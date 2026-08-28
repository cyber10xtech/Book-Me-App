/**
 * SettingsPage.tsx — enhanced neumorphic, full navigation wiring.
 * Sections: notifications, appearance, app, account, danger zone.
 */

import { useState, useEffect } from "react";
import {
  ChevronLeft, Bell, Moon, Trash2,
  LogOut, ChevronRight, Lock, HelpCircle, Zap, Sun,
  BellOff, Volume2, VolumeX,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

// ── Neumorphic toggle ─────────────────────────────────────────────────────────
const Toggle = ({
  value,
  onChange,
  disabled = false,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) => (
  <button
    onClick={() => !disabled && onChange(!value)}
    disabled={disabled}
    aria-pressed={value}
    className="relative flex-shrink-0"
    style={{
      width: 46,
      height: 26,
      borderRadius: 13,
      background: value ? "linear-gradient(145deg, hsl(199 100% 50%), hsl(199 100% 38%))" : "hsl(var(--background))",
      boxShadow: value ? "var(--shadow-sky)" : "var(--shadow-inset)",
      transition: "all 0.3s ease",
      opacity: disabled ? 0.5 : 1,
    }}
  >
    <span
      style={{
        position: "absolute",
        top: 3,
        left: value ? 23 : 3,
        width: 20,
        height: 20,
        borderRadius: "50%",
        background: "white",
        boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
        transition: "left 0.3s ease",
      }}
    />
  </button>
);

// ── Section wrapper ───────────────────────────────────────────────────────────
const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div>
    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 px-1">
      {title}
    </p>
    <div
      className="rounded-3xl overflow-hidden"
      style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)" }}
    >
      {children}
    </div>
  </div>
);

// ── Row variants ──────────────────────────────────────────────────────────────
interface RowBaseProps {
  icon: React.ElementType;
  label: string;
  subtitle?: string;
  danger?: boolean;
  last?: boolean;
}
interface ToggleRowProps extends RowBaseProps { type: "toggle"; value: boolean; onChange: (v: boolean) => void; }
interface NavRowProps   extends RowBaseProps { type: "nav";    onPress: () => void; badge?: string; }

type RowProps = ToggleRowProps | NavRowProps;

const Row = (props: RowProps) => {
  const divStyle: React.CSSProperties = {
    borderBottom: props.last ? "none" : "1px solid hsl(var(--border))",
  };

  const Icon = props.icon;
  const iconBg = props.danger ? "hsl(0 84% 95%)" : "hsl(var(--background))";
  const iconShadow = props.danger ? "none" : "var(--shadow-flat)";
  const iconColor = props.danger ? "hsl(0 84% 55%)" : "hsl(var(--primary))";

  const inner = (
    <div className="flex items-center gap-3 px-4 py-4" style={divStyle}>
      <div
        className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
        style={{ background: iconBg, boxShadow: iconShadow }}
      >
        <Icon className="w-4 h-4" style={{ color: iconColor }} />
      </div>
      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-semibold"
          style={{ color: props.danger ? "hsl(0 84% 55%)" : "hsl(var(--foreground))" }}
        >
          {props.label}
        </p>
        {props.subtitle && (
          <p className="text-xs text-muted-foreground mt-0.5">{props.subtitle}</p>
        )}
      </div>
      {props.type === "toggle" && (
        <Toggle value={props.value} onChange={props.onChange} />
      )}
      {props.type === "nav" && (
        <div className="flex items-center gap-2">
          {props.badge && (
            <span
              className="text-[10px] font-extrabold px-2 py-0.5 rounded-full text-white"
              style={{ background: "hsl(var(--primary))" }}
            >
              {props.badge}
            </span>
          )}
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </div>
      )}
    </div>
  );

  if (props.type === "nav") {
    return (
      <button
        onClick={props.onPress}
        className="w-full text-left tap-scale active:opacity-75"
      >
        {inner}
      </button>
    );
  }
  return <div>{inner}</div>;
};

