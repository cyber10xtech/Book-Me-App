-- ============================================================
-- INDUSTRY-STANDARD BYPASS
-- Goal: Booking INSERT must never depend on outbound HTTP/webhook calls.
--
-- Strategy:
-- 1) Find all trigger functions that reference net.http_post
-- 2) Drop triggers using those functions on public.bookings
-- 3) Install safe local notification trigger (DB-only, no HTTP)
-- 4) Keep booking transaction reliable
-- ============================================================

-- 0) Safety: make sure helper table exists for audit
CREATE TABLE IF NOT EXISTS public.booking_trigger_audit (
  id bigserial PRIMARY KEY,
  action text NOT NULL,
  trigger_name text,
  function_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 1) Drop ALL triggers on public.bookings whose function body contains "net.http_post"
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT
      t.tgname AS trigger_name,
      p.proname AS function_name,
      n.nspname AS function_schema
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace cn ON cn.oid = c.relnamespace
    JOIN pg_proc p ON p.oid = t.tgfoid
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE cn.nspname = 'public'
      AND c.relname = 'bookings'
      AND NOT t.tgisinternal
      AND pg_get_functiondef(p.oid) ILIKE '%net.http_post%'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.bookings;', r.trigger_name);

    INSERT INTO public.booking_trigger_audit(action, trigger_name, function_name)
    VALUES ('dropped_http_trigger', r.trigger_name, r.function_schema || '.' || r.function_name);
  END LOOP;
END $$;

-- 2) Optional: hard-drop known legacy trigger names if they exist
DROP TRIGGER IF EXISTS notify_on_booking_created ON public.bookings;
DROP TRIGGER IF EXISTS send_booking_webhook ON public.bookings;
DROP TRIGGER IF EXISTS booking_webhook_trigger ON public.bookings;

-- 3) Create safe DB-only notification function (no HTTP)
CREATE OR REPLACE FUNCTION public.notify_provider_on_booking_safe()
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
  -- Never break booking insert
  RAISE WARNING 'notify_provider_on_booking_safe failed for booking %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- 4) Replace safe trigger
DROP TRIGGER IF EXISTS notify_provider_on_booking_safe ON public.bookings;
CREATE TRIGGER notify_provider_on_booking_safe
AFTER INSERT ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.notify_provider_on_booking_safe();

GRANT EXECUTE ON FUNCTION public.notify_provider_on_booking_safe() TO authenticated, anon, service_role;

-- 5) Diagnostics query (run separately after migration if needed):
-- SELECT * FROM public.booking_trigger_audit ORDER BY id DESC LIMIT 20;

-- ============================================================
-- Expected Result:
-- - Bookings can be inserted without HTTP/webhook dependency.
-- - Any trigger tied to net.http_post on bookings is removed.
-- - Provider notification still written to public.notifications.
-- ============================================================