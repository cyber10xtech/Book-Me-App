import { useNavigate } from "react-router-dom";
import { X, Lock } from "lucide-react";

interface AuthRequiredModalProps {
  open: boolean;
  onClose: () => void;
  /** Optional short description of the action that triggered the prompt,
   *  e.g. "save providers", "send messages", "make a booking". */
  reason?: string;
}

/**
 * <AuthRequiredModal />
 *
 * The single reusable gate for any write/user-owned action. Guests can
 * browse freely; this only appears the moment they try to do something
 * that needs an account (booking, saving, messaging, posting, etc.).
 *
 * Usage pattern (see useRequireAuth.ts):
 *   if (!user && action.requiresAuth) {
 *     openAuthModal();
 *     return;
 *   }
 */
const AuthRequiredModal = ({ open, onClose, reason }: AuthRequiredModalProps) => {
  const navigate = useNavigate();
  if (!open) return null;

  const go = (path: string) => {
    onClose();
    navigate(path);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
      style={{ background: "rgba(15, 23, 42, 0.55)" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl p-6 pb-8 animate-fade-in"
        style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)" }}
      >
        <div className="flex justify-end mb-2">
          <button onClick={onClose} className="w-8 h-8 rounded-2xl flex items-center justify-center tap-scale"
            style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-flat)" }}>
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-3xl flex items-center justify-center mb-4"
            style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-flat)" }}>
            <Lock className="w-6 h-6" style={{ color: "hsl(var(--primary))" }} />
          </div>
          <h2 className="text-lg font-extrabold text-foreground mb-1">Sign in to continue</h2>
          <p className="text-sm text-muted-foreground max-w-[26ch]">
            {reason
              ? `You'll need an account to ${reason}.`
              : "You'll need an account to do that."}
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => go("/signin")}
            className="w-full h-12 rounded-2xl text-white text-sm font-bold tap-scale"
            style={{ background: "linear-gradient(145deg, hsl(199 100% 50%), hsl(199 100% 38%))", boxShadow: "var(--shadow-sky)" }}
          >
            Sign In
          </button>
          <button
            onClick={() => go("/signup")}
            className="w-full h-12 rounded-2xl text-sm font-bold tap-scale"
            style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)", color: "hsl(var(--foreground))" }}
          >
            Create Account
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthRequiredModal;
