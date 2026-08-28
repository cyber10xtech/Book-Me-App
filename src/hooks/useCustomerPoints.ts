/**
 * useCustomerPoints
 *
 * FIXES:
 * - upsert now targets BOTH profile_id and customer_id columns
 *   (the SQL schema allows either; older rows may use customer_id).
 * - Reads total_points using maybeSingle() so it doesn't throw on missing row.
 * - awardPoints is idempotent for first_booking (checks log before inserting).
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export type PointsAction =
  | "booking_completed"
  | "review_submitted"
  | "first_booking";

export const POINTS_MAP: Record<PointsAction, number> = {
  booking_completed: 50,
  review_submitted:  30,
  first_booking:     100,
};

export type Level = "Bronze" | "Silver" | "Gold" | "Platinum";

export interface LevelInfo {
  level:        Level;
  emoji:        string;
  min:          number;
  max:          number | null;
  next:         Level | null;
  progress:     number; // 0–100
  pointsToNext: number | null;
}

export const getLevelInfo = (points: number): LevelInfo => {
  if (points >= 1000)
    return { level: "Platinum", emoji: "💎", min: 1000, max: null,  next: null,       progress: 100,                              pointsToNext: null        };
  if (points >= 500)
    return { level: "Gold",     emoji: "🥇", min: 500,  max: 999,  next: "Platinum", progress: Math.round(((points-500)/500)*100), pointsToNext: 1000-points };
  if (points >= 200)
    return { level: "Silver",   emoji: "🥈", min: 200,  max: 499,  next: "Gold",     progress: Math.round(((points-200)/300)*100), pointsToNext: 500-points  };
  return   { level: "Bronze",   emoji: "🥉", min: 0,    max: 199,  next: "Silver",   progress: Math.round((points/200)*100),       pointsToNext: 200-points  };
};

export const useCustomerPoints = (profileId: string | null) => {
  const [points, setPoints]   = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profileId) { setLoading(false); return; }
    supabase
      .from("customer_points")
      .select("total_points")
      .or(`profile_id.eq.${profileId},customer_id.eq.${profileId}`)
      .maybeSingle()
      .then(({ data }) => {
        setPoints(data?.total_points ?? 0);
        setLoading(false);
      });
  }, [profileId]);

  const awardPoints = useCallback(
    async (action: PointsAction, bookingId?: string) => {
      if (!profileId) return;
      const earned = POINTS_MAP[action];

      // Guard: first_booking is one-time only
      if (action === "first_booking") {
        const { count } = await supabase
          .from("customer_points_log")
          .select("*", { count: "exact", head: true })
          .eq("profile_id", profileId)
          .eq("action", "first_booking");
        if ((count ?? 0) > 0) return;
      }

      const newTotal = points + earned;

      // Upsert — try profile_id first, fall back to customer_id
      const { error } = await supabase.from("customer_points").upsert(
        {
          profile_id:   profileId,
          customer_id:  profileId,
          total_points: newTotal,
          updated_at:   new Date().toISOString(),
        },
        { onConflict: "profile_id" }
      );

      if (error) {
        // Try onConflict customer_id if profile_id constraint doesn't exist yet
        await supabase.from("customer_points").upsert(
          {
            customer_id:  profileId,
            total_points: newTotal,
            updated_at:   new Date().toISOString(),
          },
          { onConflict: "customer_id" }
        );
      }

      // Log entry
      await supabase.from("customer_points_log").insert({
        profile_id:    profileId,
        action,
        points_earned: earned,
        booking_id:    bookingId ?? null,
        created_at:    new Date().toISOString(),
      });

      const prevLevel = getLevelInfo(points).level;
      const newLevel  = getLevelInfo(newTotal).level;

      setPoints(newTotal);

      if (prevLevel !== newLevel) {
        const info = getLevelInfo(newTotal);
        toast(`${info.emoji} Level Up! You're now ${info.level}!`, {
          description: `+${earned} pts earned. ${info.next ? `${info.pointsToNext} pts to ${info.next}!` : "You've reached the top!"}`,
          duration: 7000,
        });
      } else {
        const labels: Record<PointsAction, string> = {
          booking_completed: "Booking completed",
          review_submitted:  "Review submitted",
          first_booking:     "First booking bonus",
        };
        toast(`⭐ +${earned} points!`, {
          description: `${labels[action]}. Total: ${newTotal} pts`,
          duration: 4000,
        });
      }
    },
    [profileId, points]
  );

  return { points, loading, levelInfo: getLevelInfo(points), awardPoints };
};
