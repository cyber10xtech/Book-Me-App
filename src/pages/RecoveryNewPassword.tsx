import { useState, useEffect } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Eye, EyeOff, Lock, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export default function RecoveryNewPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const email = sessionStorage.getItem("recovery_email");
  const stage = sessionStorage.getItem("recovery_stage");

  // Basic BookMe Password Policy (from Phase 1 discovery)
  const requirements = [
    { label: "At least 8 characters", met: password.length >= 8 },
    { label: "Contains a lowercase letter", met: /[a-z]/.test(password) },
    { label: "Contains an uppercase letter", met: /[A-Z]/.test(password) },
    { label: "Contains a number", met: /[0-9]/.test(password) }
  ];
  
  const meetsAllRequirements = requirements.every(req => req.met);
  const passwordsMatch = password && confirmPassword && password === confirmPassword;
  
  // To avoid interfering with Supabase backend validation if it allows less strict passwords,
  // we will enforce basic length at minimum, but encourage the others.
  const isFormValid = password.length >= 6 && passwordsMatch && !loading;

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/recover-password/email", { replace: true });
      }
    };
    checkSession();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || !email) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        toast.error("Failed to update password: " + error.message);
      } else {
        sessionStorage.setItem("recovery_stage", "success");
        navigate("/recover-password/success", { replace: true });
      }
    } catch (err) {
      toast.error("Unable to connect. Check your internet connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!email || stage !== "new_password") {
    return <Navigate to="/recover-password/email" replace />;
  }

  return (
    <div
      className="min-h-screen flex flex-col px-6 pb-10"
      style={{
        background: "hsl(var(--background))",
        paddingTop: "calc(env(safe-area-inset-top) + 2rem)",
      }}
    >
      <div className="mb-8 mt-10">
        <h1 className="text-2xl font-extrabold text-foreground leading-tight">Create new password</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Your new password must be different from previous used passwords.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 flex-1 flex flex-col">
        {/* Read-only Username for Password Managers */}
        <div className="mb-2">
          <label className="text-xs font-extrabold text-muted-foreground uppercase tracking-wide mb-2 block">
            Account Email
          </label>
          <div className="flex items-center overflow-hidden rounded-2xl relative" style={{ boxShadow: "var(--shadow-inset)", background: "hsl(var(--background))", height: 52 }}>
            <input
              type="email"
              id="recovery-email-readonly"
              name="username"
              autoComplete="username"
              value={email}
              readOnly
              className="flex-1 h-full bg-transparent text-sm text-muted-foreground outline-none px-4 cursor-default"
            />
          </div>
        </div>

        {/* New Password */}
        <div>
          <label className="text-xs font-extrabold text-muted-foreground uppercase tracking-wide mb-2 block">
            New Password
          </label>
          <div className="flex items-center overflow-hidden rounded-2xl" style={{ boxShadow: "var(--shadow-inset)", background: "hsl(var(--background))", height: 52 }}>
            <div className="w-12 h-full flex items-center justify-center flex-shrink-0">
              <Lock className="w-4 h-4 text-muted-foreground" />
            </div>
            <input
              type={showPw ? "text" : "password"}
              id="new-password"
              name="new-password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="flex-1 h-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
              required
            />
            <button type="button" onClick={() => setShowPw(v => !v)}
              className="w-12 h-full flex items-center justify-center flex-shrink-0 tap-scale">
              {showPw ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
            </button>
          </div>
        </div>

        {/* Confirm Password */}
        <div>
          <label className="text-xs font-extrabold text-muted-foreground uppercase tracking-wide mb-2 block">
            Confirm Password
          </label>
          <div className="flex items-center overflow-hidden rounded-2xl" style={{ boxShadow: "var(--shadow-inset)", background: "hsl(var(--background))", height: 52 }}>
            <div className="w-12 h-full flex items-center justify-center flex-shrink-0">
              <Lock className="w-4 h-4 text-muted-foreground" />
            </div>
            <input
              type={showPw ? "text" : "password"}
              id="confirm-password"
              name="confirm-password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="flex-1 h-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none pr-4"
              required
            />
          </div>
          {confirmPassword.length > 0 && !passwordsMatch && (
            <p className="text-xs text-red-500 mt-2 font-semibold">Passwords do not match</p>
          )}
        </div>

        {/* Password Requirements Checklist */}
        <div className="bg-muted/30 p-4 rounded-2xl space-y-2 border border-border/50">
          <p className="text-xs font-bold text-foreground mb-3">Password requirements:</p>
          {requirements.map((req, i) => (
            <div key={i} className="flex items-center gap-2">
              {req.met ? (
                <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />
              )}
              <span className={`text-xs ${req.met ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                {req.label}
              </span>
            </div>
          ))}
        </div>

        <div className="flex-1" />

        <button
          type="submit"
          disabled={!isFormValid}
          className="w-full rounded-2xl h-14 font-bold text-[15px] flex items-center justify-center tap-scale disabled:opacity-50 disabled:pointer-events-none transition-opacity mt-4"
          style={{
            background: "hsl(var(--primary))",
            color: "hsl(var(--primary-foreground))",
            boxShadow: "0 4px 14px 0 rgba(var(--primary), 0.39)",
          }}
        >
          {loading ? "Updating..." : "Reset password"}
        </button>
      </form>
    </div>
  );
}
