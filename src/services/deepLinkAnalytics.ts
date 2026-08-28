/**
 * deepLinkAnalytics.ts — Deep Link Funnel Analytics
 *
 * Fire-and-forget event tracking for the full share → install → open funnel.
 * Uses sendBeacon (survives page unload) with fetch keepalive as fallback.
 * Failures are silently swallowed — analytics must never break UX.
 *
 * Events:
 *  share_generated   — share button tapped, URL built
 *  link_opened       — recipient opened URL in browser
 *  store_redirect    — browser redirected to App Store / Play Store
 *  app_opened        — Universal Link opened the installed app
 *  deferred_restored — post-install sign-in navigated via pending link
 *  deferred_cleared  — pending link discarded (expired / provider gone / error)
 */

export type DeepLinkEventName =
  | "share_generated"
  | "link_opened"
  | "store_redirect"
  | "app_opened"
  | "deferred_restored"
  | "deferred_cleared";

export interface DeepLinkEventPayload {
  event: DeepLinkEventName;
  link_kind?: string;
  provider_id?: string;
  user_id?: string;
  ref?: string;
  utm_campaign?: string;
  platform?: string;
  raw_url?: string;
  meta?: Record<string, unknown>;
}

const EDGE_FN_URL =
  "https://trnsuruvwdzfrhfaboxe.supabase.co/functions/v1/track-deep-link-event";

const detectPlatform = (): "ios" | "android" | "web" => {
  if (/iPad|iPhone|iPod/.test(navigator.userAgent)) return "ios";
  if (/Android/.test(navigator.userAgent)) return "android";
  return "web";
};

export const trackDeepLinkEvent = (payload: DeepLinkEventPayload): void => {
  const body = JSON.stringify({
    ...payload,
    platform: payload.platform ?? detectPlatform(),
    client_ts: new Date().toISOString(),
  });

  if (typeof navigator.sendBeacon === "function") {
    try {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon(EDGE_FN_URL, blob);
      return;
    } catch { /* fall through */ }
  }

  fetch(EDGE_FN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => { /* analytics must never break UX */ });
};

export const trackShareGenerated = (
  providerId: string, ref?: string, utmCampaign?: string, userId?: string
) => trackDeepLinkEvent({
  event: "share_generated", link_kind: "provider",
  provider_id: providerId, user_id: userId, ref, utm_campaign: utmCampaign,
});

export const trackLinkOpened = (rawUrl: string, providerId?: string, ref?: string) =>
  trackDeepLinkEvent({ event: "link_opened", link_kind: "provider",
    provider_id: providerId, ref, raw_url: rawUrl });

export const trackStoreRedirect = (platform: "ios" | "android", providerId?: string) =>
  trackDeepLinkEvent({ event: "store_redirect", link_kind: "provider",
    provider_id: providerId, platform });

export const trackAppOpened = (providerId: string, userId?: string, ref?: string) =>
  trackDeepLinkEvent({ event: "app_opened", link_kind: "provider",
    provider_id: providerId, user_id: userId, ref });

export const trackDeferredRestored = (providerId: string, userId: string, ref?: string) =>
  trackDeepLinkEvent({ event: "deferred_restored", link_kind: "provider",
    provider_id: providerId, user_id: userId, ref });

export const trackDeferredCleared = (
  reason: "expired" | "provider_invalid" | "network_error",
  providerId?: string, userId?: string
) => trackDeepLinkEvent({ event: "deferred_cleared", link_kind: "provider",
  provider_id: providerId, user_id: userId, meta: { reason } });
