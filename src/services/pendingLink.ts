/**
 * pendingLink.ts — Deferred Deep Link Storage
 *
 * Stores a structured PendingLink in localStorage before the user is sent
 * to the App Store. After install + sign-in, useDeferredDeepLink reads and
 * clears this value, then navigates the user to the correct screen.
 *
 * Uses localStorage — same engine as the Supabase session (see lib/supabase.ts).
 * localStorage on Android WebView survives app termination.
 *
 * The PendingLink discriminated union is open for extension:
 * adding a new surface (promotion, coupon, referral, event) = add a new type
 * branch. useDeferredDeepLink uses switch(kind) so new surfaces are handled
 * without touching existing cases.
 */

const STORAGE_KEY = "bookme:pending_link_v1";
const TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

// ─── Link types ───────────────────────────────────────────────────────────────

export interface ProviderPendingLink {
  kind: "provider";
  providerId: string;
  providerSlug?: string;
  storedAt: number;
  ref?: string;
  utmSource?: string;
  utmCampaign?: string;
}

export interface ServicePendingLink {
  kind: "service";
  serviceId: string;
  providerId: string;
  storedAt: number;
}

export interface PromotionPendingLink {
  kind: "promotion";
  promotionId: string;
  storedAt: number;
}

export interface CouponPendingLink {
  kind: "coupon";
  couponCode: string;
  storedAt: number;
}

export interface EventPendingLink {
  kind: "event";
  eventId: string;
  storedAt: number;
}

export interface ReferralPendingLink {
  kind: "referral";
  referrerId: string;
  campaignCode?: string;
  storedAt: number;
}

export type PendingLink =
  | ProviderPendingLink
  | ServicePendingLink
  | PromotionPendingLink
  | CouponPendingLink
  | EventPendingLink
  | ReferralPendingLink;

// ─── API ──────────────────────────────────────────────────────────────────────

export const savePendingLink = (link: Omit<PendingLink, "storedAt">): void => {
  try {
    const payload: PendingLink = {
      ...link,
      storedAt: Math.floor(Date.now() / 1000),
    } as PendingLink;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.warn("[PendingLink] Failed to save:", err);
  }
};

export const getPendingLink = (): PendingLink | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: PendingLink = JSON.parse(raw);
    if (!parsed?.kind || !parsed?.storedAt) { clearPendingLink(); return null; }
    const age = Math.floor(Date.now() / 1000) - parsed.storedAt;
    if (age > TTL_SECONDS) { clearPendingLink(); return null; }
    return parsed;
  } catch {
    clearPendingLink();
    return null;
  }
};

export const clearPendingLink = (): void => {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
};

export const hasPendingLink = (): boolean => getPendingLink() !== null;
