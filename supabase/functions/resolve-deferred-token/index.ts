/**
 * Supabase Edge Function: resolve-deferred-token
 *
 * Resolves a deferred deep link token (used for passing provider links through
 * the App Store / Play Store installation gap).
 * 
 * Flow:
 * 1. Accepts a `token`.
 * 2. Validates format.
 * 3. Fetches the token from the database using Service Role (bypassing RLS).
 * 4. Checks expiry.
 * 5. Atomically deletes the token so it cannot be replayed.
 * 6. Returns the associated `provider_id`.
 *
 * Deploy:
 *   supabase functions deploy resolve-deferred-token --project-ref trnsuruvwdzfrhfaboxe
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: CORS });

  let body: Record<string, unknown>;
  try { 
    body = await req.json(); 
  } catch { 
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: { ...CORS, "Content-Type": "application/json" } }); 
  }

  const token = body.token ? String(body.token).trim() : null;
  if (!token) {
    return new Response(JSON.stringify({ error: "Token is required" }), { status: 400, headers: { ...CORS, "Content-Type": "application/json" } });
  }

  // Tokens should be secure alphanumeric strings. E.g., 8-32 chars long.
  const tokenRegex = /^[A-Za-z0-9_-]{8,64}$/;
  if (!tokenRegex.test(token)) {
    // Return generic error so we don't confirm what a valid token looks like to an attacker
    return new Response(JSON.stringify({ error: "Invalid token" }), { status: 400, headers: { ...CORS, "Content-Type": "application/json" } });
  }

  // Use Service Role key to bypass RLS, ensuring ordinary clients can't arbitrarily access the tokens table
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase environment variables");
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { ...CORS, "Content-Type": "application/json" } });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false }
  });

  // Execute atomic delete and return the deleted row to prevent replay
  const { data, error } = await supabase
    .from("deferred_link_tokens")
    .delete()
    .eq("token", token)
    .select("provider_id, expires_at")
    .maybeSingle();

  if (error) {
    console.error("[resolve-deferred-token] DB Error:", error.message);
    return new Response(JSON.stringify({ error: "Database error" }), { status: 500, headers: { ...CORS, "Content-Type": "application/json" } });
  }

  // Not found (or already consumed)
  if (!data) {
    return new Response(JSON.stringify({ error: "Invalid or expired token" }), { status: 404, headers: { ...CORS, "Content-Type": "application/json" } });
  }

  // Check expiry
  const now = new Date();
  const expiresAt = new Date(data.expires_at);

  if (now > expiresAt) {
    return new Response(JSON.stringify({ error: "Token expired" }), { status: 400, headers: { ...CORS, "Content-Type": "application/json" } });
  }

  // Success
  return new Response(
    JSON.stringify({ 
      ok: true, 
      provider_id: data.provider_id 
    }), 
    { 
      status: 200, 
      headers: { ...CORS, "Content-Type": "application/json" } 
    }
  );
});
