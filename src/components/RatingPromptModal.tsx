/**
 * RatingPromptModal
 * Shown to the customer after a provider marks their booking complete.
 * Lets them submit a 1-5 star rating + optional comment.
 * Inserts into reviews table and triggers a review_received notification
 * for the provider using existing notification patterns.
 */

import { useState } from "react";
import { Star, X, Loader2, CheckCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface RatingPromptModalProps {
  booking: {
    id: string;
    service_name: string;
    provider_name: string;
    provider_id: string;
    customer_id: string;
  };
  onClose: () => void;
  onRated: () => void; // called after successful submission (to award points)
}

const RatingPromptModal = ({ booking, onClose, onRated }: RatingPromptModalProps) => {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error("Please select a star rating.");
      return;
    }
    setSubmitting(true);

    // 1. Insert review
    const { error: reviewError } = await supabase.from("reviews").insert({
      booking_id: booking.id,
      customer_id: booking.customer_id,
      provider_id: booking.provider_id,
      rating,
      comment: comment.trim() || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (reviewError) {
      // Duplicate review (unique constraint on booking_id) — already reviewed
      if (reviewError.code === "23505") {
        toast.info("You've already reviewed this booking.");
        onClose();
        return;
      }
      toast.error("Could not submit review. Please try again.");
      setSubmitting(false);
      return;
    }

    // 2. Insert review_received notification for the provider
    // Using provider's profile_id as user_id (matches existing notification pattern)
    await supabase.from("notifications").insert({
      user_id: booking.provider_id,
      type: "review_received",
      title: "New Review! 🌟",
      body: `A customer rated your service "${booking.service_name}" ${rating} star${rating > 1 ? "s" : ""}${comment.trim() ? `: "${comment.trim().slice(0, 80)}"` : "."}`,
      related_booking_id: booking.id,
      related_provider_id: booking.provider_id,
      data: { rating, booking_id: booking.id, service_name: booking.service_name },
      is_read: false,
      created_at: new Date().toISOString(),
    });

    // 3. Update provider average_rating and review_count
    // Do a safe recalculation via a Supabase RPC if available, otherwise
    // fall back to a simple increment approach (the trigger handles average)
    // We leave the DB trigger to handle average_rating recalculation.

    setSubmitting(false);
    setDone(true);

    // Brief success state then close & award points
    setTimeout(() => {
      onRated();
      onClose();
    }, 1800);
  };

  const starLabel = ["", "Poor", "Fair", "Good", "Great", "Excellent"];

  if (done) {
    return (
      <div className="fixed inset-0 z-[200] bg-foreground/60 flex items-end">
        <div className="w-full bg-card rounded-t-3xl p-8 flex flex-col items-center gap-4">
          <CheckCircle className="w-14 h-14 text-green-500" />
          <p className="text-lg font-extrabold text-foreground">Thanks for your review!</p>
          <p className="text-sm text-muted-foreground text-center">Your feedback helps other customers find great providers.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] bg-foreground/60 flex items-end" onClick={onClose}>
      <div
        className="w-full bg-card rounded-t-3xl flex flex-col"
        style={{ maxHeight: "85vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Header */}
        <div className="px-5 pt-3 pb-4 flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Service Completed</p>
            <h2 className="text-lg font-extrabold text-foreground mt-0.5">How was your experience?</h2>
            <p className="text-sm text-muted-foreground">{booking.provider_name} · {booking.service_name}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-muted flex items-center justify-center mt-1"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="px-5 space-y-5 overflow-y-auto pb-2">
          {/* Stars */}
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  onMouseEnter={() => setHovered(s)}
                  onMouseLeave={() => setHovered(0)}
                  onClick={() => setRating(s)}
                  className="transition-transform active:scale-90"
                >
                  <Star
                    className={`w-10 h-10 transition-colors ${
                      s <= (hovered || rating)
                        ? "text-amber-400 fill-amber-400"
                        : "text-muted-foreground/30"
                    }`}
                  />
                </button>
              ))}
            </div>
            {(hovered || rating) > 0 && (
              <p className="text-sm font-bold text-amber-500">
                {starLabel[hovered || rating]}
              </p>
            )}
          </div>

          {/* Comment */}
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 block">
              Add a comment (optional)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Tell others about your experience..."
              rows={3}
              maxLength={300}
              className="w-full px-4 py-3 rounded-2xl bg-muted text-foreground text-sm placeholder:text-muted-foreground resize-none outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-[10px] text-muted-foreground text-right mt-1">{comment.length}/300</p>
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 pt-4 pb-10 border-t border-border bg-card flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 h-12 rounded-2xl border border-border text-sm font-semibold text-muted-foreground"
          >
            Skip
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || rating === 0}
            className="flex-1 h-12 rounded-2xl bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {submitting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
            ) : (
              <><Star className="w-4 h-4 fill-primary-foreground" /> Submit Review</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RatingPromptModal;
