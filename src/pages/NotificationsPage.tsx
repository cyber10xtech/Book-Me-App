import { useState, useEffect, useRef } from "react";
import { Bell, CheckCheck, CalendarCheck, CalendarPlus, RefreshCw, XCircle, MessageSquare, Star, Settings, Loader2, CheckCircle } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useNotificationListener } from "@/hooks/useNotificationListener";
import type { RealtimeChannel } from "@supabase/supabase-js";

const ICON_CFG: Record<string, { emoji: string; accent: string }> = {
  new_booking:       { emoji: "📋", accent: "hsl(var(--primary))"   },
  booking_confirm:   { emoji: "✅", accent: "#22c55e"               },
  booking_confirmed: { emoji: "✅", accent: "#22c55e"               },
  booking_accepted:  { emoji: "✅", accent: "#22c55e"               },
  booking_update:    { emoji: "📅", accent: "#f59e0b"               },
  booking_completed: { emoji: "🎉", accent: "#3b82f6"               },
  booking_cancelled: { emoji: "❌", accent: "#ef4444"               },
  booking_rejected:  { emoji: "❌", accent: "#ef4444"               },
  new_message:       { emoji: "💬", accent: "hsl(var(--primary))"   },
  review_received:   { emoji: "⭐", accent: "#f59e0b"               },
  promotion:         { emoji: "🎁", accent: "#8b5cf6"               },
  system:            { emoji: "ℹ️",  accent: "hsl(var(--muted-foreground))" },
};

const timeAgo = (d: string) => {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(d).toLocaleDateString("en-NG", { month: "short", day: "numeric" });
};

const groupByDate = (items: any[]) => {
  const groups: Record<string, any[]> = {};
  items.forEach(n => {
    const d = new Date(n.created_at);
    const today = new Date(); const yesterday = new Date(Date.now() - 86400000);
    const key = d.toDateString() === today.toDateString() ? "Today"
      : d.toDateString() === yesterday.toDateString() ? "Yesterday"
      : d.toLocaleDateString("en-NG", { month: "long", day: "numeric" });
    if (!groups[key]) groups[key] = [];
    groups[key].push(n);
  });
  return groups;
};

const NotificationsPage = () => {
  const { user } = useAuth();
  const { setUnreadCount } = useNotificationListener();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading]             = useState(true);
  const [profileId, setProfileId]         = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const fetchNotifs = async (pid: string) => {
    const { data } = await supabase
      .from("notifications").select("*")
      .eq("user_id", pid)
      .order("created_at", { ascending: false }).limit(100);
    setNotifications(data || []);
    setLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: p } = await supabase.from("profiles").select("id").eq("user_id", user.id).single();
      if (!p) { setLoading(false); return; }
      setProfileId(p.id);
      await fetchNotifs(p.id);
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      channelRef.current = supabase.channel(`notif-page:${p.id}`)
        .on("postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${p.id}` },
          payload => setNotifications(prev => [payload.new as any, ...prev])
        ).subscribe();
    })();
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current); };
  }, [user]);

  const markAllRead = async () => {
    if (!profileId) return;
    await supabase.from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() } as any)
      .eq("user_id", profileId).eq("is_read", false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const markOne = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
    await supabase.from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() } as any).eq("id", id);
  };

  const unread  = notifications.filter(n => !n.is_read).length;
  const grouped = groupByDate(notifications);

  return (
    <div className="min-h-screen pb-24" style={{ background: "hsl(var(--background))", paddingTop: "env(safe-area-inset-top)" }}>

      {/* Header */}
      <div className="px-5 pt-5 pb-4 sticky top-0 z-10"
        style={{ background: "hsl(var(--background))", boxShadow: "0 4px 12px var(--neu-dark)" }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-extrabold text-foreground">Alerts</h1>
            {unread > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5">
                <span className="font-extrabold" style={{ color: "hsl(var(--primary))" }}>{unread}</span> unread
              </p>
            )}
          </div>
          {unread > 0 && (
            <button onClick={markAllRead}
              className="flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-bold tap-scale"
              style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)", color: "hsl(var(--primary))" }}>
              <CheckCheck className="w-3.5 h-3.5" /> Mark all read
            </button>
          )}
        </div>
      </div>

      {/* Unread banner */}
      {unread > 0 && !loading && (
        <div className="mx-5 mt-4 rounded-3xl p-4 flex items-center gap-3"
          style={{ background: "linear-gradient(135deg, hsl(199 100% 50%), hsl(220 100% 30%))" }}>
          <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(255,255,255,0.2)" }}>
            <Bell className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-extrabold text-sm">{unread} new alert{unread > 1 ? "s" : ""}</p>
            <p className="text-white/70 text-xs">Tap to mark as read</p>
          </div>
        </div>
      )}

      <div className="px-5 mt-4 space-y-5">
        {loading ? (
          <div className="adaptive-card-grid">{[1,2,3].map(i => <div key={i} className="h-20 rounded-3xl skeleton" />)}</div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center py-20">
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5"
              style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)" }}>
              <Bell className="w-9 h-9 text-muted-foreground" />
            </div>
            <p className="font-extrabold text-foreground">No alerts yet</p>
            <p className="text-sm text-muted-foreground mt-1">Booking updates will appear here.</p>
          </div>
        ) : (
          Object.entries(grouped).map(([group, items]) => (
            <div key={group}>
              <p className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider mb-2 px-1">{group}</p>
              <div className="adaptive-card-grid">
                {items.map(n => {
                  const cfg = ICON_CFG[n.type] ?? { emoji: "ℹ️", accent: "hsl(var(--muted-foreground))" };
                  return (
                    <button key={n.id} onClick={() => !n.is_read && markOne(n.id)}
                      className="w-full rounded-3xl p-4 text-left tap-scale-sm relative animate-fade-in"
                      style={n.is_read ? {
                        background: "hsl(var(--background))", boxShadow: "var(--shadow-flat)", opacity: 0.7,
                      } : {
                        background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)",
                      }}>
                      {!n.is_read && (
                        <span className="absolute top-4 right-4 w-2.5 h-2.5 rounded-full"
                          style={{ background: cfg.accent, boxShadow: `0 0 5px ${cfg.accent}` }} />
                      )}
                      <div className="flex items-start gap-3">
                        <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl flex-shrink-0"
                          style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-flat)" }}>
                          {cfg.emoji}
                        </div>
                        <div className="flex-1 min-w-0 pr-4">
                          <p className="text-sm font-extrabold text-foreground leading-tight">{n.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">{n.body}</p>
                          <p className="text-[10px] text-muted-foreground mt-1.5 font-semibold">{timeAgo(n.created_at)}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default NotificationsPage;
