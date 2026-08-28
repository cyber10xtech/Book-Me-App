-- Fix: handle_new_user() trigger must provide email value
-- The profiles.email column is NOT NULL, so the trigger must include it
-- Use auth.users.email which is always available

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

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

  INSERT INTO public.profiles (user_id, full_name, email, username, phone, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
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
    INSERT INTO public.profiles (user_id, full_name, email, avatar_url)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
    )
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
