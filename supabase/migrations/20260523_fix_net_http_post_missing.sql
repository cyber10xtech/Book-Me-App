-- ============================================================
-- HOTFIX: Prevent booking failures when legacy trigger calls net.http_post
-- Error fixed:
--   function net.http_post(url => text, headers => jsonb, body => text) does not exist
-- ============================================================

-- 1) Ensure schema exists
CREATE SCHEMA IF NOT EXISTS net;

-- 2) Optional dependency for outbound HTTP (if available in project)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- 3) Compatibility shim:
--    Legacy trigger code often calls:
--      net.http_post(url => text, headers => jsonb, body => text)
--    This shim keeps booking INSERT from failing even if HTTP extension is absent.
CREATE OR REPLACE FUNCTION net.http_post(
  url text,
  headers jsonb DEFAULT '{}'::jsonb,
  body text DEFAULT ''::text
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, net
AS $$
DECLARE
  req_id bigint;
BEGIN
  BEGIN
    -- Try HTTP extension variant (widely used in older setups)
    SELECT extensions.http_post(
      url => url,
      headers => headers,
      body => body
    )::bigint INTO req_id;
    RETURN COALESCE(req_id, 0);
  EXCEPTION WHEN undefined_function THEN
    -- Fallback: if HTTP function is unavailable, do not block booking insert
    RAISE WARNING 'http_post extension function missing; skipping webhook for %', url;
    RETURN 0;
  WHEN OTHERS THEN
    -- Any network/webhook error must never fail booking transaction
    RAISE WARNING 'Webhook call failed but transaction continues: %', SQLERRM;
    RETURN 0;
  END;
END;
$$;

GRANT USAGE ON SCHEMA net TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION net.http_post(text, jsonb, text) TO authenticated, anon, service_role;

-- 4) Remove old webhook-style triggers that can still call legacy paths
DROP TRIGGER IF EXISTS notify_on_booking_created ON public.bookings;
DROP TRIGGER IF EXISTS send_booking_webhook ON public.bookings;
DROP TRIGGER IF EXISTS booking_webhook_trigger ON public.bookings;

-- 5) Recreate local DB notification trigger (no external HTTP dependency)
CREATE OR REPLACE FUNCTION public.notify_provider_on_booking()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  customer_name text;
BEGIN
  SELECT p.full_name INTO customer_name
  FROM public.profiles p
  WHERE p.id = NEW.customer_id;

  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    body,
    data,
    is_read
  ) VALUES (
    NEW.provider_id,
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
  RAISE WARNING 'Failed to create booking notification for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_provider_on_booking ON public.bookings;
CREATE TRIGGER notify_provider_on_booking
AFTER INSERT ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.notify_provider_on_booking();

GRANT EXECUTE ON FUNCTION public.notify_provider_on_booking() TO authenticated, anon, service_role;

-- ============================================================
-- Result:
-- - booking insert no longer fails on missing net.http_post
-- - notification still created via local table insert
-- - legacy webhook path safely neutralized
-- ============================================================