/**
 * notifications.ts — Customer App (customer/)
 *
 * Push + realtime notification service.
 *
 * Token storage (dual-token):
 *   upsertFcmToken() stores under the given userId in BOTH:
 *     1. fcm_tokens table  — primary (multiple devices per user)
 *     2. profiles.fcm_token — backup (read by edge functions directly)
 *
 * Realtime:
 *   subscribeToNotifications() subscribes on a single userId.
 *   Call it twice from AuthContext — once with profile.id, once with auth user.id —
 *   so no notification is ever missed regardless of which ID was used at insert time.
 */

import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import type { RealtimeChannel } from "@supabase/supabase-js";

const ICON_MAP: Record<string, string> = {
  new_booking:         "📅",
  booking_confirm:     "✅",
  booking_confirmed:   "✅",
  booking_accepted:    "✅",
  booking_update:      "🔄",
  booking_rescheduled: "📅",
  booking_completed:   "⭐",
  booking_cancelled:   "❌",
  booking_rejected:    "❌",
  new_message:         "💬",
  review_received:     "🌟",
  promotion:           "🎉",
  system:              "🔔",
};

// Active realtime channels — keyed by userId so we can remove individually
const channels: Map<string, RealtimeChannel> = new Map();

const showToast = (notification: { title: string; body?: string; message?: string; type?: string }) => {
  if (document.visibilityState !== "visible") return;
  const icon = ICON_MAP[notification.type ?? ""] ?? "🔔";
  toast(`${icon} ${notification.title}`, {
    description: notification.body ?? notification.message ?? "",
    duration: 5000,
  });
};

/**
 * Subscribe to realtime notifications for a given userId.
 * Safe to call multiple times — deduplicates by userId.
 * Call for BOTH profile.id AND auth user.id to guarantee coverage.
 */
export const subscribeToNotifications = (
  userId: string,
  onNew?: (n: any) => void
): void => {
  if (channels.has(userId)) return;

  const ch = supabase
    .channel(`db-notif-${userId}-${Date.now()}`)
    .on(
      "postgres_changes",
      {
        event:  "INSERT",
        schema: "public",
        table:  "notifications",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        const n = payload.new as any;
        showToast(n);
        onNew?.(n);
      }
    )
    .subscribe((status) => {
      if (status === "CHANNEL_ERROR") {
        channels.delete(userId);
        setTimeout(() => subscribeToNotifications(userId, onNew), 3000);
      }
    });

  channels.set(userId, ch);
};

export const unsubscribeFromNotifications = (userId: string): void => {
  const ch = channels.get(userId);
  if (ch) {
    supabase.removeChannel(ch);
    channels.delete(userId);
  }
};

export const stopAllNotificationListeners = (): void => {
  channels.forEach((ch) => supabase.removeChannel(ch));
  channels.clear();
};

// Legacy aliases
export const startNotificationListener  = subscribeToNotifications;
export const stopNotificationListener   = stopAllNotificationListeners;

/**
 * Detect the current native platform for FCM token storage.
 * Returns "ios" | "android" | "web" without requiring initCapacitor()
 * to have been called — uses a direct dynamic import so it is safe to
 * call at any point after app boot.
 */
const detectPlatform = async (): Promise<"ios" | "android" | "web"> => {
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (!Capacitor.isNativePlatform()) return "web";
    const p = Capacitor.getPlatform();
    if (p === "ios") return "ios";
    if (p === "android") return "android";
    return "web";
  } catch {
    return "web";
  }
};

/**
 * Save an FCM token for userId to BOTH storage locations.
 * Must be called with auth user.id (not profile.id) — fcm_tokens.user_id
 * is a FK to auth.users, not profiles.
 *
 * Platform is detected at runtime so iOS tokens are stored with
 * platform = "ios" and Android tokens with platform = "android".
 *
 * Upsert strategy: conflict on token column (the only unique constraint
 * present in the schema). This correctly handles the case where the same
 * physical device re-registers with a refreshed token (old row is updated).
 * The profiles.fcm_token backup is always written for backward-compat with
 * edge functions that read it directly.
 */
export const upsertFcmToken = async (userId: string, fcmToken: string): Promise<void> => {
  const platform = await detectPlatform();

  // Primary: fcm_tokens table — upsert on token unique constraint
  const { error: tokenErr } = await supabase
    .from("fcm_tokens")
    .upsert(
      {
        user_id:    userId,
        token:      fcmToken,
        platform,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "token" }
    );

  if (tokenErr) {
    console.error("[notifications] fcm_tokens upsert failed:", tokenErr.message);
  }

  // Backup: profiles.fcm_token (keyed on user_id = auth user UUID)
  const { error: profileErr } = await supabase
    .from("profiles")
    .update({ fcm_token: fcmToken } as any)
    .eq("user_id", userId);

  if (profileErr) {
    console.error("[notifications] profiles.fcm_token update failed:", profileErr.message);
  }
};
