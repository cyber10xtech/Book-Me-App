/**
 * useNotificationListener
 *
 * FIXES:
 * - Subscribes on BOTH profile.id AND auth user.id (they differ in customer app).
 *   Previously only subscribed on profile.id, so notifications sent to auth user.id
 *   were silently missed.
 * - Counts unread from both IDs without double-counting.
 * - Exposes setUnreadCount so NotificationsPage can decrement badge after mark-read.
 * - Cleans up BOTH channels on unmount.
 */

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  subscribeToNotifications,
  unsubscribeFromNotifications,
} from "@/services/notifications";
import { useAuth } from "@/hooks/useAuth";

export const useNotificationListener = () => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const increment = useCallback(() => setUnreadCount((c) => c + 1), []);

  useEffect(() => {
    if (!user) return;

    let profileId: string | null = null;

    const setup = async () => {
      // Resolve profile id
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      profileId = profile?.id ?? null;

      // Count unread from BOTH IDs
      const ids = [...new Set([profileId, user.id].filter(Boolean))] as string[];
      const counts = await Promise.all(
        ids.map((id) =>
          supabase
            .from("notifications")
            .select("*", { count: "exact", head: true })
            .eq("user_id", id)
            .eq("is_read", false)
        )
      );
      // If profileId === user.id, only count once
      const total =
        profileId === user.id
          ? counts[0].count || 0
          : (counts[0].count || 0) + (counts[1]?.count || 0);
      setUnreadCount(total);

      // Subscribe on profile.id
      if (profileId) subscribeToNotifications(profileId, increment);

      // Subscribe on auth user.id if different
      if (user.id !== profileId) {
        subscribeToNotifications(user.id, increment);
      }
    };

    setup();

    return () => {
      // Clean up both channels
      if (profileId) unsubscribeFromNotifications(profileId);
      if (user.id !== profileId) unsubscribeFromNotifications(user.id);
    };
  }, [user, increment]);

  return { unreadCount, setUnreadCount };
};
