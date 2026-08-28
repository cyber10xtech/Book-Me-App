/**
 * useDeepLinkRouter
 *
 * Wires up ALL inbound deep link sources into a single hook:
 *
 *  1. Capacitor App `appUrlOpen` — fires when the OS delivers a Universal Link
 *     or Android App Link to the already-running native app.
 *  2. Capacitor App `appRestoredResult` — fires when the app cold-starts from
 *     a tapped link (URL is in the restoration payload).
 *  3. Capacitor App `getLaunchUrl()` — returns the URL that cold-started this
 *     session (Capacitor 5+/8+).
 *
 * Mount once inside AppContent (same level as setupDeepLinkHandler).
 * Web builds: Capacitor is absent so the hook is a no-op; react-router-dom
 * handles the URL natively via the route tree.
 */

import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { parseDeepLink, type ParsedDeepLink } from "@/services/deepLinks";
import { trackAppOpened } from "@/services/deepLinkAnalytics";

let CapacitorApp: any = null;
const loadCapacitorApp = async () => {
  try {
    const mod = await import("@capacitor/app");
    CapacitorApp = mod.App;
  } catch {
    CapacitorApp = null;
  }
};

const routeFromParsed = (
  parsed: ParsedDeepLink,
  navigate: ReturnType<typeof useNavigate>
) => {
  if (parsed.route === "unknown") return;

  const qs = new URLSearchParams();
  if (parsed.ref) qs.set("ref", parsed.ref);
  if (parsed.utmCampaign) qs.set("utm_campaign", parsed.utmCampaign);
  const query = qs.toString() ? `?${qs.toString()}` : "";

  if (parsed.route === "providerById" && parsed.providerId) {
    trackAppOpened(parsed.providerId, undefined, parsed.ref);
    navigate(`/provider/${parsed.providerId}${query}`, { replace: true });
    return;
  }


};

export const useDeepLinkRouter = () => {
  const navigate = useNavigate();
  const handled = useRef<Set<string>>(new Set());

  useEffect(() => {
    let listeners: Array<{ remove: () => void }> = [];

    const init = async () => {
      await loadCapacitorApp();
      if (!CapacitorApp) return;

      // App already running — OS delivers the link
      const openListener = await CapacitorApp.addListener(
        "appUrlOpen",
        (event: { url: string }) => {
          const { url } = event;
          if (handled.current.has(url)) return;
          handled.current.add(url);
          const parsed = parseDeepLink(url);
          if (parsed) routeFromParsed(parsed, navigate);
        }
      );
      listeners.push(openListener);

      // Cold-start restoration (Android BackStack + iOS state restore)
      const restoredListener = await CapacitorApp.addListener(
        "appRestoredResult",
        (event: { methodName?: string; data?: { url?: string } }) => {
          const url = event?.data?.url;
          if (!url || handled.current.has(url)) return;
          handled.current.add(url);
          const parsed = parseDeepLink(url);
          if (parsed) routeFromParsed(parsed, navigate);
        }
      );
      listeners.push(restoredListener);

      // getLaunchUrl — URL that cold-started this session
      try {
        const launchUrl = await CapacitorApp.getLaunchUrl();
        if (launchUrl?.url && !handled.current.has(launchUrl.url)) {
          handled.current.add(launchUrl.url);
          const parsed = parseDeepLink(launchUrl.url);
          if (parsed) routeFromParsed(parsed, navigate);
        }
      } catch {
        // getLaunchUrl not available on older plugin versions — safe to ignore
      }
    };

    init();
    return () => { listeners.forEach((l) => l.remove()); };
  }, [navigate]);
};
