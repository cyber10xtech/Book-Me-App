import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Mail, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export default function RecoveryEmail() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  // Basic email validation regex
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidEmail || loading) return;
    
    setLoading(true);
    
    // Normalize email
    const normalizedEmail = email.trim().toLowerCase();

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail);
      
      if (error) {
        // Network errors or offline
        if (error.status === 0 || error.message.includes("Failed to fetch") || error.message.includes("Network")) {
          toast.error("Unable to connect. Check your internet connection and try again.");
          setLoading(false);
          return;
        } 
        // Rate limits
        if (error.status === 429) {
          toast.error("Too many requests. Please wait before trying again.");
          setLoading(false);
          return;
        }
        // Server errors
        if (error.status && error.status >= 500) {
          toast.error("Service temporarily unavailable. Please try again later.");
          setLoading(false);
          return;
        }
        // Any other error (e.g. 400 user not found, 422) is ignored to prevent account enumeration.
      }
      
      // Success (or simulated success for enumeration protection)
      sessionStorage.setItem("recovery_email", normalizedEmail);
      sessionStorage.setItem("recovery_stage", "otp");
      sessionStorage.setItem("recovery_resend_cooldown", (Date.now() + 60000).toString());
      toast.success("If an account exists for this email, a verification code has been sent.");
      navigate("/recover-password/otp");
    } catch (err) {
      toast.error("Unable to connect. Check your internet connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col px-6 pb-10"
      style={{
        background: "hsl(var(--background))",
        paddingTop: "calc(env(safe-area-inset-top) + 2rem)",
      }}
    >
      <button
        onClick={() => navigate("/signin")}
        className="w-10 h-10 rounded-2xl flex items-center justify-center mb-8 tap-scale"
        style={{ boxShadow: "var(--shadow-raised)", background: "hsl(var(--background))" }}
      >
        <ChevronLeft className="w-5 h-5 text-foreground" />
      </button>

      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-foreground leading-tight">Reset your password</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Enter your email address and we'll send you a verification code to reset your password.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 flex-1 flex flex-col">
        <div className="flex-1">
          <label className="text-xs font-extrabold text-muted-foreground uppercase tracking-wide mb-2 block">
            Email Address
          </label>
          <div className="flex items-center overflow-hidden rounded-2xl relative" style={{ boxShadow: "var(--shadow-inset)", background: "hsl(var(--background))", height: 52 }}>
            <div className="w-12 h-full flex items-center justify-center flex-shrink-0">
              <Mail className="w-4 h-4 text-muted-foreground" />
            </div>
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 h-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none pr-12"
              required
            />
            {isValidEmail && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <button
            type="submit"
            disabled={!isValidEmail || loading}
            className="w-full rounded-2xl h-14 font-bold text-[15px] flex items-center justify-center tap-scale disabled:opacity-50 disabled:pointer-events-none transition-opacity"
            style={{
              background: "hsl(var(--primary))",
              color: "hsl(var(--primary-foreground))",
              boxShadow: "0 4px 14px 0 rgba(var(--primary), 0.39)",
            }}
          >
            {loading ? "Sending..." : "Send verification code"}
          </button>
          
          <button
            type="button"
            onClick={() => navigate("/signin")}
            className="w-full text-sm font-semibold text-muted-foreground h-10 flex items-center justify-center tap-scale"
          >
            Back to login
          </button>
        </div>
      </form>
    </div>
  );
}
