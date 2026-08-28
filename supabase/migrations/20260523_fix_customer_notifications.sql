-- ============================================================
-- FIX: Customer notifications not showing in alerts page
-- 
-- Root Cause:
-- - Trigger inserts notifications with user_id = provider_id (profile_id)
-- - NotificationsPage queries with user_id = auth.uid() (auth user ID)
-- - These are different IDs, causing notifications to not appear
--
-- Solution (Option A):
-- - Insert TWO notifications per booking:
--   1. Provider notification (using provider's auth user_id)
--   2. Customer notification (using customer's auth user_id)
-- - This ensures both parties see notifications in their alerts
-- ============================================================

-- Drop existing trigger
DROP TRIGGER IF EXISTS notify_provider_on_booking_safe ON public.bookings;

-- Create improved function that notifies BOTH provider AND customer
CREATE OR REPLACE FUNCTION public.notify_on_booking_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  customer_name text;
  provider_name text;
  customer_user_id uuid;
  provider_user_id uuid;
BEGIN
  -- Get customer details
  SELECT p.full_name, p.user_id INTO customer_name, customer_user_id
  FROM public.profiles p
  WHERE p.id = NEW.customer_id;

  -- Get provider details
  SELECT p.full_name, p.business_name, p.user_id INTO provider_name, provider_user_id
  FROM public.profiles p
  WHERE p.id = NEW.provider_id;

  -- 1) Insert notification for PROVIDER (using their auth user_id)
  IF provider_user_id IS NOT NULL THEN
    INSERT INTO public.notifications (
      user_id,
      type,
      title,
      body,
      booking_id,
      data,
      is_read
    ) VALUES (
      provider_user_id,  -- Use provider's auth user_id, not profile_id
      'booking_confirmed',
      'New Booking Received',
      COALESCE(customer_name, 'A customer') || ' has made a new booking for ' ||
      COALESCE(NEW.service_name, 'your service') || ' on ' ||
      TO_CHAR(NEW.booking_date, 'Mon DD, YYYY') || ' at ' ||
      COALESCE(NEW.booking_time_text, NEW.booking_time::text),
      NEW.id,
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
  END IF;

  -- 2) Insert notification for CUSTOMER (using their auth user_id)
  IF customer_user_id IS NOT NULL THEN
    INSERT INTO public.notifications (
      user_id,
      type,
      title,
      body,
      booking_id,
      data,
      is_read
    ) VALUES (
      customer_user_id,  -- Use customer's auth user_id, not profile_id
      'booking_confirmed',
      'Booking Confirmed',
      'Your booking for ' || COALESCE(NEW.service_name, 'service') || 
      ' with ' || COALESCE(provider_name, 'provider') || 
      ' on ' || TO_CHAR(NEW.booking_date, 'Mon DD, YYYY') || 
      ' at ' || COALESCE(NEW.booking_time_text, NEW.booking_time::text) || 
      ' has been created. Waiting for provider confirmation.',
      NEW.id,
      jsonb_build_object(
        'booking_id', NEW.id,
        'provider_id', NEW.provider_id,
        'service_name', NEW.service_name,
        'booking_date', NEW.booking_date,
        'booking_time', NEW.booking_time,
        'total_price', NEW.total_price
      ),
      false
    );
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never break booking insert
  RAISE WARNING 'notify_on_booking_created failed for booking %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- Create new trigger
CREATE TRIGGER notify_on_booking_created
AFTER INSERT ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_booking_created();

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.notify_on_booking_created() TO authenticated, anon, service_role;

-- ============================================================
-- Expected Result:
-- - When a booking is created, BOTH provider and customer receive notifications
-- - Notifications use auth user_id (not profile_id) so they appear in alerts page
-- - Customer can see their booking confirmation in the alerts tab
-- - Provider can see new booking requests in their alerts
-- ============================================================
