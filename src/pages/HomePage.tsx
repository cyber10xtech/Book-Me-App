import { useState, useEffect, useRef } from "react";
import {
  Search, Star, ChevronRight, Sparkles, Zap,
  MapPin, CheckCircle, Flame, Tag, Loader2, MessageSquare,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { categories as SERVICE_CATEGORIES } from "@/lib/categories";

// ── Constants ────────────────────────────────────────────────────────────────

const PROVIDERS_PAGE_SIZE = 3;

// Categories (names, order, and images) come from the shared, Business-App-
// sourced list in `@/lib/categories` — do not hardcode category data here.
const CAT_IMG: Record<string, string> = Object.fromEntries(
  SERVICE_CATEGORIES.map(c => [c.slug, c.image])
);
const norm    = (s: string) => s?.toLowerCase().replace(/[\s_]+/g, "-") ?? "";
const catImg  = (cat: string | null) => CAT_IMG[norm(cat || "")] || CAT_IMG.caterers;
const provImg = (p: any) =>
  p.cover_image_url || p.cover_photo_url || p.avatar_url || catImg(p.category);

const CATEGORIES = SERVICE_CATEGORIES;

// ── Promo badge pill ─────────────────────────────────────────────────────────
const PromoBadge = ({ compact = false }: { compact?: boolean }) =>
  compact ? (
    <span className="absolute top-2 right-2 flex items-center gap-0.5 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full text-white"
      style={{ background: "linear-gradient(135deg,#f59e0b,#ef4444)", boxShadow: "0 2px 6px rgba(239,68,68,.35)" }}>
      <Tag className="w-2.5 h-2.5" /> Promo
    </span>
  ) : (
    <span className="flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full text-white"
      style={{ background: "linear-gradient(135deg,#f59e0b,#ef4444)", boxShadow: "0 2px 6px rgba(239,68,68,.35)" }}>
      <Tag className="w-3 h-3" /> Promo
    </span>
  );

// ── Featured strip card ──────────────────────────────────────────────────────
const ProviderFeaturedCard = ({ p, hasPromo, onClick }: { p: any; hasPromo: boolean; onClick: () => void }) => (
  <button onClick={onClick}
    className="flex-shrink-0 w-40 rounded-3xl overflow-hidden text-left tap-scale animate-fade-in"
    style={{ boxShadow: "var(--shadow-raised)", background: "hsl(var(--background))" }}>
    <div className="h-28 overflow-hidden relative">
      <img src={provImg(p)} alt={p.business_name || p.full_name} className="w-full h-full object-cover" loading="lazy" />
      {(p.is_promoted || p.is_featured) && (
        <span className="absolute top-2 left-2 text-[9px] font-extrabold bg-amber-400 text-white px-2 py-0.5 rounded-full flex items-center gap-0.5">
          <Flame className="w-2.5 h-2.5" /> Featured
        </span>
      )}
      {hasPromo && <PromoBadge compact />}
    </div>
    <div className="p-3">
      <p className="font-extrabold text-xs text-foreground truncate leading-tight">{p.business_name || p.full_name}</p>
      <p className="text-[10px] text-muted-foreground truncate capitalize mt-0.5">{p.category}</p>
      <div className="flex items-center gap-1 mt-1.5">
        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
        <span className="text-[11px] font-extrabold text-foreground">{(p.average_rating || 0).toFixed(1)}</span>
        {p.city && <span className="text-[9px] text-muted-foreground truncate">· {p.city}</span>}
      </div>
      {p.is_verified && (
        <div className="flex items-center gap-0.5 mt-1">
          <CheckCircle className="w-2.5 h-2.5" style={{ color: "hsl(var(--primary))" }} />
          <span className="text-[9px] font-semibold" style={{ color: "hsl(var(--primary))" }}>Verified</span>
        </div>
      )}
    </div>
  </button>
);

// ── Available providers list card ────────────────────────────────────────────
const ProviderListCard = ({ p, hasPromo, onClick }: { p: any; hasPromo: boolean; onClick: () => void }) => (
  <button onClick={onClick}
    className="w-full flex items-center gap-3 rounded-3xl p-4 text-left tap-scale animate-fade-in"
    style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)" }}>
    <div className="relative flex-shrink-0">
      <img src={provImg(p)} alt={p.business_name || p.full_name}
        className="w-14 h-14 rounded-2xl object-cover"
        style={{ boxShadow: "var(--shadow-flat)" }} loading="lazy" />
      {p.is_verified && (
        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
          style={{ background: "hsl(var(--primary))", boxShadow: "var(--shadow-flat)" }}>
          <CheckCircle className="w-3 h-3 text-white" />
        </div>
      )}
    </div>
    <div className="flex-1 min-w-0">
      <p className="font-extrabold text-sm text-foreground truncate">{p.business_name || p.full_name}</p>
      <p className="text-xs text-muted-foreground capitalize truncate mt-0.5">{p.category}</p>
      <div className="flex items-center gap-2 mt-1 flex-wrap">
        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
        <span className="text-xs font-bold">{(p.average_rating || 0).toFixed(1)}</span>
        {p.city && (<>
          <span className="text-muted-foreground text-xs">·</span>
          <MapPin className="w-3 h-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground truncate">{p.city}</span>
        </>)}
        {hasPromo && <PromoBadge />}
      </div>
    </div>
    <div className="w-8 h-8 rounded-2xl flex items-center justify-center flex-shrink-0"
      style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-flat)" }}>
      <ChevronRight className="w-4 h-4 text-muted-foreground" />
    </div>
  </button>
);

