/**
 * Capacitor 8 Platform Service Layer
 *
 * Wraps native plugins with web API fallbacks.
 * All @capacitor/* imports are dynamic to avoid Rollup externalizing them
 * in the web build.
 *
 * Capacitor 8 key changes relevant here:
 *  - Requires Node 22+, Xcode 26, iOS 15+ minimum
 *  - registerAndGetToken: listener order (add BEFORE register) is unchanged
 *  - bridge_layout_main.xml renamed; no JS impact
 *  - appendUserAgent whitespace fix; no impact here
 */

let Capacitor: any = null;
let PushNotifications: any = null;
let Geolocation: any = null;

// Dynamic imports — Capacitor plugins are only available in native builds
const loadCapacitor = async () => {
  try {
    const cap = await import("@capacitor/core");
    Capacitor = cap.Capacitor;
  } catch {
    Capacitor = { isNativePlatform: () => false, getPlatform: () => "web" };
  }
};

const loadPushNotifications = async () => {
  try {
    const mod = await import("@capacitor/push-notifications");
    PushNotifications = mod.PushNotifications;
  } catch {
    PushNotifications = null;
  }
};

const loadGeolocation = async () => {
  try {
    const mod = await import("@capacitor/geolocation");
    Geolocation = mod.Geolocation;
  } catch {
    Geolocation = null;
  }
};

export const isNativePlatform = (): boolean => {
  return Capacitor?.isNativePlatform?.() ?? false;
};

/**
 * Returns true if the current native platform is iOS.
 * Must call initCapacitor() first so Capacitor is loaded.
 */
export const isIOSPlatform = (): boolean => {
  return Capacitor?.getPlatform?.() === "ios";
};

/**
 * Returns the current platform string: "ios" | "android" | "web".
 * Must call initCapacitor() first so Capacitor is loaded.
 */
export const getCurrentPlatform = (): "ios" | "android" | "web" => {
  const p = Capacitor?.getPlatform?.() ?? "web";
  return p as "ios" | "android" | "web";
};

export const initCapacitor = async () => {
  await Promise.all([loadCapacitor(), loadPushNotifications(), loadGeolocation()]);
};

// ===== PUSH NOTIFICATIONS =====

/**
 * Ask the OS for notification permission.
 * Does NOT call register() — use registerAndGetToken() to get the FCM token.
 */
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (isNativePlatform() && PushNotifications) {
    const result = await PushNotifications.requestPermissions();
    return result.receive === "granted";
  }
  if ("Notification" in window) {
    const result = await Notification.requestPermission();
    return result === "granted";
  }
  return false;
};

/**
 * Register for push notifications and return the FCM token along with the
 * current platform.
 *
 * Adds the 'registration' listener BEFORE calling register() so the event
 * is never missed (Capacitor fires it almost immediately after register()).
 * Only proceeds if permission is already granted.
 *
 * Returns null on web, if permission is not granted, or on timeout (8 s).
 */
export const registerAndGetToken = (): Promise<string | null> => {
  return new Promise(async (resolve) => {
    if (!isNativePlatform() || !PushNotifications) {
      resolve(null);
      return;
    }

    try {
      const status = await PushNotifications.checkPermissions();
      if (status.receive !== "granted") {
        resolve(null);
        return;
      }
    } catch {
      // checkPermissions may not be available on all plugin versions; proceed
    }

    let resolved = false;
    const done = (token: string | null) => {
      if (!resolved) {
        resolved = true;
        resolve(token);
      }
    };

    // Add listeners BEFORE register() — critical to avoid missing the event
    const regListener = await PushNotifications.addListener(
      "registration",
      (token: { value: string }) => {
        regListener.remove();
        errListener.remove();
        done(token.value);
      }
    );

    const errListener = await PushNotifications.addListener(
      "registrationError",
      (err: any) => {
        console.error("FCM registration error:", err);
        regListener.remove();
        errListener.remove();
        done(null);
      }
    );

    // 8 s safety timeout
    setTimeout(() => done(null), 8000);

    await PushNotifications.register();
  });
};

/**
 * Wire up foreground & tap-action listeners.
 * Call once after the user is authenticated.
 */
export const addPushNotificationListeners = (callbacks: {
  onReceived?: (notification: any) => void;
  onActionPerformed?: (action: any) => void;
}) => {
  if (!isNativePlatform() || !PushNotifications) return;

  if (callbacks.onReceived) {
    PushNotifications.addListener("pushNotificationReceived", callbacks.onReceived);
  }
  if (callbacks.onActionPerformed) {
    PushNotifications.addListener("pushNotificationActionPerformed", callbacks.onActionPerformed);
  }
};

// ===== GEOLOCATION =====

export interface UserLocation {
  latitude: number;
  longitude: number;
  city?: string;
}

export const requestLocationPermission = async (): Promise<boolean> => {
  if (isNativePlatform() && Geolocation) {
    const result = await Geolocation.requestPermissions();
    return result.location === "granted";
  }
  return new Promise((resolve) => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        () => resolve(true),
        () => resolve(false)
      );
    } else {
      resolve(false);
    }
  });
};

export const getCurrentPosition = async (): Promise<UserLocation | null> => {
  try {
    if (isNativePlatform() && Geolocation) {
      const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
      return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
    }
    return new Promise((resolve) => {
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) =>
            resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
          () => resolve(null),
          { enableHighAccuracy: true, timeout: 10000 }
        );
      } else {
        resolve(null);
      }
    });
  } catch {
    return null;
  }
};

// ===== DEEP LINKING =====

/**
 * Handle deep links from notification taps.
 * Call this from the App level with a navigate function.
 */
export const setupDeepLinkHandler = (navigate: (path: string) => void) => {
  if (!isNativePlatform() || !PushNotifications) return;

  PushNotifications.addListener(
    "pushNotificationActionPerformed",
    (action: { notification: { data?: Record<string, string> } }) => {
      const data = action.notification?.data;
      if (!data) return;

      if (data.booking_id) {
        navigate("/bookings");
      } else if (data.type === "new_message" && data.provider_id) {
        navigate(`/chat/${data.provider_id}`);
      } else {
        navigate("/notifications");
      }
    }
  );
};
