import { useState, useEffect, useRef } from "react";
import { CalendarDays, Clock, MapPin, ChevronRight, X, XCircle, Star, Phone, AlertTriangle, Loader2, CheckCircle2, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { RealtimeChannel } from "@supabase/supabase-js";
import RatingPromptModal from "@/components/RatingPromptModal";
import { useCustomerPoints } from "@/hooks/useCustomerPoints";
import ChatWindow from "@/components/ChatWindow";
import { canMessageBooking } from "@/lib/messagingWindow";

type Tab = "upcoming" | "past";

// Bug fix: added "accepted" as alias for confirmed
const STATUS_CFG: Record<string, { label: string; color: string; bg: string; stripColor: string; badgeText: string }> = {
  pending:   { label: "Pending",   color: "hsl(38 92% 38%)",   bg: "hsl(38 100% 95%)",  stripColor: "#f59e0b", badgeText: "Awaiting confirmation"  },
  confirmed: { label: "Confirmed", color: "hsl(142 71% 28%)",  bg: "hsl(142 60% 93%)", stripColor: "#22c55e", badgeText: "Confirmed by provider"   },
  accepted:  { label: "Confirmed", color: "hsl(142 71% 28%)",  bg: "hsl(142 60% 93%)", stripColor: "#22c55e", badgeText: "Confirmed by provider"   },
  completed: { label: "Completed", color: "hsl(220 80% 35%)",  bg: "hsl(220 80% 94%)", stripColor: "#3b82f6", badgeText: "Service completed"        },
  cancelled: { label: "Cancelled", color: "hsl(0 84% 45%)",    bg: "hsl(0 60% 94%)",   stripColor: "#ef4444", badgeText: "Booking cancelled"        },
  rejected:  { label: "Rejected",  color: "hsl(0 84% 45%)",    bg: "hsl(0 60% 94%)",   stripColor: "#ef4444", badgeText: "Booking rejected"         },
};

const fmt = (n: number) => `₦${Number(n || 0).toLocaleString()}`;
const fmtDate = (d: string) =>
  new Date(d + "T00:00:00").toLocaleDateString("en-NG", { weekday: "long", month: "short", day: "numeric" });

const BookingSheet = ({ b, onClose, onCancel, cancelling }: {
  b: any; onClose: () => void;
  onCancel: (id: string) => Promise<void>; cancelling: boolean;
}) => {
  const cfg = STATUS_CFG[b.status] ?? STATUS_CFG.pending;
  const canCancel = ["pending", "confirmed", "accepted"].includes(b.status);
  const [showConfirm, setShowConfirm] = useState(false);
  const { user } = useAuth();

  // Message Provider — opens this booking's dedicated conversation thread,
  // creating it lazily if the automatic on-booking creation hasn't run yet
  // (e.g. bookings made before this feature existed).
  const [convId, setConvId]         = useState<string | null>(null);
  const [chatOpen, setChatOpen]     = useState(false);
  const [openingChat, setOpeningChat] = useState(false);
  const [convCanMessage, setConvCanMessage] = useState(true);

  const handleMessageProvider = async () => {
    if (!user) return;
    if (convId) { setChatOpen(true); return; }
    setOpeningChat(true);
    try {
      // One conversation per customer+provider pair — look it up by the pair,
      // not by this specific booking_id, since an earlier or later booking
      // between the same two people may already own the thread.
      const { data: existing } = await supabase.from("chat_conversations")
        .select("id, booking_id").eq("provider_id", b.provider_id).eq("customer_id", b.customer_id).maybeSingle();
      if (existing) {
        setConvId(existing.id);
        setChatOpen(true);
        const { data: linkedBk } = existing.booking_id
          ? await supabase.from("bookings").select("created_at").eq("id", existing.booking_id).maybeSingle()
          : { data: null };
        setConvCanMessage(canMessageBooking(linkedBk ?? { created_at: b.created_at }));
      } else if (b.business_user_id) {
        const { data: created, error: createErr } = await supabase.from("chat_conversations").insert({
          booking_id:       b.id,
          provider_id:      b.provider_id,
          customer_id:      b.customer_id,
          provider_user_id: b.business_user_id,
          customer_user_id: user.id,
        }).select("id").single();
        if (created) {
          setConvId(created.id);
          setChatOpen(true);
          setConvCanMessage(canMessageBooking({ created_at: b.created_at }));
        } else if (createErr?.code === "23505") {
          const { data: raceWinner } = await supabase.from("chat_conversations")
            .select("id, booking_id").eq("provider_id", b.provider_id).eq("customer_id", b.customer_id).maybeSingle();
          if (raceWinner) {
            setConvId(raceWinner.id);
            setChatOpen(true);
            const { data: linkedBk } = raceWinner.booking_id
              ? await supabase.from("bookings").select("created_at").eq("id", raceWinner.booking_id).maybeSingle()
              : { data: null };
            setConvCanMessage(canMessageBooking(linkedBk ?? { created_at: b.created_at }));
          }
        } else if (createErr) {
          toast.error("Could not open chat.");
        }
      } else {
        toast.error("Could not open chat for this booking.");
      }
    } finally {
      setOpeningChat(false);
    }
  };

  const gradients: Record<string, string> = {
    pending: "linear-gradient(135deg,#f59e0b,#d97706)",
    confirmed: "linear-gradient(135deg,#22c55e,#16a34a)",
    accepted: "linear-gradient(135deg,#22c55e,#16a34a)",
    completed: "linear-gradient(135deg,#3b82f6,#2563eb)",
    cancelled: "linear-gradient(135deg,#ef4444,#dc2626)",
    rejected: "linear-gradient(135deg,#ef4444,#dc2626)",
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end"
      style={{ background: "rgba(13,22,38,0.55)", backdropFilter: "blur(4px)" }}
      onClick={onClose}>
      <div className="w-full rounded-t-[2rem] flex flex-col animate-slide-up"
        style={{ background: "hsl(var(--background))", maxHeight: "90vh", boxShadow: "0 -8px 40px rgba(0,0,0,0.2)" }}
        onClick={e => e.stopPropagation()}>

        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: "hsl(var(--muted-foreground)/0.3)" }} />
        </div>

        {/* Hero */}
        <div className="mx-4 mb-3 rounded-3xl p-5" style={{ background: gradients[b.status] ?? gradients.confirmed }}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-white/80 text-xs font-extrabold uppercase">{cfg.label}</p>
              <p className="text-white font-extrabold text-xl leading-tight mt-0.5">{b.service_name || "Service"}</p>
              <p className="text-white/80 text-sm mt-0.5">{b.provider_name || "Provider"}</p>
              <p className="text-white text-2xl font-extrabold mt-3">{fmt(b.total_price)}</p>
            </div>
            <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.2)" }}>
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 space-y-3 pb-2">
          {/* Date / Time / Mode */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { icon: CalendarDays, label: "Date", val: fmtDate(b.booking_date) },
              { icon: Clock,        label: "Time", val: (b.booking_time_text || String(b.booking_time)).slice(0, 5) },
              { icon: MapPin,       label: "Mode", val: b.delivery_mode === "at_home" ? "Home" : "Shop" },
            ].map(item => (
              <div key={item.label} className="rounded-3xl p-3 text-center"
                style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)" }}>
                <item.icon className="w-4 h-4 mx-auto mb-1" style={{ color: "hsl(var(--primary))" }} />
                <p className="text-[9px] text-muted-foreground uppercase font-extrabold">{item.label}</p>
                <p className="text-xs font-bold text-foreground leading-tight mt-0.5">{item.val}</p>
              </div>
            ))}
          </div>

          {/* Provider contact */}
          {b.provider_phone && (
            <a href={`tel:${b.provider_phone}`}
              className="flex items-center gap-3 rounded-3xl p-4 tap-scale"
              style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)" }}>
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
                style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-flat)" }}>
                <Phone className="w-4 h-4" style={{ color: "hsl(var(--primary))" }} />
              </div>
              <p className="text-sm font-bold flex-1">{b.provider_phone}</p>
              <span className="text-xs font-extrabold px-2 py-1 rounded-xl"
                style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-flat)", color: "hsl(var(--primary))" }}>
                Call
              </span>
            </a>
          )}

          {b.customer_location && (
            <div className="rounded-3xl p-4"
              style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-flat)" }}>
              <p className="text-[10px] text-muted-foreground uppercase font-extrabold mb-1">Your Location</p>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" style={{ color: "hsl(var(--primary))" }} />
                <p className="text-sm">{b.customer_location}</p>
              </div>
            </div>
          )}

          {b.notes && (
            <div className="rounded-3xl p-4" style={{ background: "hsl(38 100% 97%)", border: "1px solid hsl(38 92% 80%)" }}>
              <p className="text-[10px] text-amber-700 font-extrabold uppercase mb-1">Your Note</p>
              <p className="text-sm text-amber-900 italic">"{b.notes}"</p>
            </div>
          )}

          <div className="rounded-2xl px-4 py-3 flex justify-between"
            style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-inset)" }}>
            <span className="text-xs text-muted-foreground">Booking ref</span>
            <span className="font-mono text-xs font-bold">#{b.id.slice(0, 8).toUpperCase()}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="px-4 pt-3 space-y-2"
          style={{ borderTop: "1px solid hsl(var(--border))", background: "hsl(var(--background))", paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}>
          <button onClick={handleMessageProvider} disabled={openingChat}
            className="w-full h-12 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 tap-scale disabled:opacity-60"
            style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)", color: "hsl(var(--primary))" }}>
            {openingChat
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <MessageCircle className="w-4 h-4" />
            }
            {openingChat ? "Opening chat…" : "Message Provider"}
          </button>
          {canCancel && !showConfirm && (
            <button onClick={() => setShowConfirm(true)}
              className="w-full h-12 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 tap-scale"
              style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)", color: "#ef4444", border: "1.5px solid hsl(0 84% 80%)" }}>
              <XCircle className="w-5 h-5" /> Cancel Booking
            </button>
          )}
          {canCancel && showConfirm && (
            <div className="space-y-2">
              <div className="flex items-start gap-2 rounded-2xl p-3"
                style={{ background: "hsl(0 60% 97%)", border: "1px solid hsl(0 84% 80%)" }}>
                <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-700">Are you sure? This cannot be undone. The provider will be notified.</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowConfirm(false)}
                  className="flex-1 h-11 rounded-2xl text-sm font-bold tap-scale"
                  style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)", color: "hsl(var(--foreground))" }}>
                  Keep Booking
                </button>
                <button onClick={() => onCancel(b.id)} disabled={cancelling}
                  className="flex-1 h-11 rounded-2xl text-white text-sm font-bold flex items-center justify-center gap-1.5 disabled:opacity-60 tap-scale"
                  style={{ background: "linear-gradient(135deg,#ef4444,#dc2626)", boxShadow: "3px 3px 10px rgba(239,68,68,0.35)" }}>
                  {cancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                  {cancelling ? "..." : "Yes, Cancel"}
                </button>
              </div>
            </div>
          )}
          {b.status === "completed" && (
            <div className="flex items-center justify-center gap-2 py-2">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              <p className="text-sm text-muted-foreground">Service completed — leave a review above</p>
            </div>
          )}
          {["cancelled", "rejected"].includes(b.status) && (
            <p className="text-center text-sm text-muted-foreground py-2">This booking has been {b.status}.</p>
          )}
        </div>
      </div>

      {chatOpen && convId && user && (
        <ChatWindow
          conversationId={convId}
          currentUserId={user.id}
          currentRole="customer"
          otherName={b.provider_name || "Provider"}
          otherAvatar={b.provider_avatar ?? null}
          canMessage={convCanMessage}
          onClose={() => setChatOpen(false)}
        />
      )}
    </div>
  );
};

