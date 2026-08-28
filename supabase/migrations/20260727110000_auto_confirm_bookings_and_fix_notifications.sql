-- ============================================================================
-- 1) Auto-confirm bookings (bypass "pending")
-- 2) Fix booking-created notifications, which have been silently broken
--
-- Scope: ONLY the booking-creation notification path + booking status
-- default. No unrelated tables touched.
--
-- ----------------------------------------------------------------------------
-- Context on the notification bug being fixed here (for future reference):
--
-- notifications.type is a NOT NULL enum (notification_type) with values:
--   'booking_confirmed', 'booking_completed', 'new_message',
--   'review_received', 'promotion'
--
-- Two separate insert paths have been silently failing:
--   a) The customer app's booking-creation code (BookingFlow.tsx) inserted
--      with type = 'new_booking', which is NOT a valid enum value — every
--      insert threw and was swallowed by a try/catch, so no row was ever
--      written for that call.
--   b) An earlier trigger generation (notify_on_booking_created, from
--      20260523_fix_customer_notifications.sql) inserted into a column
--      called `booking_id`, which does not exist on notifications (the real
--      column is `related_booking_id`) — every insert threw and was
--      swallowed by the function's own exception handler.
--
-- The trigger that actually survived all the 2026-05-23 hotfixes and is
-- live today is notify_provider_on_booking() (final body defined in
-- 20260523_fix_net_http_post_missing.sql) — its provider-side notification
-- already works (including on Android) and is left completely untouched
-- here. It just never notified the customer. This migration only adds a
-- second INSERT to the same function for that.
-- ----------------------------------------------------------------------------

-- ----------------------------------------------------------------------------
-- A) Add the enum values booking status-change notifications need.
--    'booking_confirmed' and 'booking_completed' already exist.
--    Additive only — ALTER TYPE ... ADD VALUE cannot run inside the same
--    transaction as code that uses the new value, so this migration only
--    adds the values; the business app's status-change notification code
--    (useBookings.ts) is fixed separately to use them.
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'notification_type' AND e.enumlabel = 'booking_cancelled'
  ) THEN
    ALTER TYPE public.notification_type ADD VALUE 'booking_cancelled';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'notification_type' AND e.enumlabel = 'booking_rescheduled'
  ) THEN
    ALTER TYPE public.notification_type ADD VALUE 'booking_rescheduled';
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- B) Auto-confirm every new booking — bypass "pending" entirely.
--
--    Implemented as a BEFORE INSERT trigger (not just a new column default)
--    so it's robust no matter which app or code path inserts the row:
--    if a client still sends status = 'pending' (or omits it, which
--    defaults to 'pending'), it's rewritten to 'confirmed' before the row
--    is written. Any other explicit status (e.g. a future admin/import
--    flow that deliberately inserts 'cancelled') is left untouched.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.auto_confirm_booking()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'pending' THEN
    NEW.status := 'confirmed';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_confirm_booking ON public.bookings;
CREATE TRIGGER trg_auto_confirm_booking
BEFORE INSERT ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.auto_confirm_booking();

-- Also flip the column default, so anything inspecting the schema (or any
-- insert that omits status altogether) reflects the same behavior.
ALTER TABLE public.bookings ALTER COLUMN status SET DEFAULT 'confirmed';

-- ----------------------------------------------------------------------------
-- C) The live booking-created trigger (notify_provider_on_booking, final body
--    from 20260523_fix_net_http_post_missing.sql) already works and already
--    delivers the provider-side notification correctly — its INSERT block
--    below is reproduced byte-for-byte, untouched. This migration only ADDS
--    a second INSERT so the customer also gets a notification when their
--    booking is confirmed; nothing about the existing provider path changes.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_provider_on_booking()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  customer_name text;
  provider_label text;
BEGIN
  SELECT p.full_name INTO customer_name
  FROM public.profiles p
  WHERE p.id = NEW.customer_id;

  -- ── Unchanged: this is the exact block that's live today. ──────────────
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

  -- ── New: customer-side notification. Previously missing entirely — the
  --    customer got no DB notification row when their own booking was
  --    created. Added, not replacing anything above. ─────────────────────
  SELECT COALESCE(p.business_name, p.full_name) INTO provider_label
  FROM public.profiles p
  WHERE p.id = NEW.provider_id;

  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    body,
    related_booking_id,
    related_provider_id,
    data,
    is_read
  ) VALUES (
    NEW.customer_id,
    'booking_confirmed',
    'Booking Confirmed! ✅',
    'Your booking for ' || COALESCE(NEW.service_name, 'your service') || ' with ' ||
    COALESCE(provider_label, 'the provider') || ' on ' ||
    TO_CHAR(NEW.booking_date, 'Mon DD, YYYY') || ' at ' ||
    COALESCE(NEW.booking_time_text, NEW.booking_time::text) || ' is confirmed.',
    NEW.id,
    NEW.provider_id,
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

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Failed to create booking notification for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- Trigger name/function name unchanged (notify_provider_on_booking is what's
-- live today) — only the function body gained the new block above.
DROP TRIGGER IF EXISTS notify_provider_on_booking ON public.bookings;
CREATE TRIGGER notify_provider_on_booking
AFTER INSERT ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.notify_provider_on_booking();

-- Defensively drop the broken duplicate trigger generation in case it's
-- still present on some environment (it silently no-ops today because of
-- the bad `booking_id` column reference, but there's no reason to keep it
-- around now that notify_provider_on_booking() covers both sides).
DROP TRIGGER IF EXISTS notify_on_booking_created ON public.bookings;

GRANT EXECUTE ON FUNCTION public.notify_provider_on_booking() TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.auto_confirm_booking() TO authenticated, anon, service_role;

-- ============================================================================
-- Expected result:
-- - Every new booking is written as 'confirmed', never 'pending'.
-- - Exactly one DB notification row per side (provider + customer), always
--   successfully inserted (correct columns, valid enum value).
-- - No behavior change to messaging window, chat conversations, RLS, or any
--   other table.
-- ============================================================================
