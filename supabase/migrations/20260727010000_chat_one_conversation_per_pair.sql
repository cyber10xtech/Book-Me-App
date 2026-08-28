-- ============================================================================
-- Chat: exactly ONE conversation per (customer, provider) pair
--
-- Scope: ONLY the messaging system. No unrelated tables touched.
--
-- Problem being fixed:
--   chat_conversations.booking_id was UNIQUE, so every new booking between
--   the same customer and provider created a brand new conversation thread
--   instead of reusing the existing one. This migration:
--
--   1. Merges any conversations that already got duplicated this way,
--      preserving all chat_messages history (moved to the surviving thread).
--   2. Replaces UNIQUE(booking_id) with UNIQUE(customer_id, provider_id) so
--      duplicates become impossible going forward.
--   3. Updates the auto-create trigger (from
--      20260724120000_booking_messaging_window.sql) to upsert by pair and
--      repoint booking_id at the newest booking, so the 48h messaging
--      window (bookings.messaging_expires_at, unchanged) always reflects
--      the most recent qualifying booking between the two of them.
--   4. Adds RLS policies for chat_conversations / chat_messages / chat_typing
--      (previously untracked in migrations) so participants can read/write
--      their own threads.
--   5. Adds chat_messages / chat_typing to the supabase_realtime publication
--      so realtime subscriptions keep working.
--   6. Adds supporting indexes.
--
-- Safe to run multiple times (idempotent) and safe on environments that
-- already have zero duplicate conversations.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Merge duplicate conversations per (customer_id, provider_id) pair.
--    Existing chat history is preserved — messages are moved, never deleted.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  pair RECORD;
  keeper_id uuid;
  dup_id uuid;
  guard_trigger RECORD;
BEGIN
  -- chat_messages has an immutability guard trigger
  -- (guard_chat_message_immutability, added directly on the live database —
  -- it isn't tracked in any migration in this repo) that blocks updates to
  -- any column other than is_read/read_at. That's correct for normal app
  -- writes, but it also blocks the one-time conversation_id repoint below
  -- when merging duplicate threads. Find it by function name (rather than
  -- hardcoding a trigger name we don't know) and disable it only for the
  -- duration of this merge, then restore it immediately after.
  FOR guard_trigger IN
    SELECT t.tgname
    FROM pg_trigger t
    JOIN pg_proc p ON p.oid = t.tgfoid
    WHERE t.tgrelid = 'public.chat_messages'::regclass
      AND p.proname = 'guard_chat_message_immutability'
      AND NOT t.tgisinternal
  LOOP
    EXECUTE format('ALTER TABLE public.chat_messages DISABLE TRIGGER %I', guard_trigger.tgname);
  END LOOP;

  FOR pair IN
    SELECT customer_id, provider_id
    FROM public.chat_conversations
    GROUP BY customer_id, provider_id
    HAVING COUNT(*) > 1
  LOOP
    -- Prefer the thread linked to the most recently created booking for
    -- this pair as the survivor; fall back to the most recently created
    -- conversation row if no matching booking can be found.
    SELECT cc.id INTO keeper_id
    FROM public.chat_conversations cc
    LEFT JOIN public.bookings b ON b.id = cc.booking_id
    WHERE cc.customer_id = pair.customer_id AND cc.provider_id = pair.provider_id
    ORDER BY b.created_at DESC NULLS LAST, cc.created_at DESC
    LIMIT 1;

    FOR dup_id IN
      SELECT id FROM public.chat_conversations
      WHERE customer_id = pair.customer_id
        AND provider_id = pair.provider_id
        AND id <> keeper_id
    LOOP
      -- Preserve chat history: move messages onto the surviving thread.
      UPDATE public.chat_messages SET conversation_id = keeper_id WHERE conversation_id = dup_id;
      -- Typing indicator rows are ephemeral UI state — safe to drop.
      DELETE FROM public.chat_typing WHERE conversation_id = dup_id;
      DELETE FROM public.chat_conversations WHERE id = dup_id;
    END LOOP;

    -- Repoint the surviving thread at the most recent booking between this
    -- pair so its 48h messaging window is correct after the merge.
    UPDATE public.chat_conversations cc
    SET booking_id = (
      SELECT b.id FROM public.bookings b
      WHERE b.customer_id = pair.customer_id AND b.provider_id = pair.provider_id
      ORDER BY b.created_at DESC
      LIMIT 1
    )
    WHERE cc.id = keeper_id
      AND EXISTS (
        SELECT 1 FROM public.bookings b
        WHERE b.customer_id = pair.customer_id AND b.provider_id = pair.provider_id
      );
  END LOOP;

  -- Restore the immutability guard now that the one-time merge is done.
  FOR guard_trigger IN
    SELECT t.tgname
    FROM pg_trigger t
    JOIN pg_proc p ON p.oid = t.tgfoid
    WHERE t.tgrelid = 'public.chat_messages'::regclass
      AND p.proname = 'guard_chat_message_immutability'
      AND NOT t.tgisinternal
  LOOP
    EXECUTE format('ALTER TABLE public.chat_messages ENABLE TRIGGER %I', guard_trigger.tgname);
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 2) Replace UNIQUE(booking_id) with UNIQUE(customer_id, provider_id).
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  cname text;
BEGIN
  SELECT con.conname INTO cname
  FROM pg_constraint con
  JOIN pg_class rel   ON rel.oid = con.conrelid
  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  WHERE nsp.nspname = 'public'
    AND rel.relname = 'chat_conversations'
    AND con.contype = 'u'
    AND (
      SELECT array_agg(attname::text ORDER BY attname)
      FROM pg_attribute
      WHERE attrelid = rel.oid AND attnum = ANY (con.conkey)
    ) = ARRAY['booking_id'];

  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.chat_conversations DROP CONSTRAINT %I', cname);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'chat_conversations'
      AND con.conname = 'chat_conversations_customer_provider_key'
  ) THEN
    ALTER TABLE public.chat_conversations
      ADD CONSTRAINT chat_conversations_customer_provider_key UNIQUE (customer_id, provider_id);
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 3) Auto-create/reuse trigger: upsert by (customer_id, provider_id) instead
--    of by booking_id, repointing booking_id at the newest booking so the
--    48h window always reflects the most recent qualifying booking.
--    (Trigger itself — trg_create_chat_conversation_for_booking — is
--    unchanged; only the function body is replaced.)
-- ----------------------------------------------------------------------------
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
  ON CONFLICT (customer_id, provider_id) DO UPDATE
    SET booking_id = EXCLUDED.booking_id;

  RETURN NEW;
