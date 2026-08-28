-- ============================================================
-- Migration: add push queue for server‑side FCM delivery
-- ------------------------------------------------------------
-- 1️⃣ Create push_queue table.
-- 2️⃣ Trigger on notifications INSERT → enqueue entry.
-- 3️⃣ Grant rights to service_role (used by Edge Function).
-- ============================================================

-- 1️⃣ Table to hold pending push jobs
CREATE TABLE IF NOT EXISTS public.push_queue (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  sent          BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at       TIMESTAMPTZ
);

-- 2️⃣ Trigger: after a notification is inserted, add a row to push_queue
CREATE OR REPLACE FUNCTION public.enqueue_push()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.push_queue (notification_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enqueue_push ON public.notifications;
CREATE TRIGGER enqueue_push
AFTER INSERT ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.enqueue_push();

-- 3️⃣ Grant usage/execution to service_role (Edge Function runs as service_role)
GRANT SELECT, INSERT, UPDATE ON public.push_queue TO service_role;
GRANT EXECUTE ON FUNCTION public.enqueue_push() TO service_role;