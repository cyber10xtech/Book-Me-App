
-- Add fcm_token to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS fcm_token text;

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('business-assets', 'business-assets', true) ON CONFLICT (id) DO NOTHING;

-- Storage policies for avatars
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Users can upload their own avatar" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update their own avatar" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete their own avatar" ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for business-assets
CREATE POLICY "Business assets are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'business-assets');
CREATE POLICY "Users can upload their own business assets" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'business-assets' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update their own business assets" ON storage.objects FOR UPDATE USING (bucket_id = 'business-assets' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete their own business assets" ON storage.objects FOR DELETE USING (bucket_id = 'business-assets' AND auth.uid()::text = (storage.foldername(name))[1]);