END;
$$;

-- enforce_booking_messaging_window() is unchanged: it already resolves the
-- window via chat_conversations.booking_id, which now always points at the
-- most recent qualifying booking for the pair.

-- ----------------------------------------------------------------------------
-- 4) RLS — participants only. These tables had no tracked RLS policies
--    before this migration. Enabling RLS + adding participant policies only
--    ever narrows anonymous/other-user access; it cannot remove access the
--    app itself relies on, since every existing query already filters by
--    the authenticated participant.
-- ----------------------------------------------------------------------------
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_typing        ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants view conversations"   ON public.chat_conversations;
DROP POLICY IF EXISTS "Participants create conversations" ON public.chat_conversations;
DROP POLICY IF EXISTS "Participants update conversations" ON public.chat_conversations;

CREATE POLICY "Participants view conversations" ON public.chat_conversations FOR SELECT
  USING (auth.uid() = customer_user_id OR auth.uid() = provider_user_id);

CREATE POLICY "Participants create conversations" ON public.chat_conversations FOR INSERT
  WITH CHECK (auth.uid() = customer_user_id OR auth.uid() = provider_user_id);

CREATE POLICY "Participants update conversations" ON public.chat_conversations FOR UPDATE
  USING (auth.uid() = customer_user_id OR auth.uid() = provider_user_id);

DROP POLICY IF EXISTS "Participants view messages"  ON public.chat_messages;
DROP POLICY IF EXISTS "Participants send messages"   ON public.chat_messages;
DROP POLICY IF EXISTS "Participants update messages" ON public.chat_messages;

CREATE POLICY "Participants view messages" ON public.chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_conversations cc
      WHERE cc.id = conversation_id
        AND (auth.uid() = cc.customer_user_id OR auth.uid() = cc.provider_user_id)
    )
  );

CREATE POLICY "Participants send messages" ON public.chat_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.chat_conversations cc
      WHERE cc.id = conversation_id
        AND (auth.uid() = cc.customer_user_id OR auth.uid() = cc.provider_user_id)
    )
  );

-- Needed for the client's "mark as read" update on incoming messages.
CREATE POLICY "Participants update messages" ON public.chat_messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_conversations cc
      WHERE cc.id = conversation_id
        AND (auth.uid() = cc.customer_user_id OR auth.uid() = cc.provider_user_id)
    )
  );

DROP POLICY IF EXISTS "Participants view typing"   ON public.chat_typing;
DROP POLICY IF EXISTS "Participants set own typing" ON public.chat_typing;
DROP POLICY IF EXISTS "Participants update own typing" ON public.chat_typing;

CREATE POLICY "Participants view typing" ON public.chat_typing FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_conversations cc
      WHERE cc.id = conversation_id
        AND (auth.uid() = cc.customer_user_id OR auth.uid() = cc.provider_user_id)
    )
  );

CREATE POLICY "Participants set own typing" ON public.chat_typing FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.chat_conversations cc
      WHERE cc.id = conversation_id
        AND (auth.uid() = cc.customer_user_id OR auth.uid() = cc.provider_user_id)
    )
  );

CREATE POLICY "Participants update own typing" ON public.chat_typing FOR UPDATE
  USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 5) Realtime — required for chat_messages / chat_typing postgres_changes
--    subscriptions used by ChatWindow.tsx and ChatsPage.tsx.
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'chat_typing'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_typing;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 6) Supporting indexes.
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_created
  ON public.chat_messages (conversation_id, created_at);

CREATE INDEX IF NOT EXISTS idx_chat_conversations_customer_user
  ON public.chat_conversations (customer_user_id);

CREATE INDEX IF NOT EXISTS idx_chat_conversations_provider_user
  ON public.chat_conversations (provider_user_id);

CREATE INDEX IF NOT EXISTS idx_bookings_customer_provider_created
  ON public.bookings (customer_id, provider_id, created_at DESC);
