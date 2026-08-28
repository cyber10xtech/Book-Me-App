/**
 * Supabase Edge Function: track-deep-link-event
 *
 * Receives deep link funnel analytics events from both the web fallback page
 * and the native app. Inserts into `deep_link_events` using the service role
 * key (bypasses RLS) so unauthenticated web events are recorded correctly.
 *
 * Deploy:
 *   supabase functions deploy track-deep-link-event --project-ref trnsuruvwdzfrhfaboxe
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const VALID_EVENTS = new Set([
  "share_generated", "link_opened", "store_redirect",
  "app_opened", "deferred_restored", "deferred_cleared",
]);
const VALID_KINDS = new Set(["provider","service","promotion","coupon","event","referral"]);
const VALID_PLATFORMS = new Set(["ios","android","web"]);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: CORS });

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: { ...CORS, "Content-Type": "application/json" } }); }

  const event = String(body.event ?? "");
  if (!VALID_EVENTS.has(event))
    return new Response(JSON.stringify({ error: `Unknown event: ${event}` }), { status: 400, headers: { ...CORS, "Content-Type": "application/json" } });

  const link_kind = body.link_kind ? String(body.link_kind) : null;
  if (link_kind && !VALID_KINDS.has(link_kind))
    return new Response(JSON.stringify({ error: `Unknown link_kind: ${link_kind}` }), { status: 400, headers: { ...CORS, "Content-Type": "application/json" } });

  const platform = body.platform && VALID_PLATFORMS.has(String(body.platform)) ? String(body.platform) : null;
  const provider_id_raw = String(body.provider_id ?? "");
  const user_id_raw = String(body.user_id ?? "");
  const provider_id = UUID_RE.test(provider_id_raw) ? provider_id_raw : null;
  const user_id = UUID_RE.test(user_id_raw) ? user_id_raw : null;

  let client_ts: string | null = null;
  try { if (body.client_ts) { const d = new Date(String(body.client_ts)); if (!isNaN(d.getTime())) client_ts = d.toISOString(); } } catch {}

  const meta = body.meta && typeof body.meta === "object" && !Array.isArray(body.meta) ? body.meta as Record<string, unknown> : null;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  const { error } = await supabase.from("deep_link_events").insert({
    event, link_kind, provider_id, user_id, platform, meta, client_ts,
    ref: body.ref ? String(body.ref).slice(0, 100) : null,
    utm_campaign: body.utm_campaign ? String(body.utm_campaign).slice(0, 100) : null,
    raw_url: body.raw_url ? String(body.raw_url).slice(0, 2000) : null,
  });

  if (error) {
    console.error("[track-deep-link-event]", error.message);
    return new Response(JSON.stringify({ error: "Database error" }), { status: 500, headers: { ...CORS, "Content-Type": "application/json" } });
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...CORS, "Content-Type": "application/json" } });
});
