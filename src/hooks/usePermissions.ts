/**
 * usePermissions — smart permission request hook
 *
 * Strategy:
 *  - Each permission type (notifications, location) is tracked independently
 *    in localStorage so we never ask again once granted.
 *  - On first launch (neither granted yet) we show the full onboarding modal.
 *  - On subsequent launches we silently re-check; only prompt if something
 *    that was NOT previously granted is now needed.
 *  - requestSpecific() lets action-triggered flows (e.g. "find near me" taps
 *    location) ask for exactly one permission without touching others.
 */

import { useState, useCallback } from "react";
import {
  initCapacitor,
  requestNotificationPermission,
  requestLocationPermission,
  registerAndGetToken,
  isNativePlatform,
} from "@/services/capacitor";
import { upsertFcmToken } from "@/services/notifications";

// ── Storage keys ─────────────────────────────────────────────────────────────
const KEY_NOTIF   = "bookme_perm_notifications";   // "granted" | "denied" | unset
const KEY_LOCATION = "bookme_perm_location";        // "granted" | "denied" | unset
const KEY_SHOWN   = "bookme_perm_modal_shown";      // "true" once the onboarding modal has fired

const isGranted = (key: string) => localStorage.getItem(key) === "granted";
const isDenied  = (key: string) => localStorage.getItem(key) === "denied";
const setStatus = (key: string, granted: boolean) =>
  localStorage.setItem(key, granted ? "granted" : "denied");

// ── Hook ─────────────────────────────────────────────────────────────────────
export const usePermissions = (userId?: string) => {
  /**
   * shouldShowModal:
   *   true  → at least one permission hasn't been asked yet AND
   *           the onboarding modal hasn't been shown on this device before.
   *   false → either everything is already decided, or we've shown it before.
   *
   * We derive this synchronously from localStorage so it's stable on mount
   * and doesn't flicker.
   */
  const [shouldShowModal] = useState<boolean>(() => {
    const alreadyShown = localStorage.getItem(KEY_SHOWN) === "true";
    if (alreadyShown) return false;
    // Show if at least one permission is still undecided
    const notifUndecided   = !isGranted(KEY_NOTIF)    && !isDenied(KEY_NOTIF);
    const locationUndecided = !isGranted(KEY_LOCATION) && !isDenied(KEY_LOCATION);
    return notifUndecided || locationUndecided;
  });

  /**
   * requestAllPermissions — called when the user taps "Continue" in the
   * onboarding modal. Skips any permission already granted.
   */
  const requestAllPermissions = useCallback(async () => {
    await initCapacitor();

    // Notifications
    if (!isGranted(KEY_NOTIF)) {
      const granted = await requestNotificationPermission();
      setStatus(KEY_NOTIF, granted);
      if (granted && userId) {
        const token = await registerAndGetToken();
        if (token) await upsertFcmToken(userId, token);
      }
    }

    // Location
    if (!isGranted(KEY_LOCATION)) {
      const granted = await requestLocationPermission();
      setStatus(KEY_LOCATION, granted);
    }

    localStorage.setItem(KEY_SHOWN, "true");
  }, [userId]);

  /**
   * requestSpecific — for action-triggered permission requests.
   * Only fires the OS dialog if the permission hasn't been granted yet.
   * Returns true if the permission is (or becomes) granted.
   */
  const requestSpecific = useCallback(async (
    type: "notifications" | "location"
  ): Promise<boolean> => {
    const key = type === "notifications" ? KEY_NOTIF : KEY_LOCATION;

    // Already granted — nothing to do
    if (isGranted(key)) return true;

    // Previously denied — don't spam the user; return false
    if (isDenied(key)) return false;

    await initCapacitor();

    let granted = false;
    if (type === "notifications") {
      granted = await requestNotificationPermission();
      setStatus(key, granted);
      if (granted && userId) {
        const token = await registerAndGetToken();
        if (token) await upsertFcmToken(userId, token);
      }
    } else {
      granted = await requestLocationPermission();
      setStatus(key, granted);
    }

    return granted;
  }, [userId]);

  /**
   * markModalShown — call when the user dismisses the modal without granting,
   * so we never show the onboarding modal again (they can still be asked
   * action-by-action via requestSpecific).
   */
  const markModalShown = useCallback(() => {
    localStorage.setItem(KEY_SHOWN, "true");
  }, []);

  return {
    /** Pass to PermissionModal to control visibility */
    shouldShowModal,
    requestAllPermissions,
    requestSpecific,
    markModalShown,
    // Convenience read-only flags
    notificationsGranted: isGranted(KEY_NOTIF),
    locationGranted: isGranted(KEY_LOCATION),
  };
};
