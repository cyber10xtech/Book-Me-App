import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Eye, EyeOff, Mail, ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import logoImg from "@/assets/bookme-logo.jpg";

const SignIn = () => {
  const navigate = useNavigate();
  const { refreshSession } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resettingPw, setResettingPw] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setLoading(false);
      // Friendlier messages
      if (error.message.includes("Email not confirmed")) {
        toast.error("Please check your inbox and verify your email first.");
      } else if (error.message.includes("Invalid login credentials")) {
        toast.error("Wrong email or password. Please try again.");
      } else {
        toast.error(error.message);
      }
      return;
    }

    // Block providers from using the customer app
    const { data: profile } = await supabase
      .from("profiles").select("role").eq("user_id", data.user.id).single();

    if (profile?.role === "provider") {
      await supabase.auth.signOut();
      setLoading(false);
      toast.error("This app is for customers only. Please use the BookMe Business app.");
      return;
    }

    await refreshSession();
    setLoading(false);
    navigate("/home", { replace: true });
  };

  const handleForgotPassword = async () => {
    if (!email) { toast.error("Enter your email address first."); return; }
    setResettingPw(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setResettingPw(false);
    if (error) toast.error(error.message);
    else toast.success("Password reset email sent! Check your inbox.");
  };

  const neuInput: React.CSSProperties = {
    background: "hsl(var(--background))",
    boxShadow: "var(--shadow-inset)",
    border: "none",
    outline: "none",
    borderRadius: "1rem",
    height: 52,
    width: "100%",
    padding: "0 1rem",
    fontSize: 14,
    color: "hsl(var(--foreground))",
  };

  return (
    <div
      className="min-h-screen flex flex-col px-6 pb-10"
      style={{
        background: "hsl(var(--background))",
        paddingTop: "calc(env(safe-area-inset-top) + 2rem)",
      }}
    >
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="w-10 h-10 rounded-2xl flex items-center justify-center mb-8 tap-scale"
        style={{ boxShadow: "var(--shadow-raised)", background: "hsl(var(--background))" }}
      >
        <ChevronLeft className="w-5 h-5 text-foreground" />
      </button>

      {/* Logo + title */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-14 h-14 rounded-2xl overflow-hidden" style={{ boxShadow: "var(--shadow-raised)" }}>
          <img src={logoImg} alt="BookMe" className="w-full h-full object-cover" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-foreground leading-tight">Welcome Back</h1>
          <p className="text-sm text-muted-foreground">Sign in to your account</p>
        </div>
      </div>

      <form onSubmit={handleSignIn} className="space-y-4 flex-1">
        {/* Email */}
        <div>
          <label className="text-xs font-extrabold text-muted-foreground uppercase tracking-wide mb-2 block">
            Email Address
          </label>
          <div className="flex items-center overflow-hidden rounded-2xl" style={{ boxShadow: "var(--shadow-inset)", background: "hsl(var(--background))", height: 52 }}>
            <div className="w-12 h-full flex items-center justify-center flex-shrink-0">
              <Mail className="w-4 h-4 text-muted-foreground" />
            </div>
            <input
              type="email" inputMode="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="flex-1 h-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none pr-4"
              required
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <label className="text-xs font-extrabold text-muted-foreground uppercase tracking-wide mb-2 block">
            Password
          </label>
          <div className="flex items-center overflow-hidden rounded-2xl" style={{ boxShadow: "var(--shadow-inset)", background: "hsl(var(--background))", height: 52 }}>
            <div className="w-12 h-full flex items-center justify-center flex-shrink-0">
              <span className="text-muted-foreground text-sm">🔑</span>
            </div>
            <input
              type={showPw ? "text" : "password"}
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

          <div className="text-right mt-2">
            <button type="button" onClick={handleForgotPassword} disabled={resettingPw}
              className="text-xs font-bold tap-scale" style={{ color: "hsl(var(--primary))" }}>
              {resettingPw ? "Sending..." : "Forgot password?"}
            </button>
          </div>
        </div>

        {/* CTA */}
        <button
          type="submit"
          disabled={loading || !email || !password}
          className="w-full h-14 rounded-2xl text-white font-extrabold text-sm flex items-center justify-center gap-2 tap-scale disabled:opacity-40 mt-6"
          style={{
            background: "linear-gradient(145deg, hsl(199 100% 50%), hsl(199 100% 38%))",
            boxShadow: "var(--shadow-sky)",
          }}
        >
          {loading
            ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : <><Mail className="w-5 h-5" /> Sign In <ArrowRight className="w-4 h-4" /></>
          }
        </button>
      </form>

      <p className="text-center text-sm text-muted-foreground mt-6">
        Don't have an account?{" "}
        <button onClick={() => navigate("/signup")} className="font-extrabold tap-scale" style={{ color: "hsl(var(--primary))" }}>
          Sign Up
        </button>
      </p>
    </div>
  );
};

export default SignIn;
