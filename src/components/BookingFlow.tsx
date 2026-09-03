import { useState, useEffect } from "react";
import {
  X, ArrowLeft, MapPin, Home, Calendar, Clock,
  Navigation, AlertCircle, CheckCircle, Loader2, Building2, Lock,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { getCurrentPosition, initCapacitor } from "@/services/capacitor";
import { useCustomerPoints } from "@/hooks/useCustomerPoints";
import ChatWindow from "@/components/ChatWindow";
import { canMessageBooking } from "@/lib/messagingWindow";
import HomeServiceNoticeModal from "@/components/HomeServiceNoticeModal";
import StateLgaSelector from "@/components/common/StateLgaSelector";
import { parseCoordinates, resolveReadableLocation } from "@/lib/readableLocation";

interface BookingFlowProps {
  providerId: string;
  serviceId:  string;
  onClose:    () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Time-lock helpers
//
// The provider app saves business_hours as:
//   { "Monday": { enabled: boolean, start: "HH:MM", end: "HH:MM" }, … }
// Keys are full English day names (Monday … Sunday).
// ─────────────────────────────────────────────────────────────────────────────
const FULL_DAY_NAMES = [
  "Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday",
] as const;

const toMins = (t: string): number => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
};

/**
 * Given the provider's business_hours JSON and a date string (YYYY-MM-DD),
 * returns the allowed { start, end } window for that day, or null if the day
 * is not enabled / no hours are configured (= no restriction).
 */
function getAllowedWindow(
  businessHours: Record<string, any> | null | undefined,
  dateStr: string | null
): { start: string; end: string } | null {
  if (!dateStr || !businessHours) return null;

  const dayIndex = new Date(dateStr + "T00:00:00").getDay(); // 0=Sun … 6=Sat
  const dayName  = FULL_DAY_NAMES[dayIndex];                 // e.g. "Monday"
  const dayData  = businessHours[dayName];

  if (!dayData) return null;                         // day not configured
  if (!dayData.enabled) return null;                 // day disabled = treat as open (no hours set = no restriction)
  if (!dayData.start || !dayData.end) return null;   // incomplete config

  return { start: dayData.start as string, end: dayData.end as string };
}

/** Returns true if the time slot is within the provider's allowed window. */
function isTimeAllowed(
  time: string,
  businessHours: Record<string, any> | null | undefined,
  dateStr: string | null
): boolean {
  const window = getAllowedWindow(businessHours, dateStr);
  if (!window) return true; // no restriction — all slots bookable
  const mins = toMins(time);
  return mins >= toMins(window.start) && mins < toMins(window.end);
}

/** True if the provider is open at all on this date (day is enabled). */
function isDayEnabled(
  businessHours: Record<string, any> | null | undefined,
  dateStr: string
): boolean {
  if (!businessHours) return true; // no hours configured → open
  const dayName = FULL_DAY_NAMES[new Date(dateStr + "T00:00:00").getDay()];
  const dayData = businessHours[dayName];
  if (!dayData) return true; // day key missing → assume open
  return !!dayData.enabled;
}

// ─────────────────────────────────────────────────────────────────────────────
// All time slots shown in the grid (07:00 – 20:00)
// ─────────────────────────────────────────────────────────────────────────────
const ALL_TIMES = [
  "07:00","07:30","08:00","08:30","09:00","09:30",
  "10:00","10:30","11:00","11:30","12:00","12:30",
  "13:00","13:30","14:00","14:30","15:00","15:30",
  "16:00","16:30","17:00","17:30","18:00","18:30",
  "19:00","19:30","20:00",
];

// ─────────────────────────────────────────────────────────────────────────────
// OutsideHoursPopup — neumorphic dismissible modal
// ─────────────────────────────────────────────────────────────────────────────
const OutsideHoursPopup = ({
  onClose,
  hoursLabel,
}: {
  onClose: () => void;
  hoursLabel?: string; // e.g. "09:00 – 17:00"
}) => (
  <div
    className="fixed inset-0 z-[300] flex items-center justify-center px-6"
    style={{ background: "rgba(13,22,38,0.6)", backdropFilter: "blur(8px)" }}
    onClick={onClose}
  >
    <div
      className="w-full max-w-sm rounded-3xl p-6 flex flex-col items-center text-center animate-scale-in"
      style={{
        background: "hsl(var(--background))",
        boxShadow: "var(--shadow-raised)",
      }}
      onClick={e => e.stopPropagation()}
    >
      {/* Icon cluster */}
      <div className="relative mb-5 mt-2">
        {/* Main calendar icon */}
        <div
          className="w-[72px] h-[72px] rounded-[22px] flex items-center justify-center"
          style={{
            background: "hsl(var(--background))",
            boxShadow: "var(--shadow-raised)",
          }}
        >
          <Calendar className="w-8 h-8" style={{ color: "hsl(199 100% 40%)" }} />
        </div>
        {/* Clock badge — bottom-right */}
        <div
          className="absolute -bottom-2 -right-3 w-9 h-9 rounded-[14px] flex items-center justify-center border-[3px]"
          style={{
            background: "hsl(0 84% 95%)",
            borderColor: "hsl(var(--background))",
            boxShadow: "var(--shadow-flat)",
          }}
        >
          <Clock className="w-4 h-4" style={{ color: "hsl(0 72% 48%)" }} />
        </div>
        {/* Warning badge — top-left */}
        <div
          className="absolute -top-2 -left-3 w-8 h-8 rounded-xl flex items-center justify-center border-[3px]"
          style={{
            background: "hsl(38 100% 94%)",
            borderColor: "hsl(var(--background))",
            boxShadow: "var(--shadow-flat)",
          }}
        >
          <AlertCircle className="w-4 h-4" style={{ color: "hsl(38 92% 48%)" }} />
        </div>
      </div>

      {/* Dismiss X */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-8 h-8 rounded-xl flex items-center justify-center tap-scale"
        style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-flat)" }}
      >
        <X className="w-4 h-4 text-muted-foreground" />
      </button>

      <h2 className="text-[18px] font-extrabold text-foreground mb-2">Outside Booking Hours</h2>
      <p className="text-sm text-muted-foreground leading-relaxed">
        You are attempting to book a time outside the provider's operating hours.
        Please choose a time that falls within their business hours.
      </p>

      {hoursLabel && (
        <div
          className="mt-4 w-full px-4 py-3 rounded-2xl"
          style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-inset)" }}
        >
          <p className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wide mb-0.5">
            Available today
          </p>
          <p className="text-sm font-extrabold" style={{ color: "hsl(199 100% 38%)" }}>
            🕐 {hoursLabel}
          </p>
        </div>
      )}

      <button
        onClick={onClose}
        className="w-full h-[50px] rounded-2xl text-white font-extrabold text-sm flex items-center justify-center gap-2 tap-scale mt-5"
        style={{
          background: "linear-gradient(145deg, hsl(199 100% 50%), hsl(199 100% 38%))",
          boxShadow: "var(--shadow-sky)",
        }}
      >
        <CheckCircle className="w-4 h-4" />
        Book Within Business Hours
      </button>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const fmt = (n: number) => `₦${n.toLocaleString()}`;
const fmtDate = (s: string) =>
  new Date(s + "T00:00:00").toLocaleDateString("en-NG", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
const BookingFlow = ({ providerId, serviceId, onClose }: BookingFlowProps) => {
  const [step, setStep]             = useState(1);
  const [provider, setProvider]     = useState<any>(null);
  const [svc, setSvc]               = useState<any>(null);
  const [selDate, setSelDate]       = useState<string | null>(null);
  const [selTime, setSelTime]       = useState<string | null>(null);
  const [mode, setMode]             = useState<"at_shop" | "at_home">("at_shop");
  const [state, setState]           = useState("");
  const [city, setCity]             = useState("");
  const [address, setAddress]       = useState("");
  const [locCoords, setLocCoords]   = useState("");
  const [locating, setLocating]     = useState(false);
  const [agreed, setAgreed]         = useState(false);
  const [notes, setNotes]           = useState("");
  const [loading, setLoading]       = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess]       = useState(false);
  const [profileId, setProfileId]   = useState<string | null>(null);

  // Message Provider button (success screen) — set once the booking (and its
  // auto-created chat_conversations thread) exist.
  const [lastBookingId, setLastBookingId] = useState<string | null>(null);
  const [bookingConvId, setBookingConvId] = useState<string | null>(null);
  const [openingChat,   setOpeningChat]   = useState(false);
  const [chatOpen,      setChatOpen]      = useState(false);

  // Time-lock popup state
  const [showOutsideHours, setShowOutsideHours] = useState(false);
  const [outsideHoursLabel, setOutsideHoursLabel] = useState<string | undefined>();

  // Home Service Notice modal state
  const [showHomeNotice, setShowHomeNotice] = useState(false);
  const [homeNoticeAcknowledged, setHomeNoticeAcknowledged] = useState(false);

  const handleModeChange = (newMode: "at_shop" | "at_home") => {
    if (newMode === "at_home") {
      setMode("at_home");
      if (!homeNoticeAcknowledged) {
        setShowHomeNotice(true);
      }
    } else {
      setMode("at_shop");
    }
  };

  const { user }    = useAuth();
  const navigate    = useNavigate();
  const { awardPoints } = useCustomerPoints(profileId);

  // Load provider + service + customer profile
  useEffect(() => {
    (async () => {
      const [p, s, prof] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", providerId).single(),
        supabase.from("services").select("*").eq("id", serviceId).single(),
        user ? supabase.from("profiles").select("id").eq("user_id", user.id).single() : null,
      ]);
      if (p.error || !p.data) { toast.error("Could not load provider."); onClose(); return; }
      if (s.error || !s.data) { toast.error("Could not load service.");  onClose(); return; }
      setProvider(p.data);
      setSvc(s.data);
      if (prof?.data) setProfileId(prof.data.id);
      setLoading(false);
    })();
  }, [providerId, serviceId, user]);

  // Convenience: the provider's business_hours object
  const businessHours: Record<string, any> | null =
    provider?.business_hours && typeof provider.business_hours === "object"
      ? provider.business_hours
      : null;

  // Next 14 days (skip days the provider is fully closed)
  const dates = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const iso = d.toISOString().split("T")[0];
    return {
      date:    iso,
      day:     d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase(),
      num:     d.getDate(),
      isToday: i === 0,
      closed:  !isDayEnabled(businessHours, iso),
    };
  });

  // Handle time slot tap — show popup if outside hours instead of selecting
  const handleTimeSelect = (t: string) => {
    if (!isTimeAllowed(t, businessHours, selDate)) {
      const win = getAllowedWindow(businessHours, selDate);
      setOutsideHoursLabel(win ? `${win.start} – ${win.end}` : undefined);
      setShowOutsideHours(true);
      return;
    }
    setSelTime(t);
  };

  // When date changes, clear selected time if it's no longer valid
  const handleDateSelect = (dateStr: string) => {
    setSelDate(dateStr);
    if (selTime && !isTimeAllowed(selTime, businessHours, dateStr)) {
      setSelTime(null);
    }
  };

  // GPS
  const handleGetLocation = async () => {
    setLocating(true);
    await initCapacitor();
    const pos = await getCurrentPosition();
    if (pos) {
      const coords = `${pos.latitude.toFixed(6)}, ${pos.longitude.toFixed(6)}`;
      setLocCoords(coords);
      if (!address.trim() || parseCoordinates(address)) {
        const readable = await resolveReadableLocation({ latitude: pos.latitude, longitude: pos.longitude, city, state });
        setAddress(readable);
      }
      toast.success("GPS captured! Check the address before booking.");
    } else {
      toast.error("Could not get GPS. Please type your address.");
    }
    setLocating(false);
  };

  const atHomeValid = mode === "at_home" ? address.trim().length >= 5 && agreed : true;
  const canAdvance  =
    (step === 1 && !!selDate && !!selTime) ||
    (step === 2 && atHomeValid) ||
    step === 3;

  const handleConfirm = async () => {
    if (!user || !selDate || !selTime || !svc || !provider) return;

    // Final time-lock guard — double-check before DB insert
    if (!isTimeAllowed(selTime, businessHours, selDate)) {
      const win = getAllowedWindow(businessHours, selDate);
      setOutsideHoursLabel(win ? `${win.start} – ${win.end}` : undefined);
      setShowOutsideHours(true);
      return;
    }

    if (mode === "at_home" && address.trim().length < 5) {
      toast.error("Please enter your full address."); return;
    }
    setSubmitting(true);
    try {
      const { data: profile } = await supabase.from("profiles")
        .select("id,full_name,email,phone").eq("user_id", user.id).single();
      if (!profile) { toast.error("Profile not found. Please sign in again."); setSubmitting(false); return; }

      const finalNotes = [
        notes,
        locCoords && locCoords !== address ? `GPS: ${locCoords}` : "",
      ].filter(Boolean).join("\n") || null;

      const { data: newBooking, error } = await supabase.from("bookings").insert({
        customer_id:       profile.id,
        provider_id:       provider.id,
        service_id:        svc.id,
        business_user_id:  provider.user_id ?? null,
        service_name:      svc.name,
        service_price:     svc.price,
        total_price:       svc.price,
        price:             svc.price,
        discount_amount:   0,
        currency:          "NGN",
        customer_name:     profile.full_name ?? null,
        customer_email:    profile.email     ?? null,
        customer_phone:    profile.phone     ?? null,
        booking_date:      selDate,
        booking_time:      selTime,
        booking_time_text: selTime,
        delivery_mode:     mode,
        customer_location: mode === "at_home" ? address.trim() : null,
        notes:             finalNotes,
        // Bookings are auto-confirmed — no pending/approval step. A DB
        // trigger (trg_auto_confirm_booking, see
        // supabase/migrations/20260727110000_auto_confirm_bookings_and_fix_notifications.sql)
        // enforces this server-side too, so this is never overridden back
        // to "pending" even if a future code path forgets to set it.
        status:            "confirmed",
      }).select("id").single();

      if (error) { toast.error("Booking failed: " + error.message); setSubmitting(false); return; }

      // Automatically unlock messaging for this booking. A DB trigger (see
      // supabase/migrations/20260724120000_booking_messaging_window.sql) may
      // already create this row, but we don't assume that migration has run
      // on every environment — insert here too and fall back to fetching the
      // existing row if it already exists (booking_id is UNIQUE either way,
      // so this never creates a duplicate thread).
      if (newBooking?.id && provider.user_id) {
        try {
          const { data: conv, error: convErr } = await supabase.from("chat_conversations").insert({
            booking_id:       newBooking.id,
            provider_id:      provider.id,
            customer_id:      profile.id,
            provider_user_id: provider.user_id,
            customer_user_id: user.id,
          }).select("id").single();
          if (conv) {
            setBookingConvId(conv.id);
          } else if (convErr?.code === "23505") {
            // One conversation per customer+provider pair already exists (created
            // either by this same insert racing another tab, or by the DB trigger
            // in supabase/migrations/20260724120000_booking_messaging_window.sql).
            // Repoint it to this new booking so the 48h window extends from the
            // most recent qualifying booking, then reuse it — never a new thread.
            const { data: existing } = await supabase.from("chat_conversations")
              .select("id").eq("provider_id", provider.id).eq("customer_id", profile.id).maybeSingle();
            if (existing) {
              setBookingConvId(existing.id);
              await supabase.from("chat_conversations")
                .update({ booking_id: newBooking.id }).eq("id", existing.id);
            }
          }
        } catch (_) {}
      }
      setLastBookingId(newBooking?.id ?? null);

      // Notify both sides that the booking is confirmed.
      //
      // The DB notification rows themselves are written server-side by the
      // notify_provider_on_booking() trigger (see
      // supabase/migrations/20260727110000_auto_confirm_bookings_and_fix_notifications.sql)
      // — that's the reliable, always-runs path (it used to be duplicated
      // here with a mismatched enum value that silently failed every time).
      // All that's left to do client-side is fire the FCM push, since
      // nothing else delivers pushes for these rows.
      void supabase.functions.invoke("send-notification", {
        body: {
          user_id: provider.id,          // profiles.id of the provider
          title:   "New Booking ✅",
          message: `${profile.full_name || "A customer"} booked ${svc.name} on ${selDate} at ${selTime}. Automatically confirmed.`,
          type:    "booking_confirmed",
          related_booking_id: newBooking?.id ?? undefined,
          data: { click_action: `/calendar?booking=${newBooking?.id}` },
        },
      });

      void supabase.functions.invoke("send-notification", {
        body: {
          user_id: profile.id,           // profiles.id of the customer
          title:   "Booking Confirmed! ✅",
          message: `Your booking for ${svc.name} with ${provider.business_name || provider.full_name || "the provider"} on ${selDate} at ${selTime} is confirmed.`,
          type:    "booking_confirmed",
          related_booking_id: newBooking?.id ?? undefined,
          data: { click_action: `/calendar?booking=${newBooking?.id}` },
        },
      });

      const { count } = await supabase.from("bookings")
        .select("*", { count: "exact", head: true })
        .eq("customer_id", profile.id);
      if ((count ?? 0) === 1) await awardPoints("first_booking");

      setSuccess(true);
    } catch (e: any) {
      toast.error("Error: " + e.message);
    }
    setSubmitting(false);
  };

  // "Message Provider" — open the conversation created for this booking, or
  // create it lazily if it doesn't exist yet (fallback only).
  const handleMessageProvider = async () => {
    if (!lastBookingId || !provider || !user || !profileId) return;
    if (bookingConvId) { setChatOpen(true); return; }
    setOpeningChat(true);
    try {
      const { data: existing } = await supabase.from("chat_conversations")
        .select("id").eq("provider_id", provider.id).eq("customer_id", profileId).maybeSingle();
      if (existing) {
        setBookingConvId(existing.id);
        setChatOpen(true);
      } else if (provider.user_id) {
        const { data: created, error: createErr } = await supabase.from("chat_conversations").insert({
          booking_id:       lastBookingId,
          provider_id:      provider.id,
          customer_id:      profileId,
          provider_user_id: provider.user_id,
          customer_user_id: user.id,
        }).select("id").single();
        if (created) {
          setBookingConvId(created.id);
          setChatOpen(true);
        } else if (createErr?.code === "23505") {
          const { data: raceWinner } = await supabase.from("chat_conversations")
            .select("id").eq("provider_id", provider.id).eq("customer_id", profileId).maybeSingle();
          if (raceWinner) { setBookingConvId(raceWinner.id); setChatOpen(true); }
        }
      }
    } finally {
      setOpeningChat(false);
    }
  };

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ background: "rgba(13,22,38,0.55)", backdropFilter: "blur(4px)" }}>
      <div className="rounded-3xl p-8 flex flex-col items-center gap-4"
        style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)" }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "hsl(var(--primary))" }} />
        <p className="text-sm font-semibold text-foreground">Preparing booking…</p>
      </div>
    </div>
  );

  // ── Success ─────────────────────────────────────────────────────────────────
  if (success) return (
    <div className="fixed inset-0 z-[100] flex items-end"
      style={{ background: "rgba(13,22,38,0.55)", backdropFilter: "blur(4px)" }}>
      <div className="w-full rounded-t-[2rem] p-6 text-center animate-slide-up"
        style={{ background: "hsl(var(--background))", boxShadow: "0 -8px 40px rgba(0,0,0,0.2)" }}>
        <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-5"
          style={{ background: "hsl(142 40% 94%)", boxShadow: "var(--shadow-raised)" }}>
          <CheckCircle className="w-10 h-10" style={{ color: "#22c55e" }} />
        </div>
        <h2 className="text-xl font-extrabold text-foreground mb-2">Booking Confirmed! 🎉</h2>
        <p className="text-sm text-muted-foreground mb-2">
          You're all set with <strong>{provider?.business_name || provider?.full_name}</strong>.
        </p>
        <p className="text-xs text-muted-foreground mb-6">No approval needed — your booking is confirmed automatically.</p>
        <button onClick={handleMessageProvider} disabled={openingChat}
          className="w-full h-14 rounded-2xl font-extrabold text-sm tap-scale mb-3 flex items-center justify-center gap-2 disabled:opacity-60"
          style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)", color: "hsl(var(--primary))" }}>
          {openingChat
            ? <><span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> Opening chat…</>
            : "Message Provider"
          }
        </button>
        <button onClick={() => { onClose(); navigate("/bookings"); }}
          className="w-full h-14 rounded-2xl text-white font-extrabold text-sm tap-scale"
          style={{ background: "linear-gradient(145deg, hsl(199 100% 50%), hsl(199 100% 38%))", boxShadow: "var(--shadow-sky)" }}>
          View My Bookings
        </button>
      </div>

      {chatOpen && bookingConvId && user && (
        <ChatWindow
          conversationId={bookingConvId}
          currentUserId={user.id}
          currentRole="customer"
          otherName={provider?.business_name || provider?.full_name || "Provider"}
          otherAvatar={provider?.avatar_url ?? null}
          canMessage={canMessageBooking({ created_at: new Date().toISOString() })}
          onClose={() => setChatOpen(false)}
        />
      )}
    </div>
  );

  const STEPS = ["Schedule", "Location", "Confirm"];

  // For the selected date, what's the allowed window (for the label)?
  const todayWindow = getAllowedWindow(businessHours, selDate);
  const todayWindowLabel = todayWindow ? `${todayWindow.start} – ${todayWindow.end}` : null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end"
      style={{ background: "rgba(13,22,38,0.55)", backdropFilter: "blur(4px)" }}
      onClick={onClose}>

      {/* Outside booking hours popup — z-[300] sits above the sheet */}
      {showOutsideHours && (
        <OutsideHoursPopup
          hoursLabel={outsideHoursLabel}
          onClose={() => setShowOutsideHours(false)}
        />
      )}

      <div className="w-full rounded-t-[2rem] flex flex-col animate-slide-up relative"
        style={{ maxHeight: "94vh", background: "hsl(var(--background))", boxShadow: "0 -8px 40px rgba(0,0,0,0.2)" }}
        onClick={e => e.stopPropagation()}>

        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full" style={{ background: "hsl(var(--muted-foreground)/0.3)" }} />
        </div>

        {/* Header */}
        <div className="flex-shrink-0 px-5 pt-2 pb-4" style={{ borderBottom: "1px solid hsl(var(--border))" }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-muted-foreground uppercase font-extrabold tracking-wide">Booking</p>
              <h2 className="text-base font-extrabold text-foreground truncate">{svc?.name}</h2>
              <p className="text-xs text-muted-foreground">{provider?.business_name || provider?.full_name} · Step {step} of 3</p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <p className="text-lg font-extrabold" style={{ color: "hsl(var(--primary))" }}>{fmt(svc?.price || 0)}</p>
              <button onClick={onClose}
                className="w-9 h-9 rounded-2xl flex items-center justify-center tap-scale"
                style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)" }}>
                <X className="w-4 h-4 text-foreground" />
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="flex items-center gap-2">
            {STEPS.map((label, i) => {
              const n = i + 1;
              return (
                <div key={label} className="flex items-center gap-1.5 flex-1">
                  <div className="h-1.5 rounded-full flex-1 transition-all"
                    style={{ background: n <= step ? "linear-gradient(90deg, hsl(199 100% 50%), hsl(199 100% 38%))" : "hsl(var(--muted))" }} />
                  <span className="text-[9px] font-extrabold whitespace-nowrap"
                    style={{ color: n < step ? "#22c55e" : n === step ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))" }}>
                    {n < step ? "✓" : label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5">

          {/* ── STEP 1: Date + Time ── */}
          {step === 1 && (
            <div className="space-y-6">

              {/* Date picker */}
              <div>
                <h3 className="text-xs font-extrabold text-muted-foreground uppercase tracking-wide mb-3">Select Date</h3>
                <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
                  {dates.map(d => (
                    <button
                      key={d.date}
                      onClick={() => !d.closed && handleDateSelect(d.date)}
                      className="min-w-[58px] py-3 px-1.5 rounded-2xl flex flex-col items-center flex-shrink-0 tap-scale relative"
                      style={
                        d.closed
                          ? {
                              background: "hsl(var(--background))",
                              boxShadow: "var(--shadow-inset)",
                              color: "hsl(var(--muted-foreground)/0.35)",
                              cursor: "not-allowed",
                            }
                          : selDate === d.date
                          ? {
                              background: "linear-gradient(145deg, hsl(199 100% 50%), hsl(199 100% 38%))",
                              color: "white",
                              boxShadow: "var(--shadow-sky)",
                            }
                          : {
                              background: "hsl(var(--background))",
                              boxShadow: "var(--shadow-raised)",
                              color: "hsl(var(--muted-foreground))",
                            }
                      }
                    >
                      <span className="text-[9px] font-extrabold">{d.isToday ? "TODAY" : d.day}</span>
                      <span className="text-xl font-extrabold">{d.num}</span>
                      {d.closed && (
                        <span className="text-[8px] font-bold mt-0.5" style={{ color: "hsl(0 70% 55%)" }}>Closed</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time picker */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-extrabold text-muted-foreground uppercase tracking-wide">
                    Select Time
                  </h3>
                  {/* Show allowed window badge when a date is selected and hours are configured */}
                  {selDate && todayWindowLabel && (
                    <div
                      className="flex items-center gap-1 px-2.5 py-1 rounded-full"
                      style={{ background: "hsl(199 100% 96%)", boxShadow: "var(--shadow-flat)" }}
                    >
                      <Clock className="w-3 h-3" style={{ color: "hsl(199 100% 35%)" }} />
                      <span className="text-[10px] font-extrabold" style={{ color: "hsl(199 100% 35%)" }}>
                        {todayWindowLabel}
                      </span>
                    </div>
                  )}
                </div>

                {/* Hint when a date with restrictions is selected */}
                {selDate && todayWindowLabel && (
                  <div
                    className="flex items-center gap-2 mb-3 px-3 py-2 rounded-xl"
                    style={{ background: "hsl(38 100% 96%)", border: "1px solid hsl(38 92% 82%)" }}
                  >
                    <Lock className="w-3 h-3 flex-shrink-0" style={{ color: "hsl(38 92% 48%)" }} />
                    <p className="text-[11px] font-semibold" style={{ color: "hsl(38 60% 35%)" }}>
                      Greyed slots are outside this provider's booking hours
                    </p>
                  </div>
                )}

                {/* No date selected hint */}
                {!selDate && (
                  <p className="text-[11px] text-muted-foreground mb-3">
                    Select a date above to see available time slots.
                  </p>
                )}

                <div className="grid grid-cols-4 gap-2">
                  {ALL_TIMES.map(t => {
                    const allowed  = isTimeAllowed(t, businessHours, selDate);
                    const selected = selTime === t;
                    // No date selected yet → show all as normal (unselectable feel)
                    const noDate   = !selDate;

                    return (
                      <button
                        key={t}
                        onClick={() => handleTimeSelect(t)}
                        disabled={noDate}
                        className="py-2.5 rounded-2xl text-xs font-bold tap-scale relative overflow-hidden"
                        style={
                          selected
                            ? {
                                background: "linear-gradient(145deg, hsl(199 100% 50%), hsl(199 100% 38%))",
                                color: "white",
                                boxShadow: "var(--shadow-sky)",
                              }
                            : !allowed && !noDate
                            ? {
                                // Locked / outside hours — inset (pressed-in look)
                                background: "hsl(var(--background))",
                                boxShadow: "var(--shadow-inset)",
                                color: "hsl(var(--muted-foreground)/0.35)",
                                cursor: "pointer", // tappable — shows popup
                              }
                            : {
                                background: "hsl(var(--background))",
                                boxShadow: "var(--shadow-flat)",
                                color: noDate
                                  ? "hsl(var(--muted-foreground)/0.4)"
                                  : "hsl(var(--muted-foreground))",
                              }
                        }
                      >
                        {/* Lock icon overlay for blocked slots */}
                        {!allowed && !selected && !noDate && (
                          <Lock
                            className="w-2 h-2 absolute top-1 right-1 opacity-50"
                            style={{ color: "hsl(var(--muted-foreground))" }}
                          />
                        )}
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 2: Location ── */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-xs font-extrabold text-muted-foreground uppercase tracking-wide">Where?</h3>

              <div className="grid grid-cols-2 gap-3">
                {([
                  { key: "at_shop", Icon: Building2, title: "At Shop",  sub: "You visit the provider" },
                  { key: "at_home", Icon: Home,      title: "At Home",  sub: "Provider visits you"    },
                ] as const).map(({ key, Icon, title, sub }) => (
                  <button key={key} onClick={() => handleModeChange(key)}
                    className="p-4 rounded-3xl flex flex-col items-center gap-2 tap-scale"
                    style={mode === key ? {
                      background: "hsl(var(--background))", boxShadow: "var(--shadow-pressed)",
                      border: "1.5px solid hsl(var(--primary))",
                    } : {
                      background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)",
                      border: "1.5px solid transparent",
                    }}>
                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center"
                      style={mode === key ? {
                        background: "linear-gradient(145deg, hsl(199 100% 50%), hsl(199 100% 38%))", boxShadow: "var(--shadow-sky)",
                      } : { background: "hsl(var(--background))", boxShadow: "var(--shadow-flat)" }}>
                      <Icon className="w-5 h-5" style={{ color: mode === key ? "white" : "hsl(var(--muted-foreground))" }} />
                    </div>
                    <div className="text-center">
                      <p className="font-extrabold text-sm text-foreground">{title}</p>
                      <p className="text-[10px] text-muted-foreground">{sub}</p>
                    </div>
                  </button>
                ))}
              </div>

              {mode === "at_home" && (
                <div className="space-y-3 animate-fade-in">
                  <StateLgaSelector
                    stateValue={state}
                    lgaValue={city}
                    onStateChange={setState}
                    onLgaChange={setCity}
                    stateLabel="State"
                    lgaLabel="City / LGA"
                    required
                  />

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-extrabold text-muted-foreground uppercase tracking-wide">
                        Street Address <span className="text-destructive">*</span>
                      </label>
                      {address.trim().length >= 5 && (
                        <span className="text-[10px] font-extrabold" style={{ color: "#22c55e" }}>✓ Set</span>
                      )}
                    </div>
                    <div className="rounded-2xl overflow-hidden"
                      style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-inset)" }}>
                      <div className="flex items-start gap-2 px-4 py-3">
                        <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5"
                          style={{ color: address.trim().length >= 5 ? "#22c55e" : "hsl(var(--primary))" }} />
                        <textarea
                          value={address}
                          onChange={e => setAddress(e.target.value)}
                          placeholder="Enter your full address (street, area, city)…"
                          rows={2}
                          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none"
                        />
                      </div>
                    </div>
                    {address.trim().length > 0 && address.trim().length < 5 && (
                      <p className="text-[11px] text-destructive mt-1 ml-1">Please enter a full address.</p>
                    )}
                  </div>

                  <button onClick={handleGetLocation} disabled={locating}
                    className="w-full p-3.5 rounded-2xl flex items-center gap-3 tap-scale"
                    style={locCoords ? {
                      background: "hsl(142 40% 96%)", border: "1.5px solid hsl(142 71% 65%)",
                    } : {
                      background: "hsl(var(--background))", boxShadow: "var(--shadow-flat)",
                      border: "1.5px solid hsl(var(--primary) / 0.3)",
                    }}>
                    {locating
                      ? <Loader2 className="w-5 h-5 animate-spin flex-shrink-0" style={{ color: "hsl(var(--primary))" }} />
                      : <Navigation className="w-5 h-5 flex-shrink-0" style={{ color: locCoords ? "#22c55e" : "hsl(var(--primary))" }} />
                    }
                    <div className="text-left flex-1">
                      <p className="font-bold text-sm" style={{ color: locCoords ? "#15803d" : "hsl(var(--primary))" }}>
                        {locating ? "Getting location…" : locCoords ? "GPS captured ✓" : "Use GPS to auto-fill address"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {locCoords ? "Edit the address field above if needed" : "Tap to fill your address automatically"}
                      </p>
                    </div>
                  </button>

                  <div className="rounded-2xl p-4"
                    style={{ background: "hsl(38 100% 97%)", border: "1.5px solid hsl(38 92% 78%)" }}>
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-extrabold text-xs text-amber-800">Safety Notice</p>
                        <p className="text-[11px] text-amber-700 mt-0.5 leading-relaxed">
                          Home visits may carry travel fees. BookMe is not liable for incidents at your location.
                        </p>
                        <label className="flex items-center gap-2 mt-3 cursor-pointer tap-scale select-none"
                          onClick={() => setAgreed(v => !v)}>
                          <div className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
                            style={agreed ? {
                              background: "hsl(var(--primary))", boxShadow: "var(--shadow-flat)",
                            } : { background: "hsl(var(--background))", boxShadow: "var(--shadow-flat)" }}>
                            {agreed && <CheckCircle className="w-3 h-3 text-white" />}
                          </div>
                          <span className="text-xs font-bold text-amber-900">
                            I understand and agree <span className="text-destructive">*</span>
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {(!address.trim() || !agreed) && (
                    <div className="rounded-xl p-3 flex gap-2"
                      style={{ background: "hsl(0 60% 97%)", border: "1px solid hsl(0 84% 80%)" }}>
                      <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-destructive">
                        {!address.trim() ? "Address is required." : "Please accept the safety terms."}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── STEP 3: Confirm ── */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-extrabold text-foreground">Review & Confirm</h3>

              <div className="rounded-3xl p-5 space-y-4"
                style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)" }}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-extrabold">Provider</p>
                    <p className="font-extrabold text-sm">{provider?.business_name || provider?.full_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground uppercase font-extrabold">Service</p>
                    <p className="font-extrabold text-sm">{svc?.name}</p>
                  </div>
                </div>
                <div className="h-px" style={{ background: "hsl(var(--border))" }} />
                {[
                  { Icon: Calendar, val: selDate ? fmtDate(selDate) : "" },
                  { Icon: Clock,    val: `${selTime} · ${svc?.duration_minutes || svc?.duration || "—"}` },
                  { Icon: MapPin,   val: mode === "at_shop" ? "At Shop" : `Home Service · ${address}` },
                ].map(({ Icon, val }) => (
                  <div key={val} className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-flat)" }}>
                      <Icon className="w-4 h-4" style={{ color: "hsl(var(--primary))" }} />
                    </div>
                    <p className="text-sm font-semibold pt-2 flex-1">{val}</p>
                  </div>
                ))}
                <div className="h-px" style={{ background: "hsl(var(--border))" }} />
                <div className="flex justify-between items-center">
                  <p className="font-extrabold">Total</p>
                  <p className="text-2xl font-extrabold" style={{ color: "hsl(var(--primary))" }}>{fmt(svc?.price || 0)}</p>
                </div>
              </div>

              <div>
                <label className="text-xs font-extrabold text-muted-foreground uppercase tracking-wide mb-2 block">
                  Special Requests <span className="normal-case font-normal">(optional)</span>
                </label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="Any notes for the provider…"
                  className="w-full text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none rounded-2xl p-4"
                  style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-inset)", height: 80, border: "none" }} />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-5 pt-3 flex gap-3"
          style={{
            borderTop: "1px solid hsl(var(--border))",
            background: "hsl(var(--background))",
            paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)",
          }}>
          {step > 1 && (
            <button onClick={() => setStep(step - 1)}
              className="w-12 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 tap-scale"
              style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)", height: 52 }}>
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
          )}
          <button
            disabled={!canAdvance || submitting}
            onClick={() => {
              if (step === 2 && mode === "at_home" && !homeNoticeAcknowledged) {
                setShowHomeNotice(true);
                return;
              }
              if (step < 3) {
                setStep(step + 1);
              } else {
                handleConfirm();
              }
            }}
            className="flex-1 rounded-2xl text-white font-extrabold text-sm flex items-center justify-center gap-2 tap-scale disabled:opacity-40"
            style={{ height: 52, background: "linear-gradient(145deg, hsl(199 100% 50%), hsl(199 100% 38%))", boxShadow: "var(--shadow-sky)" }}>
            {step === 3
              ? submitting
                ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Submitting…</>
                : "Confirm & Book"
              : "Continue →"
            }
          </button>
        </div>

        {/* Home Service Notice Modal */}
        <HomeServiceNoticeModal
          open={showHomeNotice}
          onCancel={() => {
            setShowHomeNotice(false);
            if (!homeNoticeAcknowledged) {
              setMode("at_shop");
            }
          }}
          onUnderstand={() => {
            setHomeNoticeAcknowledged(true);
            setMode("at_home");
            setShowHomeNotice(false);
          }}
        />
      </div>
    </div>
  );
};

export default BookingFlow;
