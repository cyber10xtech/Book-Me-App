-- Migration: Enforce case-insensitive, trimmed username uniqueness on public.profiles

-- 1. Diagnostic pre-check: Raise warning if any normalized duplicates exist
DO $$
DECLARE
  dup_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO dup_count
  FROM (
    SELECT LOWER(TRIM(username))
    FROM public.profiles
    WHERE username IS NOT NULL AND TRIM(username) <> ''
    GROUP BY LOWER(TRIM(username))
    HAVING COUNT(*) > 1
  ) dups;

  IF dup_count > 0 THEN
    RAISE WARNING 'Found % normalized username duplicate group(s) in public.profiles. Clean up duplicates before index creation.', dup_count;
  END IF;
END $$;

-- 2. Create unique index on LOWER(TRIM(username))
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username_lower
  ON public.profiles (LOWER(TRIM(username)))
  WHERE username IS NOT NULL AND TRIM(username) <> '';

COMMENT ON INDEX idx_profiles_username_lower IS 'Enforces case-insensitive and whitespace-stripped uniqueness for usernames across customer and provider profiles.';
