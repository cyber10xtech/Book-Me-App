-- ============================================================================
-- Chat: create the missing `chat-media` storage bucket
--
-- Problem being fixed:
--   ChatWindow.tsx uploads voice notes and images to
--   supabase.storage.from("chat-media") (see uploadToStorage() — path
--   pattern "conversations/{conversation_id}/{timestamp}.{ext}"), but no
--   migration ever created this bucket or any policy for it — unlike
--   `avatars` and `business-assets` (see 20260414031944_...sql). Without the
--   bucket existing, every upload() call fails outright, the chat_messages
--   insert for that voice/image message never happens, and nothing is ever
--   shown in the thread. This is the direct cause of "voice notes record
--   but no voice [message] appears" — the recording itself works fine, but
--   the upload it depends on has nowhere to land.
--
-- Scope: ONLY the chat-media bucket + its own policies. No other bucket or
-- table touched. Safe to run multiple times.
-- ============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-media', 'chat-media', true)
ON CONFLICT (id) DO NOTHING;

-- Read: media URLs are embedded directly as public URLs in chat_messages
-- (media_url), consistent with the avatars/business-assets buckets.
DROP POLICY IF EXISTS "Chat media is publicly accessible" ON storage.objects;
CREATE POLICY "Chat media is publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'chat-media');

-- Write: only participants of the conversation named in the path
-- ("conversations/{conversation_id}/...") may upload into that folder.
DROP POLICY IF EXISTS "Participants upload chat media" ON storage.objects;
CREATE POLICY "Participants upload chat media"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'chat-media'
    AND (storage.foldername(name))[1] = 'conversations'
    AND EXISTS (
      SELECT 1 FROM public.chat_conversations cc
      WHERE cc.id::text = (storage.foldername(name))[2]
        AND (auth.uid() = cc.customer_user_id OR auth.uid() = cc.provider_user_id)
    )
  );

DROP POLICY IF EXISTS "Participants manage own chat media" ON storage.objects;
CREATE POLICY "Participants manage own chat media"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'chat-media'
    AND (storage.foldername(name))[1] = 'conversations'
    AND EXISTS (
      SELECT 1 FROM public.chat_conversations cc
      WHERE cc.id::text = (storage.foldername(name))[2]
        AND (auth.uid() = cc.customer_user_id OR auth.uid() = cc.provider_user_id)
    )
  );
