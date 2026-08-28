/**
 * GuestSessionContext
 *
 * Gives every unauthenticated visitor a lightweight, local-only identity so
 * the app never has to force a login/register screen before it's usable.
 * This is NOT a Supabase session and grants no database access on its own —
 * Supabase RLS still requires a real auth.uid() for any write. It exists so
 * the UI has something stable to render ("Guest User") and so guest-specific
 * local state (e.g. analytics, onboarding flags) has a consistent id to key
 * off of for the lifetime of the install.
 *
 * Storage: localStorage on both web and native.
 * @capacitor/preferences is intentionally NOT used here — see the note in
 * src/lib/supabase.ts: Rollup/Vite resolves dynamic import() paths at build
 * time regardless of runtime guards, so importing it breaks the build even
 * on platforms that never execute that branch. localStorage persists fine
 * inside the Capacitor WebView on both iOS and Android, which is why the
 * rest of this app already standardises on it for local session state.
 */

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export interface GuestSession {
  id: string;
  name: string;
  role: "guest";
  avatar: null;
}

interface GuestSessionContextType {
  guest: GuestSession;
}

const GUEST_STORAGE_KEY = "bookme-guest-session";

const generateGuestId = () => {
  const uuid =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `guest_${uuid}`;
};

const loadOrCreateGuestSession = (): GuestSession => {
  try {
    const raw = localStorage.getItem(GUEST_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.id) return parsed;
    }
  } catch {
    // Corrupt/blocked storage — fall through and mint a fresh one in memory.
  }

  const fresh: GuestSession = {
    id: generateGuestId(),
    name: "Guest User",
    role: "guest",
    avatar: null,
  };

  try {
    localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(fresh));
  } catch {
    // Storage unavailable — guest session still works for this app session,
    // it just won't persist across restarts.
  }

  return fresh;
};

const GuestSessionContext = createContext<GuestSessionContextType | null>(null);

export const useGuestSession = () => {
  const ctx = useContext(GuestSessionContext);
  if (!ctx) throw new Error("useGuestSession must be used within GuestSessionProvider");
  return ctx;
};

export const GuestSessionProvider = ({ children }: { children: ReactNode }) => {
  const [guest, setGuest] = useState<GuestSession>(() => loadOrCreateGuestSession());

  // Re-check on mount in case another tab/webview created the session first.
  useEffect(() => {
    setGuest(loadOrCreateGuestSession());
  }, []);

  return (
    <GuestSessionContext.Provider value={{ guest }}>
      {children}
    </GuestSessionContext.Provider>
  );
};
