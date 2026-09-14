-- Migration: 20260908000000_copilot_schema.sql
-- Add copilot_role column to profiles if not exists
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS copilot_role text DEFAULT 'field_agent';

-- Create copilot_business_leads table
CREATE TABLE IF NOT EXISTS public.copilot_business_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id text UNIQUE NOT NULL,
  submitting_agent_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  business_name text NOT NULL,
  category_id text,
  contact_person text,
  contact_role text,
  phone text,
  email text,
  address text,
  state text,
  lga text,
  town text,
  landmark text,
  operating_model text,
  services_offered text,
  already_uses_bookme boolean DEFAULT false,
  app_installed_status text DEFAULT 'not_installed',
  onboarding_status text DEFAULT 'lead',
  interest_level text DEFAULT 'medium',
  feedback text,
  next_action text,
  follow_up_date timestamptz,
  contact_permission boolean DEFAULT true,
  photo_url text,
  linked_business_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  review_status text DEFAULT 'pending_review',
  review_notes text,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create copilot_customer_leads table
CREATE TABLE IF NOT EXISTS public.copilot_customer_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id text UNIQUE NOT NULL,
  submitting_agent_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  preferred_name text,
  phone text,
  email text,
  location text,
  services_of_interest text,
  already_uses_bookme boolean DEFAULT false,
  app_installed_status text DEFAULT 'not_installed',
  registration_status text DEFAULT 'unregistered',
  booking_experience_barriers text,
  feedback text,
  assistance_required text,
  next_action text,
  follow_up_date timestamptz,
  contact_permission boolean DEFAULT true,
  is_anonymous boolean DEFAULT false,
  linked_customer_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  review_status text DEFAULT 'pending_review',
  review_notes text,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create copilot_visits table
CREATE TABLE IF NOT EXISTS public.copilot_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submitting_agent_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  target_type text NOT NULL CHECK (target_type IN ('business', 'customer')),
  target_business_lead_id uuid REFERENCES public.copilot_business_leads(id) ON DELETE CASCADE,
  target_customer_lead_id uuid REFERENCES public.copilot_customer_leads(id) ON DELETE CASCADE,
  visit_date timestamptz DEFAULT now(),
  outcome text DEFAULT 'successful',
  notes text,
  follow_up_date timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create copilot_issues table
CREATE TABLE IF NOT EXISTS public.copilot_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submitting_agent_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  affected_app text NOT NULL CHECK (affected_app IN ('business', 'customer')),
  target_business_lead_id uuid REFERENCES public.copilot_business_leads(id) ON DELETE SET NULL,
  target_customer_lead_id uuid REFERENCES public.copilot_customer_leads(id) ON DELETE SET NULL,
  category text,
  description text NOT NULL,
  severity text DEFAULT 'medium',
  device_platform text,
  app_version text,
  steps_to_reproduce text,
  status text DEFAULT 'open',
  tracking_reference text,
  created_at timestamptz DEFAULT now()
);

-- Create copilot_audit_events table
CREATE TABLE IF NOT EXISTS public.copilot_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

-- RLS Enablement
ALTER TABLE public.copilot_business_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.copilot_customer_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.copilot_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.copilot_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.copilot_audit_events ENABLE ROW LEVEL SECURITY;

-- Allow authenticated staff members full access to CoPilot tables
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated staff full access business_leads') THEN
    CREATE POLICY "Authenticated staff full access business_leads" ON public.copilot_business_leads FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated staff full access customer_leads') THEN
    CREATE POLICY "Authenticated staff full access customer_leads" ON public.copilot_customer_leads FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated staff full access visits') THEN
    CREATE POLICY "Authenticated staff full access visits" ON public.copilot_visits FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated staff full access issues') THEN
    CREATE POLICY "Authenticated staff full access issues" ON public.copilot_issues FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated staff full access audit_events') THEN
    CREATE POLICY "Authenticated staff full access audit_events" ON public.copilot_audit_events FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;
