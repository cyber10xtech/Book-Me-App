import React from "react";
import { ShieldAlert, LogOut } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface DeactivatedScreenProps {
  onSignOut?: () => void;
}

export const DeactivatedScreen: React.FC<DeactivatedScreenProps> = ({ onSignOut }) => {
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    if (onSignOut) {
      onSignOut();
    } else {
      window.location.href = "/";
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center px-6 text-center"
      style={{ background: "hsl(var(--background))" }}
    >
      <div
        className="w-full max-w-sm rounded-3xl p-6 flex flex-col items-center gap-4"
        style={{
          background: "hsl(var(--background))",
          boxShadow: "var(--shadow-raised)",
          border: "1.5px solid hsl(0 84% 85%)",
        }}
      >
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ background: "hsl(0 84% 95%)", boxShadow: "var(--shadow-flat)" }}
        >
          <ShieldAlert className="w-8 h-8 text-destructive" />
        </div>

        <div>
          <h2 className="text-xl font-extrabold text-foreground mb-2">Account Deactivated</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Your account has been deactivated due to suspicious activity.
          </p>
        </div>

        <button
          onClick={handleSignOut}
          className="w-full h-12 mt-2 rounded-2xl text-white font-bold text-sm flex items-center justify-center gap-2 tap-scale"
          style={{
            background: "linear-gradient(135deg,#ef4444,#dc2626)",
            boxShadow: "0 4px 14px rgba(239,68,68,0.35)",
          }}
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
};

export default DeactivatedScreen;
