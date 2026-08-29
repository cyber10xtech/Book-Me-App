-- Table Definition
CREATE TABLE IF NOT EXISTS public.app_update_config (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    app text NOT NULL CHECK (app IN ('customer', 'business')),
    platform text NOT NULL CHECK (platform IN ('ios', 'android')),
    latest_version text NOT NULL,
    minimum_supported_version text NOT NULL,
    store_url text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (app, platform)
);

-- Row Level Security
ALTER TABLE public.app_update_config ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any to ensure idempotency
DROP POLICY IF EXISTS "Allow public read access to app update config" ON public.app_update_config;

-- Client SELECT only policy
CREATE POLICY "Allow public read access to app update config"
    ON public.app_update_config
    FOR SELECT
    USING (true);

-- Updated_at Trigger
CREATE OR REPLACE FUNCTION update_app_update_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_app_update_config_updated_at ON public.app_update_config;

CREATE TRIGGER update_app_update_config_updated_at
    BEFORE UPDATE ON public.app_update_config
    FOR EACH ROW
    EXECUTE FUNCTION update_app_update_config_updated_at();

-- Seed Data (Idempotent using UPSERT)
INSERT INTO public.app_update_config (app, platform, latest_version, minimum_supported_version, store_url)
VALUES 
    ('customer', 'ios', '1.0', '1.0', 'https://apps.apple.com/us/app/bookme-book-a-service/id6782405521'),
    ('customer', 'android', '11.9.3', '11.9.3', 'https://play.google.com/store/apps/details?id=com.bookmebusiness.customerapp1'),
    ('business', 'ios', '1.3', '1.3', 'https://apps.apple.com/us/app/bookme-business/id6762440255'),
    ('business', 'android', '11.8.1', '11.8.1', 'https://play.google.com/store/apps/details?hl=en&id=com.bookmebusiness.bookmeapp')
ON CONFLICT (app, platform) 
DO UPDATE SET 
    latest_version = EXCLUDED.latest_version,
    minimum_supported_version = EXCLUDED.minimum_supported_version,
    store_url = EXCLUDED.store_url;
