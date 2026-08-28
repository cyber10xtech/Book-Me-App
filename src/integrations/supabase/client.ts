/**
 * Re-exports the single shared Supabase client from lib/supabase.ts
 *
 * Previously this file created a SECOND independent createClient() instance.
 * Having two instances means each maintains its own auth token state — when
 * one refreshes the access token, the other keeps the old expired token.
 * That caused "session forgotten" errors mid-session.
 *
 * All imports across the app (whether from @/lib/supabase or
 * @/integrations/supabase/client) now share the exact same client object.
 */
export { supabase } from '@/lib/supabase';
export type { Database } from './types';
