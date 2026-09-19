import { useState, useEffect, useRef } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export default function RecoveryOTP() {
  const navigate = useNavigate();
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const isVerifying = useRef(false);

  const email = sessionStorage.getItem("recovery_email");
  const stage = sessionStorage.getItem("recovery_stage");

  // Mask email: "t***@example.com"
  const maskedEmail = email
    ? `${email.charAt(0)}***@${email.split("@")[1]}`
    : "";


  useEffect(() => {
    const checkCooldown = () => {
      const stored = sessionStorage.getItem("recovery_resend_cooldown");
      if (stored) {
        const remaining = Math.max(0, Math.ceil((parseInt(stored) - Date.now()) / 1000));
        setCooldown(remaining);
      }
    };
    checkCooldown();
    const interval = setInterval(checkCooldown, 1000);
    return () => clearInterval(interval);
  }, [navigate]);

  // Early exit if state is invalid (prevents history loops during back navigation)
  if (!email || stage !== "otp") {
    return <Navigate to="/recover-password/email" replace />;
  }

  const verifyOTP = async (code: string) => {
    if (isVerifying.current || !email) return;
    
    isVerifying.current = true;
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: "recovery",
      });

      if (error) {
        if (error.message.includes("Token has expired") || error.message.includes("expired")) {
          toast.error("That code has expired. Please request a new one.");
        } else if (error.message.includes("fetch") || error.message.includes("Network")) {
          toast.error("Unable to connect. Check your internet connection and try again.");
        } else {
          toast.error("Incorrect code. Please try again.");
        }
      } else if (data?.session) {
        // Mark as verified and move to next step
        sessionStorage.setItem("recovery_stage", "new_password");
        navigate("/recover-password/new", { replace: true });
      } else {
        toast.error("An unexpected error occurred. Please try again.");
      }
    } catch (err) {
      toast.error("Unable to connect. Check your internet connection and try again.");
    } finally {
      isVerifying.current = false;
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 8);
    setOtp(val);
    
    // Auto-submit on 8 digits
    if (val.length === 8 && !isVerifying.current) {
      verifyOTP(val);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || loading || !email) return;
    setLoading(true);
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) {
        toast.error("Failed to resend code. Please try again later.");
      } else {
        toast.success("A new code has been sent to your email.");
        setOtp("");
        inputRef.current?.focus();
        sessionStorage.setItem("recovery_resend_cooldown", (Date.now() + 60000).toString());
        setCooldown(60);
      }
    } catch (err) {
      toast.error("Unable to connect. Check your internet connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleChangeEmail = () => {
    sessionStorage.removeItem("recovery_email");
    sessionStorage.removeItem("recovery_stage");
    sessionStorage.removeItem("recovery_resend_cooldown");
    navigate("/recover-password/email", { replace: true });
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
        onClick={handleChangeEmail}
        className="w-10 h-10 rounded-2xl flex items-center justify-center mb-8 tap-scale"
        style={{ boxShadow: "var(--shadow-raised)", background: "hsl(var(--background))" }}
      >
        <ChevronLeft className="w-5 h-5 text-foreground" />
      </button>

      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-foreground leading-tight">Check your email</h1>
        <p className="text-sm text-muted-foreground mt-2">
          We've sent an 8-digit code to <strong>{maskedEmail}</strong>.
        </p>
      </div>

      <div className="flex-1 flex flex-col items-center">
        {/* Hidden Input for handling paste/autofill/mobile keyboard naturally */}
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          value={otp}
          onChange={handleInputChange}
          maxLength={8}
          className="opacity-0 absolute inset-0 w-full h-16 z-10 cursor-text"
          disabled={loading}
          aria-label="8-digit verification code"
        />

        {/* 8 Visual Slots */}
        <div className="flex gap-2 mb-8 justify-center w-full pointer-events-none">
          {[...Array(8)].map((_, i) => {
            const digit = otp[i] || "";
            const isActive = i === otp.length;
            return (
              <div
                key={i}
                className={`w-10 h-14 rounded-xl flex items-center justify-center text-xl font-bold transition-all ${
                  isActive ? "ring-2 ring-primary scale-105" : ""
                }`}
                style={{
                  background: "hsl(var(--background))",
                  boxShadow: "var(--shadow-inset)",
                  color: digit ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))"
                }}
              >
                {digit}
              </div>
            );
          })}
        </div>

        <button
          onClick={() => verifyOTP(otp)}
          disabled={otp.length !== 8 || loading}
          className="w-full rounded-2xl h-14 font-bold text-[15px] flex items-center justify-center tap-scale disabled:opacity-50 disabled:pointer-events-none transition-opacity mb-4"
          style={{
            background: "hsl(var(--primary))",
            color: "hsl(var(--primary-foreground))",
            boxShadow: "0 4px 14px 0 rgba(var(--primary), 0.39)",
          }}
        >
          {loading ? "Verifying..." : "Verify code"}
        </button>

        <div className="flex flex-col items-center gap-4 mt-6">
          <button
            type="button"
            onClick={handleResend}
            disabled={cooldown > 0 || loading}
            className="text-sm font-semibold text-primary tap-scale disabled:text-muted-foreground disabled:opacity-50"
          >
            {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
          </button>
          
          <button
            type="button"
            onClick={handleChangeEmail}
            className="text-sm font-semibold text-muted-foreground tap-scale"
          >
            Change email address
          </button>
        </div>
      </div>
    </div>
  );
}
