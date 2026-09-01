/**
 * send-notification — Supabase Edge Function
 *
 * Sends FCM push notifications to ALL registered tokens for a user.
 * Automatically uses both the primary token (fcm_tokens table) and the
 * backup token (profiles.fcm_token), deduplicates, fans out to all,
 * and cleans up any stale/unregistered tokens it finds.
 *
 * Deploy:
 *   supabase functions deploy send-notification
 *
 * Required secrets (set in Supabase Dashboard → Edge Functions → Secrets):
 *   FIREBASE_PROJECT_ID       — your Firebase project ID
 *   FIREBASE_SERVICE_ACCOUNT  — full JSON of the service account key file
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ── Google OAuth2 access token via service account JWT ───────────────────────

async function getAccessToken(serviceAccount: {
  client_email: string;
  private_key: string;
}): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  const jwtPayload = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const b64url = (obj: unknown) =>
    btoa(JSON.stringify(obj))
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");

  const header  = b64url({ alg: "RS256", typ: "JWT" });
  const payload = b64url(jwtPayload);
  const toSign  = `${header}.${payload}`;

  const rawKey = serviceAccount.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\n/g, "");

  const binaryKey = Uint8Array.from(atob(rawKey), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const sigBytes = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(toSign)
  );

  const sig = btoa(String.fromCharCode(...new Uint8Array(sigBytes)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  const jwt = `${toSign}.${sig}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const data = await res.json();
  if (!data.access_token) {
    throw new Error(`Google OAuth failed: ${JSON.stringify(data)}`);
  }
  return data.access_token;
}

// ── Send a single FCM message ─────────────────────────────────────────────────

interface FcmResult {
  token:   string;
  success: boolean;
  error?:  string;
  stale?:  boolean;
}

async function sendFcmMessage(
  projectId:   string,
  accessToken: string,
  fcmToken:    string,
  title:       string,
  body:        string,
  data:        Record<string, string>
): Promise<FcmResult> {
  const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: {
        token: fcmToken,
        notification: { title, body },
        android: {
          priority: "high",
          notification: {
            sound:      "default",
            channel_id: "bookme_default",
          },
        },
        apns: {
          headers: {
            "apns-push-type": "alert",
            "apns-priority": "10",
          },
          payload: {
            aps: {
              alert: { title, body },
              sound: "default",
              badge: 1,
            },
          },
        },
        data, // all values must be strings — enforced by caller
      },
    }),
  });

  if (res.ok) {
    return { token: fcmToken, success: true };
  }

  const err     = await res.json().catch(() => ({ error: { message: res.statusText } }));
  const errMsg  = err?.error?.message ?? res.statusText ?? "unknown";
  const isStale =
    errMsg.includes("UNREGISTERED") ||
    errMsg.includes("INVALID_ARGUMENT") ||
    res.status === 404;

  return { token: fcmToken, success: false, error: errMsg, stale: isStale };
}

// ── Main handler ──────────────────────────────────────────────────────────────

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const payload = await req.json();
    const {
      user_id,                    // profiles.id of the recipient
      title,
      message      = "",
      type         = "system",
      related_booking_id,
      data: extraData = {},
    } = payload;

    if (!user_id || !title) {
      return new Response(
        JSON.stringify({ error: "user_id and title are required" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    // ── Supabase service client ─────────────────────────────────────────────
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const db          = createClient(supabaseUrl, serviceKey);

    // ── Resolve auth user_id from profiles.id ───────────────────────────────
    const { data: profile, error: profileErr } = await db
      .from("profiles")
      .select("user_id, fcm_token")
      .eq("id", user_id)
      .single();

    if (profileErr || !profile) {
      console.warn(`[send-notification] profile not found for id=${user_id}`);
      return new Response(
        JSON.stringify({ error: "profile not found", user_id }),
        { status: 404, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const authUserId = profile.user_id;

    // ── Collect ALL FCM tokens for this user ────────────────────────────────
    // Primary: fcm_tokens table (supports multiple devices)
    const { data: tokenRows } = await db
      .from("fcm_tokens")
      .select("token, platform")
      .eq("user_id", authUserId);

    const tokenSet = new Set<string>(tokenRows?.map((r) => r.token) ?? []);

    // Backup: profiles.fcm_token (kept for backward compat)
    if (profile.fcm_token) tokenSet.add(profile.fcm_token);

    if (tokenSet.size === 0) {
      console.log(`[send-notification] no tokens for user=${user_id} — skipping push`);
      return new Response(
        JSON.stringify({ sent: 0, message: "no FCM tokens registered for this user" }),
        { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    // ── Firebase access token ───────────────────────────────────────────────
    const projectId         = Deno.env.get("FIREBASE_PROJECT_ID")!;
    const serviceAccountRaw = Deno.env.get("FIREBASE_SERVICE_ACCOUNT")!;
    const serviceAccount    = JSON.parse(serviceAccountRaw);
    const accessToken       = await getAccessToken(serviceAccount);

    // ── Build FCM data payload (all values must be strings) ─────────────────
    const fcmData: Record<string, string> = {
      type,
      click_action: related_booking_id
        ? `/calendar?booking=${related_booking_id}`
        : "/notifications",
      ...(related_booking_id ? { related_booking_id: String(related_booking_id) } : {}),
      ...Object.fromEntries(
        Object.entries(extraData).map(([k, v]) => [k, String(v)])
      ),
    };

    // ── Fan out to ALL tokens in parallel ───────────────────────────────────
    const results = await Promise.all(
      Array.from(tokenSet).map((token) =>
        sendFcmMessage(projectId, accessToken, token, title, message, fcmData)
      )
    );

    const succeeded   = results.filter((r) => r.success);
    const failed      = results.filter((r) => !r.success);
    const staleTokens = failed.filter((r) => r.stale).map((r) => r.token);

    // ── Auto-clean stale/unregistered tokens ────────────────────────────────
    if (staleTokens.length > 0) {
      await db.from("fcm_tokens").delete().in("token", staleTokens);

      // Also clear from profiles if the backup token is stale
      if (profile.fcm_token && staleTokens.includes(profile.fcm_token)) {
        await db.from("profiles").update({ fcm_token: null }).eq("id", user_id);
      }

      console.log(`[send-notification] removed ${staleTokens.length} stale token(s)`);
    }

    console.log(
      `[send-notification] user=${user_id} tokens=${tokenSet.size} ` +
      `sent=${succeeded.length} failed=${failed.length} stale_cleaned=${staleTokens.length}`
    );

    return new Response(
      JSON.stringify({
        sent:          succeeded.length,
        failed:        failed.length,
        stale_cleaned: staleTokens.length,
        results,
      }),
      { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("[send-notification] fatal error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
});
