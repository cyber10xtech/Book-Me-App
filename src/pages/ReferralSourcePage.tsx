/**
 * ReferralSourcePage
 * Shown immediately after a new user signs up (or first login if referral_source is null).
 * The user MUST select one option — no skip. Selection is saved to profiles.referral_source.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, CheckCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const OPTIONS: { value: string; label: string; subtitle: string; emoji: string }[] = [
  {
    value: "shop_sticker_qr",
    label: "At a shop",
    subtitle: "Book Me sticker / QR code",
    emoji: "🏪",
  },
  {
    value: "book_me_rep",
    label: "Book Me representative",
    subtitle: "A Book Me team member told me",
    emoji: "🤝",
  },
  {
    value: "keke_bus",
    label: "Keke / Bus",
    subtitle: "I saw it on a keke or bus",
    emoji: "🛺",
  },
  {
    value: "instagram_tiktok",
    label: "Instagram / TikTok",
    subtitle: "Saw it on social media",
    emoji: "📱",
  },
  {
    value: "online_ads",
    label: "Online ads",
    subtitle: "Google, YouTube or other ads",
    emoji: "💻",
  },
  {
    value: "friend_referral",
    label: "From a friend / referral",
    subtitle: "A friend recommended Book Me",
    emoji: "👥",
  },
];

const ReferralSourcePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleContinue = async () => {
    if (!selected) {
      toast.error("Please select how you heard about us to continue.");
      return;
    }
    if (!user) return;

    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ referral_source: selected as any })
      .eq("user_id", user.id);

    if (error) {
      toast.error("Could not save your selection. Please try again.");
      setSaving(false);
      return;
    }

    // Navigate to home — app is fully set up
    navigate("/home", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background px-5 py-10 flex flex-col">
      {/* Header */}
      <div className="mb-6">
        <p className="text-3xl mb-2">🎉</p>
        <h1 className="text-2xl font-extrabold text-foreground leading-tight">One last thing</h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          How did you hear about <span className="font-bold text-foreground">Book Me</span>?
          This helps us grow!
        </p>
      </div>

      {/* Options */}
      <div className="flex flex-col gap-3 flex-1">
        {OPTIONS.map((opt) => {
          const isSelected = selected === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => setSelected(opt.value)}
              className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl border-2 text-left transition-all active:scale-[0.98] ${
                isSelected
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card"
              }`}
            >
              <span className="text-2xl w-9 text-center flex-shrink-0">{opt.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className={`font-bold text-sm ${isSelected ? "text-primary" : "text-foreground"}`}>
                  {opt.label}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{opt.subtitle}</p>
              </div>
              {/* Radio circle */}
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                  isSelected ? "border-primary" : "border-muted-foreground/40"
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

      {/* CTA */}
      <div className="mt-6 flex gap-3">
        <button
          onClick={() => navigate("/home", { replace: true })}
          className="px-5 py-4 rounded-2xl border border-border text-sm font-semibold text-muted-foreground"
        >
          Back
        </button>
        <button
          onClick={handleContinue}
          disabled={saving || !selected}
          className="flex-1 py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] transition-transform"
        >
          {saving ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
          ) : (
            "Complete Setup"
          )}
        </button>
      </div>
    </div>
  );
};

export default ReferralSourcePage;
