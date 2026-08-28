import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  User, Edit2, Settings, LogOut, Bell, Shield, Heart,
  HelpCircle, ChevronRight, Camera, CheckCircle, Gift, Info,
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { getLevelInfo } from "@/hooks/useCustomerPoints";
import { toast } from "sonner";

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [profile, setProfile]           = useState<any>(null);
  const [points, setPoints]             = useState(0);
  const [savedCount, setSavedCount]     = useState(0);
  const [bookingCount, setBookingCount] = useState(0);
  const [editing, setEditing]           = useState(false);
  const [saving, setSaving]             = useState(false);
  const [form, setForm] = useState({ full_name: "", username: "", phone: "", bio: "" });
  const avatarRef = useRef<HTMLInputElement>(null);
  const profileIdRef = useRef<string | null>(null);

  // ── Initial data load ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    let channel: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      const { data: p } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (!p) return;

      profileIdRef.current = p.id;
      setProfile(p);
      setForm({ full_name: p.full_name || "", username: p.username || "", phone: p.phone || "", bio: p.bio || "" });

      // Points (profile_id is the canonical column per schema)
      const { data: pts } = await supabase
        .from("customer_points")
        .select("total_points")
        .eq("profile_id", p.id)
        .maybeSingle();
      setPoints(pts?.total_points ?? 0);

      // Saved providers count
      const { count: sc } = await supabase
        .from("saved_providers")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);
      setSavedCount(sc ?? 0);

      // Bookings count
      const { count: bc } = await supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .eq("customer_id", p.id);
      setBookingCount(bc ?? 0);

      // ── Real-time subscription: points auto-update ──────────────────────
      // We listen to INSERT and UPDATE on customer_points for this profile.
      channel = supabase
        .channel(`points:${p.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "customer_points",
            filter: `profile_id=eq.${p.id}`,
          },
          (payload) => {
            const newRow = payload.new as { total_points?: number } | null;
            if (newRow && typeof newRow.total_points === "number") {
              setPoints((prev) => {
                if (prev !== newRow.total_points) {
                  // Surface a subtle toast only on increase (booking completions, etc.)
                  if (newRow.total_points! > prev) {
                    const diff = newRow.total_points! - prev;
                    toast(`⭐ +${diff} points!`, { description: `Total: ${newRow.total_points} pts`, duration: 3500 });
                  }
                }
                return newRow.total_points!;
              });
            }
          }
        )
        .subscribe();
    })();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [user]);

  // ── Avatar upload ──────────────────────────────────────────────────────────
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const path = `${user.id}/avatar.${file.name.split(".").pop()}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) { toast.error("Upload failed"); return; }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    await supabase.from("profiles").update({ avatar_url: data.publicUrl }).eq("user_id", user.id);
    setProfile((p: any) => ({ ...p, avatar_url: data.publicUrl }));
    toast.success("Photo updated!");
    e.target.value = "";
  };

  // ── Save profile edits ─────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: form.full_name, username: form.username, phone: form.phone, bio: form.bio })
      .eq("user_id", user.id);
    if (error) toast.error(error.message);
    else { setProfile((p: any) => ({ ...p, ...form })); setEditing(false); toast.success("Profile saved!"); }
    setSaving(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/signin", { replace: true });
  };

  const initials    = (profile?.full_name || user?.email || "U")[0].toUpperCase();
  const levelInfo   = getLevelInfo(points);

  // ── Guest view ──────────────────────────────────────────────────────────
  // No account yet: show who they're browsing as + a way to sign in/register.
  // Never redirects or errors — guests are always welcome on this page.
  if (!user) {
    const BENEFITS = [
      { icon: Heart,       label: "Save your favourite providers" },
      { icon: CheckCircle, label: "Track and manage your bookings" },
      { icon: Gift,        label: "Earn loyalty points on every visit" },
      { icon: Bell,        label: "Get booking updates in real time" },
    ];

    return (
      <div className="min-h-screen pb-28" style={{ background: "hsl(var(--background))", paddingTop: "env(safe-area-inset-top)" }}>
        <div className="px-5 pt-6 pb-4">
          <h1 className="text-2xl font-extrabold text-foreground mb-6">Profile</h1>

          {/* Avatar + Guest badge */}
          <div className="flex flex-col items-center mb-6">
            <div className="w-24 h-24 rounded-3xl overflow-hidden flex items-center justify-center mb-3"
              style={{ boxShadow: "var(--shadow-raised)", background: "hsl(var(--muted))" }}>
              <User className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-extrabold text-foreground">Guest User</h2>
            <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full mt-1"
              style={{ background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" }}>
              GUEST
            </span>
            <p className="text-sm text-muted-foreground text-center mt-3 max-w-[28ch]">
              You are currently browsing as a guest.
            </p>
          </div>

          {/* Sign in / create account */}
          <div className="space-y-3 mb-6">
            <button onClick={() => navigate("/signin")}
              className="w-full h-12 rounded-2xl text-white text-sm font-bold tap-scale"
              style={{ background: "linear-gradient(145deg, hsl(199 100% 50%), hsl(199 100% 38%))", boxShadow: "var(--shadow-sky)" }}>
              Sign In
            </button>
            <button onClick={() => navigate("/signup")}
              className="w-full h-12 rounded-2xl text-sm font-bold tap-scale"
              style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)", color: "hsl(var(--foreground))" }}>
              Create Account
            </button>
          </div>

          {/* Benefits of creating an account */}
          <div className="rounded-3xl overflow-hidden mb-5" style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)" }}>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide px-5 pt-4 pb-1">
              Why create an account?
            </p>
            {BENEFITS.map((b, i) => (
              <div key={b.label} className="flex items-center gap-4 px-5 py-3.5"
                style={{ borderTop: i > 0 ? "1px solid hsl(var(--border))" : "none" }}>
                <div className="w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-flat)" }}>
                  <b.icon className="w-4 h-4" style={{ color: "hsl(var(--primary))" }} />
                </div>
                <span className="text-sm font-semibold text-foreground">{b.label}</span>
              </div>
            ))}
          </div>

          {/* Help / About — still reachable as a guest */}
          <div className="rounded-3xl overflow-hidden" style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)" }}>
            <button onClick={() => navigate("/help")}
              className="w-full flex items-center gap-4 px-5 py-4 tap-scale text-left"
              style={{ borderBottom: "1px solid hsl(var(--border))" }}>
              <div className="w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-flat)" }}>
                <HelpCircle className="w-4 h-4 text-foreground" />
              </div>
              <span className="flex-1 text-sm font-semibold text-foreground">Help</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
            <button onClick={() => navigate("/privacy-security")}
              className="w-full flex items-center gap-4 px-5 py-4 tap-scale text-left">
              <div className="w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-flat)" }}>
                <Info className="w-4 h-4 text-foreground" />
              </div>
              <span className="flex-1 text-sm font-semibold text-foreground">About</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        <BottomNav />
      </div>
    );
  }

  const MENU = [
    { icon: Heart,      label: "Saved Providers",    badge: savedCount > 0 ? String(savedCount) : null, action: () => navigate("/saved") },
    { icon: Bell,       label: "Notifications",      badge: null, action: () => navigate("/notifications") },
    { icon: Gift,       label: "Loyalty Points",     badge: `${points} pts`,  action: () => navigate("/loyalty") },
    { icon: Shield,     label: "Privacy & Security", badge: null, action: () => navigate("/privacy-security") },
    { icon: HelpCircle, label: "Help & Support",     badge: null, action: () => navigate("/help") },
    { icon: Settings,   label: "Settings",           badge: null, action: () => navigate("/settings") },
  ];

  const neuInput: React.CSSProperties = {
    background: "hsl(var(--background))", boxShadow: "var(--shadow-inset)",
    border: "none", outline: "none", borderRadius: "1rem",
    height: 48, width: "100%", padding: "0 1rem", fontSize: 14,
    color: "hsl(var(--foreground))",
  };

  return (
    <div className="min-h-screen pb-28" style={{ background: "hsl(var(--background))", paddingTop: "env(safe-area-inset-top)" }}>
      <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />

      {/* Header */}
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-extrabold text-foreground">Profile</h1>
          <button onClick={() => setEditing(v => !v)}
            className="w-10 h-10 rounded-2xl flex items-center justify-center tap-scale"
            style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)" }}>
            <Edit2 className="w-4 h-4 text-foreground" />
          </button>
        </div>

        {/* Avatar + name */}
        <div className="flex flex-col items-center mb-5">
          <div className="relative mb-3">
            <div className="w-24 h-24 rounded-3xl overflow-hidden" style={{ boxShadow: "var(--shadow-raised)" }}>
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-3xl font-extrabold text-white"
                    style={{ background: "linear-gradient(135deg, hsl(199 100% 50%), hsl(220 100% 30%))" }}>
                    {initials}
                  </div>}
            </div>
            <button onClick={() => avatarRef.current?.click()}
              className="absolute -bottom-1.5 -right-1.5 w-8 h-8 rounded-2xl flex items-center justify-center tap-scale"
              style={{ background: "linear-gradient(145deg, hsl(199 100% 50%), hsl(199 100% 38%))", boxShadow: "var(--shadow-sky)" }}>
              <Camera className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
          <h2 className="text-lg font-extrabold text-foreground">{profile?.full_name || user?.email?.split("@")[0]}</h2>
          <p className="text-sm text-muted-foreground">@{profile?.username || "user"}</p>
          {profile?.is_verified && (
            <div className="flex items-center gap-1 mt-1">
              <CheckCircle className="w-3.5 h-3.5" style={{ color: "hsl(var(--primary))" }} />
              <span className="text-xs font-bold" style={{ color: "hsl(var(--primary))" }}>Verified</span>
            </div>
          )}
        </div>

        {/* Stats row – points value updates reactively */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { value: bookingCount, label: "Bookings" },
            { value: savedCount,   label: "Saved"    },
            { value: points,       label: "Points"   },
          ].map(s => (
            <div key={s.label} className="rounded-3xl p-3 text-center"
              style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)" }}>
              <p className="text-xl font-extrabold text-foreground">{s.value}</p>
              <p className="text-[10px] text-muted-foreground font-semibold">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Loyalty level card – progress bar and label auto-reflect live points */}
        <div className="rounded-3xl p-4 flex items-center gap-4 mb-2"
          style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)" }}>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-flat)" }}>
            <span className="text-2xl">{levelInfo.emoji}</span>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="font-extrabold text-sm text-foreground">{levelInfo.level} Member</p>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                style={{
                  background: levelInfo.level === "Gold" ? "#f59e0b"
                    : levelInfo.level === "Silver"  ? "#94a3b8"
                    : levelInfo.level === "Platinum" ? "#8b5cf6"
                    : "#a16207",
                }}>
                {levelInfo.level}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {points} pts ·{" "}
              {levelInfo.pointsToNext != null
                ? `${levelInfo.pointsToNext} pts to ${levelInfo.next}`
                : "Top tier! 🎉"}
            </p>
            <div className="h-2 rounded-full mt-1.5"
              style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-inset)" }}>
              <div className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${levelInfo.progress}%`,
                  background: levelInfo.level === "Gold" ? "#f59e0b"
                    : levelInfo.level === "Silver"  ? "#94a3b8"
                    : levelInfo.level === "Platinum" ? "#8b5cf6"
                    : "#a16207",
                }} />
            </div>
          </div>
        </div>
      </div>

      {/* Edit form */}
      {editing && (
        <div className="px-5 mb-5 animate-fade-in">
          <div className="rounded-3xl p-5" style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)" }}>
            <p className="text-sm font-extrabold text-foreground mb-4">Edit Profile</p>
            <div className="space-y-3">
              {[
                { label: "Full Name", key: "full_name", placeholder: "John Doe",    type: "text" },
                { label: "Username",  key: "username",  placeholder: "johndoe",     type: "text" },
                { label: "Phone",     key: "phone",     placeholder: "+234 800...", type: "tel"  },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wide mb-1.5 block">{f.label}</label>
                  <input type={f.type} value={(form as any)[f.key]} placeholder={f.placeholder}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    style={neuInput} />
                </div>
              ))}
              <div>
                <label className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wide mb-1.5 block">Bio</label>
                <textarea value={form.bio} placeholder="Tell providers about yourself..."
                  onChange={e => setForm(p => ({ ...p, bio: e.target.value }))}
                  style={{ ...neuInput, height: 80, padding: "0.75rem 1rem", resize: "none" }} />
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setEditing(false)}
                  className="flex-1 h-11 rounded-2xl text-sm font-bold tap-scale"
                  style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)", color: "hsl(var(--muted-foreground))" }}>
                  Cancel
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 h-11 rounded-2xl text-white text-sm font-bold flex items-center justify-center gap-2 tap-scale disabled:opacity-50"
                  style={{ background: "linear-gradient(145deg, hsl(199 100% 50%), hsl(199 100% 38%))", boxShadow: "var(--shadow-sky)" }}>
                  {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Menu */}
      <div className="px-5 mb-5">
        <div className="rounded-3xl overflow-hidden" style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)" }}>
          {MENU.map((item, i) => (
            <button key={item.label} onClick={item.action}
              className="w-full flex items-center gap-4 px-5 py-4 tap-scale text-left"
              style={{ borderBottom: i < MENU.length - 1 ? "1px solid hsl(var(--border))" : "none" }}>
              <div className="w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-flat)" }}>
                <item.icon className="w-4 h-4 text-foreground" />
              </div>
              <span className="flex-1 text-sm font-semibold text-foreground">{item.label}</span>
              {item.badge && (
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full"
                  style={{ background: "hsl(var(--sky-light))", color: "hsl(var(--primary))" }}>
                  {item.badge}
                </span>
              )}
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          ))}
        </div>
      </div>

      {/* Sign out */}
      <div className="px-5 mb-5">
        <button onClick={handleSignOut}
          className="w-full h-13 rounded-3xl font-extrabold text-sm flex items-center justify-center gap-2 tap-scale"
          style={{ height: 52, background: "hsl(0 60% 97%)", boxShadow: "var(--shadow-flat)", color: "#ef4444", border: "1.5px solid hsl(0 84% 85%)" }}>
          <LogOut className="w-5 h-5" /> Sign Out
        </button>
      </div>

      <BottomNav />
    </div>
  );
};

export default ProfilePage;