// ── Page ──────────────────────────────────────────────────────────────────────
const SettingsPage = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { requireAuth, modal: authModal } = useRequireAuth();

  const [pushEnabled,  setPushEnabled]  = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [smsEnabled,   setSmsEnabled]   = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [darkMode,     setDarkMode]     = useState(false);
  const [saving,       setSaving]       = useState<string | null>(null);

  // Load notification preferences from Supabase
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("notification_preferences")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.notification_preferences) {
          const p = data.notification_preferences as any;
          setPushEnabled(p.push  ?? true);
          setEmailEnabled(p.email ?? true);
          setSmsEnabled(p.sms   ?? false);
        }
      });
  }, [user]);

  const savePreference = async (key: string, val: boolean) => {
    if (!user) return;
    setSaving(key);
    const prefs: Record<string, boolean> = {
      push:  key === "push"  ? val : pushEnabled,
      email: key === "email" ? val : emailEnabled,
      sms:   key === "sms"   ? val : smsEnabled,
    };
    await supabase
      .from("profiles")
      .update({ notification_preferences: prefs })
      .eq("user_id", user.id);
    setSaving(null);
    toast.success("Preference saved");
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/", { replace: true });
  };

  const handleDeleteAccount = () => {
    toast.error("To delete your account, contact support@bookmebusiness.com");
  };

  return (
    <div className="min-h-screen pb-28" style={{ background: "hsl(var(--background))" }}>

      {/* Header */}
      <div
        className="px-5 pt-10 pb-5 flex items-center gap-3"
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
          <h1 className="text-xl font-extrabold text-foreground">Settings</h1>
          <p className="text-xs text-muted-foreground">Manage your app preferences</p>
        </div>
      </div>

      <div className="px-5 pt-4 space-y-5">

        {/* ── Notifications ─────────────────────────────────────────────── */}
        <Section title="Notifications">
          <Row
            type="toggle"
            icon={Bell}
            label="Push Notifications"
            subtitle="Booking updates & messages"
            value={pushEnabled}
            onChange={v => requireAuth(() => { setPushEnabled(v); savePreference("push", v); }, "manage notification preferences")}
          />
          <Row
            type="toggle"
            icon={pushEnabled ? Bell : BellOff}
            label="Email Notifications"
            subtitle="Booking confirmations by email"
            value={emailEnabled}
            onChange={v => requireAuth(() => { setEmailEnabled(v); savePreference("email", v); }, "manage notification preferences")}
          />
          <Row
            type="toggle"
            icon={pushEnabled ? Bell : BellOff}
            label="SMS Notifications"
            subtitle="Text alerts for bookings"
            value={smsEnabled}
            onChange={v => requireAuth(() => { setSmsEnabled(v); savePreference("sms", v); }, "manage notification preferences")}
          />
          <Row
            type="toggle"
            icon={soundEnabled ? Volume2 : VolumeX}
            label="Notification Sound"
            subtitle="Play sound for alerts"
            value={soundEnabled}
            onChange={v => { setSoundEnabled(v); toast.success(v ? "Sound on" : "Sound off"); }}
            last
          />
        </Section>

        {/* ── Appearance ────────────────────────────────────────────────── */}
        <Section title="Appearance">
          <Row
            type="toggle"
            icon={darkMode ? Moon : Sun}
            label="Dark Mode"
            subtitle="Switch to dark theme"
            value={darkMode}
            onChange={v => { setDarkMode(v); toast.info("Theme toggle coming soon!"); }}
            last
          />
        </Section>

        {/* ── More ──────────────────────────────────────────────────────── */}
        <Section title="More">
          <Row
            type="nav"
            icon={Lock}
            label="Privacy & Security"
            subtitle="Password, data & legal docs"
            onPress={() => navigate("/privacy-security")}
          />
          <Row
            type="nav"
            icon={HelpCircle}
            label="Help & Support"
            subtitle="FAQs, contact, report issues"
            onPress={() => navigate("/help")}
          />
          <Row
            type="nav"
            icon={Zap}
            label="Loyalty Points"
            subtitle="View your points & level"
            onPress={() => navigate("/loyalty")}
            last
          />
        </Section>

        {/* ── Danger zone — only relevant to a real account ───────────────── */}
        {user && (
          <Section title="Account">
            <Row
              type="nav"
              icon={Trash2}
              label="Delete Account"
              subtitle="Permanently remove all your data"
              danger
              onPress={handleDeleteAccount}
              last
            />
          </Section>
        )}

        {/* Sign out — guests have nothing to sign out of */}
        {user && (
          <button
            onClick={handleSignOut}
            className="w-full h-14 rounded-3xl flex items-center justify-center gap-2 font-extrabold text-sm tap-scale"
            style={{
              background: "hsl(var(--background))",
              boxShadow: "var(--shadow-raised)",
              color: "hsl(0 84% 55%)",
              border: "1.5px solid hsl(0 84% 88%)",
            }}
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        )}

      </div>

      {authModal}
    </div>
  );
};

export default SettingsPage;
