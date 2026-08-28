import { useCallback, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { REQUIRE_AUTH_ON_WRITE } from "@/lib/featureFlags";
import AuthRequiredModal from "@/components/AuthRequiredModal";

/**
 * useRequireAuth
 *
 * Wrap any write / user-owned action with `requireAuth(fn, reason?)`.
 * If a real (Supabase) user is signed in, `fn` runs immediately. If not,
 * <AuthRequiredModal /> opens instead and `fn` never runs — matching:
 *
 *   if (!user && action.requiresAuth) {
 *     openAuthModal();
 *     return;
 *   }
 *
 * Render `{modal}` once near the bottom of any component that calls
 * requireAuth().
 */
export const useRequireAuth = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string | undefined>(undefined);

  const requireAuth = useCallback(
    (action: () => void, actionReason?: string) => {
      if (!user && REQUIRE_AUTH_ON_WRITE) {
        setReason(actionReason);
        setOpen(true);
        return;
      }
      action();
    },
    [user]
  );

  const modal = (
    <AuthRequiredModal open={open} onClose={() => setOpen(false)} reason={reason} />
  );

  return { requireAuth, modal, isGuest: !user };
};
