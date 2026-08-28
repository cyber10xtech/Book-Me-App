/**
 * HelpSupportPage.tsx
 * Full help & support page — neumorphic design.
 * Sections: search, quick actions, FAQs (expandable), contact.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft, ChevronDown, ChevronUp, Phone,
  Mail, Search, HelpCircle,
} from "lucide-react";

interface FAQ {
  id: string;
  q: string;
  a: string;
  category: string;
}

const FAQS: FAQ[] = [
  {
    id: "b1", category: "Bookings",
    q: "How do I book a service?",
    a: "Open any provider's profile, go to the Services tab, tap a service, then tap Book. Choose your date, time, and delivery mode (at shop or home service), then confirm.",
  },
  {
    id: "b2", category: "Bookings",
    q: "Can I cancel or reschedule a booking?",
    a: "Yes — go to the Bookings tab, find your booking, and tap Cancel or use the reschedule option. Cancellation policies vary by provider; check the provider's notes before confirming.",
  },
  {
    id: "b3", category: "Bookings",
    q: "Why is my booking still 'Pending'?",
    a: "Pending means the provider hasn't confirmed yet. Most providers respond within 30 minutes. If you don't hear back in a few hours, you can message the provider directly.",
  },
  {
    id: "p1", category: "Payments",
    q: "How does payment work?",
    a: "BookMe is currently a booking platform — payment is agreed directly between you and the service provider. You'll see the service price before confirming your booking.",
  },
  {
    id: "p2", category: "Payments",
    q: "Are prices negotiable?",
    a: "Prices are set by providers. You can message a provider to ask about custom pricing, but the listed price is the standard rate.",
  },
  {
    id: "acc1", category: "Account",
    q: "How do I update my profile?",
    a: "Go to Profile → tap the pencil icon at the top right. You can update your name, username, phone number, and bio.",
  },
  {
    id: "acc2", category: "Account",
    q: "How do I reset my password?",
    a: "Go to Profile → Privacy & Security → Change Password. Enter your new password twice and tap Update Password.",
  },
  {
    id: "pts1", category: "Points",
    q: "How do I earn loyalty points?",
    a: "You earn +100 pts for your first booking, +50 pts each time a booking is marked complete, and +30 pts each time you submit a review.",
  },
  {
    id: "pts2", category: "Points",
    q: "What are my points worth?",
    a: "Points unlock membership levels (Bronze → Silver → Gold → Platinum) which come with perks and priority support. Redemption for discounts is coming soon.",
  },
  {
    id: "ntf1", category: "Notifications",
    q: "I'm not receiving push notifications",
    a: "Go to your Android Settings → Apps → BookMe → Permissions and make sure Notifications are allowed. You can also check notification settings in-app under Settings.",
  },
  {
    id: "ntf2", category: "Notifications",
    q: "How do I turn off email notifications?",
    a: "Go to Settings → Notifications → Email Notifications and toggle it off.",
  },
];

const CATEGORIES = ["All", ...Array.from(new Set(FAQS.map(f => f.category)))];

// ── Official support contact details ──────────────────────────────────────────
const SUPPORT_PHONE = "+2347034344806";
const SUPPORT_EMAIL = "support@bookmebusiness.com";

// Official WhatsApp deep link (wa.me): opens directly in the WhatsApp app when
// installed, and falls back to WhatsApp Web / the app store automatically
// when it isn't.
const openWhatsAppSupport = () => {
  window.open(`https://wa.me/${SUPPORT_PHONE.replace(/\D/g, "")}`, "_blank");
};

const openEmailSupport = () => {
  window.location.href = `mailto:${SUPPORT_EMAIL}`;
};

const QUICK_ACTIONS = [
  { icon: Phone, label: "Text Support", sub: SUPPORT_PHONE, action: openWhatsAppSupport },
  { icon: Mail,  label: "Email Us",     sub: SUPPORT_EMAIL,  action: openEmailSupport },
];

const HelpSupportPage = () => {
  const navigate = useNavigate();
  const [search,      setSearch]      = useState("");
  const [activeTab,   setActiveTab]   = useState("All");
  const [expandedId,  setExpandedId]  = useState<string | null>(null);

  const filtered = FAQS.filter(f => {
    const matchCat = activeTab === "All" || f.category === activeTab;
    const matchSearch = !search || f.q.toLowerCase().includes(search.toLowerCase()) || f.a.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="min-h-screen pb-28" style={{ background: "hsl(var(--background))" }}>

      {/* Header */}
      <div
        className="px-5 pt-10 pb-5"
        style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-flat)" }}
      >
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-2xl flex items-center justify-center tap-scale"
            style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)" }}
          >
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </button>
          <div>
            <h1 className="text-xl font-extrabold text-foreground">Help & Support</h1>
            <p className="text-xs text-muted-foreground">How can we help you today?</p>
          </div>
        </div>

        {/* Search */}
        <div
          className="flex items-center gap-3 px-4"
          style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-inset)", borderRadius: "1rem", height: 48 }}
        >
          <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search for help…"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
        </div>
      </div>

      <div className="px-5 pt-4 space-y-5">

        {/* ── Quick contact actions ─────────────────────────────────────── */}
        <div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 px-1">
            Contact us
          </p>
          <div className="grid grid-cols-2 gap-3">
            {QUICK_ACTIONS.map(action => (
              <button
                key={action.label}
                onClick={action.action}
                className="rounded-3xl p-4 text-left tap-scale"
                style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)" }}
              >
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center mb-3"
                  style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-flat)" }}
                >
                  <action.icon className="w-5 h-5" style={{ color: "hsl(var(--primary))" }} />
                </div>
                <p className="text-sm font-extrabold text-foreground">{action.label}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{action.sub}</p>
              </button>
            ))}
          </div>
        </div>

        {/* ── FAQs ─────────────────────────────────────────────────────── */}
        <div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 px-1">
            Frequently asked questions
          </p>

          {/* Category tabs */}
          <div
            className="flex gap-1.5 p-1.5 rounded-3xl mb-3 overflow-x-auto no-scrollbar"
            style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-inset)" }}
          >
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveTab(cat)}
                className="flex-shrink-0 px-4 py-2 text-xs font-bold rounded-2xl transition-all tap-scale"
                style={activeTab === cat ? {
                  background: "linear-gradient(145deg, hsl(199 100% 50%), hsl(199 100% 38%))",
                  color: "white", boxShadow: "var(--shadow-sky)",
                } : { color: "hsl(var(--muted-foreground))" }}
              >
                {cat}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div
              className="rounded-3xl p-10 text-center"
              style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-flat)" }}
            >
              <HelpCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-bold text-foreground">No results found</p>
              <p className="text-xs text-muted-foreground mt-1">Try a different search term</p>
            </div>
          ) : (
            <div
              className="rounded-3xl overflow-hidden"
              style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)" }}
            >
              {filtered.map((faq, i) => {
                const open = expandedId === faq.id;
                return (
                  <div
                    key={faq.id}
                    style={{ borderBottom: i < filtered.length - 1 ? "1px solid hsl(var(--border))" : "none" }}
                  >
                    <button
                      className="w-full flex items-start gap-3 px-4 py-4 text-left tap-scale"
                      onClick={() => setExpandedId(open ? null : faq.id)}
                    >
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-flat)" }}
                      >
                        <HelpCircle className="w-4 h-4" style={{ color: "hsl(var(--primary))" }} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-foreground leading-snug">{faq.q}</p>
                        <span
                          className="inline-block text-[9px] font-bold px-2 py-0.5 rounded-full mt-1.5"
                          style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-flat)", color: "hsl(var(--primary))" }}
                        >
                          {faq.category}
                        </span>
                      </div>
                      {open
                        ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
                        : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
                      }
                    </button>
                    {open && (
                      <div
                        className="mx-4 mb-4 rounded-2xl p-4"
                        style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-inset)" }}
                      >
                        <p className="text-sm text-foreground leading-relaxed">{faq.a}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Still need help ───────────────────────────────────────────── */}
        <div
          className="rounded-3xl p-5 text-center"
          style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)" }}
        >
          <p className="text-sm font-extrabold text-foreground mb-1">Still need help?</p>
          <p className="text-xs text-muted-foreground mb-4">
            Our support team is available Mon–Sat, 8am–8pm (WAT).
          </p>
          <button
            onClick={openEmailSupport}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold text-white tap-scale"
            style={{
              background: "linear-gradient(145deg, hsl(199 100% 50%), hsl(199 100% 38%))",
              boxShadow: "var(--shadow-sky)",
            }}
          >
            <Mail className="w-4 h-4" />
            Email {SUPPORT_EMAIL}
          </button>
        </div>

      </div>
    </div>
  );
};

export default HelpSupportPage;
