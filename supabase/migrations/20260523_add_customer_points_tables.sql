-- ============================================================
-- Migration: Add Customer Points Tables
-- Date: 2026-05-23
-- Purpose: Create customer_points and customer_points_log tables
--          for the points/rewards system in BookMe Customer app
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. CUSTOMER POINTS TABLE
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.customer_points (
  id          uuid NOT NULL DEFAULT gen_random_uuid(),
  profile_id  uuid NOT NULL UNIQUE,
  total_points integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customer_points_pkey PRIMARY KEY (id),
  CONSTRAINT customer_points_profile_id_fkey
    FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- ────────────────────────────────────────────────────────────
-- 2. CUSTOMER POINTS LOG TABLE
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.customer_points_log (
  id            uuid NOT NULL DEFAULT gen_random_uuid(),
  profile_id    uuid NOT NULL,
  action        text NOT NULL,
  points_earned integer NOT NULL,
  booking_id    uuid,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customer_points_log_pkey PRIMARY KEY (id),
  CONSTRAINT customer_points_log_profile_id_fkey
    FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT customer_points_log_booking_id_fkey
    FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE SET NULL
);

-- ────────────────────────────────────────────────────────────
-- 3. INDEXES FOR PERFORMANCE
-- ────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_customer_points_log_profile_id
  ON public.customer_points_log (profile_id);

CREATE INDEX IF NOT EXISTS idx_customer_points_log_action
  ON public.customer_points_log (profile_id, action);

CREATE INDEX IF NOT EXISTS idx_customer_points_log_created_at
  ON public.customer_points_log (created_at DESC);

-- ────────────────────────────────────────────────────────────
-- 4. ROW LEVEL SECURITY
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.customer_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_points_log ENABLE ROW LEVEL SECURITY;

-- Policy: customers can only read/write their own points
DROP POLICY IF EXISTS "customer_points_self" ON public.customer_points;
CREATE POLICY "customer_points_self"
  ON public.customer_points
  FOR ALL
  USING (
    profile_id IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

-- Policy: customers can only read/insert their own points log
DROP POLICY IF EXISTS "customer_points_log_self" ON public.customer_points_log;
CREATE POLICY "customer_points_log_self"
  ON public.customer_points_log
  FOR ALL
  USING (
    profile_id IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

-- ────────────────────────────────────────────────────────────
-- 5. AUTO-UPDATE TRIGGER FOR updated_at
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_customer_points_updated_at ON public.customer_points;
CREATE TRIGGER trg_customer_points_updated_at
  BEFORE UPDATE ON public.customer_points
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ────────────────────────────────────────────────────────────
-- 6. ENABLE REALTIME FOR NEW TABLES
-- ────────────────────────────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE public.customer_points;
ALTER PUBLICATION supabase_realtime ADD TABLE public.customer_points_log;

-- ============================================================
-- DONE ✅
-- Tables created and ready for use by the BookMe Customer app
-- ============================================================
