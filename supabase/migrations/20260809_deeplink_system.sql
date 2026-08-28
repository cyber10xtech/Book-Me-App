-- ─── 1. Provider slug column ──────────────────────────────────────────────────

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS slug TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_slug_unique
  ON profiles (slug) WHERE slug IS NOT NULL;

CREATE INDEX IF NOT EXISTS profiles_slug_provider_idx
  ON profiles (slug) WHERE slug IS NOT NULL AND role = 'provider';

-- Backfill slugs for existing providers
DO $$
DECLARE
  r RECORD;
  base_slug TEXT;
  final_slug TEXT;
BEGIN
  FOR r IN
    SELECT id, business_name, full_name FROM profiles
    WHERE role = 'provider' AND slug IS NULL ORDER BY created_at
  LOOP
    base_slug := lower(regexp_replace(regexp_replace(
      COALESCE(r.business_name, r.full_name, ''),
      '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g'));
    base_slug := trim(both '-' from base_slug);
    base_slug := left(base_slug, 60);
    IF base_slug = '' THEN CONTINUE; END IF;
    final_slug := base_slug;
    WHILE EXISTS (SELECT 1 FROM profiles WHERE slug = final_slug AND id <> r.id) LOOP
      final_slug := base_slug || '-' || left(r.id::text, 6);
    END LOOP;
    UPDATE profiles SET slug = final_slug WHERE id = r.id;
  END LOOP;
END $$;

-- ─── 2. Deep link analytics table ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS deep_link_events (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  event         TEXT        NOT NULL,
  link_kind     TEXT,
  provider_id   UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  user_id       UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  ref           TEXT,
  utm_campaign  TEXT,
  platform      TEXT,
  raw_url       TEXT,
  client_ts     TIMESTAMPTZ,
  meta          JSONB
);

ALTER TABLE deep_link_events
  ADD CONSTRAINT IF NOT EXISTS deep_link_events_event_check
  CHECK (event IN ('share_generated','link_opened','store_redirect','app_opened','deferred_restored','deferred_cleared'));

ALTER TABLE deep_link_events
  ADD CONSTRAINT IF NOT EXISTS deep_link_events_kind_check
  CHECK (link_kind IN ('provider','service','promotion','coupon','event','referral') OR link_kind IS NULL);

CREATE INDEX IF NOT EXISTS deep_link_events_event_created
  ON deep_link_events (event, created_at DESC);

CREATE INDEX IF NOT EXISTS deep_link_events_provider_id
  ON deep_link_events (provider_id, created_at DESC) WHERE provider_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS deep_link_events_user_id
  ON deep_link_events (user_id, created_at DESC) WHERE user_id IS NOT NULL;

ALTER TABLE deep_link_events ENABLE ROW LEVEL SECURITY;
-- No client SELECT/INSERT policies — all writes go through the Edge Function (service role).

-- ─── 3. Funnel analytics view ─────────────────────────────────────────────────

CREATE OR REPLACE VIEW deep_link_funnel AS
SELECT
  link_kind, event, platform,
  COUNT(*)                    AS total,
  COUNT(DISTINCT provider_id) AS unique_providers,
  COUNT(DISTINCT user_id)     AS unique_users,
  date_trunc('day', created_at) AS day
FROM deep_link_events
GROUP BY link_kind, event, platform, day
ORDER BY day DESC, event;
