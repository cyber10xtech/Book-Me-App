-- ============================================================================
-- Booking-Based Customer <-> Provider Messaging Window (48 hours)
--
-- Scope: ONLY the messaging-window feature. No unrelated tables, no RLS
-- policy rewrites, no changes to booking flow, auth, or existing chat
-- infrastructure beyond what's needed here.
--
-- What this migration does:
--   1. Adds a computed expiration column on `bookings` so the 48h cutoff
--      can be queried directly (booking.created_at + 48h) instead of being
--      recalculated ad-hoc everywhere in SQL.
--   2. Auto-creates a `chat_conversations` row the instant a booking is
--      inserted, so the provider shows up on the customer's Chats page
--      immediately, even before any message is sent. Idempotent (one
--      conversation per booking_id, which is already UNIQUE).
--   3. Adds a defense-in-depth DB trigger that blocks INSERTs into
--      `chat_messages` once the linked booking's window has closed, so the
--      48h rule holds even if a client bypasses the app-level UI guard.
--      This mirrors the exact same rule enforced client-side by
--      `canMessageBooking()` in both apps.
-- ============================================================================

-- 1) Computed expiration timestamp on bookings
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS messaging_expires_at timestamptz
  GENERATED ALWAYS AS (created_at + interval '48 hours') STORED;

-- 2) Auto-create chat_conversations row on booking creation
CREATE OR REPLACE FUNCTION public.create_chat_conversation_for_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_user_id uuid;
  v_provider_user_id uuid;
BEGIN
  SELECT user_id INTO v_customer_user_id FROM public.profiles WHERE id = NEW.customer_id;
  SELECT user_id INTO v_provider_user_id FROM public.profiles WHERE id = NEW.provider_id;

  -- If either profile is missing a linked auth user, skip silently rather
  -- than failing the booking insert.
  IF v_customer_user_id IS NULL OR v_provider_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.chat_conversations (
    booking_id, provider_id, customer_id, provider_user_id, customer_user_id, created_at
  ) VALUES (
    NEW.id, NEW.provider_id, NEW.customer_id, v_provider_user_id, v_customer_user_id, NEW.created_at
  )
  ON CONFLICT (booking_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_chat_conversation_for_booking ON public.bookings;
CREATE TRIGGER trg_create_chat_conversation_for_booking
AFTER INSERT ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.create_chat_conversation_for_booking();

-- 3) Enforce the 48h window at the database level (mirrors client-side
--    canMessageBooking() so a direct API call can't bypass the UI guard)
CREATE OR REPLACE FUNCTION public.enforce_booking_messaging_window()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking_id  uuid;
  v_expires_at  timestamptz;
BEGIN
  SELECT booking_id INTO v_booking_id
  FROM public.chat_conversations
  WHERE id = NEW.conversation_id;

  -- No linked booking (shouldn't happen for this feature) -> allow.
  IF v_booking_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT messaging_expires_at INTO v_expires_at
  FROM public.bookings
  WHERE id = v_booking_id;

  IF v_expires_at IS NOT NULL AND now() > v_expires_at THEN
    RAISE EXCEPTION 'You must have an active booking to message this business.'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_booking_messaging_window ON public.chat_messages;
CREATE TRIGGER trg_enforce_booking_messaging_window
BEFORE INSERT ON public.chat_messages
FOR EACH ROW
EXECUTE FUNCTION public.enforce_booking_messaging_window();
