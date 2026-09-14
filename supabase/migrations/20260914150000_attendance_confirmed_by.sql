-- Migration: 20260914150000_attendance_confirmed_by.sql

-- 1. Add the audit column WITHOUT a foreign key
-- We omit the FK so that if an auth.users record is deleted in the future (e.g. GDPR),
-- the booking record remains intact and the audit identifier survives without violating the consistency constraint.
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS attendance_confirmed_by uuid NULL;

-- 2. Update Consistency Constraint to Strict All-or-None
ALTER TABLE public.bookings
DROP CONSTRAINT IF EXISTS bookings_attendance_consistency_check;

ALTER TABLE public.bookings
ADD CONSTRAINT bookings_attendance_consistency_check
CHECK (
  (
    provider_attendance_outcome IS NULL
    AND attendance_confirmed_at IS NULL
    AND attendance_confirmed_by IS NULL
  )
  OR
  (
    provider_attendance_outcome IS NOT NULL
    AND attendance_confirmed_at IS NOT NULL
    AND attendance_confirmed_by IS NOT NULL
  )
);

-- 3. Replace trg_attendance_guard with Hardened Security Definer & Safe Search Path
CREATE OR REPLACE FUNCTION public.trg_attendance_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_provider_user_id uuid;
  v_duration integer;
BEGIN
  -- Validate authentication
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validate ownership using the proven relationship
  SELECT user_id INTO v_provider_user_id 
  FROM public.profiles 
  WHERE id = OLD.provider_id;

  IF auth.uid() != v_provider_user_id THEN
    RAISE EXCEPTION 'Not authorized. You do not own this booking.';
  END IF;

  -- Validate completed status
  IF OLD.status != 'completed' THEN
    RAISE EXCEPTION 'Booking must be completed before confirming attendance.';
  END IF;

  -- Validate scheduled service end time has passed
  SELECT duration_minutes INTO v_duration FROM public.services WHERE id = OLD.service_id;
  v_duration := pg_catalog.coalesce(v_duration, 60);
  IF (OLD.booking_date + OLD.booking_time) + (v_duration * interval '1 minute') > pg_catalog.now() THEN
    RAISE EXCEPTION 'Cannot confirm attendance before the service has ended.';
  END IF;

  -- Validate new outcome
  IF NEW.provider_attendance_outcome IS NULL 
     OR NEW.provider_attendance_outcome NOT IN ('attended', 'no_show') THEN
    RAISE EXCEPTION 'Invalid attendance outcome. Must be attended or no_show.';
  END IF;

  -- Validate state transitions
  IF OLD.provider_attendance_outcome IS NOT NULL THEN
    IF NEW.provider_attendance_outcome = OLD.provider_attendance_outcome THEN
      -- Identical retry: silently ignore the new timestamp/confirmer attempt and preserve the old ones
      NEW.attendance_confirmed_at = OLD.attendance_confirmed_at;
      NEW.attendance_confirmed_by = OLD.attendance_confirmed_by;
      RETURN NEW;
    ELSE
      RAISE EXCEPTION 'Attendance already recorded and cannot be changed.';
    END IF;
  END IF;

  -- Force the confirmation timestamp and user
  NEW.attendance_confirmed_at = pg_catalog.now();
  NEW.attendance_confirmed_by = auth.uid();

  RETURN NEW;
END;
$$;

-- 4. Recreate Trigger with expanded WHEN condition
DROP TRIGGER IF EXISTS trg_attendance_guard_trigger ON public.bookings;
CREATE TRIGGER trg_attendance_guard_trigger
BEFORE UPDATE ON public.bookings
FOR EACH ROW
WHEN (
  NEW.provider_attendance_outcome IS DISTINCT FROM OLD.provider_attendance_outcome 
  OR NEW.attendance_confirmed_at IS DISTINCT FROM OLD.attendance_confirmed_at
  OR NEW.attendance_confirmed_by IS DISTINCT FROM OLD.attendance_confirmed_by
)
EXECUTE FUNCTION public.trg_attendance_guard();

-- 5. Hardened RPC Definition
CREATE OR REPLACE FUNCTION public.confirm_booking_attendance(p_booking_id uuid, p_outcome text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_booking record;
  v_provider_user_id uuid;
  v_duration integer;
BEGIN
  IF p_outcome IS NULL OR p_outcome NOT IN ('attended', 'no_show') THEN
    RAISE EXCEPTION 'Invalid attendance outcome. Must be attended or no_show.';
  END IF;

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_booking 
  FROM public.bookings 
  WHERE id = p_booking_id 
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found.';
  END IF;

  SELECT user_id INTO v_provider_user_id 
  FROM public.profiles 
  WHERE id = v_booking.provider_id;

  IF auth.uid() != v_provider_user_id THEN
    RAISE EXCEPTION 'Not authorized. You do not own this booking.';
  END IF;

  IF v_booking.status != 'completed' THEN
    RAISE EXCEPTION 'Booking must be completed before confirming attendance.';
  END IF;

  SELECT duration_minutes INTO v_duration FROM public.services WHERE id = v_booking.service_id;
  v_duration := pg_catalog.coalesce(v_duration, 60);
  IF (v_booking.booking_date + v_booking.booking_time) + (v_duration * interval '1 minute') > pg_catalog.now() THEN
    RAISE EXCEPTION 'Cannot confirm attendance before the service has ended.';
  END IF;

  IF v_booking.provider_attendance_outcome IS NOT NULL THEN
    IF v_booking.provider_attendance_outcome = p_outcome THEN
      RETURN;
    ELSE
      RAISE EXCEPTION 'Attendance already recorded and cannot be changed.';
    END IF;
  END IF;

  UPDATE public.bookings
  SET provider_attendance_outcome = p_outcome
  WHERE id = p_booking_id;
  
END;
$$;

-- 6. Explicitly revoke public execution and grant correctly
REVOKE EXECUTE ON FUNCTION public.confirm_booking_attendance(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.confirm_booking_attendance(uuid, text) TO authenticated;

-- Ensure the trigger function cannot be called directly via RPC
REVOKE EXECUTE ON FUNCTION public.trg_attendance_guard() FROM PUBLIC, anon, authenticated;
