/**
 * AuthContext — Customer App (customer/)
 *
 * Session management + FCM push notification wiring.
 *
 * FCM dual-token strategy:
 *  - Token saved under auth user.id (for direct push targeting).
 *  - Token ALSO saved under profile.id when they differ (for edge functions
 *    that receive user_id = profiles.id from booking triggers).
 *  - The edge function collects all tokens for the resolved auth user.id
 *    AND profiles.fcm_token as backup, so delivery is guaranteed either way.
 *
 * Listener order fix:
 *  - addListener('registration') wired BEFORE register() so the token
 *    event is never missed (it fires almost immediately after register()).
 */

import {
  createContext, useContext, useEffect, useRef,
  useState, useCallback, ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

// Lazy Capacitor loader — never bundled by Rollup/Vite
const loadCapacitor = async () => {
  try {
    const [capMod, pushMod] = await Promise.all([
      import("@capacitor/core"),
      import("@capacitor/push-notifications"),
    ]);
    return { Capacitor: capMod.Capacitor, PushNotifications: pushMod.PushNotifications };
  } catch {
    return null;
  }
};

interface AuthContextType {
  session:        Session | null;
  user:           User    | null;
  loading:        boolean;
  signOut:        () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session:        null,
  user:           null,
  loading:        true,
  signOut:        async () => {},
  refreshSession: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const initialisedRef = useRef(false);
  const fcmWiredRef    = useRef(false);

  const applySession = useCallback((s: Session | null) => {
    setSession(s);
    setLoading(false);
  }, []);

  // ── FCM setup ──────────────────────────────────────────────────────────────
  const setupFcm = useCallback(async (authedUser: User, profileId?: string) => {
    if (fcmWiredRef.current) return;

    const cap = await loadCapacitor();
    if (!cap?.Capacitor.isNativePlatform()) return;
    fcmWiredRef.current = true;

    const { PushNotifications } = cap;

    try {
      const permResult = await PushNotifications.requestPermissions();
      if (permResult.receive !== "granted") {
        fcmWiredRef.current = false;
        return;
      }

      // ALL listeners wired BEFORE register()
      await PushNotifications.addListener("registration", async (tokenData) => {
        const token = tokenData.value;
        if (!token) return;

        const { upsertFcmToken } = await import("@/services/notifications");

        // fcm_tokens.user_id is a FK to auth.users — always use authedUser.id
        await upsertFcmToken(authedUser.id, token);

        // Stamp profiles row directly if profile.id differs from auth user.id
        if (profileId && profileId !== authedUser.id) {
          await supabase
            .from("profiles")
            .update({ fcm_token: token } as any)
            .eq("id", profileId);
        }
      });

      await PushNotifications.addListener("registrationError", (err) => {
        console.error("[FCM] Registration error:", err);
        fcmWiredRef.current = false;
      });

      await PushNotifications.addListener("pushNotificationReceived", (notification) => {
        toast(`🔔 ${notification.title ?? "BookMe"}`, {
          description: notification.body ?? "",
          duration: 6000,
        });
      });

      await PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
        const data = action.notification?.data || {};
        if (data.booking_id || data.type?.includes("booking")) {
          window.location.hash = "/bookings";
        } else if (data.type === "new_message") {
          window.location.hash = "/notifications";
        } else {
          window.location.hash = "/notifications";
        }
      });

      // register() called LAST — all listeners are ready
      await PushNotifications.register();

    } catch (e) {
      console.warn("[FCM] Setup failed:", e);
      fcmWiredRef.current = false;
    }
  }, []);

  // ── Session refresh ────────────────────────────────────────────────────────
  const refreshSession = useCallback(async () => {
    try {
      const { data: { session: stored }, error } = await supabase.auth.getSession();
      if (error) {
        if (
          error.message.includes("refresh_token_not_found") ||
          error.message.includes("Invalid Refresh Token")
        ) {
          await supabase.auth.signOut();
          applySession(null);
          return;
        }
      }
      if (stored) {
        const nowSec = Math.floor(Date.now() / 1000);
        const expSec = stored.expires_at ?? 0;
        if (expSec - nowSec < 60) {
          const { data: { session: fresh } } = await supabase.auth.refreshSession();
          applySession(fresh);
        } else {
          applySession(stored);
        }
      } else {
        applySession(null);
      }
    } catch (e) {
      console.warn("[AuthContext] refreshSession:", e);
    }
  }, [applySession]);

  // ── Main effect ────────────────────────────────────────────────────────────
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        initialisedRef.current = true;
        applySession(newSession);

        if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && newSession?.user) {
          // Resolve profile.id non-blocking
          supabase
            .from("profiles").select("id").eq("user_id", newSession.user.id).single()
            .then(({ data }) => setupFcm(newSession.user, data?.id));
        }

        if (event === "SIGNED_OUT") {
          applySession(null);
          fcmWiredRef.current = false;
        }
      }
    );

    // Cold start hydration
    supabase.auth.getSession().then(({ data: { session: stored } }) => {
      if (!initialisedRef.current) {
        initialisedRef.current = true;
        applySession(stored);
        if (stored?.user) {
          supabase
            .from("profiles").select("id").eq("user_id", stored.user.id).single()
            .then(({ data }) => setupFcm(stored!.user, data?.id));
        }
      }
    });

    // Web visibility resume
    const onVisible = () => {
      if (document.visibilityState === "visible") refreshSession();
    };
    document.addEventListener("visibilitychange", onVisible);

    // Native app resume
    let removeNativeListener: (() => void) | null = null;
    (async () => {
      try {
        const { App } = await import("@capacitor/app");
        const handle = await App.addListener("appStateChange", ({ isActive }) => {
          if (isActive) refreshSession();
        });
        removeNativeListener = () => handle.remove();
      } catch {
        // Not in Capacitor — visibilitychange covers web
      }
    })();

    // 10-min heartbeat
    const heartbeat = setInterval(() => {
      if (document.visibilityState === "visible") refreshSession();
    }, 10 * 60 * 1000);

    return () => {
      subscription.unsubscribe();
      document.removeEventListener("visibilitychange", onVisible);
      removeNativeListener?.();
      clearInterval(heartbeat);
    };
  }, [applySession, refreshSession, setupFcm]);

  const signOut = useCallback(async () => {
    fcmWiredRef.current = false;
    await supabase.auth.signOut();
    applySession(null);
  }, [applySession]);

  return (
    <AuthContext.Provider value={{
      session,
      user: session?.user ?? null,
      loading,
      signOut,
      refreshSession,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
