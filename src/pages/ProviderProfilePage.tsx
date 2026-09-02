/**
 * ProviderProfilePage.tsx  — customer app (fix2)
 *
 * Changes vs original:
 * 1. Rating: customers can rate EACH completed booking (not once per provider).
 *    The average_rating on the provider's profile card increments correctly via
 *    the DB trigger.  The "Write a Review" button shows for every unrated
 *    completed booking.  We track which booking_ids have been reviewed.
 * 2. Chat: after a completed booking a "Message" button appears on the profile
 *    card.  Tapping opens the full WhatsApp-style ChatWindow.
 */

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ChevronLeft, Share, Heart, Star, MapPin, Plus, Clock,
  CheckCircle, Camera, Loader2, X, MessageSquare, Lock,
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import BookingFlow from "@/components/BookingFlow";
import ChatWindow from "@/components/ChatWindow";
import { toast } from "sonner";
import { useProviderDetail } from "@/hooks/useProviders";
import { useAuth } from "@/hooks/useAuth";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { supabase } from "@/lib/supabase";
import { useCustomerPoints } from "@/hooks/useCustomerPoints";
import { canMessageBooking } from "@/lib/messagingWindow";
import { useReadableLocation } from "@/lib/readableLocation";
import { shareProvider } from "@/services/deepLinks";
import { Capacitor } from "@capacitor/core";

type Tab = "services" | "gallery" | "reviews" | "about";

const defaultCover = "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=800&q=60";

// ── Business Hours Helper ─────────────────────────────────────────────────────
// Checks if a provider is currently open based on their business_hours JSON.
// Expected format: { monday: { open: "09:00", close: "17:00", closed: false }, ... }
// Returns true (open/bookable) if: is_active is true AND current time falls
// within today's open window. If business_hours is null/missing, defaults to open.
const DAY_NAMES = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"] as const;

function isBusinessOpen(provider: any): boolean {
  if (!provider) return false;
  if (provider.is_active === false) return false;

  const hours = provider.business_hours;
  if (!hours || typeof hours !== "object") return true; // no hours set → assume open

  const now = new Date();
  const dayKey = DAY_NAMES[now.getDay()];
  const todayHours = (hours as Record<string, any>)[dayKey];

  if (!todayHours) return true;          // day not configured → assume open
  if (todayHours.closed === true) return false; // explicitly marked closed

  const { open, close } = todayHours as { open?: string; close?: string };
  if (!open || !close) return true;      // times not set → assume open

  const toMinutes = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + (m || 0);
  };

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return nowMinutes >= toMinutes(open) && nowMinutes < toMinutes(close);
}

function getClosedLabel(provider: any): string {
  if (!provider) return "Currently Unavailable";
  if (provider.is_active === false) return "Business Inactive";
  const hours = provider.business_hours;
  if (!hours || typeof hours !== "object") return "Currently Unavailable";
  const dayKey = DAY_NAMES[new Date().getDay()];
  const todayHours = (hours as Record<string, any>)[dayKey];
  if (todayHours?.closed === true) return "Closed Today";
  if (todayHours?.open && todayHours?.close)
    return `Open ${todayHours.open} – ${todayHours.close}`;
  return "Currently Unavailable";
}

const getServiceImages = (svc: any): string[] => {
  try { return JSON.parse(svc.description || "{}").imageUrls || []; } catch { return []; }
};
const getServiceMeta = (svc: any) => {
  try { return JSON.parse(svc.description || "{}"); } catch { return {}; }
};
// Returns the plain-text description for a service regardless of whether
// the `description` column stores raw text or a JSON blob.
const getServiceDescription = (svc: any): string => {
  if (!svc.description) return "";
  try {
    const parsed = JSON.parse(svc.description);
    // JSON blob — pull the nested description field
    return (parsed.description as string | undefined) || "";
  } catch {
    // Not JSON — it's a plain string description
    return svc.description as string;
  }
};
const formatPrice = (svc: any): string => {
  const meta = getServiceMeta(svc);
  if (meta.pricingType === "range" && meta.maxPrice)
    return `₦${Number(svc.price).toLocaleString()} – ₦${Number(meta.maxPrice).toLocaleString()}`;
  return `₦${Number(svc.price).toLocaleString()}`;
};

