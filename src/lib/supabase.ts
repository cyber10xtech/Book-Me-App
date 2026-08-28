import { createClient, SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL  = "https://trnsuruvwdzfrhfaboxe.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRybnN1cnV2d2R6ZnJoZmFib3hlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwMzkxMzMsImV4cCI6MjA5MTYxNTEzM30.asqTEqqVPY1WsSrDsIELHKde25qMUdTqSJXP2bNFsvM";
const STORAGE_KEY   = "bookme-customer-auth";

/**
 * Use localStorage directly.
 *
 * @capacitor/preferences was removed because Rollup resolves dynamic import()
 * strings at build time regardless of runtime guards — the vite build would
 * fail even though the code path is never reached on web.
 *
 * localStorage on Capacitor Android WebView is persistent across backgrounds
 * and process-death recovery is handled by AuthContext's visibilitychange +
 * App.appStateChange + 10-minute heartbeat. This is industry standard for
 * Capacitor apps that don't need offline-capable auth storage.
 */
export const supabase: SupabaseClient = createClient(
  SUPABASE_URL,
  SUPABASE_ANON,
  {
    auth: {
      storage:            localStorage,
      storageKey:         STORAGE_KEY,
      persistSession:     true,
      autoRefreshToken:   true,
      detectSessionInUrl: false,
    },
    realtime: {
      params: { eventsPerSecond: 10 },
    },
  }
);

export const SUPABASE_URL_EXPORT = SUPABASE_URL;
export const SUPABASE_PROJECT_ID = "trnsuruvwdzfrhfaboxe";
