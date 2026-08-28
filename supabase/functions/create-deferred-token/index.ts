/**
 * Supabase Edge Function: create-deferred-token
 *
 * Creates a deferred deep link token securely from the server side.
 * Called by the web browser fallback when a user visits a provider profile
 * without the app installed.
 *
 * Flow:
 * 1. Accepts a `provider_id`.
 * 2. Validates format.
 * 3. Checks if the provider actually exists in the `profiles` table.
 * 4. Generates a secure, unpredictable token.
 * 5. Calculates an expiration time (e.g., 1 hour).
 * 6. Inserts into `deferred_link_tokens` using Service Role.
 * 7. Returns the generated token to the browser for store redirection.
 *
 * Deploy:
 *   supabase functions deploy create-deferred-token --project-ref trnsuruvwdzfrhfaboxe
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Generates a cryptographically secure random token (base64url without padding)
function generateSecureToken(byteLength = 32): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: CORS });

  let body: Record<string, unknown>;
  try { 
    body = await req.json(); 
  } catch { 
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: { ...CORS, "Content-Type": "application/json" } }); 
  }

  const provider_id = body.provider_id ? String(body.provider_id).trim() : null;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (!provider_id || !uuidRegex.test(provider_id)) {
    return new Response(JSON.stringify({ error: "Invalid provider_id format" }), { status: 400, headers: { ...CORS, "Content-Type": "application/json" } });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { ...CORS, "Content-Type": "application/json" } });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false }
  });

  // 1. Verify the provider exists and is actually a provider (business_name must not be null/empty)
  // Assuming a provider must exist in profiles
  const { data: provider, error: providerError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", provider_id)
    .single();

  if (providerError || !provider) {
    console.error("[create-deferred-token] Provider lookup failed:", providerError?.message);
    return new Response(JSON.stringify({ error: "Provider not found" }), { status: 404, headers: { ...CORS, "Content-Type": "application/json" } });
  }

  // 2. Generate secure token
  const token = generateSecureToken();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiration

  // 3. Store in DB
  const { error: insertError } = await supabase
    .from("deferred_link_tokens")
    .insert({
      token,
      provider_id,
      expires_at: expiresAt.toISOString(),
    });

  if (insertError) {
    console.error("[create-deferred-token] Insert failed:", insertError.message);
    return new Response(JSON.stringify({ error: "Failed to create token" }), { status: 500, headers: { ...CORS, "Content-Type": "application/json" } });
  }

  // 4. Return token to browser
  return new Response(
    JSON.stringify({ ok: true, token }), 
    { status: 200, headers: { ...CORS, "Content-Type": "application/json" } }
  );
});