// ── Write-Review Modal ────────────────────────────────────────────────────────
const WriteReviewModal = ({
  booking, customerId, providerId, providerName, onClose, onSubmitted,
}: {
  booking: { id: string; service_name?: string };
  customerId: string; providerId: string; providerName: string;
  onClose: () => void; onSubmitted: (bookingId: string, rating: number) => void;
}) => {
  const [rating, setRating]   = useState(0);
  const [hover,  setHover]    = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSub]  = useState(false);

  const handleSubmit = async () => {
    if (!rating) { toast.error("Please choose a star rating."); return; }
    setSub(true);
    const { error } = await supabase.from("reviews").insert({
      booking_id:    booking.id,
      customer_id:   customerId,
      provider_id:   providerId,
      rating,
      comment:       comment.trim() || null,
      service_name:  booking.service_name || null,
      customer_name: null, // DB trigger backfills
    });
    if (error) {
      if (error.code === "23505") toast.info("You already reviewed this booking.");
      else toast.error("Could not submit. Please try again.");
      setSub(false);
      return;
    }
    // Notify provider
    await supabase.from("notifications").insert({
      user_id: providerId,
      type: "review_received",
      title: "New Review! 🌟",
      body: `You received a ${rating}-star review${comment.trim() ? `: "${comment.trim().slice(0, 80)}"` : "."}`,
      is_read: false,
    });
    toast.success("Review submitted! +30 pts 🎉");
    setSub(false);
    onSubmitted(booking.id, rating);
  };

  const labels = ["", "Poor", "Fair", "Good", "Great", "Excellent"];

  return (
    <div className="fixed inset-0 z-[200] flex items-end"
      style={{ background: "rgba(13,22,38,0.6)", backdropFilter: "blur(4px)" }}
      onClick={onClose}>
      <div className="w-full rounded-t-[2rem] flex flex-col animate-slide-up"
        style={{ background: "hsl(var(--background))", maxHeight: "85vh", boxShadow: "0 -8px 40px rgba(0,0,0,0.25)" }}
        onClick={e => e.stopPropagation()}>

        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: "hsl(var(--muted-foreground)/0.3)" }} />
        </div>

        <div className="flex items-start justify-between px-5 pt-2 pb-4"
          style={{ borderBottom: "1px solid hsl(var(--border))" }}>
          <div>
            <h2 className="text-lg font-extrabold text-foreground">Write a Review</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {providerName}
              {booking.service_name ? ` · ${booking.service_name}` : ""}
            </p>
          </div>
          <button onClick={onClose}
            className="w-9 h-9 rounded-2xl flex items-center justify-center tap-scale"
            style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)" }}>
            <X className="w-4 h-4 text-foreground" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pt-6 pb-4 space-y-6">
          {/* Stars */}
          <div className="flex flex-col items-center gap-3">
            <div className="flex gap-3" onMouseLeave={() => setHover(0)}>
              {[1, 2, 3, 4, 5].map(s => (
                <button key={s}
                  onMouseEnter={() => setHover(s)}
                  onClick={() => setRating(s)}
                  className="tap-scale">
                  <Star className={`w-11 h-11 transition-colors ${s <= (hover || rating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
                </button>
              ))}
            </div>
            {(hover || rating) > 0 && (
              <p className="text-base font-extrabold text-amber-500">{labels[hover || rating]}</p>
            )}
          </div>

          {/* Comment */}
          <div>
            <label className="text-xs font-extrabold text-muted-foreground uppercase tracking-wider mb-2 block">
              Your comment (optional)
            </label>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Share your experience…"
              rows={4}
              className="w-full p-4 rounded-2xl text-sm text-foreground placeholder:text-muted-foreground resize-none outline-none"
              style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-inset)", border: "none" }}
            />
          </div>
        </div>

        <div className="px-5 pt-3"
          style={{ borderTop: "1px solid hsl(var(--border))", paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}>
          <button onClick={handleSubmit} disabled={submitting || !rating}
            className="w-full h-[52px] rounded-2xl text-white font-extrabold text-sm flex items-center justify-center gap-2 tap-scale"
            style={{
              background: rating ? "linear-gradient(145deg, hsl(199 100% 50%), hsl(199 100% 38%))" : "hsl(var(--muted))",
              boxShadow: rating ? "var(--shadow-sky)" : "none",
              opacity: submitting ? 0.6 : 1,
            }}>
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Star className="w-4 h-4" />}
            {submitting ? "Submitting…" : "Submit Review"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Booking Selector Sheet (when multiple completed bookings) ─────────────────
const BookingPickerSheet = ({
  bookings, reviewedIds, onPick, onClose,
}: {
  bookings: { id: string; service_name?: string; booking_date?: string }[];
  reviewedIds: Set<string>;
  onPick: (b: { id: string; service_name?: string }) => void;
  onClose: () => void;
}) => {
  const unrated = bookings.filter(b => !reviewedIds.has(b.id));
  return (
    <div className="fixed inset-0 z-[200] flex items-end"
      style={{ background: "rgba(13,22,38,0.6)", backdropFilter: "blur(4px)" }}
      onClick={onClose}>
      <div className="w-full rounded-t-[2rem] animate-slide-up"
        style={{ background: "hsl(var(--background))", maxHeight: "70vh", boxShadow: "0 -8px 40px rgba(0,0,0,0.25)" }}
        onClick={e => e.stopPropagation()}>
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: "hsl(var(--muted-foreground)/0.3)" }} />
        </div>
        <div className="px-5 pt-2 pb-4" style={{ borderBottom: "1px solid hsl(var(--border))" }}>
          <h2 className="text-lg font-extrabold text-foreground">Which booking to review?</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{unrated.length} unrated booking{unrated.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="px-5 py-4 space-y-3 overflow-y-auto" style={{ maxHeight: "calc(70vh - 90px)" }}>
          {unrated.map(b => (
            <button key={b.id} onClick={() => onPick(b)}
              className="w-full text-left rounded-2xl p-4 flex items-center gap-3 tap-scale"
              style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)" }}>
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-flat)" }}>
                <Star className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="font-bold text-sm text-foreground">{b.service_name || "Service"}</p>
                {b.booking_date && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(b.booking_date + "T00:00:00").toLocaleDateString("en-NG", { day: "numeric", month: "long" })}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// ── Service Detail Bottom Sheet ───────────────────────────────────────────────
// Expands a service card into a full-detail sheet with the provider-uploaded
// image (services.image_url), parsed JSON gallery thumbnails, full description,
// duration, pricing, and a Book Now CTA — all neumorphic.
const ServiceDetailSheet = ({
  svc,
  onClose,
  onBook,
  isOpen: businessOpen,
  closedLabel: businessClosedLabel,
}: { svc: any; onClose: () => void; onBook: () => void; isOpen: boolean; closedLabel: string }) => {
  // Primary image: prefer direct image_url column, fall back to JSON gallery
  const directImg   = svc.image_url || null;
  const jsonImgs    = getServiceImages(svc);
  const meta        = getServiceMeta(svc);
  const heroImg     = directImg || jsonImgs[0] || null;
  const extraImgs   = jsonImgs.filter((u: string) => u !== heroImg).slice(0, 3);

  const displayDesc = getServiceDescription(svc);

  return (
    <div className="fixed inset-0 z-[400] flex items-end justify-center"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
      onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-t-[2rem] overflow-hidden animate-slide-up"
        style={{ background: "hsl(var(--background))", maxHeight: "90dvh", overflowY: "auto" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Hero image */}
        {heroImg ? (
          <div className="relative h-52 w-full bg-muted">
            <img src={heroImg} alt={svc.name} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            {/* Emoji badge */}
            {svc.emoji && (
              <span className="absolute top-4 left-4 text-2xl drop-shadow-lg">{svc.emoji}</span>
            )}
          </div>
        ) : (
          <div className="h-24 w-full flex items-center justify-center rounded-t-[2rem]"
            style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-inset)" }}>
            <span className="text-4xl">{svc.emoji || "⭐"}</span>
          </div>
        )}

        <div className="p-5">
          {/* Name + price row */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <h2 className="text-xl font-extrabold text-foreground flex-1">{svc.name}</h2>
            <div className="text-right flex-shrink-0">
              <p className="text-lg font-extrabold" style={{ color: "hsl(var(--primary))" }}>
                {formatPrice(svc)}
              </p>
              {svc.duration_minutes && (
                <p className="text-[11px] text-muted-foreground flex items-center gap-1 justify-end mt-0.5">
                  <Clock className="w-3 h-3" /> {svc.duration_minutes} min
                </p>
              )}
            </div>
          </div>

          {/* Delivery modes */}
          {Array.isArray(svc.delivery_modes) && svc.delivery_modes.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {svc.delivery_modes.map((m: string) => (
                <span key={m}
                  className="text-[11px] font-bold px-3 py-1 rounded-full"
                  style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-flat)", color: "hsl(var(--primary))" }}>
                  {m === "at_shop" ? "🏪 At Shop" : m === "home_service" ? "🏠 Home Service" : m}
                </span>
              ))}
            </div>
          )}

          {/* Full description */}
          {displayDesc ? (
            <div className="rounded-2xl p-4 mb-4"
              style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-inset)" }}>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{displayDesc}</p>
            </div>
          ) : null}

          {/* Extra gallery thumbnails */}
          {extraImgs.length > 0 && (
            <div className="flex gap-2 mb-5">
              {extraImgs.map((url: string, i: number) => (
                <div key={i} className="flex-1 aspect-square rounded-2xl overflow-hidden"
                  style={{ boxShadow: "var(--shadow-flat)" }}>
                  <img src={url} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}

          {/* Book Now CTA */}
          <button
            onClick={() => { if (!businessOpen) { toast.error(`Booking unavailable — ${businessClosedLabel}`); return; } onClose(); onBook(); }}
            className="w-full h-[52px] rounded-2xl font-extrabold text-sm flex items-center justify-center gap-2 tap-scale"
            style={
              businessOpen
                ? { background: "linear-gradient(145deg, hsl(199 100% 50%), hsl(199 100% 38%))", boxShadow: "var(--shadow-sky)", color: "#fff" }
                : { background: "hsl(var(--muted))", boxShadow: "var(--shadow-flat)", color: "hsl(var(--muted-foreground))", cursor: "not-allowed" }
            }
          >
            {businessOpen ? <Plus className="w-5 h-5" /> : <Lock className="w-4 h-4" />}
            {businessOpen ? "Book This Service" : businessClosedLabel}
          </button>

          {/* Close pill */}
          <button onClick={onClose}
            className="w-full h-11 rounded-2xl mt-3 font-semibold text-sm tap-scale"
            style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-flat)", color: "hsl(var(--muted-foreground))" }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
const ProviderProfilePage = () => {
  const { id }   = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { requireAuth, modal: authModal } = useRequireAuth();
  
  const [isRedirecting, setIsRedirecting] = useState(!Capacitor.isNativePlatform());

  useEffect(() => {
    if (Capacitor.isNativePlatform() || !id) {
      setIsRedirecting(false);
      return;
    }

    // Web fallback execution
    const runFallback = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("create-deferred-token", {
          body: { provider_id: id }
        });

        let token = "";
        if (data?.token && !error) {
          token = data.token;
        }

        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
        const isAndroid = /android/i.test(navigator.userAgent);

        if (isAndroid) {
          const referrer = token ? `&referrer=token%3D${token}` : "";
          window.location.href = `https://play.google.com/store/apps/details?id=com.bookmebusiness.customerapp1${referrer}`;
        } else if (isIOS) {
          if (token) {
             // For iOS, the standard approach without native resolution yet is to try to write to clipboard or use a fallback mechanism.
             // We will prepare the token for iOS clipboard-based mechanism.
             try {
                await navigator.clipboard.writeText(`bookme_token_${token}`);
             } catch (e) {
                // Ignore clipboard failures as we can't guarantee 100% reliability
             }
          }
          window.location.href = "https://apps.apple.com/us/app/bookme-book-a-service/id6782405521";
        } else {
          // Desktop fallback
          window.location.href = "https://play.google.com/store/apps/details?id=com.bookmebusiness.customerapp1";
        }
      } catch (err) {
        // Fallback on failure
        window.location.href = "https://play.google.com/store/apps/details?id=com.bookmebusiness.customerapp1";
      }
    };

    runFallback();
  }, [id]);

  if (isRedirecting) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: "hsl(var(--background))" }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "hsl(var(--primary))" }} />
        <p className="text-sm text-muted-foreground animate-pulse">Redirecting to app store...</p>
      </div>
    );
  }

  const [activeTab,       setActiveTab]       = useState<Tab>("services");
  const [bookingService,  setBookingService]   = useState<string | null>(null);
  const [lightbox,        setLightbox]         = useState<string | null>(null);
  const [isFav,           setIsFav]            = useState(false);
  const [favLoading,      setFavLoading]       = useState(false);
  const [profileId,       setProfileId]        = useState<string | null>(null);

  // Gallery
  const [gallery,         setGallery]          = useState<{ id: string; photo_url: string }[]>([]);
  const [galleryLoading,  setGalLoading]       = useState(false);

  // Reviews — per-booking tracking
  const [reviews,         setReviews]          = useState<any[]>([]);
  const [reviewsLoading,  setRevLoading]       = useState(false);
  const [ratingBars,      setRatingBars]       = useState<{ star: number; count: number; pct: number }[]>([]);
  const [completedBks,    setCompBks]          = useState<{ id: string; service_name?: string; booking_date?: string }[]>([]);
  const [reviewedIds,     setReviewedIds]      = useState<Set<string>>(new Set());
  const [showWriteReview, setShowWrite]        = useState(false);
  const [pickerOpen,      setPickerOpen]       = useState(false);
  const [selectedBk,      setSelectedBk]       = useState<{ id: string; service_name?: string } | null>(null);

  // Service detail sheet
  const [selectedService, setSelectedService]  = useState<any | null>(null);

  // Chat
  const [chatConvId,      setChatConvId]       = useState<string | null>(null);
  const [chatOpen,        setChatOpen]         = useState(false);
  const [chatCanMessage,  setChatCanMessage]   = useState(true);

  // About-tab phone visibility — only shown to a logged-in customer who has
  // an active (pending/confirmed/accepted) booking with this specific provider.
  const [hasActiveBooking, setHasActiveBooking] = useState(false);

  // Live average_rating after new review
  const [liveRating,      setLiveRating]       = useState<number | null>(null);
  const [liveCount,       setLiveCount]        = useState<number | null>(null);

  const { provider, services, loading } = useProviderDetail(id || "");
  const providerRecord = provider as any;
  const readableProviderLocation = useReadableLocation({
    address: providerRecord?.address,
    city: providerRecord?.city,
    state: providerRecord?.state,
    latitude: providerRecord?.latitude,
    longitude: providerRecord?.longitude,
  });
  const { awardPoints } = useCustomerPoints(profileId);

  // Time-lock: derive open/closed status from business_hours + is_active
  const isOpen = isBusinessOpen(provider);
  const closedLabel = getClosedLabel(provider);

  // Load customer profile id
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("id").eq("user_id", user.id).single()
      .then(({ data }) => { if (data) setProfileId(data.id); });
  }, [user]);

  // Load favourite status
  useEffect(() => {
    if (!user || !id) return;
    supabase.from("saved_providers").select("id").eq("user_id", user.id).eq("provider_id", id).maybeSingle()
      .then(({ data }) => setIsFav(!!data));
  }, [user, id]);

  // Load completed bookings for this provider + which are already reviewed
  useEffect(() => {
    if (!profileId || !id) return;
    supabase.from("bookings")
      .select("id, service_name, booking_date")
      .eq("customer_id", profileId)
      .eq("provider_id", id)
      .eq("status", "completed")
      .then(({ data }) => setCompBks(data || []));

    supabase.from("reviews")
      .select("booking_id")
      .eq("customer_id", profileId)
      .eq("provider_id", id)
      .then(({ data }) => setReviewedIds(new Set((data || []).map((r: any) => r.booking_id))));
  }, [profileId, id]);

  // Check for an active booking with this provider — gates the phone number
  // shown on the About tab. "Active" = not yet completed/cancelled/rejected.
  useEffect(() => {
    if (!user || !profileId || !id) { setHasActiveBooking(false); return; }
    supabase.from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("customer_id", profileId)
      .eq("provider_id", id)
      .in("status", ["pending", "confirmed", "accepted"])
      .then(({ count }) => setHasActiveBooking((count ?? 0) > 0));
  }, [user, profileId, id]);

  // Load or create chat conversation for this provider
  useEffect(() => {
    if (!profileId || !id || completedBks.length === 0 || !user) return;
    // Try to find an existing conversation between these two
    supabase.from("chat_conversations")
      .select("id, booking_id")
      .eq("provider_id", id)
      .eq("customer_id", profileId)
      .maybeSingle()
      .then(async ({ data }) => {
        if (!data) return;
        setChatConvId(data.id);
        // Messaging window is driven by the conversation's linked booking,
        // which is always the most recent qualifying booking for this pair
        // (see supabase/migrations/*_dedupe_chat_conversations_per_pair.sql).
        if (data.booking_id) {
          const { data: bk } = await supabase.from("bookings")
            .select("created_at").eq("id", data.booking_id).maybeSingle();
          setChatCanMessage(canMessageBooking(bk));
        }
      });
  }, [profileId, id, completedBks, user]);

  // Create conversation if doesn't exist (lazy: on chat button tap)
  const openChat = async () => {
    if (!profileId || !id || !user || !provider) return;
    if (chatConvId) { setChatOpen(true); return; }
    // Create conversation using first completed booking
    const bk = completedBks[0];
    if (!bk) return;
    const { data, error } = await supabase.from("chat_conversations").insert({
      booking_id: bk.id,
      provider_id: id,
      customer_id: profileId,
      provider_user_id: provider.user_id,
      customer_user_id: user.id,
    }).select("id").single();
    if (error && error.code === "23505") {
      // Already exists (one conversation per customer+provider pair), fetch it
      const { data: existing } = await supabase.from("chat_conversations")
        .select("id, booking_id").eq("provider_id", id).eq("customer_id", profileId).maybeSingle();
      if (existing) {
        setChatConvId(existing.id);
        setChatOpen(true);
        if (existing.booking_id) {
          const { data: existingBk } = await supabase.from("bookings")
            .select("created_at").eq("id", existing.booking_id).maybeSingle();
          setChatCanMessage(canMessageBooking(existingBk));
        }
      }
    } else if (data) {
      setChatConvId(data.id);
      setChatOpen(true);
      setChatCanMessage(canMessageBooking(bk));
    }
  };

  // Fetch gallery when tab active
  useEffect(() => {
    if (!provider || activeTab !== "gallery") return;
    setGalLoading(true);
    supabase.from("gallery_photos").select("id, photo_url")
      .eq("user_id", provider.user_id)
      .order("created_at", { ascending: false })
      .then(({ data }) => { setGallery(data || []); setGalLoading(false); });
  }, [provider, activeTab]);

  // Fetch reviews when tab active
  const loadReviews = async () => {
    if (!provider) return;
    setRevLoading(true);
    const { data } = await supabase.from("reviews")
      .select(`id, rating, comment, created_at, booking_id,
        customer:profiles!reviews_customer_id_fkey(full_name, avatar_url)`)
      .eq("provider_id", provider.id)
      .order("created_at", { ascending: false });
    const rv = data || [];
    setReviews(rv);
    const bars = [5, 4, 3, 2, 1].map(star => {
      const count = rv.filter((r: any) => r.rating === star).length;
      return { star, count, pct: rv.length ? Math.round((count / rv.length) * 100) : 0 };
    });
    setRatingBars(bars);
    if (rv.length > 0) {
      const avg = rv.reduce((s: number, r: any) => s + r.rating, 0) / rv.length;
      setLiveRating(Math.round(avg * 10) / 10);
      setLiveCount(rv.length);
    }
    setRevLoading(false);
  };

  useEffect(() => {
    if (activeTab === "reviews") loadReviews();
  }, [provider, activeTab]);

  // Toggle favourite — the calling button is gated by requireAuth, so `user`
  // is guaranteed here; this guard is just defense-in-depth.
  const toggleFav = async () => {
    if (!user || !id) return;
    setFavLoading(true);
    if (isFav) {
      await supabase.from("saved_providers").delete().eq("user_id", user.id).eq("provider_id", id);
      setIsFav(false); toast("Removed from saved");
    } else {
      const { error } = await supabase.from("saved_providers").upsert({ user_id: user.id, provider_id: id });
      if (error) toast.error("Could not save provider.");
      else { setIsFav(true); toast("Saved! ❤️"); }
    }
    setFavLoading(false);
  };

  const handleShare = async () => {
    if (!provider) return;
    const result = await shareProvider({
      providerId: provider.id,
      providerSlug: (provider as any).slug ?? null,
      providerName: provider.business_name || provider.full_name || "Provider",
      ref: "profile_share",
      utmCampaign: "organic_share",
      utmSource: "share",
      sharerId: user?.id,
    });
    if (result.method === "clipboard") toast.success("Link copied to clipboard!");
    else if (result.method === "failed") toast.error("Could not share — please try again.");
  };

  const handleReviewSubmitted = async (bookingId: string, rating: number) => {
    setShowWrite(false);
    setPickerOpen(false);
    setSelectedBk(null);
    setReviewedIds(prev => new Set([...prev, bookingId]));
    await loadReviews();
    await awardPoints("review_submitted");
  };

  // How many unrated completed bookings remain
  const unratedCount = completedBks.filter(b => !reviewedIds.has(b.id)).length;

  const handleReviewBtnClick = () => {
    if (unratedCount === 0) return;
    if (unratedCount === 1) {
      setSelectedBk(completedBks.find(b => !reviewedIds.has(b.id))!);
      setShowWrite(true);
    } else {
      setPickerOpen(true);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: "hsl(var(--background))" }}>
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: "hsl(var(--primary))" }} />
      <p className="text-sm text-muted-foreground animate-pulse">Loading profile…</p>
    </div>
  );
  if (!provider) return (
    <div className="min-h-screen flex items-center justify-center text-muted-foreground" style={{ background: "hsl(var(--background))" }}>
      Provider not found
    </div>
  );

  const displayRating = liveRating ?? (provider.average_rating || 0);
  const displayCount  = liveCount  ?? (provider.review_count  || 0);

  const tabs: { key: Tab; label: string }[] = [
    { key: "services", label: "Services" },
    { key: "gallery",  label: "Gallery"  },
    { key: "reviews",  label: "Reviews"  },
    { key: "about",    label: "About"    },
  ];

  return (
    <div className="min-h-screen pb-32" style={{ background: "hsl(var(--background))" }}>

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center"
          onClick={() => setLightbox(null)}>
          <button className="absolute top-12 right-4 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <X className="w-5 h-5 text-white" />
          </button>
          <img src={lightbox} alt="" className="max-w-full max-h-full object-contain rounded-2xl" />
        </div>
      )}

      {/* Write review modal */}
      {showWriteReview && profileId && selectedBk && (
        <WriteReviewModal
          customerId={profileId}
          providerId={provider.id}
          providerName={provider.business_name || provider.full_name || "Provider"}
          booking={selectedBk}
          onClose={() => { setShowWrite(false); setSelectedBk(null); }}
          onSubmitted={handleReviewSubmitted}
        />
      )}

      {/* Booking picker */}
      {pickerOpen && (
        <BookingPickerSheet
          bookings={completedBks}
          reviewedIds={reviewedIds}
          onPick={b => { setPickerOpen(false); setSelectedBk(b); setShowWrite(true); }}
          onClose={() => setPickerOpen(false)}
        />
      )}

      {/* Booking flow */}
      {bookingService && (
        <BookingFlow providerId={provider.id} serviceId={bookingService} onClose={() => setBookingService(null)} />
      )}

      {authModal}

      {/* Chat window */}
      {chatOpen && chatConvId && user && (
        <ChatWindow
          conversationId={chatConvId}
          currentUserId={user.id}
          currentRole="customer"
          otherName={provider.business_name || provider.full_name || "Provider"}
          otherAvatar={provider.avatar_url}
          canMessage={chatCanMessage}
          onClose={() => setChatOpen(false)}
        />
      )}

      {/* Service detail bottom sheet */}
      {selectedService && (
        <ServiceDetailSheet
          svc={selectedService}
          onClose={() => setSelectedService(null)}
          onBook={() => requireAuth(() => setBookingService(selectedService.id), "book this service")}
          isOpen={isOpen}
          closedLabel={closedLabel}
        />
      )}

      {/* Cover */}
      <div className="relative h-64">
        <img src={provider.cover_image_url || provider.cover_photo_url || defaultCover}
          alt={provider.business_name || provider.full_name || ""}
          className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-transparent" />
        <button onClick={() => navigate(-1)}
          className="absolute top-12 left-4 w-11 h-11 rounded-2xl flex items-center justify-center tap-scale"
          style={{ background: "rgba(255,255,255,0.2)", backdropFilter: "blur(8px)" }}>
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
        <div className="absolute top-12 right-4 flex gap-2">
          <button onClick={handleShare}
            className="w-11 h-11 rounded-2xl flex items-center justify-center tap-scale"
            aria-label="Share provider profile"
            style={{ background: "rgba(255,255,255,0.2)", backdropFilter: "blur(8px)" }}>
            <Share className="w-4 h-4 text-white" />
          </button>
          <button onClick={() => requireAuth(toggleFav, "save providers")} disabled={favLoading}
            className="w-11 h-11 rounded-2xl flex items-center justify-center tap-scale"
            style={{ background: "rgba(255,255,255,0.2)", backdropFilter: "blur(8px)" }}>
            <Heart className={`w-4 h-4 transition-colors ${isFav ? "fill-red-400 text-red-400" : "text-white"}`} />
          </button>
        </div>
      </div>

      {/* Profile card */}
      <div className="px-5 -mt-10 relative z-10">
        <div className="rounded-3xl p-5" style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)" }}>
          <div className="flex items-start justify-between -mt-14 mb-4">
            <img src={provider.avatar_url || defaultCover} alt=""
              className="w-20 h-20 rounded-2xl object-cover border-4"
              style={{ borderColor: "hsl(var(--background))", boxShadow: "var(--shadow-raised)" }} />
            <div className="flex items-center gap-1.5 mt-10 px-3 py-1.5 rounded-2xl"
              style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-flat)" }}>
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span className="text-sm font-extrabold">{displayRating.toFixed(1)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-foreground">{provider.business_name || provider.full_name}</h1>
            {provider.is_verified && <CheckCircle className="w-5 h-5" style={{ color: "hsl(var(--primary))" }} />}
          </div>
          <p className="text-sm font-bold mt-0.5 capitalize" style={{ color: "hsl(var(--primary))" }}>
            {provider.category || "General"}
          </p>

          {/* Open/Closed status badge */}
          <div className="flex items-center gap-1.5 mt-2">
            <span
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold"
              style={
                isOpen
                  ? { background: "hsl(142 76% 90%)", color: "hsl(142 76% 26%)" }
                  : { background: "hsl(0 84% 93%)", color: "hsl(0 84% 35%)" }
              }
            >
              {isOpen ? (
                <><span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" /> Open Now</>
              ) : (
                <><Lock className="w-3 h-3" /> {closedLabel}</>
              )}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-muted-foreground">
            <MapPin className="w-3.5 h-3.5" />
            <span className="text-sm">{readableProviderLocation || "Location unavailable"}</span>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            {[
              { value: displayCount > 0 ? displayCount.toString() : "New", label: "Reviews"  },
              { value: services.length.toString(),                          label: "Services" },
              { value: gallery.length > 0 ? gallery.length.toString() : "—", label: "Photos" },
            ].map(s => (
              <div key={s.label} className="rounded-2xl p-3 text-center"
                style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-inset)" }}>
                <p className="text-lg font-extrabold text-foreground">{s.value}</p>
                <p className="text-[10px] text-muted-foreground font-semibold">{s.label}</p>
              </div>
            ))}
          </div>

          {/* CTA buttons */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => {
                if (!isOpen) { toast.error(`Booking unavailable — ${closedLabel}`); return; }
                if (services.length === 0) { toast.error("No services available"); return; }
                requireAuth(() => setBookingService(services[0].id), "make a booking");
              }}
              className="flex-1 h-[52px] rounded-2xl font-extrabold text-sm flex items-center justify-center gap-2 tap-scale"
              style={
                isOpen
                  ? { background: "linear-gradient(145deg, hsl(199 100% 50%), hsl(199 100% 38%))", boxShadow: "var(--shadow-sky)", color: "#fff" }
                  : { background: "hsl(var(--muted))", boxShadow: "var(--shadow-flat)", color: "hsl(var(--muted-foreground))", cursor: "not-allowed" }
              }>
              {isOpen ? <Plus className="w-5 h-5" /> : <Lock className="w-4 h-4" />}
              {isOpen ? "Book Now" : closedLabel}
            </button>

            {/* Chat button — only after a completed booking */}
            {completedBks.length > 0 && user && (
              <button onClick={openChat}
                className="w-[52px] h-[52px] rounded-2xl flex items-center justify-center flex-shrink-0 tap-scale"
                style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)" }}>
                <MessageSquare className="w-5 h-5 text-primary" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-5 mt-5">
        <div className="flex gap-1.5 p-1.5 rounded-3xl" style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-inset)" }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className="flex-1 py-2.5 text-xs font-bold rounded-2xl transition-all tap-scale capitalize"
              style={activeTab === t.key ? {
                background: "linear-gradient(145deg, hsl(199 100% 50%), hsl(199 100% 38%))",
                color: "white", boxShadow: "var(--shadow-sky)",
              } : { color: "hsl(var(--muted-foreground))" }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="px-5 mt-4">

        {/* ── SERVICES ── */}
        {activeTab === "services" && (
          <div className="adaptive-card-grid animate-fade-in">
            {services.length === 0 && (
              <div className="rounded-3xl p-12 text-center" style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-flat)" }}>
                <p className="text-sm text-muted-foreground">No services listed yet.</p>
              </div>
            )}
            {services.map(s => {
              const imgs      = getServiceImages(s);
              const meta      = getServiceMeta(s);
              const heroImg   = s.image_url || imgs[0] || null;
              const extraImgs = imgs.filter((u: string) => u !== heroImg).slice(0, 2);
              const hasImages = !!heroImg;
              const cardDesc  = getServiceDescription(s);

              return (
                <button
                  key={s.id}
                  onClick={() => setSelectedService(s)}
                  className="w-full text-left rounded-3xl overflow-hidden animate-fade-in tap-scale"
                  style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)" }}
                >
                  {/* Hero image */}
                  {hasImages ? (
                    <div className="relative w-full h-44 overflow-hidden">
                      <img
                        src={heroImg!}
                        alt={s.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      {s.emoji && (
                        <span className="absolute top-3 left-3 text-2xl drop-shadow-lg">{s.emoji}</span>
                      )}
                      <div
                        className="absolute top-3 right-3 px-3 py-1 rounded-xl"
                        style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(6px)" }}
                      >
                        <span className="text-sm font-extrabold text-white">{formatPrice(s)}</span>
                      </div>
                      {s.duration_minutes && (
                        <div
                          className="absolute bottom-3 left-3 flex items-center gap-1"
                          style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(6px)", padding: "3px 10px", borderRadius: 20 }}
                        >
                          <Clock className="w-3 h-3 text-white" />
                          <span className="text-[11px] font-bold text-white">{s.duration_minutes} min</span>
                        </div>
                      )}
                      {extraImgs.length > 0 && (
                        <div className="absolute bottom-3 right-3 flex gap-1">
                          {extraImgs.map((url: string, i: number) => (
                            <button
                              key={i}
                              onClick={e => { e.stopPropagation(); setLightbox(url); }}
                              className="w-9 h-9 rounded-xl overflow-hidden border-2"
                              style={{ borderColor: "rgba(255,255,255,0.5)" }}
                            >
                              <img src={url} alt="" className="w-full h-full object-cover" />
                            </button>
                          ))}
                          {imgs.length > 3 && (
                            <div
                              className="w-9 h-9 rounded-xl flex items-center justify-center border-2 text-[10px] font-extrabold text-white"
                              style={{ borderColor: "rgba(255,255,255,0.5)", background: "rgba(0,0,0,0.5)" }}
                            >
                              +{imgs.length - 3}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div
                      className="w-full h-20 flex items-center justify-center"
                      style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-inset)" }}
                    >
                      <span className="text-5xl">{s.emoji || "⭐"}</span>
                    </div>
                  )}

                  {/* Content */}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-extrabold text-foreground text-base leading-tight">{s.name}</p>
                        {cardDesc && (
                          <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed line-clamp-2">{cardDesc}</p>
                        )}
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {!hasImages && s.duration_minutes && (
                            <span
                              className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full"
                              style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-flat)", color: "hsl(var(--muted-foreground))" }}
                            >
                              <Clock className="w-3 h-3" /> {s.duration_minutes} min
                            </span>
                          )}
                          {Array.isArray(s.delivery_modes) && s.delivery_modes.map((m: string) => (
                            <span
                              key={m}
                              className="text-[10px] font-bold px-2.5 py-1 rounded-full"
                              style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-flat)", color: "hsl(var(--primary))" }}
                            >
                              {m === "at_shop" ? "🏪 At Shop" : m === "home_service" ? "🏠 Home" : m}
                            </span>
                          ))}
                        </div>
                      </div>
                      {!hasImages && (
                        <div className="text-right flex-shrink-0">
                          <p className="text-base font-extrabold" style={{ color: "hsl(var(--primary))" }}>{formatPrice(s)}</p>
                          <button
                            onClick={e => { e.stopPropagation(); if (!isOpen) { toast.error(`Booking unavailable — ${closedLabel}`); return; } requireAuth(() => setBookingService(s.id), "book this service"); }}
                            className="mt-2 px-4 py-1.5 rounded-xl text-xs font-bold tap-scale flex items-center gap-1"
                            style={
                              isOpen
                                ? { background: "linear-gradient(135deg, hsl(199 100% 50%), hsl(199 100% 38%))", color: "#fff" }
                                : { background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))", cursor: "not-allowed" }
                            }
                          >
                            {isOpen ? "Book" : <><Lock className="w-3 h-3" /> Closed</>}
                          </button>
                        </div>
                      )}
                    </div>
                    {hasImages && (
                      <div
                        className="flex items-center justify-between mt-3 pt-3"
                        style={{ borderTop: "1px solid hsl(var(--border))" }}
                      >
                        <p className="text-base font-extrabold" style={{ color: "hsl(var(--primary))" }}>{formatPrice(s)}</p>
                        <button
                          onClick={e => { e.stopPropagation(); if (!isOpen) { toast.error(`Booking unavailable — ${closedLabel}`); return; } requireAuth(() => setBookingService(s.id), "book this service"); }}
                          className="px-5 py-2 rounded-xl text-xs font-bold tap-scale flex items-center gap-1"
                          style={
                            isOpen
                              ? { background: "linear-gradient(135deg, hsl(199 100% 50%), hsl(199 100% 38%))", color: "#fff" }
                              : { background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))", cursor: "not-allowed" }
                          }
                        >
                          {isOpen ? "Book Now" : <><Lock className="w-3 h-3" /> Closed</>}
                        </button>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* ── GALLERY ── */}
        {activeTab === "gallery" && (
          <div className="animate-fade-in">
            {galleryLoading ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
                {[1,2,3,4,5,6].map(i => <div key={i} className="aspect-square rounded-2xl skeleton" />)}
              </div>
            ) : gallery.length === 0 ? (
              <div className="rounded-3xl p-12 text-center" style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-flat)" }}>
                <Camera className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No photos yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
                {gallery.map(p => (
                  <button key={p.id} onClick={() => setLightbox(p.photo_url)}
                    className="aspect-square rounded-2xl overflow-hidden tap-scale">
                    <img src={p.photo_url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── REVIEWS ── */}
        {activeTab === "reviews" && (
          <div className="space-y-3 animate-fade-in">

            {/* Overall rating */}
            {reviews.length > 0 && (
              <div className="rounded-3xl p-5" style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)" }}>
                <div className="flex gap-5 items-center">
                  <div className="text-center">
                    <p className="text-5xl font-extrabold text-foreground">{displayRating.toFixed(1)}</p>
                    <div className="flex justify-center gap-0.5 mt-1">
                      {[1,2,3,4,5].map(i => (
                        <Star key={i} className={`w-4 h-4 ${i <= Math.round(displayRating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20"}`} />
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">{displayCount} review{displayCount !== 1 ? "s" : ""}</p>
                  </div>
                  <div className="flex-1 space-y-1.5">
                    {ratingBars.map(({ star, count, pct }) => (
                      <div key={star} className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground w-3">{star}</span>
                        <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "hsl(var(--muted))" }}>
                          <div className="h-full rounded-full bg-amber-400 transition-all duration-700" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-[10px] text-muted-foreground w-4">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Write review button — shows for each unrated completed booking */}
            {unratedCount > 0 && (
              <button onClick={handleReviewBtnClick}
                className="w-full h-12 rounded-2xl text-white font-bold text-sm flex items-center justify-center gap-2 tap-scale"
                style={{ background: "linear-gradient(145deg, hsl(199 100% 50%), hsl(199 100% 38%))", boxShadow: "var(--shadow-sky)" }}>
                <Star className="w-4 h-4" />
                Rate this provider {unratedCount > 1 ? `(${unratedCount} bookings)` : ""}
              </button>
            )}

            {/* Already reviewed all indicator */}
            {completedBks.length > 0 && unratedCount === 0 && (
              <div className="rounded-2xl px-4 py-3 text-center"
                style={{ background: "hsl(142 40% 94%)", border: "1px solid hsl(142 71% 70%)" }}>
                <p className="text-xs font-bold" style={{ color: "hsl(142 71% 28%)" }}>
                  ✓ You've rated all your completed bookings
                </p>
              </div>
            )}

            {/* Reviews list */}
            {reviewsLoading ? (
              <div className="adaptive-card-grid">{[1,2,3].map(i => <div key={i} className="h-20 rounded-3xl skeleton" />)}</div>
            ) : reviews.length === 0 ? (
              <div className="rounded-3xl p-10 text-center" style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-flat)" }}>
                <Star className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No reviews yet. Book a service and review!</p>
              </div>
            ) : (
              <div className="adaptive-card-grid">
              {reviews.map((r: any) => {
                const name = r.customer?.full_name || r.customer_name || "Anonymous";
                return (
                  <div key={r.id} className="rounded-3xl p-4 animate-fade-in"
                    style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)" }}>
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-extrabold text-sm flex-shrink-0"
                        style={{ background: "linear-gradient(135deg, hsl(199 100% 50%), hsl(220 100% 30%))", boxShadow: "var(--shadow-flat)" }}>
                        {name[0].toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-bold text-sm text-foreground">{name}</p>
                            {r.service_name && <p className="text-[10px] text-muted-foreground">{r.service_name}</p>}
                          </div>
                          <div className="flex gap-0.5">
                            {[1,2,3,4,5].map(i => (
                              <Star key={i} className={`w-3 h-3 ${i <= r.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20"}`} />
                            ))}
                          </div>
                        </div>
                        {r.comment && (
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed italic">"{r.comment}"</p>
                        )}
                        <p className="text-[10px] text-muted-foreground mt-1.5">
                          {new Date(r.created_at).toLocaleDateString("en-NG", { month: "short", day: "numeric", year: "numeric" })}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
              </div>
            )}
          </div>
        )}

        {/* ── ABOUT ── */}
        {activeTab === "about" && (
          <div className="adaptive-card-grid animate-fade-in">
            {[
              { label: "About",   value: provider.bio || provider.business_description },
              { label: "City",    value: provider.city    },
              { label: "State",   value: provider.state   },
              { label: "Address", value: readableProviderLocation || provider.address },
              { label: "Website", value: provider.website },
            ].filter(i => i.value).map(({ label, value }) => (
              <div key={label} className="rounded-3xl p-4"
                style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)" }}>
                <p className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
                <p className="text-sm text-foreground">{value}</p>
              </div>
            ))}
            {!provider.bio && !provider.city && (
              <div className="rounded-3xl p-10 text-center" style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-flat)" }}>
                <p className="text-sm text-muted-foreground">No details available.</p>
              </div>
            )}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default ProviderProfilePage;
