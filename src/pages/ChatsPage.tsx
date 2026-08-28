/**
 * ChatsPage.tsx  — conversation inbox (customer app)
 *
 * Key behaviour:
 *  - Exactly ONE conversation thread per (customer, provider) pair —
 *    chat_conversations has a UNIQUE(customer_id, provider_id) constraint.
 *    Booking the same provider again reuses the existing thread; its
 *    booking_id is repointed to the newest booking so the 48h messaging
 *    window (see src/lib/messagingWindow.ts) extends from the most recent
 *    qualifying booking instead of creating a duplicate thread.
 *  - Ordered by latest activity (last_message_at, descending).
 *  - Back-to-dashboard arrow is passed down to ChatWindow via onBack prop.
 */

import { useState, useEffect } from "react";
import { MessageSquare, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import ChatWindow from "@/components/ChatWindow";
import BottomNav from "@/components/BottomNav";
import { canMessageBooking } from "@/lib/messagingWindow";

interface Conversation {
  id: string;
  booking_id: string;
  provider_id: string;
  customer_id: string;
  provider_user_id: string;
  customer_user_id: string;
  last_message_at: string | null;
  last_message_preview: string | null;
  // joined fields
  other_name: string;
  other_avatar: string | null;
  unread_count: number;
  booking_created_at: string | null;
  booking_status: string | null;
  can_message: boolean;
}

// Mirrors the badge styling already used on BookingsPage — kept minimal
// since a status badge is only being *added* here, not redesigned.
const BOOKING_STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  pending:   { label: "Pending",   color: "hsl(38 92% 38%)",  bg: "hsl(38 100% 95%)" },
  confirmed: { label: "Confirmed", color: "hsl(142 71% 28%)", bg: "hsl(142 60% 93%)" },
  accepted:  { label: "Confirmed", color: "hsl(142 71% 28%)", bg: "hsl(142 60% 93%)" },
  completed: { label: "Completed", color: "hsl(220 80% 35%)", bg: "hsl(220 80% 94%)" },
  cancelled: { label: "Cancelled", color: "hsl(0 84% 45%)",   bg: "hsl(0 60% 94%)" },
  rejected:  { label: "Rejected",  color: "hsl(0 84% 45%)",   bg: "hsl(0 60% 94%)" },
};

const AVATAR_GRADIENTS = [
  "linear-gradient(135deg,#3b82f6,#1d4ed8)",
  "linear-gradient(135deg,#8b5cf6,#6d28d9)",
  "linear-gradient(135deg,#22c55e,#15803d)",
  "linear-gradient(135deg,#f59e0b,#b45309)",
  "linear-gradient(135deg,#ec4899,#be185d)",
  "linear-gradient(135deg,#14b8a6,#0f766e)",
];
const gradientFor = (name: string) =>
  AVATAR_GRADIENTS[(name.charCodeAt(0) || 0) % AVATAR_GRADIENTS.length];

const fmtTime = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  const today = new Date().toDateString();
  if (d.toDateString() === today)
    return d.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit", hour12: true });
  return d.toLocaleDateString("en-NG", { day: "numeric", month: "short" });
};

interface ChatsPageProps {
  /** Reserved for future business/customer copy differences; currently unused. */
  role?: "customer" | "provider";
}

