-- Add attendance tracking columns
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS provider_attendance_outcome text NULL,
ADD COLUMN IF NOT EXISTS attendance_confirmed_at timestamptz NULL;

-- Ensure valid outcomes
ALTER TABLE public.bookings
ADD CONSTRAINT bookings_provider_attendance_outcome_check
CHECK (
  provider_attendance_outcome IS NULL
  OR provider_attendance_outcome IN ('attended', 'no_show')
);

-- Consistency constraint: outcome and timestamp must exist together
ALTER TABLE public.bookings
ADD CONSTRAINT bookings_attendance_consistency_check
CHECK (
  (provider_attendance_outcome IS NULL AND attendance_confirmed_at IS NULL)
  OR (provider_attendance_outcome IS NOT NULL AND attendance_confirmed_at IS NOT NULL)
);

-- Add narrow partial index for unresolved completed bookings
CREATE INDEX IF NOT EXISTS idx_bookings_unresolved_attendance 
ON public.bookings (provider_id) 
WHERE status = 'completed' AND provider_attendance_outcome IS NULL;

-- 1. Attendance Guard Trigger Function
CREATE OR REPLACE FUNCTION trg_attendance_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  v_duration := COALESCE(v_duration, 60);
  IF (OLD.booking_date + OLD.booking_time) + (v_duration * interval '1 minute') > now() THEN
    RAISE EXCEPTION 'Cannot confirm attendance before the service has ended.';
  END IF;

  -- Validate new outcome
  IF NEW.provider_attendance_outcome NOT IN ('attended', 'no_show') THEN
    RAISE EXCEPTION 'Invalid attendance outcome. Must be attended or no_show.';
  END IF;

  -- Validate state transitions
  IF OLD.provider_attendance_outcome IS NOT NULL THEN
    IF NEW.provider_attendance_outcome = OLD.provider_attendance_outcome THEN
      -- Identical retry: ignore the new timestamp attempt and preserve the old one
      NEW.attendance_confirmed_at = OLD.attendance_confirmed_at;
      RETURN NEW;
    ELSE
      RAISE EXCEPTION 'Attendance already recorded and cannot be changed.';
    END IF;
  END IF;

  -- Force the confirmation timestamp
  NEW.attendance_confirmed_at = now();

  RETURN NEW;
END;
$$;

-- 2. Attendance Guard Trigger
DROP TRIGGER IF EXISTS trg_attendance_guard_trigger ON public.bookings;
CREATE TRIGGER trg_attendance_guard_trigger
BEFORE UPDATE ON public.bookings
FOR EACH ROW
WHEN (
  NEW.provider_attendance_outcome IS DISTINCT FROM OLD.provider_attendance_outcome 
  OR NEW.attendance_confirmed_at IS DISTINCT FROM OLD.attendance_confirmed_at
)
EXECUTE FUNCTION trg_attendance_guard();

-- 3. The Security Definer RPC for providers to confirm attendance safely
CREATE OR REPLACE FUNCTION confirm_booking_attendance(p_booking_id uuid, p_outcome text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking record;
  v_provider_user_id uuid;
  v_duration integer;
BEGIN
  -- Validate outcome
  IF p_outcome NOT IN ('attended', 'no_show') THEN
    RAISE EXCEPTION 'Invalid attendance outcome. Must be attended or no_show.';
  END IF;

  -- Require auth.uid()
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Lock the target booking row using FOR UPDATE and reject missing booking
  SELECT * INTO v_booking 
  FROM public.bookings 
  WHERE id = p_booking_id 
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found.';
  END IF;

  -- Validate provider ownership
  SELECT user_id INTO v_provider_user_id 
  FROM public.profiles 
  WHERE id = v_booking.provider_id;

  IF auth.uid() != v_provider_user_id THEN
    RAISE EXCEPTION 'Not authorized. You do not own this booking.';
  END IF;

  -- Validate completed status
  IF v_booking.status != 'completed' THEN
    RAISE EXCEPTION 'Booking must be completed before confirming attendance.';
  END IF;

  -- Validate that the scheduled end time passed
  SELECT duration_minutes INTO v_duration FROM public.services WHERE id = v_booking.service_id;
  v_duration := COALESCE(v_duration, 60);
  IF (v_booking.booking_date + v_booking.booking_time) + (v_duration * interval '1 minute') > now() THEN
    RAISE EXCEPTION 'Cannot confirm attendance before the service has ended.';
  END IF;

  -- Handle retries and conflicts
  IF v_booking.provider_attendance_outcome IS NOT NULL THEN
    IF v_booking.provider_attendance_outcome = p_outcome THEN
      -- Return success for an identical retry
      RETURN;
    ELSE
      -- Reject a conflicting second outcome
      RAISE EXCEPTION 'Attendance already recorded and cannot be changed.';
    END IF;
  END IF;

  -- Set the outcome and allow the trigger to generate the timestamp
  UPDATE public.bookings
  SET provider_attendance_outcome = p_outcome
  WHERE id = p_booking_id;
  
END;
$$;

-- Revoke public execution and grant to authenticated users
REVOKE EXECUTE ON FUNCTION confirm_booking_attendance(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION confirm_booking_attendance(uuid, text) TO authenticated;
