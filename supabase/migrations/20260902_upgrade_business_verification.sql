-- Migration: 20260902_upgrade_business_verification.sql
-- Upgrades Business Verification schema, status tracking, triggers and RLS policies

-- 1. Ensure verification columns exist on public.profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS action_required_reason TEXT,
  ADD COLUMN IF NOT EXISTS nin TEXT,
  ADD COLUMN IF NOT EXISTS dob TEXT;

-- Enforce verification_status constraint
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_verification_status_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_verification_status_check 
      CHECK (verification_status IN ('not_started', 'in_progress', 'submitted', 'under_review', 'action_required', 'verified', 'rejected'));
  END IF;
END $$;

-- 2. Ensure public.documents table exists with required fields
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  document_number TEXT,
  document_url TEXT NOT NULL,
  status TEXT DEFAULT 'submitted',
  action_required_reason TEXT,
  verification_notes TEXT,
  verified_by_admin TEXT,
  verification_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on documents table
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- 3. Document RLS Policies
DROP POLICY IF EXISTS "Providers manage own verification documents" ON public.documents;
CREATE POLICY "Providers manage own verification documents" ON public.documents
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. Trigger to prevent business owners from self-granting is_verified = true
CREATE OR REPLACE FUNCTION public.protect_profile_verification_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- If not service_role / admin, prevent mutating is_verified directly
  IF (current_setting('role', true) <> 'service_role') THEN
    IF (OLD.is_verified IS TRUE AND NEW.is_verified IS FALSE) THEN
      -- Allow admin/system revoke
      NULL;
    ELSIF (OLD.is_verified IS NOT TRUE AND NEW.is_verified IS TRUE) THEN
      RAISE EXCEPTION 'Only authorized administrators can verify a business.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_protect_profile_verification ON public.profiles;
CREATE TRIGGER trg_protect_profile_verification
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_verification_fields();

-- 5. Trigger to handle re-verification when critical identity fields change on a VERIFIED business
CREATE OR REPLACE FUNCTION public.handle_verified_profile_critical_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- If currently verified, and critical identity fields change, transition to under_review for re-verification
  IF (OLD.is_verified IS TRUE) THEN
    IF (
      COALESCE(OLD.business_name, '') <> COALESCE(NEW.business_name, '') OR
      COALESCE(OLD.owner_name, '') <> COALESCE(NEW.owner_name, '') OR
      COALESCE(OLD.nin, '') <> COALESCE(NEW.nin, '') OR
      COALESCE(OLD.business_registration_number, '') <> COALESCE(NEW.business_registration_number, '')
    ) THEN
      NEW.verification_status := 'under_review';
      NEW.action_required_reason := 'Critical business information changed after verification. Submitted for re-review.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_handle_verified_profile_critical_changes ON public.profiles;
CREATE TRIGGER trg_handle_verified_profile_critical_changes
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_verified_profile_critical_changes();

-- 6. Private Storage Bucket for Verification Documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('verification-documents', 'verification-documents', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Storage bucket RLS policies for verification-documents
DROP POLICY IF EXISTS "Providers upload own verification documents" ON storage.objects;
CREATE POLICY "Providers upload own verification documents" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'verification-documents' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Providers view own verification documents" ON storage.objects;
CREATE POLICY "Providers view own verification documents" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'verification-documents' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Providers update own verification documents" ON storage.objects;
CREATE POLICY "Providers update own verification documents" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'verification-documents' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Providers delete own verification documents" ON storage.objects;
CREATE POLICY "Providers delete own verification documents" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'verification-documents' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );
