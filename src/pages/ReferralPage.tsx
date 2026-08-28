/**
 * ReferralPage
 * Shown once after a user's first login if profile.referral_source is null.
 * User MUST select an option before they can access the dashboard.
 * Selection is written to profiles.referral_source immediately.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface ReferralOption {
  value: string;
  emoji: string;
  label: string;
  sublabel: string;
}

const OPTIONS: ReferralOption[] = [
  {
    value: "shop_sticker_qr",
    emoji: "🏪",
    label: "At a shop",
    sublabel: "Book Me sticker / QR code",
  },
  {
    value: "book_me_rep",
    emoji: "🤝",
    label: "Book Me representative",
    sublabel: "A Book Me team member told me",
  },
  {
    value: "keke_bus",
    emoji: "🛺",
    label: "Keke / Bus",
    sublabel: "I saw it on a keke or bus",
  },
  {
    value: "instagram_tiktok",
    emoji: "📱",
    label: "Instagram / TikTok",
    sublabel: "Saw it on social media",
  },
  {
    value: "online_ads",
    emoji: "💻",
    label: "Online ads",
    sublabel: "Google, YouTube or other ads",
  },
  {
    value: "friend_referral",
    emoji: "👥",
    label: "From a friend / referral",
    sublabel: "A friend recommended Book Me",
  },
];

interface ReferralPageProps {
  onComplete?: () => void;
}

const ReferralPage = ({ onComplete }: ReferralPageProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleComplete = async () => {
    if (!selected) {
      toast.error("Please select an option to continue.");
      return;
    }
    if (!user) return;

    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ referral_source: selected } as any)
      .eq("user_id", user.id);

    setSaving(false);

    if (error) {
      console.error("[ReferralPage] Failed to save:", error.message);
      // Don't block the user — let them through and log the error
      toast.error("Couldn't save your answer, but you can still continue.");
    }

    // Clear the referral gate in App before navigating so ReferralGuard lets us through
    onComplete?.();
    navigate("/home", { replace: true });
  };

  return (
    <div className="min-h-screen bg-primary flex flex-col">
      {/* Top gradient header */}
      <div className="px-6 pt-14 pb-8 flex-shrink-0">
        <p className="text-4xl mb-3">🎉</p>
        <h1 className="text-2xl font-extrabold text-primary-foreground leading-tight">
          One last thing
        </h1>
        <p className="text-sm text-primary-foreground/70 mt-2 leading-relaxed">
          How did you hear about <span className="font-bold text-primary-foreground">Book Me</span>?
          {" "}This helps us grow!
        </p>
      </div>

      {/* White card */}
      <div className="flex-1 bg-background rounded-t-3xl px-5 pt-6 pb-10 flex flex-col overflow-y-auto">
        <div className="space-y-3 flex-1">
          {OPTIONS.map((opt) => {
            const isSelected = selected === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setSelected(opt.value)}
                className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl border-2 text-left transition-all active:scale-[0.98] ${
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card hover:border-primary/30"
                }`}
              >
                {/* Emoji icon */}
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${
                    isSelected ? "bg-primary/10" : "bg-muted"
                  }`}
                >
                  {opt.emoji}
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground leading-tight">{opt.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{opt.sublabel}</p>
                </div>

                {/* Radio indicator */}
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                    isSelected ? "border-primary" : "border-muted-foreground/30"
                  }`}
                >
                  {isSelected && (
                    <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Bottom actions */}
        <div className="mt-6 pt-4 border-t border-border flex gap-3">
          <button
            onClick={() => navigate("/home", { replace: true })}
            className="flex-1 h-13 py-4 rounded-2xl border border-border text-sm font-semibold text-muted-foreground active:scale-[0.98] transition-transform"
          >
            Back
          </button>
          <button
            onClick={handleComplete}
            disabled={!selected || saving}
            className="flex-[2] h-13 py-4 rounded-2xl bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] transition-transform"
          >
            {saving ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Complete Setup
              </>
            )}
          </button>
        </div>

        {/* Already have account link */}
        <p className="text-center text-xs text-muted-foreground mt-4">
          Already have an account?{" "}
          <button
            onClick={() => navigate("/signin")}
            className="text-primary font-bold underline"
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
};

export default ReferralPage;
