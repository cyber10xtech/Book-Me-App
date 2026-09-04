/**
 * send-notification — Supabase Edge Function
 *
 * Sends FCM push notifications to ALL registered tokens for a user.
 * Automatically uses both the primary token (fcm_tokens table) and the
 * backup token (profiles.fcm_token), deduplicates, maps notification types
 * to dedicated Android notification channels, fans out to all tokens, and
 * cleans up stale/unregistered tokens.
 *
 * Deploy:
 *   supabase functions deploy send-notification --project-ref trnsuruvwdzfrhfaboxe
 *
 * Required secrets:
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

// ── Android Notification Channel Mapping ──────────────────────────────────────

function getChannelIdForType(type: string): string {
  switch (type) {
    case "new_message":
      return "bookme_chat";
    case "new_booking":
    case "booking_created":
      return "bookme_bookings";
    case "booking_confirmed":
    case "booking_completed":
    case "booking_status_changed":
    case "booking_updated":
      return "bookme_booking_updates";
    case "booking_cancelled":
      return "bookme_cancellations";
    case "booking_rescheduled":
      return "bookme_reschedules";
    case "booking_reminder":
    case "reminder":
      return "bookme_reminders";
    case "promotion":
    case "offer":
      return "bookme_promotions";
    case "system":
    case "account":
      return "bookme_system";
    default:
      return "bookme_default";
  }
}

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
  channelId:   string,
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
            sound: "default",
            channel_id: channelId,
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
        data,
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
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const payload = await req.json();
    const {
      user_id,                    // profiles.id OR auth.users.id
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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const db          = createClient(supabaseUrl, serviceKey);

    // ── Flexible Recipient Resolution (profiles.id OR auth.users.id) ─────────
    let profile: { id: string; user_id: string; fcm_token: string | null } | null = null;
    let authUserId = user_id;

    // 1) Try matching profiles.id first
    const { data: pById } = await db
      .from("profiles")
      .select("id, user_id, fcm_token")
      .eq("id", user_id)
      .maybeSingle();

    if (pById) {
      profile = pById;
      authUserId = pById.user_id;
    } else {
      // 2) Try matching profiles.user_id next
      const { data: pByUser } = await db
        .from("profiles")
        .select("id, user_id, fcm_token")
        .eq("user_id", user_id)
        .maybeSingle();

      if (pByUser) {
        profile = pByUser;
        authUserId = pByUser.user_id;
      }
    }

    // ── Collect ALL FCM tokens for this user ────────────────────────────────
    const tokenSet = new Set<string>();

    // Primary: fcm_tokens table
    const { data: tokenRows } = await db
      .from("fcm_tokens")
      .select("token")
      .or(`user_id.eq.${authUserId},user_id.eq.${user_id}`);

    if (tokenRows) {
      tokenRows.forEach((r) => { if (r.token) tokenSet.add(r.token); });
    }

    // Backup: profiles.fcm_token
    if (profile?.fcm_token) {
      tokenSet.add(profile.fcm_token);
    }

    if (tokenSet.size === 0) {
      console.log(`[send-notification] no tokens found for user_id=${user_id} (authUserId=${authUserId}) — skipping push`);
      return new Response(
        JSON.stringify({ sent: 0, message: "no FCM tokens registered for this user" }),
        { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    // ── Firebase access token & channel resolution ─────────────────────────
    const projectId         = Deno.env.get("FIREBASE_PROJECT_ID")!;
    const serviceAccountRaw = Deno.env.get("FIREBASE_SERVICE_ACCOUNT")!;
    const serviceAccount    = JSON.parse(serviceAccountRaw);
    const accessToken       = await getAccessToken(serviceAccount);
    const channelId         = getChannelIdForType(type);

    // ── Build FCM data payload (all values must be strings) ─────────────────
    const fcmData: Record<string, string> = {
      type,
      channel_id: channelId,
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
        sendFcmMessage(projectId, accessToken, token, title, message, channelId, fcmData)
      )
    );

    const succeeded   = results.filter((r) => r.success);
    const failed      = results.filter((r) => !r.success);
    const staleTokens = failed.filter((r) => r.stale).map((r) => r.token);

    // ── Auto-clean stale/unregistered tokens ────────────────────────────────
    if (staleTokens.length > 0) {
      await db.from("fcm_tokens").delete().in("token", staleTokens);

      if (profile?.id && profile.fcm_token && staleTokens.includes(profile.fcm_token)) {
        await db.from("profiles").update({ fcm_token: null }).eq("id", profile.id);
      }

      console.log(`[send-notification] removed ${staleTokens.length} stale token(s)`);
    }

    console.log(
      `[send-notification] user=${user_id} tokens=${tokenSet.size} channel=${channelId} ` +
      `sent=${succeeded.length} failed=${failed.length} stale_cleaned=${staleTokens.length}`
    );

    return new Response(
      JSON.stringify({
        sent:          succeeded.length,
        failed:        failed.length,
        stale_cleaned: staleTokens.length,
        channel_id:    channelId,
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
