import { useState, useEffect, useRef } from "react";
import { Search as SearchIcon, SlidersHorizontal, Star, MapPin, CheckCircle, Loader2, X } from "lucide-react";
import { useSearchParams, useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import { useProviders } from "@/hooks/useProviders";
import { categories as CATEGORIES } from "@/lib/categories";
import StateLgaSelector from "@/components/common/StateLgaSelector";

type SortKey = "rating" | "reviews" | "newest" | "random";

const defaultCover = "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=400&q=60";

const SearchPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialCat = searchParams.get("category") || "";
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery]             = useState("");
  const [debouncedQ, setDebouncedQ]   = useState("");
  const [selectedCat, setSelectedCat] = useState(initialCat);
  const [filterState, setFilterState] = useState("");
  const [filterLga, setFilterLga]     = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy]           = useState<SortKey>("random");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [minRating, setMinRating]       = useState(0);

  const { providers, loading } = useProviders();

  // Debounce query
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  // Focus input on mount
  useEffect(() => { inputRef.current?.focus(); }, []);

  const norm = (s: string) => (s || "").toLowerCase().replace(/[\s_]+/g, "-");

  const filtered = providers
    .filter(p => {
      const q = debouncedQ.toLowerCase();
      const nameMatch     = (p.business_name || p.full_name || "").toLowerCase().includes(q);
      const categoryMatch = (p.category || "").toLowerCase().includes(q);
      const cityMatch     = (p.city || "").toLowerCase().includes(q);
      const stateMatch    = (p.state || "").toLowerCase().includes(q);
      const matchesQuery  = !q || nameMatch || categoryMatch || cityMatch || stateMatch;
      const matchesCat    = !selectedCat || norm(p.category) === selectedCat;
      const matchesVerif  = !verifiedOnly || p.is_verified;
      const matchesState  = !filterState || (p.state || "").toLowerCase().includes(filterState.toLowerCase());
      const matchesLga    = !filterLga || (p.city || "").toLowerCase().includes(filterLga.toLowerCase());
      const matchesMinRating = (p.average_rating || 0) >= minRating;
      return matchesQuery && matchesCat && matchesVerif && matchesState && matchesLga && matchesMinRating;
    })
    .sort((a, b) => {
      if (sortBy === "rating")  return (b.average_rating || 0) - (a.average_rating || 0);
      if (sortBy === "reviews") return (b.review_count   || 0) - (a.review_count   || 0);
      if (sortBy === "random") {
        // Pseudo-random sort based on id to prevent re-rendering shuffling
        const hashA = a.id.charCodeAt(0) + a.id.charCodeAt(a.id.length - 1);
        const hashB = b.id.charCodeAt(0) + b.id.charCodeAt(b.id.length - 1);
        return (hashA % 10) - (hashB % 10);
      }
      return 0; // newest — DB already ordered
    });

  return (
    <div className="min-h-screen pb-24" style={{ background: "hsl(var(--background))", paddingTop: "env(safe-area-inset-top)" }}>

      {/* Header */}
      <div className="px-5 pt-5 pb-4 sticky top-0 z-20"
        style={{ background: "hsl(var(--background))", boxShadow: "0 4px 12px var(--neu-dark)" }}>
        <h1 className="text-xl font-extrabold text-foreground mb-3">Discover</h1>

        {/* Search bar */}
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1 flex items-center gap-3 rounded-2xl px-4"
            style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-inset)", height: 48 }}>
            <SearchIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              placeholder='Search providers, categories, city…'
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
            {query && (
              <button onClick={() => setQuery("")} className="tap-scale">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
          {/* Filter button — now works */}
          <button onClick={() => setShowFilters(v => !v)}
            className="w-12 h-12 rounded-2xl flex items-center justify-center tap-scale relative"
            style={showFilters ? {
              background: "linear-gradient(145deg, hsl(199 100% 50%), hsl(199 100% 38%))",
              boxShadow: "var(--shadow-sky)",
            } : { background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)" }}>
            <SlidersHorizontal className={`w-5 h-5 ${showFilters ? "text-white" : "text-foreground"}`} />
            {(verifiedOnly || sortBy !== "rating") && (
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full"
                style={{ background: "hsl(var(--primary))" }} />
            )}
          </button>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="rounded-3xl p-4 mb-3 animate-fade-in"
            style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)" }}>
            <p className="text-xs font-extrabold text-muted-foreground uppercase tracking-wide mb-3">Sort By</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {([["random","Random"], ["rating","Top Rated"],["reviews","Most Reviews"],["newest","Newest"]] as [SortKey,string][]).map(([key, label]) => (
                <button key={key} onClick={() => setSortBy(key)}
                  className="flex-1 min-w-[70px] py-2 rounded-2xl text-xs font-bold tap-scale"
                  style={sortBy === key ? {
                    background: "linear-gradient(145deg, hsl(199 100% 50%), hsl(199 100% 38%))",
                    color: "white", boxShadow: "var(--shadow-sky)",
                  } : { background: "hsl(var(--background))", boxShadow: "var(--shadow-flat)", color: "hsl(var(--muted-foreground))" }}>
                  {label}
                </button>
              ))}
            </div>
            <button onClick={() => setVerifiedOnly(v => !v)}
              className="w-full py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 tap-scale mb-4"
              style={verifiedOnly ? {
                background: "hsl(142 40% 94%)", color: "hsl(142 71% 28%)", border: "1.5px solid hsl(142 71% 70%)"
              } : { background: "hsl(var(--background))", boxShadow: "var(--shadow-flat)", color: "hsl(var(--muted-foreground))" }}>
              <CheckCircle className="w-4 h-4" /> Verified Providers Only
            </button>

            <div className="border-t border-border pt-3 mb-4">
              <p className="text-xs font-extrabold text-muted-foreground uppercase tracking-wide mb-2">Minimum Rating</p>
              <div className="flex gap-2">
                {[0, 3, 4, 4.5].map((val) => (
                  <button key={val} onClick={() => setMinRating(val)}
                    className="flex-1 py-2 rounded-2xl text-xs font-bold tap-scale flex items-center justify-center gap-1"
                    style={minRating === val ? {
                      background: "hsl(38 92% 50%)",
                      color: "white", boxShadow: "var(--shadow-raised)",
                    } : { background: "hsl(var(--background))", boxShadow: "var(--shadow-flat)", color: "hsl(var(--muted-foreground))" }}>
                    {val === 0 ? "Any" : <>{val}+ <Star className="w-3 h-3 fill-current" /></>}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-border pt-3">
              <p className="text-xs font-extrabold text-muted-foreground uppercase tracking-wide mb-2">Location Filter</p>
              <StateLgaSelector
                stateValue={filterState}
                lgaValue={filterLga}
                onStateChange={setFilterState}
                onLgaChange={setFilterLga}
                stateLabel="Filter by State"
                lgaLabel="Filter by City / LGA"
              />
              {(filterState || filterLga) && (
                <button
                  onClick={() => { setFilterState(""); setFilterLga(""); }}
                  className="mt-2 text-xs font-bold text-primary underline"
                >
                  Clear location filter
                </button>
              )}
            </div>
          </div>
        )}

        {/* Category pills */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
          <button onClick={() => setSelectedCat("")}
            className="px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap tap-scale"
            style={!selectedCat ? {
              background: "linear-gradient(145deg, hsl(199 100% 50%), hsl(199 100% 38%))",
              color: "white", boxShadow: "var(--shadow-sky)",
            } : { background: "hsl(var(--background))", boxShadow: "var(--shadow-flat)", color: "hsl(var(--muted-foreground))" }}>
            All
          </button>
          {CATEGORIES.map(cat => (
            <button key={cat.slug} onClick={() => setSelectedCat(selectedCat === cat.slug ? "" : cat.slug)}
              className="px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap tap-scale"
              style={selectedCat === cat.slug ? {
                background: "linear-gradient(145deg, hsl(199 100% 50%), hsl(199 100% 38%))",
                color: "white", boxShadow: "var(--shadow-sky)",
              } : { background: "hsl(var(--background))", boxShadow: "var(--shadow-flat)", color: "hsl(var(--muted-foreground))" }}>
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="px-5 mt-4">
        <p className="text-xs font-bold text-muted-foreground mb-3">
          {loading ? "Searching…" : `${filtered.length} result${filtered.length !== 1 ? "s" : ""}`}
          {selectedCat && ` · ${CATEGORIES.find(c => c.slug === selectedCat)?.name}`}
        </p>

        {loading ? (
          <div className="adaptive-card-grid">
            {[1,2,3,4].map(i => <div key={i} className="h-24 rounded-3xl skeleton" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl p-12 text-center"
            style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-flat)" }}>
            <SearchIcon className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-bold text-foreground">No providers found</p>
            <p className="text-sm text-muted-foreground mt-1">Try a different search or category.</p>
          </div>
        ) : (
          <div className="adaptive-card-grid">
            {filtered.map(p => (
              <button key={p.id} onClick={() => navigate(`/provider/${p.id}`)}
                className="w-full rounded-3xl p-4 text-left flex gap-3 items-center tap-scale animate-fade-in"
                style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)" }}>
                <div className="relative flex-shrink-0">
                  <img
                    src={p.cover_image_url || p.cover_photo_url || p.avatar_url || defaultCover}
                    alt={p.business_name || p.full_name || ""}
                    className="w-16 h-16 rounded-2xl object-cover"
                    style={{ boxShadow: "var(--shadow-flat)" }}
                  />
                  {p.is_verified && (
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ background: "hsl(var(--primary))", boxShadow: "var(--shadow-flat)" }}>
                      <CheckCircle className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-extrabold text-sm text-foreground truncate">{p.business_name || p.full_name}</p>
                  <p className="text-xs text-muted-foreground capitalize truncate mt-0.5">{p.category || "General"}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <div className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span className="text-xs font-bold">{(p.average_rating || 0).toFixed(1)}</span>
                      <span className="text-[10px] text-muted-foreground">({p.review_count || 0})</span>
                    </div>
                    {p.city && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <MapPin className="w-3 h-3" />
                        <span className="text-xs">{p.city}</span>
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default SearchPage;
