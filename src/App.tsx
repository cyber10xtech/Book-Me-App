import React, { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useNavigate, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { GuestSessionProvider } from "@/contexts/GuestSessionContext";
import { useNotificationListener } from "@/hooks/useNotificationListener";
import { usePermissions } from "@/hooks/usePermissions";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import PermissionModal from "@/components/PermissionModal";
import AuthRequiredModal from "@/components/AuthRequiredModal";
import ErrorBoundary from "@/components/ErrorBoundary";
import { clearScrollLock } from "@/lib/scrollLockGuard";
import { setupDeepLinkHandler, addPushNotificationListeners } from "@/services/capacitor";
import { useDeepLinkRouter } from "@/hooks/useDeepLinkRouter";
import { useDeferredDeepLink } from "@/hooks/useDeferredDeepLink";


import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import ReferralPage from "./pages/ReferralPage";
import HomePage from "./pages/HomePage";
import SearchPage from "./pages/SearchPage";
import BookingsPage from "./pages/BookingsPage";
import NotificationsPage from "./pages/NotificationsPage";
import ProfilePage from "./pages/ProfilePage";
import ProviderProfilePage from "./pages/ProviderProfilePage";
import ChatsPage from "./pages/ChatsPage";
import SavedProvidersPage from "./pages/SavedProvidersPage";
import EditProfilePage from "./pages/EditProfilePage";
import NotFound from "./pages/NotFound";
import LoyaltyPointsPage from "./pages/LoyaltyPointsPage";
import HelpSupportPage from "./pages/HelpSupportPage";
import SettingsPage from "./pages/SettingsPage";
import PrivacySecurityPage from "./pages/PrivacySecurityPage";

const queryClient = new QueryClient();

const FCM_ICON: Record<string, string> = {
  new_booking:       "📅",
  booking_confirm:   "✅",
  booking_confirmed: "✅",
  booking_update:    "🔄",
  booking_completed: "⭐",
  booking_cancelled: "❌",
  new_message:       "💬",
  review_received:   "🌟",
  promotion:         "🎉",
  system:            "🔔",
};

// ── AuthGuard — uses shared context, no separate loading cycle ────────────────
// Only wraps user-owned routes (bookings, chats, notifications, saved,
// edit-profile, loyalty, referral). Guests see AuthRequiredModal instead of
// a redirect or a broken page — dismissing it returns them to /home.
const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <AuthRequiredModal open onClose={() => navigate("/home", { replace: true })} />
      </div>
    );
  }
  return <>{children}</>;
};

// ── ReferralGuard — wraps protected routes, gates on referral_source ──────────
// Only redirects to /referral if the user's profile has no referral_source set.
// Skips the gate for the /referral route itself to avoid redirect loops.
// Guests (active=false) bypass this entirely — the referral gate only
// applies once someone has actually created an account.
const ReferralGuard = ({ children, profileLoaded, needsReferral, active }: {
  children: React.ReactNode;
  profileLoaded: boolean;
  needsReferral: boolean;
  active: boolean;
}) => {
  if (!active) return <>{children}</>;
  if (!profileLoaded) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (needsReferral) return <Navigate to="/referral" replace />;
  return <>{children}</>;
};