const BookingsPage = () => {
  const [tab, setTab]             = useState<Tab>("upcoming");
  const [bookings, setBookings]   = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState<any | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [ratingBooking, setRatingBooking] = useState<any | null>(null);
  const promptedRef = useRef<Set<string>>(new Set());
  const channelRef  = useRef<RealtimeChannel | null>(null);
  const { user } = useAuth();
  const navigate   = useNavigate();
  const { awardPoints } = useCustomerPoints(profileId);

  const fetchBookings = async (pid: string) => {
    const { data } = await supabase
      .from("bookings")
      .select(`
        *,
        provider_profile:profiles!bookings_provider_id_fkey(
          full_name, business_name, avatar_url, phone, city
        )
      `)
      .eq("customer_id", pid)
      .order("booking_date", { ascending: false })
      .order("booking_time", { ascending: true });

    const enriched = (data || []).map((b: any) => ({
      ...b,
      provider_name:   b.provider_profile?.business_name || b.provider_profile?.full_name,
      provider_phone:  b.provider_profile?.phone,
      provider_avatar: b.provider_profile?.avatar_url,
      provider_city:   b.provider_profile?.city,
    }));
    setBookings(enriched);
    setLoading(false);
    return enriched;
  };

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: profile } = await supabase.from("profiles").select("id").eq("user_id", user.id).single();
      if (!profile) { setLoading(false); return; }
      setProfileId(profile.id);
      await fetchBookings(profile.id);

      if (channelRef.current) supabase.removeChannel(channelRef.current);
      channelRef.current = supabase
        .channel(`cust-bk:${profile.id}`)
        .on("postgres_changes",
          { event: "*", schema: "public", table: "bookings", filter: `customer_id=eq.${profile.id}` },
          async (payload: any) => {
            const updated = await fetchBookings(profile.id);
            if (payload.new?.status === "completed" && payload.old?.status !== "completed") {
              const bid = payload.new.id;
              if (!promptedRef.current.has(bid)) {
                promptedRef.current.add(bid);
                const completedBooking = updated.find((b: any) => b.id === bid);
                if (completedBooking) {
                  await awardPoints("booking_completed", bid);
                  const { count } = await supabase
                    .from("bookings").select("*", { count: "exact", head: true })
                    .eq("customer_id", profile.id).eq("status", "completed");
                  if ((count ?? 0) === 1) await awardPoints("first_booking", bid);
                  setTimeout(() => setRatingBooking(completedBooking), 800);
                }
              }
            }
            // Toast on status changes
            if (payload.new?.status === "accepted" || payload.new?.status === "confirmed") {
              toast.success("Your booking has been confirmed! ✅");
            } else if (payload.new?.status === "rejected") {
              toast.error("Your booking was declined by the provider.");
            }
          }
        )
        .subscribe();
    })();

    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current); };
  }, [user]);

  const handleCancel = async (id: string) => {
    if (!profileId) return;
    setCancelling(true);
    const { error } = await supabase.from("bookings")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString(), cancelled_by_role: "customer" } as any)
      .eq("id", id).eq("customer_id", profileId);
    if (error) toast.error("Could not cancel: " + error.message);
    else { toast.success("Booking cancelled."); setSelected(null); await fetchBookings(profileId); }
    setCancelling(false);
  };

  const upcoming = bookings.filter(b => ["pending","confirmed","accepted"].includes(b.status));
  const past     = bookings.filter(b => ["completed","cancelled","rejected"].includes(b.status));
  const shown    = tab === "upcoming" ? upcoming : past;

  const isToday    = (d: string) => d === new Date().toISOString().split("T")[0];
  const isTomorrow = (d: string) => d === new Date(Date.now() + 86400000).toISOString().split("T")[0];
  const dateLabel  = (d: string) => isToday(d) ? "Today" : isTomorrow(d) ? "Tomorrow" : fmtDate(d);

  return (
    <div className="min-h-screen pb-24" style={{ background: "hsl(var(--background))" }}>
      {ratingBooking && (
        <RatingPromptModal
          booking={ratingBooking}
          onClose={() => setRatingBooking(null)}
          onRated={async () => { await awardPoints("review_submitted", ratingBooking?.id); }}
        />
      )}
      {selected && (
        <BookingSheet b={selected} onClose={() => setSelected(null)} onCancel={handleCancel} cancelling={cancelling} />
      )}

      {/* Header */}
      <div
        className="px-5 pb-4 sticky top-0 z-10"
        style={{
          background: "hsl(var(--background))",
          boxShadow: "0 4px 12px var(--neu-dark)",
          paddingTop: "calc(env(safe-area-inset-top) + 1rem)",
        }}
      >
        <h1 className="text-xl font-extrabold text-foreground mb-4">My Bookings</h1>
        {/* Tab switcher — neumorphic inset for active */}
        <div className="flex gap-2 rounded-3xl p-1.5" style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-inset)" }}>
          {(["upcoming","past"] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="flex-1 py-2.5 text-sm font-bold rounded-2xl transition-all"
              style={tab === t ? {
                background: "linear-gradient(145deg, hsl(199 100% 50%), hsl(199 100% 38%))",
                color: "white", boxShadow: "var(--shadow-sky)",
              } : { color: "hsl(var(--muted-foreground))" }}>
              {t === "upcoming" ? "Upcoming" : "Past"}
              {t === "upcoming" && upcoming.length > 0 && (
                <span className="ml-1.5 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full"
                  style={{ background: "white", color: "hsl(var(--primary))" }}>
                  {upcoming.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 mt-4">
        {loading ? (
          <div className="adaptive-card-grid">
            {[1,2,3].map(i => <div key={i} className="h-24 rounded-3xl skeleton" />)}
          </div>
        ) : shown.length === 0 ? (
          <div className="rounded-3xl p-12 text-center"
            style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)" }}>
            <CalendarDays className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="font-bold text-foreground">{tab === "upcoming" ? "No upcoming bookings" : "No past bookings yet"}</p>
            {tab === "upcoming" && (
              <button onClick={() => navigate("/search")}
                className="mt-5 px-6 py-3 rounded-2xl text-white font-bold text-sm tap-scale"
                style={{ background: "linear-gradient(145deg, hsl(199 100% 50%), hsl(199 100% 38%))", boxShadow: "var(--shadow-sky)" }}>
                Book a Service
              </button>
            )}
          </div>
        ) : (
          <div className="adaptive-card-grid">
          {shown.map(b => {
            const cfg = STATUS_CFG[b.status] ?? STATUS_CFG.pending;
            const today = isToday(b.booking_date);
            return (
              <button key={b.id} onClick={() => setSelected(b)}
                className="w-full rounded-3xl overflow-hidden text-left tap-scale animate-fade-in"
                style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)" }}>
                <div className="h-1 w-full" style={{ background: cfg.stripColor }} />
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="relative flex-shrink-0">
                      {b.provider_avatar
                        ? <img src={b.provider_avatar} alt="" className="w-12 h-12 rounded-2xl object-cover"
                            style={{ boxShadow: "var(--shadow-flat)" }} />
                        : <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                            style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-flat)" }}>
                            <CalendarDays className="w-5 h-5" style={{ color: "hsl(var(--primary))" }} />
                          </div>}
                      {today && b.status !== "cancelled" && (
                        <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-green-500 border-2 border-background animate-pulse" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="min-w-0">
                          <p className="font-extrabold text-sm text-foreground truncate">{b.service_name || "Service"}</p>
                          <p className="text-xs text-muted-foreground truncate">{b.provider_name || "Provider"}</p>
                        </div>
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0"
                          style={{ background: cfg.bg, color: cfg.color }}>
                          {cfg.label}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1.5">
                        <span className={`font-bold ${today ? "text-primary" : ""}`}>{dateLabel(b.booking_date)}</span>
                        <span>·</span>
                        <Clock className="w-3 h-3" />
                        <span>{(b.booking_time_text || String(b.booking_time)).slice(0, 5)}</span>
                        <span>·</span>
                        <MapPin className="w-3 h-3" />
                        <span>{b.delivery_mode === "at_home" ? "Home" : "Shop"}</span>
                      </div>

                      <div className="flex items-center justify-between mt-2">
                        <p className="text-base font-extrabold" style={{ color: "hsl(var(--primary))" }}>
                          {fmt(b.total_price)}
                        </p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          Details <ChevronRight className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="text-[10px] font-bold mt-2.5 pt-2.5"
                    style={{ borderTop: "1px solid hsl(var(--border))", color: cfg.stripColor }}>
                    {cfg.badgeText}
                    {today && ["confirmed","accepted"].includes(b.status) && " · This is today!"}
                  </p>
                </div>
              </button>
            );
          })}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default BookingsPage;
