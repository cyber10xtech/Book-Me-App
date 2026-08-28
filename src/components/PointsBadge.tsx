/**
 * PointsBadge
 * Compact card that shows the customer's points, level, and progress bar.
 * Drop this anywhere in the customer app (e.g. ProfilePage).
 */
import { getLevelInfo } from "@/hooks/useCustomerPoints";
import { Loader2 } from "lucide-react";

interface PointsBadgeProps {
  points: number;
  loading?: boolean;
}

const PointsBadge = ({ points, loading }: PointsBadgeProps) => {
  const info = getLevelInfo(points);

  if (loading) {
    return (
      <div className="bg-card rounded-2xl border border-border p-4 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-2xl border border-primary/20 p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-[10px] font-bold text-primary uppercase tracking-wide">BookMe Points</p>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-2xl font-extrabold text-foreground">{points.toLocaleString()}</span>
            <span className="text-xs text-muted-foreground font-semibold">pts</span>
          </div>
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="text-3xl">{info.emoji}</span>
          <span className="text-xs font-bold text-foreground">{info.level}</span>
        </div>
      </div>

      {/* Progress bar */}
      {info.next && (
        <div>
          <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
            <span>{info.level}</span>
            <span>{info.next} in {info.pointsToNext} pts</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${Math.min(100, info.progress)}%` }}
            />
          </div>
        </div>
      )}

      {!info.next && (
        <p className="text-xs text-primary font-semibold text-center mt-1">
          💎 Maximum level reached!
        </p>
      )}

      {/* Points legend */}
      <div className="mt-3 pt-3 border-t border-primary/10 grid grid-cols-3 gap-1 text-center">
        {[
          { action: "Booking done", pts: "+50" },
          { action: "Review given", pts: "+30" },
          { action: "1st booking",  pts: "+100" },
        ].map((item) => (
          <div key={item.action}>
            <p className="text-xs font-bold text-primary">{item.pts}</p>
            <p className="text-[9px] text-muted-foreground leading-tight">{item.action}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PointsBadge;