// ── Main app shell ─────────────────────────────────────────────────────────────
const AppContent = () => {
  const { user, loading } = useAuth();
  const { unreadCount } = useNotificationListener();
  const { shouldShowModal, requestAllPermissions, markModalShown } = usePermissions(user?.id);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Guard against iOS WKWebView getting stuck zoomed in: if a route change
  // unmounts a focused <input>/<textarea> (e.g. tapping bottom-nav away from
  // a search box or chat composer) before it's blurred, the browser skips
  // its normal "reset viewport zoom on blur" step. Explicitly blurring the
  // active element on every route change guarantees that cycle always runs.
  //
  // Also sweeps any leaked Radix scroll-lock (see scrollLockGuard.ts) on
  // every navigation. A modal that was open on the previous screen should
  // never leave scrolling blocked on the next one — if its own unmount
  // cleanup didn't run (e.g. a render error interrupted it), this is the
  // safety net that un-sticks it instead of the whole app appearing frozen
  // until a manual reload.
  useEffect(() => {
    const active = document.activeElement as HTMLElement | null;
    if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.isContentEditable)) {
      active.blur();
    }
    clearScrollLock();
  }, [location.pathname]);

  // Profile referral gate state
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [needsReferral, setNeedsReferral] = useState(false);

  // Fetch profile once after auth resolves to check referral_source
  useEffect(() => {
    if (loading) return;
    if (!user) {
      // Not logged in — reset gate state so it's clean on next login
      setProfileLoaded(false);
      setNeedsReferral(false);
      return;
    }

    supabase
      .from("profiles")
      .select("referral_source")
      .eq("user_id", user.id)
      .single()
      .then(({ data, error }) => {
        if (error) {
          console.warn("Failed to fetch referral status (offline?), skipping gate:", error);
          setNeedsReferral(false);
        } else {
          setNeedsReferral(!data?.referral_source);
        }
        setProfileLoaded(true);
      });
  }, [user, loading]);

  // Deep-link handler for push notification taps (background → foreground)
  useEffect(() => {
    if (user) setupDeepLinkHandler(navigate);
  }, [user, navigate]);

  // Universal Links / Android App Links — handles link when app is already installed
  useDeepLinkRouter();

  // Deferred deep links — restores pending provider link after install + sign-in
  useDeferredDeepLink();

  // Foreground FCM push toast
  useEffect(() => {
    if (!user) return;
    addPushNotificationListeners({
      onReceived: (notification: any) => {
        if (document.visibilityState !== "visible") return;
        const type = notification.data?.type ?? "";
        const icon = FCM_ICON[type] ?? "🔔";
        toast(`${icon} ${notification.title ?? "BookMe"}`, {
          description: notification.body ?? "",
          duration: 5000,
        });
      },
    });
  }, [user]);

  // Permissions modal — shown once on first launch (only for undecided permissions)
  useEffect(() => {
    if (user && shouldShowModal) {
      const t = setTimeout(() => setShowPermissionModal(true), 1500);
      return () => clearTimeout(t);
    }
  }, [user, shouldShowModal]);

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <>
      {showPermissionModal && (
        <PermissionModal
          onContinue={async () => { await requestAllPermissions(); setShowPermissionModal(false); }}
          onDismiss={() => { markModalShown(); setShowPermissionModal(false); }}
        />
      )}

      <div className="app-shell-width min-h-screen bg-background relative overflow-y-auto overflow-x-hidden">
        <Routes>
          {/* ── Guest-mode default entry — no forced login/register screen ──── */}
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/signin" element={user ? <Navigate to="/home" replace /> : <SignIn />} />
          <Route path="/signup" element={user ? <Navigate to="/home" replace /> : <SignUp />} />

          {/* ── Referral gate — authenticated but no referral_source yet ──── */}
          <Route
            path="/referral"
            element={
              <AuthGuard>
                <ReferralPage onComplete={() => setNeedsReferral(false)} />
              </AuthGuard>
            }
          />

          {/* ── Public routes — browsable by guests, no account required ───── */}
          <Route path="/home" element={
            <ReferralGuard active={!!user} profileLoaded={profileLoaded} needsReferral={needsReferral}>
              <HomePage />
            </ReferralGuard>
          } />
          <Route path="/search" element={
            <ReferralGuard active={!!user} profileLoaded={profileLoaded} needsReferral={needsReferral}>
              <SearchPage />
            </ReferralGuard>
          } />
          <Route path="/provider/:id" element={<ProviderProfilePage />} />

          {/* Profile: never gated or redirected — renders its own guest view */}
          <Route path="/profile" element={
            <ReferralGuard active={!!user} profileLoaded={profileLoaded} needsReferral={needsReferral}>
              <ProfilePage />
            </ReferralGuard>
          } />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/privacy-security" element={<PrivacySecurityPage />} />
          <Route path="/help" element={<HelpSupportPage />} />

          {/* ── Protected routes — user-owned data, require a real account ─── */}
          <Route path="/bookings" element={<AuthGuard><BookingsPage /></AuthGuard>} />
          <Route path="/notifications" element={<AuthGuard><NotificationsPage /></AuthGuard>} />
          <Route path="/chats" element={<AuthGuard><ChatsPage role="customer" /></AuthGuard>} />
          <Route path="/saved" element={<AuthGuard><SavedProvidersPage /></AuthGuard>} />
          <Route path="/edit-profile" element={<AuthGuard><EditProfilePage /></AuthGuard>} />
          <Route path="/loyalty" element={<AuthGuard><LoyaltyPointsPage /></AuthGuard>} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </>
  );
};

// ── Root — AuthProvider + GuestSessionProvider wrap everything so both
// real-auth state and the local guest identity are shared app-wide ───────────
const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <GuestSessionProvider>
              <AppContent />
            </GuestSessionProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
