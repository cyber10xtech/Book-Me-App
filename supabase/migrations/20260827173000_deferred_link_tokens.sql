CREATE TABLE public.deferred_link_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token VARCHAR NOT NULL UNIQUE,
    provider_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

-- Enable RLS to protect from ordinary clients
ALTER TABLE public.deferred_link_tokens ENABLE ROW LEVEL SECURITY;

-- No RLS policies provided intentionally.
-- This ensures that ONLY the Service Role (which bypasses RLS) can read, insert, update, or delete tokens.
-- Clients cannot enumerate or extract tokens arbitrarily.
