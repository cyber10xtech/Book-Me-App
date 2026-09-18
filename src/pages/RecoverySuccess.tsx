import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function RecoverySuccess() {
  const navigate = useNavigate();

  useEffect(() => {
    const cleanup = async () => {
      // Clear session storage recovery items
      sessionStorage.removeItem("recovery_email");
      sessionStorage.removeItem("recovery_stage");
      sessionStorage.removeItem("recovery_resend_cooldown");

      // Sign out the temporary recovery session
      await supabase.auth.signOut();
    };
    
    cleanup();
  }, []);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 pb-10 text-center"
      style={{
        background: "hsl(var(--background))",
      }}
    >
      <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6" style={{ background: "hsl(var(--primary)/0.1)" }}>
        <CheckCircle2 className="w-10 h-10 text-primary" />
      </div>

      <h1 className="text-3xl font-extrabold text-foreground leading-tight mb-4">Password updated</h1>
      
      <p className="text-base text-muted-foreground mb-10 max-w-[280px]">
        Your password has been changed successfully. You can now sign in with your new password.
      </p>

      <button
        onClick={() => navigate("/signin", { replace: true })}
        className="w-full max-w-[300px] rounded-2xl h-14 font-bold text-[15px] flex items-center justify-center tap-scale transition-opacity"
        style={{
          background: "hsl(var(--primary))",
          color: "hsl(var(--primary-foreground))",
          boxShadow: "0 4px 14px 0 rgba(var(--primary), 0.39)",
        }}
      >
        Continue to login
      </button>
    </div>
  );
}
