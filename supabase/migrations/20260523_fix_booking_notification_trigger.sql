-- ============================================================
-- FIX: Replace any net.http_post calls with safe_http_post
-- This migration ensures booking notifications work without failing transactions
-- ============================================================

-- Drop any existing webhook triggers that might be calling net.http_post
DROP TRIGGER IF EXISTS notify_on_booking_created ON public.bookings;
DROP TRIGGER IF EXISTS send_booking_webhook ON public.bookings;
DROP TRIGGER IF EXISTS booking_webhook_trigger ON public.bookings;

-- Create a function to send booking notifications
-- This inserts a notification record for the provider when a booking is created
CREATE OR REPLACE FUNCTION public.notify_provider_on_booking()
RETURNS TRIGGER AS $$
DECLARE
  provider_profile_id uuid;
  customer_name text;
BEGIN
  -- Get provider's profile ID and customer name
  SELECT p.id, p.full_name INTO provider_profile_id, customer_name
  FROM public.profiles p
  WHERE p.id = NEW.provider_id;

  -- Insert notification for the provider
  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    body,
    data,
    is_read
  ) VALUES (
    provider_profile_id,
    'booking_confirmed',
    'New Booking Received',
    COALESCE(customer_name, 'A customer') || ' has made a new booking for ' || 
    COALESCE(NEW.service_name, 'your service') || ' on ' || 
    TO_CHAR(NEW.booking_date, 'Mon DD, YYYY') || ' at ' || 
    COALESCE(NEW.booking_time_text, NEW.booking_time::text),
    jsonb_build_object(
      'booking_id', NEW.id,
      'customer_id', NEW.customer_id,
      'service_name', NEW.service_name,
      'booking_date', NEW.booking_date,
      'booking_time', NEW.booking_time,
      'total_price', NEW.total_price
    ),
    false
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the booking insert
  RAISE WARNING 'Failed to create notification for booking %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to call the notification function
CREATE TRIGGER notify_provider_on_booking
  AFTER INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_provider_on_booking();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.notify_provider_on_booking() TO authenticated, anon, service_role;

-- ============================================================
-- EXPLANATION:
-- This migration fixes the booking notification issue by:
-- 1. Removing any old triggers that might call net.http_post
-- 2. Creating a new trigger that inserts notifications directly into the notifications table
-- 3. Using exception handling to ensure booking inserts never fail due to notification errors
-- 4. The notification will be delivered via Supabase Realtime (already configured)
-- ============================================================