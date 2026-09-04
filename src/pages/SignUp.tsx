import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Eye, EyeOff, CheckCircle, Mail } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { PhoneInput, isValidNigerianPhone } from "@/components/PhoneInput";
import logoImg from "@/assets/bookme-logo.jpg";

const SignUp = () => {
  const navigate = useNavigate();
  const [fullName, setFullName]   = useState("");
  const [username, setUsername]   = useState("");
  const [email, setEmail]         = useState("");
  const [phone, setPhone]         = useState("");
  const [password, setPassword]   = useState("");
  const [showPw, setShowPw]       = useState(false);
  const [loading, setLoading]     = useState(false);
  const [done, setDone]           = useState(false);
  const [resending, setResending] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone && !isValidNigerianPhone(phone)) {
      toast.error("Enter a valid 11-digit Nigerian phone number.");
      return;
    }
    if (password.length < 6) { toast.error("Password must be at least 6 characters."); return; }
    
    const cleanUsername = username.trim();
    if (cleanUsername) {
      // Frontend uniqueness pre-check
      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .ilike("username", cleanUsername)
        .limit(1);
      if (existing && existing.length > 0) {
        toast.error("That username is already taken.");
        return;
      }
    }

    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, username: cleanUsername, phone },
        emailRedirectTo: `${window.location.origin}/home`,
      },
    });

    setLoading(false);
    if (error) {
      if (error.message.toLowerCase().includes("username") || error.message.includes("23505")) {
        toast.error("That username is already taken.");
      } else if (error.message.includes("already registered")) {
        toast.error("This email is already in use. Try signing in instead.");
      } else {
        toast.error(error.message);
      }
    } else {
      setDone(true);
    }
  };

  const handleResend = async () => {
    setResending(true);
    const { error } = await supabase.auth.resend({ type: "signup", email });
    setResending(false);
    if (error) toast.error(error.message);
    else toast.success("Verification email resent!");
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

  /* ── Verification sent screen ── */
  if (done) return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: "hsl(var(--background))", paddingTop: "env(safe-area-inset-top)" }}>
      <div className="w-24 h-24 rounded-3xl flex items-center justify-center mb-6"
        style={{ boxShadow: "var(--shadow-raised)", background: "hsl(var(--background))" }}>
        <Mail className="w-10 h-10" style={{ color: "hsl(var(--primary))" }} />
      </div>
      <h2 className="text-2xl font-extrabold text-foreground mb-2">Check your inbox</h2>
      <p className="text-sm text-muted-foreground text-center mb-8 max-w-xs">
        We sent a verification link to <strong>{email}</strong>. Click it to activate your account.
      </p>

      <div className="w-full max-w-xs space-y-3">
        <button onClick={handleResend} disabled={resending}
          className="w-full h-12 rounded-2xl text-sm font-bold tap-scale disabled:opacity-40"
          style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)", color: "hsl(var(--primary))" }}>
          {resending ? "Sending..." : "Resend Email"}
        </button>
        <button onClick={() => navigate("/signin")}
          className="w-full h-14 rounded-2xl text-white font-extrabold text-sm tap-scale"
          style={{ background: "linear-gradient(145deg, hsl(199 100% 50%), hsl(199 100% 38%))", boxShadow: "var(--shadow-sky)" }}>
          Go to Sign In
        </button>
      </div>

      <p className="text-xs text-muted-foreground mt-6 text-center">
        Wrong email? <button onClick={() => setDone(false)} className="font-bold" style={{ color: "hsl(var(--primary))" }}>Go back</button>
      </p>
    </div>
  );

  return (
    <div
      className="min-h-screen flex flex-col px-6 pb-10"
      style={{ background: "hsl(var(--background))", paddingTop: "calc(env(safe-area-inset-top) + 2rem)" }}
    >
      {/* Back */}
      <button onClick={() => navigate(-1)}
        className="w-10 h-10 rounded-2xl flex items-center justify-center mb-6 tap-scale"
        style={{ boxShadow: "var(--shadow-raised)", background: "hsl(var(--background))" }}>
        <ChevronLeft className="w-5 h-5 text-foreground" />
      </button>

      <div className="flex items-center gap-3 mb-6">
        <div className="w-14 h-14 rounded-2xl overflow-hidden" style={{ boxShadow: "var(--shadow-raised)" }}>
          <img src={logoImg} alt="BookMe" className="w-full h-full object-cover" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-foreground">Create Account</h1>
          <p className="text-sm text-muted-foreground">Join BookMe today</p>
        </div>
      </div>

      <form onSubmit={handleSignUp} className="space-y-4 flex-1">
        <div>
          <label className="text-xs font-extrabold text-muted-foreground uppercase tracking-wide mb-2 block">Full Name</label>
          <input
            type="text"
            placeholder="John Doe"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            style={neuInput}
            required
          />
        </div>

        <div>
          <label className="text-xs font-extrabold text-muted-foreground uppercase tracking-wide mb-2 block">Username</label>
          <input
            type="text"
            placeholder="johndoe123"
            value={username}
            onChange={e => setUsername(e.target.value)}
            style={neuInput}
            required
          />
        </div>

        <div>
          <label className="text-xs font-extrabold text-muted-foreground uppercase tracking-wide mb-2 block">Email</label>
          <input
            type="email"
            inputMode="email"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={neuInput}
            required
          />
        </div>

        <div>
          <label className="text-xs font-extrabold text-muted-foreground uppercase tracking-wide mb-2 block">Phone Number</label>
          <PhoneInput
            value={phone}
            onChange={setPhone}
          />
        </div>

        {/* Password */}
        <div>
          <label className="text-xs font-extrabold text-muted-foreground uppercase tracking-wide mb-2 block">Password</label>
          <div className="flex items-center overflow-hidden rounded-2xl"
            style={{ boxShadow: "var(--shadow-inset)", background: "hsl(var(--background))", height: 52 }}>
            <input
              type={showPw ? "text" : "password"}
              placeholder="Min. 6 characters"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="flex-1 h-full bg-transparent px-4 text-sm text-foreground placeholder:text-muted-foreground outline-none"
              required minLength={6}
            />
            <button type="button" onClick={() => setShowPw(v => !v)}
              className="w-12 h-full flex items-center justify-center tap-scale">
              {showPw ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
            </button>
          </div>
          {/* Password strength indicator */}
          {password.length > 0 && (
            <div className="flex gap-1 mt-2">
              {[1, 2, 3].map(lvl => (
                <div key={lvl} className="flex-1 h-1 rounded-full transition-all"
                  style={{
                    background: lvl === 1 && password.length >= 6
                      ? "#f59e0b"
                      : lvl <= 2 && password.length >= 8
                        ? "#22c55e"
                        : lvl <= 3 && password.length >= 12 && /[^a-zA-Z0-9]/.test(password)
                          ? "hsl(var(--primary))"
                          : "hsl(var(--muted))",
                  }}
                />
              ))}
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground text-center">
          By signing up you agree to our{" "}
          <span className="font-bold text-foreground">Terms</span> and{" "}
          <span className="font-bold text-foreground">Privacy Policy</span>.
        </p>

        <button type="submit" disabled={loading}
          className="w-full h-14 rounded-2xl text-white font-extrabold text-sm flex items-center justify-center gap-2 tap-scale disabled:opacity-40"
          style={{ background: "linear-gradient(145deg, hsl(199 100% 50%), hsl(199 100% 38%))", boxShadow: "var(--shadow-sky)" }}>
          {loading
            ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : <><CheckCircle className="w-5 h-5" /> Create Account</>
          }
        </button>
      </form>

      <p className="text-center text-sm text-muted-foreground mt-5">
        Already have an account?{" "}
        <button onClick={() => navigate("/signin")} className="font-extrabold tap-scale" style={{ color: "hsl(var(--primary))" }}>
          Sign In
        </button>
      </p>
    </div>
  );
};

export default SignUp;
