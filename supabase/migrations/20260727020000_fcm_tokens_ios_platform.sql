-- ============================================================
-- Migration: iOS push notification support for fcm_tokens
-- ============================================================
-- The fcm_tokens table only had a UNIQUE constraint on `token`.
-- The platform column existed but had no constraint, and the
-- client was hardcoding platform = 'android' for all devices.
--
-- This migration:
--   1. Ensures existing rows with NULL platform default to 'android'
--      (preserves all existing Android tokens unchanged).
--   2. Adds a NOT NULL constraint with default 'android' on platform
--      so future rows always carry a valid platform value.
--   3. Adds a partial index on (user_id, platform) for efficient
--      per-user per-device-type queries used by edge functions.
--
-- No data is deleted. No existing constraints are removed.
-- The UNIQUE constraint on token is preserved as-is.
-- ============================================================

-- 1. Backfill NULL platform values to 'android' (safe for existing Android users)
UPDATE public.fcm_tokens
SET platform = 'android'
WHERE platform IS NULL;

-- 2. Set NOT NULL with a default so future inserts always have a platform
ALTER TABLE public.fcm_tokens
  ALTER COLUMN platform SET DEFAULT 'android',
  ALTER COLUMN platform SET NOT NULL;

-- 3. Index to speed up the per-user per-platform lookup in edge functions
CREATE INDEX IF NOT EXISTS fcm_tokens_user_platform_idx
  ON public.fcm_tokens (user_id, platform);
