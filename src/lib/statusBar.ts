import { Capacitor } from "@capacitor/core";

/**
 * Configure the iOS/Android status bar on app mount — Capacitor 8.
 *
 * iOS  — overlaysWebView: true renders content edge-to-edge under the
 *         status bar, matching native app behaviour.
 *         CSS safe-area vars: padding-top: env(safe-area-inset-top).
 *
 * Android — Capacitor 8 introduced SystemBars for Android edge-to-edge.
 *            For iOS we continue to use @capacitor/status-bar.
 *            On Android this function is a no-op (SystemBars handles it).
 */
export async function syncStatusBar() {
  if (!Capacitor.isNativePlatform()) return;

  const platform = Capacitor.getPlatform();

  if (platform === "ios") {
    try {
      const { StatusBar, Style } = await import("@capacitor/status-bar");
      // Render under the status bar (edge-to-edge)
      await StatusBar.setOverlaysWebView({ overlay: true });
      // Dark icons on the light neumorphic background
      await StatusBar.setStyle({ style: Style.Dark });
    } catch (e) {
      console.warn("StatusBar plugin unavailable:", e);
    }
  }
  // Android: SystemBars plugin (new in Capacitor 8) handles edge-to-edge
  // margins via CSS env() variables automatically — no JS needed here.
}
