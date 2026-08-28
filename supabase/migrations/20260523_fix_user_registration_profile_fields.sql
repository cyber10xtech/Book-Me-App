-- Fix user registration issues
-- Issue 1: The handle_new_user() trigger was only extracting full_name and avatar_url
--          from user metadata, but the SignUp form also collects username and phone
-- Issue 2: Missing referral_source column that's required by the app's ReferralGuard

-- Add referral_source column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_source TEXT;

-- Drop the existing trigger first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Update the function to extract username and phone from user metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  desired_username TEXT;
  desired_phone TEXT;
BEGIN
  desired_username := NULLIF(NEW.raw_user_meta_data->>'username', '');
  desired_phone := NULLIF(NEW.raw_user_meta_data->>'phone', '');

  -- Avoid failing signup if legacy/existing data already uses this unique value.
  IF desired_username IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.profiles WHERE username = desired_username
  ) THEN
    desired_username := NULL;
  END IF;

  IF desired_phone IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.profiles WHERE phone = desired_phone
  ) THEN
    desired_phone := NULL;
  END IF;

  INSERT INTO public.profiles (user_id, full_name, username, phone, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    desired_username,
    desired_phone,
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Last-resort fallback: never block auth user creation because username/phone conflicts.
    -- Create the profile without optional unique fields so signup can complete.
    INSERT INTO public.profiles (user_id, full_name, avatar_url)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
    )
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Optional: Update existing profiles that might have missing username/phone from metadata
-- This will help users who registered before this fix.
-- It only fills username/phone when the metadata value is not already used by another profile,
-- so existing UNIQUE constraints (profiles_username_key/profiles_phone_key) do not fail the migration.
UPDATE public.profiles p
SET
  username = CASE
    WHEN p.username IS NOT NULL THEN p.username
    WHEN NULLIF(au.raw_user_meta_data->>'username', '') IS NULL THEN p.username
    WHEN EXISTS (
      SELECT 1
      FROM public.profiles other
      WHERE other.username = au.raw_user_meta_data->>'username'
        AND other.id <> p.id
    ) THEN p.username
    ELSE au.raw_user_meta_data->>'username'
  END,
  phone = CASE
    WHEN p.phone IS NOT NULL THEN p.phone
    WHEN NULLIF(au.raw_user_meta_data->>'phone', '') IS NULL THEN p.phone
    WHEN EXISTS (
      SELECT 1
      FROM public.profiles other
      WHERE other.phone = au.raw_user_meta_data->>'phone'
        AND other.id <> p.id
    ) THEN p.phone
    ELSE au.raw_user_meta_data->>'phone'
  END
FROM auth.users au
WHERE au.id = p.user_id
  AND (
    au.raw_user_meta_data ? 'username'
    OR au.raw_user_meta_data ? 'phone'
  );
