/**
 * PermissionModal — neumorphic onboarding permission request.
 *
 * Notifications only. Location permission is NOT requested through any
 * custom UI here — it is requested directly via the native OS dialog
 * (see usePermissions/requestAllPermissions -> requestLocationPermission
 * in @/services/capacitor). The old custom location onboarding step has
 * been removed entirely.
 *
 * Smart step logic:
 *  - If notifications are already granted, the modal calls onContinue
 *    immediately without rendering any UI.
 */

import { useEffect } from "react";
import { Bell, X } from "lucide-react";

const KEY_NOTIF = "bookme_perm_notifications";
const isGranted = (key: string) => localStorage.getItem(key) === "granted";

interface PermissionModalProps {
  onContinue: () => void;
  onDismiss:  () => void;
}

const PermissionModal = ({ onContinue, onDismiss }: PermissionModalProps) => {
  const alreadyGranted = isGranted(KEY_NOTIF);

  // Safety net: if already granted, skip the modal entirely
  useEffect(() => {
    if (alreadyGranted) onContinue();
  }, []);

  if (alreadyGranted) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6"
      style={{ background: "rgba(13,22,38,0.55)", backdropFilter: "blur(4px)" }}>
      <div
        className="relative w-full max-w-sm rounded-3xl p-6 animate-fade-in"
        style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)" }}
      >
        {/* Dismiss */}
        <button
          onClick={onDismiss}
          className="absolute top-4 right-4 w-8 h-8 rounded-xl flex items-center justify-center tap-scale"
          style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-flat)" }}
          aria-label="Dismiss"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>

        <div className="text-center">
          {/* Icon */}
          <div className="w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4"
            style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)" }}>
            <Bell className="w-7 h-7 text-primary" />
          </div>

          <h2 className="text-xl font-extrabold text-foreground mb-2">
            Stay Updated
          </h2>

          <p className="text-sm text-muted-foreground mb-6 leading-relaxed px-2">
            Enable notifications to get real-time booking updates, chat messages, and special offers from your favourite providers.
          </p>

          {/* Primary CTA */}
          <button
            onClick={onContinue}
            className="w-full h-[52px] rounded-2xl text-white font-extrabold text-sm tap-scale mb-3"
            style={{
              background: "linear-gradient(145deg, hsl(220 80% 40%), hsl(220 100% 20%))",
              boxShadow: "var(--shadow-navy)",
            }}
          >
            Allow Notifications
          </button>

          {/* Secondary */}
          <button
            onClick={onDismiss}
            className="w-full h-11 rounded-2xl font-semibold text-sm tap-scale"
            style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-flat)", color: "hsl(var(--muted-foreground))" }}
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
};

export default PermissionModal;
