-- Migration: 20260908000001_copilot_followups_and_security.sql
-- Create copilot_follow_ups table for functional task & follow-up tracking
CREATE TABLE IF NOT EXISTS public.copilot_follow_ups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submitting_agent_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_agent_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  target_type text NOT NULL CHECK (target_type IN ('business', 'customer')),
  target_business_lead_id uuid REFERENCES public.copilot_business_leads(id) ON DELETE CASCADE,
  target_customer_lead_id uuid REFERENCES public.copilot_customer_leads(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  due_date timestamptz NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  completion_notes text,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on copilot_follow_ups
ALTER TABLE public.copilot_follow_ups ENABLE ROW LEVEL SECURITY;

-- Allow authenticated staff members full access to copilot_follow_ups
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated staff full access follow_ups') THEN
    CREATE POLICY "Authenticated staff full access follow_ups" ON public.copilot_follow_ups FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Indexes for performance & quick queries
CREATE INDEX IF NOT EXISTS idx_copilot_biz_agent ON public.copilot_business_leads(submitting_agent_id);
CREATE INDEX IF NOT EXISTS idx_copilot_cust_agent ON public.copilot_customer_leads(submitting_agent_id);
CREATE INDEX IF NOT EXISTS idx_copilot_biz_review ON public.copilot_business_leads(review_status);
CREATE INDEX IF NOT EXISTS idx_copilot_cust_review ON public.copilot_customer_leads(review_status);
CREATE INDEX IF NOT EXISTS idx_copilot_followups_due ON public.copilot_follow_ups(due_date);
CREATE INDEX IF NOT EXISTS idx_copilot_followups_status ON public.copilot_follow_ups(status);