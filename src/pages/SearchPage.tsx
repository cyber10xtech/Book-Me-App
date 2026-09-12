import { useState, useEffect, useRef } from "react";
import {
  Search as SearchIcon, SlidersHorizontal, Star, MapPin, CheckCircle,
  X, Navigation, MessageSquare, ChevronDown, Heart, Scissors, Cake,
  Utensils, Wrench, Sparkles, Camera, Dog, Calendar, Music, BookOpen, Dumbbell
} from "lucide-react";
import { useSearchParams, useNavigate } from "react-router-dom";

import BottomNav from "@/components/BottomNav";
import { useProviders } from "@/hooks/useProviders";
import { categories as CATEGORIES } from "@/lib/categories";
import { StateSelector } from "@/components/common/StateSelector";
import { parseQuery, normalizeTarget, isPluralOrSingularMatch, formatServicePriceLabel } from "@/lib/searchParser";
import { NIGERIA_STATES } from "@/data/nigeriaLocations";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";

import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem
} from "@/components/ui/dropdown-menu";

type SortKey = "rating" | "nearest" | "reviews" | "price_asc" | "price_desc";

const getDist = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const p = 0.017453292519943295;
  const c = Math.cos;
  const a = 0.5 - c((lat2 - lat1) * p) / 2 +
    c(lat1 * p) * c(lat2 * p) *
    (1 - c((lon2 - lon1) * p)) / 2;
  return 12742 * Math.asin(Math.sqrt(a));
};

const defaultCover = "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=400&q=60";

const getCategoryIcon = (slug: string) => {
  switch (slug) {
    case "barbers": return <Scissors className="w-3.5 h-3.5" />;
    case "cake-vendors": return <Cake className="w-3.5 h-3.5" />;
    case "catering": return <Utensils className="w-3.5 h-3.5" />;
    case "mechanics": return <Wrench className="w-3.5 h-3.5" />;
    case "cleaning-services": return <Sparkles className="w-3.5 h-3.5" />;
    case "photographers": return <Camera className="w-3.5 h-3.5" />;
    case "pet-services": return <Dog className="w-3.5 h-3.5" />;
    case "event-planners": return <Calendar className="w-3.5 h-3.5" />;
    case "djs": return <Music className="w-3.5 h-3.5" />;
    case "lesson-teachers": return <BookOpen className="w-3.5 h-3.5" />;
    case "personal-trainers": return <Dumbbell className="w-3.5 h-3.5" />;
    default: return <Sparkles className="w-3.5 h-3.5" />;
  }
};

const SearchPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialCat = searchParams.get("category") || "";
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [selectedCat, setSelectedCat] = useState(initialCat);
  const [sortBy, setSortBy] = useState<SortKey>("rating");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [showFilters, setShowFilters] = useState(true);
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [locError, setLocError] = useState(false);
  const [page, setPage] = useState(1);
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const LIMIT = 20;

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedQ, selectedCat, sortBy, minPrice, maxPrice, selectedState]);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocError(false);
      }, () => {
        setLocError(true);
      });
    } else {
      setLocError(true);
    }
  }, []);

  const { providers, loading } = useProviders();

  // Debounce query
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  // Focus input on mount
  useEffect(() => { inputRef.current?.focus(); }, []);

  const norm = (s: string) => (s || "").toLowerCase().replace(/[\s_]+/g, "-");

  const { target, location } = parseQuery(debouncedQ);
  const normalizedTarget = normalizeTarget(target);

  // Detect state conflict if location is typed and dropdown selected state doesn't match
  const stateConflict = Boolean(
    location &&
    selectedState &&
    !selectedState.toLowerCase().includes(location.toLowerCase()) &&
    !location.toLowerCase().includes(selectedState.toLowerCase().replace(" state", ""))
  );

  const minVal = parseFloat(minPrice);
  const maxVal = parseFloat(maxPrice);
  const isNegativePrice = (!isNaN(minVal) && minVal < 0) || (!isNaN(maxVal) && maxVal < 0);
  const isInvalidPriceRange = !isNaN(minVal) && !isNaN(maxVal) && minVal > maxVal;
  const priceHasError = isNegativePrice || isInvalidPriceRange;

  // Sync dual slider values
  const sliderMin = !isNaN(minVal) && minVal >= 0 ? Math.min(minVal, 500000) : 0;
  const sliderMax = !isNaN(maxVal) && maxVal >= 0 ? Math.min(maxVal, 500000) : 500000;

  const handleSliderChange = (vals: number[]) => {
    setMinPrice(vals[0] > 0 ? String(vals[0]) : "");
    setMaxPrice(vals[1] < 500000 ? String(vals[1]) : "");
  };

  const rawQueryLower = debouncedQ.toLowerCase().trim();

  const scoredProviders = providers.map(p => {
    let matchScore = 0;
    let matchReason = "";

    const pName = (p.business_name || p.full_name || "").toLowerCase().trim();
    const pCat = norm(p.category || "");
    const pCity = (p.city || "").toLowerCase().trim();
    const pState = (p.state || "").toLowerCase().trim();

    // Category Match from UI chip
    const matchesCatUi = !selectedCat || pCat === selectedCat;

    // Location Match (City or State)
    let matchesLocation = true;
    if (selectedState) {
      const normSelState = selectedState.toLowerCase().trim().replace(" state", "");
      if (!pState.includes(normSelState)) {
        matchesLocation = false;
      }
    }
    if (location) {
      const normLoc = location.toLowerCase().trim();
      const isStateSearch = normLoc.endsWith("state") || normLoc === "fct" || NIGERIA_STATES.some(s => s.toLowerCase() === normLoc || s.toLowerCase().replace(" state", "") === normLoc);
      if (isStateSearch) {
        const stateBase = normLoc.replace(" state", "");
        if (!pState.includes(stateBase)) {
          matchesLocation = false;
        }
      } else {
        // Strict city match against p.city
        if (!pCity.includes(normLoc)) {
          matchesLocation = false;
        }
      }
    }

    // Price Filter
    let matchesPrice = true;
    if (priceHasError) {
      matchesPrice = false;
    } else if (!isNaN(minVal) || !isNaN(maxVal)) {
      if (!p.services || p.services.length === 0) {
        matchesPrice = false;
      } else {
        matchesPrice = p.services.some((s: any) => {
          if (s.pricing_type === 'inspection_required') return false;
          const pVal = s.price;
          if (pVal == null || isNaN(pVal) || pVal <= 0) return false;
          const passesMin = isNaN(minVal) || pVal >= minVal;
          const passesMax = isNaN(maxVal) || pVal <= maxVal;
          return passesMin && passesMax;
        });
      }
    }

    // Active Services
    const activeServices = (p.services || []).filter((s: any) => s.is_active !== false);

    // Intent Match (Target) & Ranking
    let matchesIntent = false;
    let matchingServices: typeof activeServices = [];

    if (!target) {
      matchesIntent = true;
      matchingServices = activeServices;
      if (location) {
        matchReason = `${p.category || 'Provider'} in ${p.city || location}`;
      }
    } else {
      const targetLower = target.toLowerCase().trim();

      // Priority 1: Exact business-name match
      if (pName === targetLower || pName === rawQueryLower) {
        matchScore = 1000;
        matchesIntent = true;
        matchReason = "Exact business match";
        matchingServices = activeServices;
      }
      // Priority 2: Business name starts with target
      else if (pName.startsWith(targetLower) || pName.startsWith(rawQueryLower)) {
        matchScore = 800;
        matchesIntent = true;
        matchReason = "Business match";
        matchingServices = activeServices;
      }
      // Priority 3: Partial business-name match
      else if (pName.includes(targetLower) || pName.includes(rawQueryLower)) {
        matchScore = 600;
        matchesIntent = true;
        matchReason = "Business match";
        matchingServices = activeServices;
      }
      // Priority 4: Exact or singular/plural service-name match
      else if (activeServices.some(s => isPluralOrSingularMatch(s.name, targetLower))) {
        const exactSvc = activeServices.find(s => isPluralOrSingularMatch(s.name, targetLower));
        matchScore = 400;
        matchesIntent = true;
        matchReason = exactSvc ? `Offers ${exactSvc.name}` : `Service match`;
        const matched = activeServices.filter(s => isPluralOrSingularMatch(s.name, targetLower));
        const rest = activeServices.filter(s => !isPluralOrSingularMatch(s.name, targetLower));
        matchingServices = [...matched, ...rest];
      }
      // Priority 5: Exact category match
      else if (pCat === normalizedTarget || norm(p.category) === norm(targetLower)) {
        matchScore = 300;
        matchesIntent = true;
        matchReason = `${p.category || 'Category'} match`;
        matchingServices = activeServices;
      }
      // Priority 6: Partial service or category match
      else {
        const partialSvc = activeServices.find(s => s.name?.toLowerCase().includes(targetLower));
        if (partialSvc) {
          matchScore = 200;
          matchesIntent = true;
          matchReason = `Offers ${partialSvc.name}`;
          const matched = activeServices.filter(s => s.name?.toLowerCase().includes(targetLower));
          const rest = activeServices.filter(s => !s.name?.toLowerCase().includes(targetLower));
          matchingServices = [...matched, ...rest];
        } else if (pCat.includes(targetLower) || normalizedTarget.includes(pCat)) {
          matchScore = 200;
          matchesIntent = true;
          matchReason = `${p.category || 'Category'} match`;
          matchingServices = activeServices;
        }
      }
    }

    const distance = (userLoc && p.latitude && p.longitude)
      ? getDist(userLoc.lat, userLoc.lng, p.latitude, p.longitude)
      : null;

    return {
      p,
      matchesCatUi,
      matchesLocation,
      matchesPrice,
      matchesIntent,
      matchScore,
      matchReason,
      matchingServices,
      distance
    };
  });

  const filtered = scoredProviders
    .filter(x => x.matchesCatUi && x.matchesLocation && x.matchesPrice && x.matchesIntent)
    .sort((a, b) => {
      if (sortBy === "nearest" && userLoc) {
        const distA = a.distance !== null ? a.distance : Infinity;
        const distB = b.distance !== null ? b.distance : Infinity;
        return distA - distB;
      }

      if (sortBy === "reviews") return (b.p.review_count || 0) - (a.p.review_count || 0);
      if (sortBy === "price_asc") {
        const minA = a.p.services && a.p.services.length > 0 ? Math.min(...a.p.services.map((s: any) => s.price || 0)) : Infinity;
        const minB = b.p.services && b.p.services.length > 0 ? Math.min(...b.p.services.map((s: any) => s.price || 0)) : Infinity;
        return minA - minB;
      }
      if (sortBy === "price_desc") {
        const maxA = a.p.services && a.p.services.length > 0 ? Math.max(...a.p.services.map((s: any) => s.price || 0)) : -1;
        const maxB = b.p.services && b.p.services.length > 0 ? Math.max(...b.p.services.map((s: any) => s.price || 0)) : -1;
        return maxB - maxA;
      }

      if (a.matchScore !== b.matchScore) {
        return b.matchScore - a.matchScore;
      }

      return (b.p.average_rating || 0) - (a.p.average_rating || 0);
    });

  let emptyTitle = "No providers found";
  let emptySub = "Try a different search or category.";

  if (isInvalidPriceRange) {
    emptyTitle = "Invalid Price Range";
    emptySub = "Minimum price cannot be greater than maximum price.";
  } else if (isNegativePrice) {
    emptyTitle = "Invalid Price";
    emptySub = "Price values cannot be negative.";
  } else if (stateConflict) {
    emptyTitle = "Location Conflict";
    emptySub = `Your search location "${location}" does not match the selected state "${selectedState}". Clear or change the State filter.`;
  } else if (target && location) {
    const locDisplay = location.charAt(0).toUpperCase() + location.slice(1);
    if (target.length > 2 && (target.includes("salon") || target.includes("shop") || target.includes("studio"))) {
      emptyTitle = "No matching business found";
      emptySub = `No business matching "${target}" was found in ${locDisplay}.`;
    } else {
      emptyTitle = `No businesses found in ${locDisplay}`;
      emptySub = `No businesses offering "${target}" were found in ${locDisplay}.`;
    }
  } else if (target) {
    emptyTitle = "No matching business or service";
    emptySub = `No business or service matching "${target}" was found.`;
  } else if (minPrice || maxPrice) {
    emptyTitle = "No matching fixed-price services";
    emptySub = "No matching fixed-price services fall within your selected price range.";
  }

  const requestLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocError(false);
        setSortBy("nearest");
      }, () => {
        setLocError(true);
        setSortBy("rating");
      });
    } else {
      setLocError(true);
      setSortBy("rating");
    }
  };

  const handleSortChange = (key: SortKey) => {
    if (key === "nearest") {
      if (!userLoc) {
        requestLocation();
        return;
      }
    }
    setSortBy(key);
  };

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const paginatedFiltered = filtered.slice(0, page * LIMIT);
  const hasMore = filtered.length > page * LIMIT;

  const getSortLabel = (key: SortKey) => {
    switch (key) {
      case "rating": return "Top Rated";
      case "nearest": return "Nearest";
      case "reviews": return "Most Reviews";
      case "price_asc": return "Price: Low to High";
      case "price_desc": return "Price: High to Low";
    }
  };

  return (
    <div className="min-h-screen pb-24 bg-background" style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)" }}>

      {/* Header & Sticky Search Area */}
      <div className="px-5 pt-2 pb-3">
        {/* Header Title & Subtitle */}
        <div className="mb-4">
          <p className="text-xs font-bold text-sky-500 mb-0.5">BookMe</p>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight mb-1">Discover</h1>
          <p className="text-xs text-muted-foreground font-medium">Find and book amazing local service providers</p>
        </div>

        {/* Search Row */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 flex items-center gap-3 rounded-2xl px-4 bg-card border border-border/40 shadow-sm"
            style={{ height: 48 }}>
            <SearchIcon className="w-4.5 h-4.5 text-muted-foreground flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search providers, services, categories…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none font-medium"
            />
            {query && (
              <button onClick={() => setQuery("")} className="tap-scale">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters(v => !v)}
            className="w-12 h-12 rounded-2xl flex items-center justify-center tap-scale relative bg-gradient-to-br from-sky-400 to-blue-600 text-white shadow-md shadow-sky-500/20 flex-shrink-0"
          >
            <SlidersHorizontal className="w-5 h-5 text-white" />
            {(minPrice || maxPrice || sortBy !== "rating" || selectedState) && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-primary border-2 border-background" />
            )}
          </button>
        </div>

        {/* Filter Panel (Card Matching Screenshot) */}
        {showFilters && (
          <div className="rounded-3xl p-5 mb-5 bg-card border border-border/50 shadow-sm space-y-4 animate-fade-in">

            {/* Section A: SORT BY */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-extrabold tracking-wider text-muted-foreground uppercase">SORT BY</span>
                <span className="text-[11px] font-medium text-muted-foreground/70">Find the best providers for you</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: "rating" as SortKey, label: "Top Rated", icon: <Star className="w-3.5 h-3.5 fill-current" /> },
                  { key: "nearest" as SortKey, label: "Nearest", icon: <Navigation className="w-3.5 h-3.5" /> },
                  { key: "reviews" as SortKey, label: "Most Reviews", icon: <MessageSquare className="w-3.5 h-3.5" /> }
                ].map(({ key, label, icon }) => {
                  const isActive = sortBy === key;
                  return (
                    <button
                      key={key}
                      onClick={() => handleSortChange(key)}
                      className={`h-10 px-2 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all tap-scale ${isActive
                          ? "bg-gradient-to-r from-sky-400 to-blue-600 text-white shadow-md shadow-sky-500/20"
                          : "bg-background text-foreground border border-border/60 shadow-sm hover:bg-secondary/60"
                        }`}
                    >
                      {icon}
                      <span className="truncate">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section B: NEAREST TOGGLE */}
            <div className="border-t border-border/60 pt-4">
              {locError && (
                <div className="rounded-2xl p-3 mb-3 bg-destructive/10 border border-destructive/20 text-xs flex flex-col gap-2">
                  <span className="text-destructive font-medium">Location permission needed to sort by distance.</span>
                  <div className="flex gap-2">
                    <button onClick={requestLocation} className="px-3 py-1 bg-primary text-white font-bold rounded-xl text-[11px] tap-scale">Retry Location</button>
                    <button onClick={() => { setSortBy("rating"); setLocError(false); }} className="px-3 py-1 bg-secondary text-foreground font-bold rounded-xl text-[11px] tap-scale">Use Default Sort</button>
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-sky-100/70 text-sky-600 flex items-center justify-center flex-shrink-0">
                    <Navigation className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <p className="font-extrabold text-sm text-foreground">Nearest</p>
                    <p className="text-xs text-muted-foreground font-medium">Show providers closest to you</p>
                  </div>
                </div>
                <Switch
                  checked={sortBy === "nearest"}
                  onCheckedChange={(checked) => {
                    if (checked) handleSortChange("nearest");
                    else setSortBy("rating");
                  }}
                />
              </div>
            </div>

            {/* Section C: LOCATION */}
            <div className="border-t border-border/60 pt-4">
              <span className="text-[11px] font-extrabold tracking-wider text-muted-foreground uppercase block mb-0.5">LOCATION</span>
              <p className="text-xs text-muted-foreground font-medium mb-2.5">Filter by state</p>
              <StateSelector
                stateValue={selectedState}
                onStateChange={setSelectedState}
              />
            </div>

            {/* Section D: PRICE RANGE */}
            <div className="border-t border-border/60 pt-4">
              <span className="text-[11px] font-extrabold tracking-wider text-muted-foreground uppercase block mb-0.5">PRICE RANGE</span>
              <p className="text-xs text-muted-foreground font-medium mb-3">Set your budget (in Nigerian Naira)</p>

              {/* Dual Inputs Row */}
              <div className="flex items-center gap-2 mb-4">
                <div className="flex-1 flex items-center rounded-2xl bg-secondary/50 border border-border/60 px-3.5 h-11">
                  <span className="text-xs font-bold text-muted-foreground mr-1.5">₦</span>
                  <input
                    type="number"
                    placeholder="Min"
                    value={minPrice}
                    onChange={e => setMinPrice(e.target.value)}
                    className="w-full bg-transparent text-sm outline-none font-semibold text-foreground placeholder:text-muted-foreground"
                  />
                </div>
                <span className="text-muted-foreground font-bold">-</span>
                <div className="flex-1 flex items-center rounded-2xl bg-secondary/50 border border-border/60 px-3.5 h-11">
                  <span className="text-xs font-bold text-muted-foreground mr-1.5">₦</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={maxPrice}
                    onChange={e => setMaxPrice(e.target.value)}
                    className="w-full bg-transparent text-sm outline-none font-semibold text-foreground placeholder:text-muted-foreground"
                  />
                </div>
              </div>

              {/* Dual-Handle Slider */}
              <div className="px-1 mb-2">
                <Slider
                  min={0}
                  max={500000}
                  step={5000}
                  value={[sliderMin, sliderMax]}
                  onValueChange={handleSliderChange}
                  className="my-3"
                />
                <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
                  <span>₦0</span>
                  <span>₦500,000+</span>
                </div>
              </div>

              {/* Error messages */}
              {isInvalidPriceRange && (
                <p className="text-xs font-semibold text-destructive mt-2">
                  Minimum price cannot be greater than maximum price.
                </p>
              )}
              {isNegativePrice && (
                <p className="text-xs font-semibold text-destructive mt-2">
                  Price cannot be negative.
                </p>
              )}
              {(minPrice || maxPrice) && (
                <button
                  onClick={() => { setMinPrice(""); setMaxPrice(""); }}
                  className="mt-2 text-xs font-bold text-primary underline block text-center w-full"
                >
                  Clear price filter
                </button>
              )}
            </div>
          </div>
        )}

        {/* Category Chips Row */}
        <div className="flex gap-2.5 overflow-x-auto hide-scrollbar pb-1 -mx-5 px-5">
          <button
            onClick={() => setSelectedCat("")}
            className={`px-5 py-2.5 rounded-full text-xs font-bold whitespace-nowrap tap-scale flex items-center gap-1.5 transition-all ${!selectedCat
                ? "bg-gradient-to-r from-sky-400 to-blue-600 text-white shadow-md shadow-sky-500/20"
                : "bg-card text-foreground border border-border/60 shadow-sm"
              }`}
          >
            All
          </button>
          {CATEGORIES.map(cat => {
            const isCatActive = selectedCat === cat.slug;
            return (
              <button
                key={cat.slug}
                onClick={() => setSelectedCat(isCatActive ? "" : cat.slug)}
                className={`px-4 py-2.5 rounded-full text-xs font-bold whitespace-nowrap tap-scale flex items-center gap-1.5 transition-all ${isCatActive
                    ? "bg-gradient-to-r from-sky-400 to-blue-600 text-white shadow-md shadow-sky-500/20"
                    : "bg-card text-foreground border border-border/60 shadow-sm"
                  }`}
              >
                {getCategoryIcon(cat.slug)}
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Results Section */}
      <div className="px-5 mt-3">
        {/* Summary Row */}
        <div className="flex items-center justify-between mb-3.5">
          <p className="text-sm font-extrabold text-foreground">
            {loading ? "Searching…" : `${filtered.length} results`}
          </p>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-card border border-border/50 text-xs font-bold text-foreground shadow-sm tap-scale">
                <span>Sort: {getSortLabel(sortBy)}</span>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-2xl p-1 bg-card border border-border/60 shadow-md">
              <DropdownMenuItem onClick={() => handleSortChange("rating")} className="text-xs font-semibold rounded-xl cursor-pointer">
                Top Rated
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSortChange("nearest")} className="text-xs font-semibold rounded-xl cursor-pointer">
                Nearest
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSortChange("reviews")} className="text-xs font-semibold rounded-xl cursor-pointer">
                Most Reviews
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSortChange("price_asc")} className="text-xs font-semibold rounded-xl cursor-pointer">
                Price: Low to High
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSortChange("price_desc")} className="text-xs font-semibold rounded-xl cursor-pointer">
                Price: High to Low
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Results List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-24 rounded-3xl skeleton" />)}
          </div>
        ) : stateConflict || filtered.length === 0 || priceHasError ? (
          <div className="rounded-3xl p-8 text-center bg-card border border-border/40 shadow-sm">
            <SearchIcon className="w-10 h-10 text-muted-foreground/60 mx-auto mb-3" />
            <p className="font-bold text-foreground">{emptyTitle}</p>
            <p className="text-sm text-muted-foreground mt-1">{emptySub}</p>
            {stateConflict && (
              <button
                onClick={() => setSelectedState("")}
                className="mt-4 px-6 py-2.5 rounded-2xl text-xs font-bold text-white bg-primary tap-scale shadow-sm"
              >
                Clear State Filter
              </button>
            )}
            {priceHasError && (
              <button
                onClick={() => { setMinPrice(""); setMaxPrice(""); }}
                className="mt-4 px-6 py-2.5 rounded-2xl text-xs font-bold text-white bg-primary tap-scale shadow-sm"
              >
                Clear Price Filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3.5">
            {paginatedFiltered.map(({ p, distance, matchReason, matchingServices }) => {
              const isFav = favorites[p.id] || false;
              const previewServices = matchingServices.slice(0, 3);
              const hasMoreServices = matchingServices.length > 3;

              return (
                <div
                  key={p.id}
                  onClick={() => navigate(`/provider/${p.id}`)}
                  className="w-full rounded-3xl p-4.5 text-left bg-card border border-border/40 shadow-sm tap-scale transition-all hover:border-primary/40 relative cursor-pointer"
                >
                  {/* Top Business Card Header */}
                  <div className="flex gap-3.5 items-start">
                    {/* Avatar/Cover Photo */}
                    <div className="relative flex-shrink-0">
                      <img
                        src={p.cover_image_url || p.cover_photo_url || p.avatar_url || defaultCover}
                        alt={p.business_name || p.full_name || ""}
                        className="w-16 h-16 rounded-2xl object-cover border border-border/40 shadow-sm"
                      />
                    </div>

                    {/* Main Details */}
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex items-start justify-between gap-2 pr-6">
                        <p className="font-extrabold text-base text-foreground truncate">{p.business_name || p.full_name}</p>
                      </div>
                      <p className="text-xs text-muted-foreground font-medium capitalize truncate mt-0.5">{p.category || "General"}</p>

                      {/* Rating & Location Row */}
                      <div className="flex items-center gap-2 mt-2 text-xs font-semibold">
                        <div className="flex items-center gap-1 text-foreground">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          <span>{(p.average_rating || 0).toFixed(1)}</span>
                          <span className="text-muted-foreground text-[11px]">({p.review_count || 0})</span>
                        </div>
                        {p.city && (
                          <>
                            <span className="text-muted-foreground/40">|</span>
                            <div className="flex items-center gap-1 text-muted-foreground truncate">
                              <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                              <span className="truncate">{p.city}</span>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Badges & Match Reason Row */}
                      <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                        {p.is_verified && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-100 text-sky-700">
                            <CheckCircle className="w-3 h-3 fill-sky-600 text-white" />
                            Verified
                          </span>
                        )}
                        {distance !== null && distance < 1000 && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-50 text-sky-600">
                            <Navigation className="w-3 h-3" />
                            {distance < 1 ? `${Math.round(distance * 1000)} m away` : `${distance.toFixed(1)} km away`}
                          </span>
                        )}
                        {matchReason && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-secondary text-secondary-foreground border border-border/50">
                            {matchReason}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Heart / Favorite Button */}
                    <button
                      onClick={(e) => toggleFavorite(p.id, e)}
                      className="absolute top-4 right-4 text-muted-foreground hover:text-rose-500 tap-scale p-1"
                    >
                      <Heart className={`w-4.5 h-4.5 ${isFav ? "fill-rose-500 text-rose-500" : ""}`} />
                    </button>
                  </div>

                  {/* Services Preview Subsection */}
                  {previewServices.length > 0 && (
                    <div className="mt-3.5 pt-3 border-t border-border/50 space-y-2">
                      {previewServices.map((svc, idx) => {
                        const isMatched = target && (
                          svc.name?.toLowerCase().includes(target.toLowerCase()) ||
                          isPluralOrSingularMatch(svc.name, target)
                        );

                        const priceInfo = formatServicePriceLabel(svc);
                        return (
                          <div key={svc.id || idx} className="flex items-center justify-between text-xs py-1 px-2.5 rounded-xl bg-secondary/40 border border-border/30">
                            <span className={`font-semibold truncate pr-2 ${isMatched ? "text-primary font-bold" : "text-foreground"}`}>
                              {svc.name}
                            </span>
                            <span className="font-extrabold flex-shrink-0">
                              {priceInfo.isBadge ? (
                                <span className={priceInfo.badgeClass}>
                                  {priceInfo.label}
                                </span>
                              ) : (
                                <span className="text-foreground">
                                  {priceInfo.label}
                                </span>
                              )}
                            </span>
                          </div>
                        );
                      })}

                      {hasMoreServices && (
                        <p className="text-[11px] font-bold text-sky-600 hover:underline pt-0.5 text-right">
                          View all {matchingServices.length} services →
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {hasMore && !loading && !stateConflict && !priceHasError && filtered.length > 0 && (
          <div className="mt-6 text-center">
            <button
              onClick={() => setPage(p => p + 1)}
              className="px-6 py-3 rounded-2xl text-sm font-bold bg-secondary text-secondary-foreground tap-scale transition-colors hover:bg-secondary/80 border border-border/50 shadow-sm"
            >
              Load More Results
            </button>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default SearchPage;
