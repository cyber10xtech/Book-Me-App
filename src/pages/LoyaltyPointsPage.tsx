/**
 * LoyaltyPointsPage.tsx
 * Full-screen loyalty points page — neumorphic design.
 * Shows: live points, level card, progress ring, earn guide, points log.
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Star, Zap, Gift, CheckCircle, Clock, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { getLevelInfo } from "@/hooks/useCustomerPoints";

interface LogEntry {
  id: string;
  action: string;
  points_earned: number;
  created_at: string;
}

const ACTION_META: Record<string, { label: string; icon: string; color: string }> = {
  booking_completed: { label: "Booking completed",  icon: "✅", color: "#22c55e" },
  review_submitted:  { label: "Review submitted",   icon: "⭐", color: "#f59e0b" },
  first_booking:     { label: "First booking bonus",icon: "🎉", color: "#8b5cf6" },
};

const LEVEL_COLORS: Record<string, { bg: string; fg: string; bar: string }> = {
  Bronze:   { bg: "hsl(35 60% 95%)",  fg: "#a16207",  bar: "#a16207" },
  Silver:   { bg: "hsl(215 20% 95%)", fg: "#64748b",  bar: "#94a3b8" },
  Gold:     { bg: "hsl(45 95% 94%)",  fg: "#d97706",  bar: "#f59e0b" },
  Platinum: { bg: "hsl(270 60% 96%)", fg: "#7c3aed",  bar: "#8b5cf6" },
};

const HOW_TO_EARN = [
  { pts: "+50",  label: "Complete a booking",  icon: CheckCircle, desc: "Earn every time a booking is marked complete." },
  { pts: "+30",  label: "Leave a review",      icon: Star,        desc: "Rate a provider after your service." },
  { pts: "+100", label: "First booking bonus", icon: Gift,        desc: "One-time reward on your very first booking." },
];

const LEVEL_TIERS = [
  { level: "Bronze",   emoji: "🥉", min: 0,    max: 199,   perks: "Basic member perks" },
  { level: "Silver",   emoji: "🥈", min: 200,  max: 499,   perks: "Priority support" },
  { level: "Gold",     emoji: "🥇", min: 500,  max: 999,   perks: "Exclusive promotions" },
  { level: "Platinum", emoji: "💎", min: 1000, max: null,  perks: "VIP access & top perks" },
];

const LoyaltyPointsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [points,     setPoints]     = useState(0);
  const [log,        setLog]        = useState<LogEntry[]>([]);
  const [logLoading, setLogLoading] = useState(true);
  const [profileId,  setProfileId]  = useState<string | null>(null);

  // Load profile → points + log
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: prof } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();
      if (!prof) return;
      setProfileId(prof.id);

      const { data: pts } = await supabase
        .from("customer_points")
        .select("total_points")
        .eq("profile_id", prof.id)
        .maybeSingle();
      setPoints(pts?.total_points ?? 0);

      const { data: history } = await supabase
        .from("customer_points_log")
        .select("id, action, points_earned, created_at")
        .eq("profile_id", prof.id)
        .order("created_at", { ascending: false })
        .limit(30);
      setLog(history || []);
      setLogLoading(false);
    })();
  }, [user]);

  // Real-time points subscription
  useEffect(() => {
    if (!profileId) return;
    const channel = supabase
      .channel(`loyalty_page:${profileId}`)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "customer_points",
        filter: `profile_id=eq.${profileId}`,
      }, (payload) => {
        const row = payload.new as { total_points?: number } | null;
        if (row && typeof row.total_points === "number") setPoints(row.total_points);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profileId]);

  const lvl    = getLevelInfo(points);
  const colors = LEVEL_COLORS[lvl.level];
  const circumference = 2 * Math.PI * 44; // r=44
  const dashOffset    = circumference - (lvl.progress / 100) * circumference;

  return (
    <div className="min-h-screen pb-28" style={{ background: "hsl(var(--background))" }}>

      {/* Header */}
      <div
        className="px-5 pt-10 pb-6 flex items-center gap-3"
        style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-flat)" }}
      >
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-2xl flex items-center justify-center tap-scale flex-shrink-0"
          style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)" }}
        >
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </button>
        <div>
          <h1 className="text-xl font-extrabold text-foreground">Loyalty Points</h1>
          <p className="text-xs text-muted-foreground">Earn rewards every time you book</p>
        </div>
      </div>

      <div className="px-5 pt-4 space-y-4">

        {/* ── Hero level card ──────────────────────────────────────────── */}
        <div
          className="rounded-3xl p-6 relative overflow-hidden"
          style={{ background: colors.bg, boxShadow: "var(--shadow-raised)" }}
        >
          {/* Decorative circle */}
          <div
            className="absolute -right-10 -top-10 w-48 h-48 rounded-full opacity-10"
            style={{ background: colors.bar }}
          />
          <div className="flex items-center gap-5 relative z-10">
            {/* Progress ring */}
            <div className="relative w-28 h-28 flex-shrink-0">
              <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="44" fill="none"
                  stroke="rgba(0,0,0,0.08)" strokeWidth="8" />
                <circle cx="50" cy="50" r="44" fill="none"
                  stroke={colors.bar} strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                  style={{ transition: "stroke-dashoffset 1s ease" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl">{lvl.emoji}</span>
                <span className="text-[10px] font-extrabold mt-0.5" style={{ color: colors.fg }}>
                  {lvl.level}
                </span>
              </div>
            </div>

            <div className="flex-1">
              <p className="text-[11px] font-bold uppercase tracking-wider mb-0.5" style={{ color: colors.fg }}>
                BookMe Points
              </p>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-extrabold" style={{ color: colors.fg }}>
                  {points.toLocaleString()}
                </span>
                <span className="text-sm font-semibold text-muted-foreground">pts</span>
              </div>
              {lvl.next ? (
                <>
                  <p className="text-xs text-muted-foreground mt-2">
                    {lvl.pointsToNext} pts to <strong>{lvl.next}</strong>
                  </p>
                  <div
                    className="h-2 rounded-full mt-1.5"
                    style={{ background: "rgba(0,0,0,0.08)" }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${lvl.progress}%`, background: colors.bar }}
                    />
                  </div>
                </>
              ) : (
                <p className="text-xs font-bold mt-2" style={{ color: colors.fg }}>
                  💎 Maximum level reached!
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── How to earn ──────────────────────────────────────────────── */}
        <div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 px-1">
            How to earn points
          </p>
          <div className="rounded-3xl overflow-hidden" style={{ boxShadow: "var(--shadow-raised)", background: "hsl(var(--background))" }}>
            {HOW_TO_EARN.map((item, i) => (
              <div
                key={item.label}
                className="flex items-center gap-4 px-4 py-4"
                style={{ borderBottom: i < HOW_TO_EARN.length - 1 ? "1px solid hsl(var(--border))" : "none" }}
              >
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-flat)" }}
                >
                  <item.icon className="w-5 h-5" style={{ color: "hsl(var(--primary))" }} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-extrabold text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                </div>
                <span
                  className="text-base font-extrabold"
                  style={{ color: "hsl(var(--primary))" }}
                >
                  {item.pts}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Tier ladder ──────────────────────────────────────────────── */}
        <div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 px-1">
            Membership tiers
          </p>
          <div className="grid grid-cols-2 gap-3">
            {LEVEL_TIERS.map(tier => {
              const tc   = LEVEL_COLORS[tier.level];
              const active = lvl.level === tier.level;
              return (
                <div
                  key={tier.level}
                  className="rounded-3xl p-4 relative"
                  style={{
                    background: active ? tc.bg : "hsl(var(--background))",
                    boxShadow: active ? "var(--shadow-raised)" : "var(--shadow-flat)",
                    border: active ? `2px solid ${tc.bar}` : "2px solid transparent",
                  }}
                >
                  {active && (
                    <span
                      className="absolute top-3 right-3 text-[9px] font-extrabold px-2 py-0.5 rounded-full text-white"
                      style={{ background: tc.bar }}
                    >
                      YOU
                    </span>
                  )}
                  <div className="text-2xl mb-2">{tier.emoji}</div>
                  <p className="font-extrabold text-sm text-foreground">{tier.level}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {tier.max ? `${tier.min}–${tier.max} pts` : `${tier.min}+ pts`}
                  </p>
                  <p className="text-[10px] font-semibold mt-1" style={{ color: tc.fg }}>
                    {tier.perks}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Points history ────────────────────────────────────────────── */}
        <div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 px-1">
            Points history
          </p>
          {logLoading ? (
            <div
              className="rounded-3xl p-10 flex items-center justify-center"
              style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-flat)" }}
            >
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : log.length === 0 ? (
            <div
              className="rounded-3xl p-10 text-center"
              style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-flat)" }}
            >
              <Zap className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-bold text-foreground">No points yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Book a service to start earning!
              </p>
            </div>
          ) : (
            <div
              className="rounded-3xl overflow-hidden"
              style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)" }}
            >
              {log.map((entry, i) => {
                const meta = ACTION_META[entry.action] ?? {
                  label: entry.action.replace(/_/g, " "),
                  icon: "⭐",
                  color: "#64748b",
                };
                const date = new Date(entry.created_at).toLocaleDateString("en-NG", {
                  day: "numeric", month: "short", year: "numeric",
                });
                return (
                  <div
                    key={entry.id}
                    className="flex items-center gap-3 px-4 py-3.5"
                    style={{ borderBottom: i < log.length - 1 ? "1px solid hsl(var(--border))" : "none" }}
                  >
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 text-lg"
                      style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-flat)" }}
                    >
                      {meta.icon}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground capitalize">{meta.label}</p>
                      <div className="flex items-center gap-1 mt-0.5 text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span className="text-[11px]">{date}</span>
                      </div>
                    </div>
                    <span
                      className="text-sm font-extrabold"
                      style={{ color: meta.color }}
                    >
                      +{entry.points_earned}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default LoyaltyPointsPage;
