/**
 * useDeferredDeepLink
 *
 * Fires once per session, immediately after the user signs in or creates an
 * account. Reads localStorage for a stored PendingLink, validates the target,
 * then routes the user there and clears the stored link.
 *
 * ── Lifecycle ─────────────────────────────────────────────────────────────────
 *  1. Native share menu / clipboard is used to share link.
 *  2. Browser opens https://business.bookmebusiness.com/provider/{id}
 *  3. Page redirects to Google Play/App Store.
 *  4. User installs BookMe and opens it.
 *  5. User signs in — AuthContext fires, user becomes non-null.
 *  6. THIS HOOK fires: reads PendingLink → validates → navigates → clears.
 *
 * ── Error handling ────────────────────────────────────────────────────────────
 *  Provider deleted    → clear link, toast, /home
 *  Provider wrong role → clear link, toast, /home
 *  Network error       → retry once after 3 s, then clear silently
 *  Link expired (>7d)  → getPendingLink() already returns null
 *
 * ── Extension ─────────────────────────────────────────────────────────────────
 *  Adding a new link kind = add a case in the switch below. Nothing else changes.
 */

import { useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { getPendingLink, clearPendingLink, savePendingLink, type PendingLink } from "@/services/pendingLink";
import { trackDeferredRestored, trackDeferredCleared } from "@/services/deepLinkAnalytics";
import { toast } from "sonner";
import { Capacitor } from "@capacitor/core";
import { InstallReferrer } from "@capawesome/capacitor-install-referrer";
import { Clipboard } from "@capacitor/clipboard";

// ─── Deferred Token Check ─────────────────────────────────────────────────────

const HAS_CHECKED_DEFERRED_KEY = "has_checked_deferred_token";
let checkPromise: Promise<void> | null = null;

const ensureDeferredTokenChecked = (): Promise<void> => {
  if (!checkPromise) {
    checkPromise = (async () => {
      if (!Capacitor.isNativePlatform()) return;
      if (localStorage.getItem(HAS_CHECKED_DEFERRED_KEY)) return;
      
      try {
        let token: string | null = null;
        
        if (Capacitor.getPlatform() === "android") {
          try {
            const result = await InstallReferrer.getInstallReferrer();
            const referrerString = result.referrerUrl;
            if (referrerString) {
              const params = new URLSearchParams(referrerString);
              if (params.has("token")) {
                token = params.get("token");
              }
            }
          } catch (e) {
            console.warn("InstallReferrer error:", e);
          }
        }
        
        if (Capacitor.getPlatform() === "ios") {
          try {
            const { value } = await Clipboard.read();
            if (value && value.startsWith("bookme_token_")) {
              token = value.replace("bookme_token_", "");
            }
          } catch (e) {
            console.warn("Clipboard error:", e);
          }
        }
        
        if (token) {
          const { data, error } = await supabase.functions.invoke("resolve-deferred-token", {
            body: { token }
          });
          
          if (data?.provider_id && !error) {
            savePendingLink({
              kind: "provider",
              providerId: data.provider_id,
              ref: "deferred_install"
            });
            
            if (Capacitor.getPlatform() === "ios") {
              try {
                await Clipboard.write({ string: "" });
              } catch (e) {}
            }
          }
        }
      } catch (e) {
        console.warn("Deferred token check error:", e);
      } finally {
        localStorage.setItem(HAS_CHECKED_DEFERRED_KEY, "true");
      }
    })();
  }
  return checkPromise;
};

// ─── Provider validation ──────────────────────────────────────────────────────

type ProviderStatus =
  | { ok: true; id: string }
  | { ok: false; reason: "not_found" | "wrong_role" | "network_error" };

const validateProvider = async (providerId: string): Promise<ProviderStatus> => {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", providerId)
      .maybeSingle();

    if (error) return { ok: false, reason: "network_error" };
    if (!data) return { ok: false, reason: "not_found" };
    if (data.role !== "provider") return { ok: false, reason: "wrong_role" };
    return { ok: true, id: data.id };
  } catch {
    return { ok: false, reason: "network_error" };
  }
};

// ─── Route builders ───────────────────────────────────────────────────────────

const buildProviderRoute = (link: Extract<PendingLink, { kind: "provider" }>) => {
  const qs = new URLSearchParams();
  if (link.ref) qs.set("ref", link.ref);
  if (link.utmCampaign) qs.set("utm_campaign", link.utmCampaign);
  const query = qs.toString();
  return `/provider/${link.providerId}${query ? `?${query}` : ""}`;
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useDeferredDeepLink = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const hasRunRef = useRef(false);

  // Trigger check immediately on mount, don't wait for auth.
  useEffect(() => {
    ensureDeferredTokenChecked();
  }, []);

  const restore = useCallback(async (userId: string) => {
    if (hasRunRef.current) return;
    
    // ensure token check is complete before trying to restore
    await ensureDeferredTokenChecked();
    
    hasRunRef.current = true;

    const link = getPendingLink();
    if (!link) return;

    switch (link.kind) {
      case "provider": {
        let status = await validateProvider(link.providerId);

        // Retry once on network error
        if (!status.ok && status.reason === "network_error") {
          await new Promise((r) => setTimeout(r, 3000));
          status = await validateProvider(link.providerId);
          if (!status.ok) {
            trackDeferredCleared("network_error", link.providerId, userId);
            clearPendingLink();
            return; // silent — user may be on slow connection
          }
        }

        if (!status.ok) {
          // Provider deleted or wrong role
          trackDeferredCleared("provider_invalid", link.providerId, userId);
          clearPendingLink();
          toast("The provider profile you were looking for is no longer available.", {
            duration: 5000,
          });
          navigate("/home", { replace: true });
          return;
        }

        // Success
        trackDeferredRestored(link.providerId, userId, link.ref);
        clearPendingLink();
        navigate(buildProviderRoute(link), { replace: true });

        setTimeout(() => {
          toast("✨ Taking you to the profile you were checking out!", { duration: 3500 });
        }, 400);
        break;
      }

      // ── Future kinds ───────────────────────────────────────────────────────
      // case "service":   { /* validate + navigate to /service/:id */ break; }
      // case "promotion": { /* validate + navigate to /promotion/:id */ break; }
      // case "coupon":    { /* apply coupon, navigate to /search */ break; }
      // case "referral":  { /* apply referral credit, navigate to /home */ break; }

      default:
        clearPendingLink();
        break;
    }
  }, [navigate]);

  useEffect(() => {
    if (!user) {
      hasRunRef.current = false; // reset so next sign-in can trigger restoration
      return;
    }
    restore(user.id);
  }, [user, restore]);
};
