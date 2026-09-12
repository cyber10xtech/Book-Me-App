-- Add pricing_type to services table
ALTER TABLE public.services ADD COLUMN pricing_type text DEFAULT 'fixed';
