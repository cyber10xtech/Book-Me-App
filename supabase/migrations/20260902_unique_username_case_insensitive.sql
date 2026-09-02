-- Migration: Enforce case-insensitive, trimmed username uniqueness on public.profiles

DO $$
DECLARE
  dup_count INTEGER;
  dup_samples TEXT;
BEGIN
  -- 1. Check for normalized duplicate usernames (case-insensitive & trimmed)
  SELECT COUNT(*), string_agg(dup_name, ', ') INTO dup_count, dup_samples
  FROM (
    SELECT LOWER(TRIM(username)) AS dup_name
    FROM public.profiles
    WHERE username IS NOT NULL AND TRIM(username) <> ''
    GROUP BY LOWER(TRIM(username))
    HAVING COUNT(*) > 1
    LIMIT 5
  ) dups;

  IF dup_count > 0 THEN
    RAISE EXCEPTION 'Cannot create unique index on public.profiles(LOWER(TRIM(username))): Found % duplicate group(s) (e.g. %). Please manually resolve these duplicate usernames before running this migration.', dup_count, dup_samples;
  END IF;
END $$;

-- 2. Create unique index on LOWER(TRIM(username)) for non-empty usernames
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username_lower
  ON public.profiles (LOWER(TRIM(username)))
  WHERE username IS NOT NULL AND TRIM(username) <> '';

COMMENT ON INDEX idx_profiles_username_lower IS 'Enforces case-insensitive uniqueness after trimming leading/trailing whitespace.';