const ChatsPage = (_props: ChatsPageProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);

  const loadConversations = async () => {
    if (!user) return;
    setLoading(true);

    const { data: convs } = await supabase
      .from("chat_conversations")
      .select("*")
      .eq("customer_user_id", user.id)
      .order("last_message_at", { ascending: false });

    if (!convs) { setLoading(false); return; }

    // Fetch provider profiles for names + avatars
    const providerIds = [...new Set(convs.map((c: any) => c.provider_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, business_name, avatar_url")
      .in("id", providerIds);

    const profMap: Record<string, any> = {};
    if (profiles) profiles.forEach((p: any) => { profMap[p.id] = p; });

    // Fetch unread counts for all conversations at once
    const convIds = convs.map((c: any) => c.id);
    const { data: unreadRows } = await supabase
      .from("chat_messages")
      .select("conversation_id")
      .in("conversation_id", convIds)
      .eq("is_read", false)
      .neq("sender_id", user.id);

    const unreadMap: Record<string, number> = {};
    if (unreadRows) {
      unreadRows.forEach((m: any) => {
        unreadMap[m.conversation_id] = (unreadMap[m.conversation_id] || 0) + 1;
      });
    }

    // Fetch the linked booking's created_at + status — drives the 48h
    // messaging window and the "Booking status" badge on each row.
    const bookingIds = [...new Set(convs.map((c: any) => c.booking_id).filter(Boolean))];
    const { data: bookingRows } = bookingIds.length
      ? await supabase.from("bookings").select("id, created_at, status").in("id", bookingIds)
      : { data: [] as any[] };

    const bookingMap: Record<string, any> = {};
    if (bookingRows) bookingRows.forEach((b: any) => { bookingMap[b.id] = b; });

    const enriched: Conversation[] = convs.map((c: any) => {
      const prof = profMap[c.provider_id];
      const name = prof?.business_name || prof?.full_name || "Unknown";
      const booking = bookingMap[c.booking_id];
      return {
        ...c,
        other_name: name,
        other_avatar: prof?.avatar_url || null,
        unread_count: unreadMap[c.id] || 0,
        booking_created_at: booking?.created_at ?? null,
        booking_status: booking?.status ?? null,
        can_message: canMessageBooking(booking),
      };
    });

    // One thread per provider (DB-enforced) — just sort by latest activity.
    const sorted = [...enriched].sort((a, b) => {
      const aTs = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
      const bTs = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
      return bTs - aTs;
    });
    setConversations(sorted);
    setLoading(false);
  };

  useEffect(() => { loadConversations(); }, [user]);

  // Realtime: refresh on any new or updated message
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("chats-inbox-customer-" + user.id)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" },
        () => { loadConversations(); })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "chat_messages" },
        () => { loadConversations(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const filtered = conversations.filter(c =>
    c.other_name.toLowerCase().includes(search.toLowerCase())
  );

  const totalUnread = conversations.reduce((s, c) => s + c.unread_count, 0);

  return (
    <>
      {/* Chat window overlay — passes navigate so header can go back to /home */}
      {activeConv && user && (
        <ChatWindow
          conversationId={activeConv.id}
          currentUserId={user.id}
          currentRole="customer"
          otherName={activeConv.other_name}
          otherAvatar={activeConv.other_avatar}
          canMessage={activeConv.can_message}
          onClose={() => {
            setActiveConv(null);
            loadConversations();
          }}
          onBackToDashboard={() => {
            setActiveConv(null);
            navigate("/home");
          }}
        />
      )}

      <div className="min-h-screen pb-32" style={{ background: "hsl(var(--background))" }}>
        <div className="px-5 pt-5 pb-8">

          {/* Header */}
          <div className="flex items-center justify-between mb-1">
            <h1 className="text-2xl font-extrabold text-foreground">Messages</h1>
            <div className="relative">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
                style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)" }}>
                <MessageSquare className="w-5 h-5 text-primary" />
              </div>
              {totalUnread > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-extrabold text-white"
                  style={{ background: "#22c55e" }}>
                  {totalUnread > 9 ? "9+" : totalUnread}
                </span>
              )}
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            {conversations.length} conversation{conversations.length !== 1 ? "s" : ""}
          </p>

          {/* Search */}
          <div className="relative mb-5">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              placeholder="Search conversations…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full h-12 pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground outline-none rounded-2xl"
              style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-inset)", border: "none" }}
            />
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-3xl skeleton" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center py-20">
              <div className="w-16 h-16 rounded-3xl flex items-center justify-center mb-4"
                style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)" }}>
                <MessageSquare className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-sm font-bold text-foreground">
                {search ? "No conversations found" : "No messages yet"}
              </p>
              <p className="text-xs text-muted-foreground mt-1 text-center px-8">
                {search
                  ? "Try a different name"
                  : "Complete a booking to start chatting with your provider."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(conv => {
                const initials = conv.other_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
                const hasUnread = conv.unread_count > 0;

                return (
                  <button key={conv.id} onClick={() => setActiveConv(conv)}
                    className="w-full text-left rounded-3xl p-4 flex items-center gap-3 tap-scale-sm"
                    style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)" }}>

                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      {conv.other_avatar
                        ? <img src={conv.other_avatar} alt={conv.other_name}
                            className="w-12 h-12 rounded-full object-cover"
                            style={{ boxShadow: "var(--shadow-flat)" }} />
                        : <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-extrabold text-white"
                            style={{ background: gradientFor(conv.other_name), boxShadow: "var(--shadow-flat)" }}>
                            {initials}
                          </div>
                      }
                      {hasUnread && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-extrabold text-white"
                          style={{ background: "#22c55e" }}>
                          {conv.unread_count > 9 ? "9+" : conv.unread_count}
                        </span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-sm truncate ${hasUnread ? "font-extrabold text-foreground" : "font-bold text-foreground"}`}>
                          {conv.other_name}
                        </p>
                        <span className="text-[10px] text-muted-foreground flex-shrink-0">
                          {fmtTime(conv.last_message_at)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <p className={`text-xs truncate ${hasUnread ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                          {conv.last_message_preview || "Say hello 👋"}
                        </p>
                        {conv.booking_status && (
                          <span
                            className="text-[9px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                            style={{
                              color: (BOOKING_STATUS_CFG[conv.booking_status] ?? BOOKING_STATUS_CFG.pending).color,
                              background: (BOOKING_STATUS_CFG[conv.booking_status] ?? BOOKING_STATUS_CFG.pending).bg,
                            }}
                          >
                            {(BOOKING_STATUS_CFG[conv.booking_status] ?? BOOKING_STATUS_CFG.pending).label}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <BottomNav />
      </div>
    </>
  );
};

export default ChatsPage;
