-- Enable pg_net extension for HTTP calls
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create a safer wrapper for http_post that handles errors gracefully
-- This allows booking inserts to succeed even if webhooks fail
CREATE OR REPLACE FUNCTION public.safe_http_post(
  url text,
  headers jsonb DEFAULT '{}',
  body text DEFAULT ''
)
RETURNS boolean AS $$
DECLARE
  result record;
BEGIN
  BEGIN
    -- Attempt to make the HTTP POST call
    result := extensions.http_post(
      url => url,
      headers => headers,
      body => body
    );
    RETURN true;
  EXCEPTION WHEN undefined_function THEN
    -- pg_net not enabled, silently continue
    RAISE WARNING 'pg_net extension not available for webhook: %', url;
    RETURN false;
  EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail the transaction
    RAISE WARNING 'Webhook failed (booking will still be created): %', SQLERRM;
    RETURN false;
  END;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.safe_http_post(text, jsonb, text) TO authenticated, anon, service_role;
