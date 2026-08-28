/**
 * deepLinks.ts — BookMe Deep Link Service
 *
 * Handles:
 *  1. OUTBOUND — building share URLs from provider data
 *  2. INBOUND  — parsing Universal Link / App Link URLs into structured routes
 *  3. DEFERRED — saving a PendingLink before share so post-install restoration works
 *
 * URL scheme:
 *   https://business.bookmebusiness.com/provider/{id}
 *
 * Apple Universal Links and Android App Links intercept https:// at the OS level.
 * Custom bookme:// scheme is a last-resort fallback for older OS versions only.
 */

import { trackShareGenerated } from "@/services/deepLinkAnalytics";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProviderShareParams {
  providerId: string;
  providerSlug?: string | null;
  providerName?: string;
  ref?: string;
  utmCampaign?: string;
  utmSource?: string;
  /** Auth user id of the sharer — used for analytics attribution */
  sharerId?: string;
}

export interface ParsedDeepLink {
  route: "providerById" | "providerBySlug" | "unknown";
  providerId?: string;
  providerSlug?: string;
  ref?: string;
  utmCampaign?: string;
  rawUrl: string;
}

export interface ShareResult {
  method: "native" | "clipboard" | "failed";
  url: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const BASE_URL = "https://business.bookmebusiness.com";
export const ANDROID_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.bookmebusiness.customerapp1";
export const IOS_STORE_URL =
  "https://apps.apple.com/us/app/bookme-book-a-service/id6782405521";

// ─── Slug utilities ───────────────────────────────────────────────────────────

export const slugify = (name: string): string =>
  name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);

// ─── URL builder ──────────────────────────────────────────────────────────────

export const buildProviderShareUrl = (params: ProviderShareParams): string => {
  const {
    providerId,
    ref = "profile_share",
    utmCampaign,
    utmSource = "share",
  } = params;

  const path = `/provider/${encodeURIComponent(providerId)}`;

  const qs = new URLSearchParams();
  if (ref) qs.set("ref", ref);
  qs.set("utm_source", utmSource);
  if (utmCampaign) qs.set("utm_campaign", utmCampaign);
  // Optional pid for legacy backward compatibility in parsing if needed, but we don't strictly need it if we're using /provider/:id
  
  return `${BASE_URL}${path}?${qs.toString()}`;
};

// ─── URL parser ───────────────────────────────────────────────────────────────

export const parseDeepLink = (urlString: string): ParsedDeepLink | null => {
  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    return null;
  }

  if (url.hostname !== "business.bookmebusiness.com") return null;

  const qs = url.searchParams;
  const meta = {
    ref: qs.get("ref") ?? undefined,
    utmCampaign: qs.get("utm_campaign") ?? undefined,
    rawUrl: urlString,
  };

  const slugMatch = url.pathname.match(/^\/p\/([^/?#]+)/);
  if (slugMatch) {
    return {
      route: "providerBySlug",
      providerSlug: decodeURIComponent(slugMatch[1]),
      providerId: qs.get("pid") ?? undefined,
      ...meta,
    };
  }

  const idMatch = url.pathname.match(/^\/provider\/([^/?#]+)/);
  if (idMatch) {
    return {
      route: "providerById",
      providerId: decodeURIComponent(idMatch[1]),
      ...meta,
    };
  }

  return { route: "unknown", ...meta };
};

// ─── Platform detection ───────────────────────────────────────────────────────

export const detectIOS = (): boolean =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

export const getStoreUrl = (): string =>
  detectIOS() ? IOS_STORE_URL : ANDROID_STORE_URL;

// ─── Share sheet ──────────────────────────────────────────────────────────────

/**
 * Trigger the native OS share sheet (or clipboard fallback).
 *
 * Also:
 *  - Saves a PendingLink to localStorage before opening the share sheet, so
 *    the post-install deferred deep link path works on Android WebView.
 *  - Fires share_generated analytics event.
 */
export const shareProvider = async (params: ProviderShareParams): Promise<ShareResult> => {
  const url = buildProviderShareUrl(params);

  // Sender does not generate pending links anymore. The browser fallback does.

  // Analytics
  trackShareGenerated(params.providerId, params.ref, params.utmCampaign, params.sharerId);

  const title = params.providerName
    ? `Book ${params.providerName} on BookMe`
    : "Book on BookMe";
  const text = params.providerName
    ? `Check out ${params.providerName} on BookMe — easy online booking!`
    : "Check out this service provider on BookMe!";

  if (typeof navigator.share === "function") {
    try {
      await navigator.share({ title, text, url });
      return { method: "native", url };
    } catch (err: any) {
      if (err?.name === "AbortError") return { method: "native", url };
    }
  }

  try {
    await navigator.clipboard.writeText(url);
    return { method: "clipboard", url };
  } catch {
    return { method: "failed", url };
  }
};