// ── Page ─────────────────────────────────────────────────────────────────────
const HomePage = () => {
  const navigate    = useNavigate();
  const { user }    = useAuth();
  const { unreadMessages } = useUnreadMessages();

  const scrollRef = useRef<HTMLDivElement>(null);
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Customer first name — pulled from profiles table, not metadata ──────────
  const [firstName, setFirstName] = useState<string>("");

  useEffect(() => {
    if (!user) { setFirstName("Guest"); return; }
    supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        const name = data?.full_name?.trim();
        // Use first word of full name; fall back to email prefix
        setFirstName(
          name
            ? name.split(" ")[0]
            : user.email?.split("@")[0] ?? "there"
        );
      });
  }, [user]);

  const [featured,         setFeatured]         = useState<any[]>([]);
  const [nearby,           setNearby]           = useState<any[]>([]);
  const [promoProviderIds, setPromoProviderIds] = useState<Set<string>>(new Set());
  const [loading,          setLoading]          = useState(true);
  const [visibleCount,     setVisibleCount]     = useState(PROVIDERS_PAGE_SIZE);
  const [loadingMore,      setLoadingMore]      = useState(false);

  // ── Fetch providers + promotions ──────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,full_name,business_name,category,avatar_url,cover_image_url,cover_photo_url,average_rating,review_count,city,is_promoted,is_verified,is_active,is_featured")
        .eq("role", "provider")
        .eq("is_active", true)
        .order("is_promoted",    { ascending: false })
        .order("average_rating", { ascending: false })
        .limit(100);

      if (error || !data) { setLoading(false); return; }

      const ids = data.map(p => p.id);

      const { data: svcs } = await supabase
        .from("services").select("provider_id").in("provider_id", ids).eq("is_active", true);

      const svcMap: Record<string, number> = {};
      (svcs || []).forEach(s => { svcMap[s.provider_id] = (svcMap[s.provider_id] || 0) + 1; });

      const now = new Date().toISOString();
      const { data: promos } = await supabase
        .from("promotions")
        .select("provider_id")
        .in("provider_id", ids)
        .eq("is_active", true)
        .or(`end_date.is.null,end_date.gte.${now}`)
        .lte("start_date", now);

      setPromoProviderIds(new Set((promos || []).map((r: any) => r.provider_id)));

      const isFeat = (p: any) =>
        p.is_promoted || p.is_featured ||
        (p.business_name && p.category && (svcMap[p.id] || 0) >= 1);

      setFeatured(data.filter(isFeat));
      setNearby(data.filter(p => !isFeat(p)));
      setLoading(false);
    })();
  }, []);

  // ── Auto-scroll featured strip ─────────────────────────────────────────────
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || featured.length === 0) return;
    const tick = () => {
      if (!el) return;
      el.scrollLeft += 1;
      if (el.scrollLeft >= el.scrollWidth - el.clientWidth - 2) el.scrollLeft = 0;
    };
    timerRef.current = setInterval(tick, 22);
    const stop  = () => { if (timerRef.current) clearInterval(timerRef.current); };
    const start = () => { timerRef.current = setInterval(tick, 22); };
    el.addEventListener("touchstart", stop,  { passive: true });
    el.addEventListener("touchend",   start, { passive: true });
    el.addEventListener("mousedown",  stop);
    el.addEventListener("mouseup",    start);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      el.removeEventListener("touchstart", stop);
      el.removeEventListener("touchend",   start);
      el.removeEventListener("mousedown",  stop);
      el.removeEventListener("mouseup",    start);
    };
  }, [featured]);

  const handleShowMore = () => {
    setLoadingMore(true);
    setTimeout(() => {
      setVisibleCount(c => c + PROVIDERS_PAGE_SIZE);
      setLoadingMore(false);
    }, 400);
  };

  const visibleProviders = nearby.slice(0, visibleCount);
  const hasMore          = visibleCount < nearby.length;

  const hour     = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="min-h-screen pb-24" style={{ background: "hsl(var(--background))" }}>

      {/* ── Hero header ── */}
      <div
        className="px-5 pb-6 rounded-b-[2rem]"
        style={{
          background: "var(--gradient-hero)",
          paddingTop: "calc(env(safe-area-inset-top) + 1.25rem)",
        }}
      >
        <div className="flex items-center justify-between mb-5">
          {/* Greeting — uses live firstName from profiles table */}
          <div>
            <p className="text-white/70 text-xs">{greeting} 👋</p>
            <h1 className="text-xl font-extrabold text-white">
              {firstName || <span className="opacity-0">·</span>}
            </h1>
          </div>

          {/* Top-right action cluster */}
          <div className="flex items-center gap-2">
            {/* Chat icon — replaces the old bottom-nav Messages tab */}
            <button
              onClick={() => navigate("/chats")}
              className="relative w-11 h-11 rounded-2xl flex items-center justify-center"
              style={{
                background: "rgba(255,255,255,0.15)",
                boxShadow: "inset 2px 2px 6px rgba(0,0,0,0.2), inset -1px -1px 4px rgba(255,255,255,0.1)",
              }}
            >
              <MessageSquare className="w-5 h-5 text-white" />
              {unreadMessages > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 text-white text-[9px] font-extrabold flex items-center justify-center">
                  {unreadMessages > 9 ? "9+" : unreadMessages}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Search bar */}
        <button onClick={() => navigate("/search")}
          className="w-full flex items-center gap-3 rounded-2xl px-4 py-3.5"
          style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.25)" }}>
          <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "hsl(var(--primary))", boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}>
            <Zap className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-sm text-white/70 flex-1 text-left">Find services near you...</span>
          <Search className="w-4 h-4 text-white/50" />
        </button>
      </div>

      {/* ── Categories ── */}
      <div className="px-5 mt-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-extrabold text-foreground">Categories</h2>
          <button onClick={() => navigate("/search")}
            className="text-xs font-bold tap-scale" style={{ color: "hsl(var(--primary))" }}>See all</button>
        </div>
        <div className="adaptive-chip-grid hide-scrollbar pb-2">
          {CATEGORIES.map(cat => (
            <button key={cat.id} onClick={() => navigate(`/search?category=${cat.slug}`)}
              className="category-card flex flex-col items-center gap-2 flex-shrink-0 tap-scale snap-start">
              <div className="category-card-image rounded-2xl overflow-hidden" style={{ boxShadow: "var(--shadow-raised)" }}>
                <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" loading="lazy" />
              </div>
              <span className="category-card-label text-[10px] font-bold text-foreground text-center leading-tight">{cat.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Best on BookMe ── */}
      <div className="px-5 mt-6">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <h2 className="text-sm font-extrabold text-foreground">Best on BookMe</h2>
        </div>
        <p className="text-[10px] text-muted-foreground mb-3">Promoted & top-rated professionals</p>
        {loading ? (
          <div className="flex gap-3 pb-2">
            {[1,2,3].map(i => <div key={i} className="w-40 h-52 rounded-3xl skeleton flex-shrink-0" />)}
          </div>
        ) : featured.length > 0 ? (
          <div ref={scrollRef} className="flex gap-3 overflow-x-auto hide-scrollbar pb-2" style={{ scrollBehavior: "auto" }}>
            {[...featured, ...featured].map((p, idx) => (
              <ProviderFeaturedCard key={`${p.id}-${idx}`} p={p} hasPromo={promoProviderIds.has(p.id)}
                onClick={() => navigate(`/provider/${p.id}`)} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-3">No featured providers yet.</p>
        )}
      </div>

      {/* ── Available Providers (paginated 3 per load) ── */}
      <div className="px-5 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-extrabold text-foreground">Available Providers</h2>
          <button onClick={() => navigate("/search")}
            className="text-xs font-bold tap-scale" style={{ color: "hsl(var(--primary))" }}>See all</button>
        </div>

        {loading ? (
          <div className="adaptive-card-grid">
            {[1,2,3].map(i => <div key={i} className="w-full h-20 rounded-3xl skeleton" />)}
          </div>
        ) : nearby.length === 0 && featured.length === 0 ? (
          <div className="rounded-3xl p-10 text-center"
            style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-flat)" }}>
            <p className="text-muted-foreground text-sm">No providers available yet.</p>
          </div>
        ) : nearby.length === 0 ? (
          <p className="text-muted-foreground text-xs py-2">All active providers are featured above!</p>
        ) : (
          <>
            <div className="adaptive-card-grid">
              {visibleProviders.map(p => (
                <ProviderListCard key={p.id} p={p} hasPromo={promoProviderIds.has(p.id)}
                  onClick={() => navigate(`/provider/${p.id}`)} />
              ))}
            </div>

            {hasMore && (
              <div className="flex justify-center mt-1 mb-2">
                <button onClick={handleShowMore} disabled={loadingMore}
                  className="flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-extrabold tap-scale disabled:opacity-60 transition-all"
                  style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)", color: "hsl(var(--primary))" }}>
                  {loadingMore ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Loading…</>
                  ) : (
                    <>
                      Show more providers
                      <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full text-white ml-1"
                        style={{ background: "hsl(var(--primary))" }}>
                        +{Math.min(PROVIDERS_PAGE_SIZE, nearby.length - visibleCount)}
                      </span>
                    </>
                  )}
                </button>
              </div>
            )}

            {!hasMore && nearby.length > PROVIDERS_PAGE_SIZE && (
              <p className="text-center text-[11px] text-muted-foreground py-3">
                You've seen all {nearby.length} providers ·{" "}
                <button onClick={() => navigate("/search")} className="font-bold" style={{ color: "hsl(var(--primary))" }}>
                  Search for more
                </button>
              </p>
            )}
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default HomePage;
