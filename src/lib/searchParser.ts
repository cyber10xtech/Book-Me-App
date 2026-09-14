import { NIGERIA_LOCATIONS, NIGERIA_STATES } from '../data/nigeriaLocations';

const ALIASES: Record<string, string[]> = {
  "barbers": ["barber", "barbers", "barbing", "haircut", "haircuts"],
  "hairdressers": ["hairdresser", "hairdressers", "braiding", "hair treatment", "wig", "weaves"],
  "makeup-artists": ["makeup", "glam", "bridal makeup", "makeup artist", "makeup artists"],
  "lash-techs": ["lash", "lashes", "lash refill", "lash tech", "lash techs"],
  "photographers": ["photographer", "photographers", "photography", "photoshoot"],
  "tattoo-artists": ["tattoo", "tattoos", "tattoo artist"],
  "djs": ["dj", "djs", "mixtape", "mc"],
  "event-planners": ["event planner", "event planners", "decoration", "decorating"],
  "catering": ["caterer", "caterers", "catering", "buffet", "small chops"],
  "cake-vendors": ["cake", "cakes", "cupcakes", "cake vendor", "cake vendors"],
  "mechanics": ["mechanic", "mechanics", "car inspection", "diagnostics", "auto repair", "engine repair"],
  "generator-mechanics": ["generator", "gen mechanic", "gen servicing"],
  "cleaning-services": ["cleaner", "cleaners", "cleaning", "deep clean", "house cleaning"],
  "personal-trainers": ["trainer", "trainers", "fitness", "workout", "gym"],
  "pet-services": ["pet", "pets", "dog walking", "grooming"],
  "lesson-teachers": ["teacher", "teachers", "tutoring", "tutor", "lessons"],
  "nail-techs": ["nail", "nails", "manicure", "pedicure"],
  "skin-care": ["skin", "facial", "acne"],
  "piercings": ["piercing", "piercings"]
};

const CONNECTORS = [" in ", " at ", " near ", " around ", " for "];

// Build a sorted list of known locations (longest first to match "Port Harcourt" before "Port")
const knownLocations = (() => {
  const locs = new Set<string>();
  
  // Add major base cities that might not exactly match LGA names
  const baseCities = [
    "owerri", "port harcourt", "aba", "abuja", "lagos", "ikeja", "kano", 
    "kaduna", "ibadan", "enugu", "benin city", "calabar", "warri", "onitsha", 
    "umuahia", "uyo", "akure", "ilorin", "abeokuta", "asaba", "jos", "fct"
  ];
  baseCities.forEach(c => locs.add(c));
  
  NIGERIA_STATES.forEach(state => {
    locs.add(state.toLowerCase());
    if (state.toLowerCase().endsWith(" state")) {
      locs.add(state.toLowerCase().replace(" state", ""));
    } else {
      locs.add(state.toLowerCase() + " state");
    }
  });
  Object.values(NIGERIA_LOCATIONS).flat().forEach(city => {
    locs.add(city.toLowerCase());
    const suffixRegex = /\s(municipal|north|south|east|west)$/i;
    if (suffixRegex.test(city)) {
      locs.add(city.toLowerCase().replace(suffixRegex, '').trim());
    }
  });
  return Array.from(locs).sort((a, b) => b.length - a.length);
})();

export interface ParsedQuery {
  target: string;
  location: string;
  originalQuery: string;
}

export function parseQuery(query: string): ParsedQuery {
  if (!query) {
    return { target: "", location: "", originalQuery: "" };
  }

  const normalized = query.toLowerCase().replace(/[,]/g, " ").replace(/\s+/g, " ").trim();

  let target = normalized;
  let location = "";

  // 1. Try to split by connector
  let connectorFound = false;
  for (const connector of CONNECTORS) {
    if (normalized.includes(connector)) {
      const parts = normalized.split(connector);
      target = parts[0].trim();
      location = parts.slice(1).join(connector).trim();
      connectorFound = true;
      break;
    }
  }

  // 2. If no connector, try to find a known location at the end of the string
  if (!connectorFound) {
    for (const loc of knownLocations) {
      if (normalized.endsWith(" " + loc) || normalized === loc) {
        const potentialTarget = normalized.substring(0, normalized.length - loc.length).trim();
        if (potentialTarget.length > 0 || normalized === loc) {
          target = potentialTarget;
          location = loc;
          break;
        }
      }
    }
  }

  return { target, location, originalQuery: query };
}

export function normalizeTarget(target: string): string {
  const lower = target.toLowerCase().trim();
  for (const [canonical, aliases] of Object.entries(ALIASES)) {
    if (aliases.includes(lower)) {
      return canonical;
    }
  }
  return lower;
}

export function isPluralOrSingularMatch(str1: string, str2: string): boolean {
  const s1 = (str1 || "").toLowerCase().trim();
  const s2 = (str2 || "").toLowerCase().trim();
  if (!s1 || !s2) return false;
  if (s1 === s2) return true;
  if (s1 + "s" === s2 || s2 + "s" === s1) return true;
  if (s1 + "es" === s2 || s2 + "es" === s1) return true;
  if (s1.replace(/ies$/, "y") === s2 || s2.replace(/ies$/, "y") === s1) return true;
  if (s1.replace(/s$/, "") === s2.replace(/s$/, "")) return true;
  return false;
}

export interface FormattedPriceLabel {
  label: string;
  isBadge: boolean;
  badgeClass?: string;
}

export function formatServicePriceLabel(svc: { 
  price?: number | null; 
  pricing_type?: string; 
  max_price?: number; 
  maxPrice?: number 
}): FormattedPriceLabel {
  // Rule 1: Confirmed inspection_required pricing type
  if (svc.pricing_type === "inspection_required") {
    return { 
      label: "Price after inspection", 
      isBadge: true, 
      badgeClass: "text-[11px] text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full font-bold" 
    };
  }

  // Rule 2: Confirmed price range
  if (svc.pricing_type === "range") {
    const maxVal = svc.max_price || svc.maxPrice;
    if (svc.price != null && svc.price > 0 && maxVal != null && maxVal > 0) {
      return { label: `₦${svc.price.toLocaleString()} – ₦${maxVal.toLocaleString()}`, isBadge: false };
    }
    if (svc.price != null && svc.price > 0) {
      return { label: `Starting at ₦${svc.price.toLocaleString()}`, isBadge: false };
    }
  }

  // Rule 3: Valid positive fixed price
  if (svc.price != null && svc.price > 0) {
    return { label: `₦${svc.price.toLocaleString()}`, isBadge: false };
  }

  // Rule 4: Zero, null, invalid, or unconfirmed price without confirmed pricing_type
  return { 
    label: "Contact provider for price", 
    isBadge: true, 
    badgeClass: "text-[11px] text-muted-foreground bg-secondary px-2.5 py-0.5 rounded-full font-bold border border-border/50" 
  };
}

export function calculateSearchScore(
  activeServices: { name?: string; description?: string; [key: string]: unknown }[],
  targetLower: string,
  rawQueryLower: string,
  pName: string,
  pCat: string,
  normalizedTarget: string
) {
  let matchScore = 0;
  let matchReason = "";
  let matchingServices = activeServices;
  let matchesIntent = false;

  const SCORE_EXACT_SERVICE = 1000;
  const SCORE_EXACT_BUSINESS = 900;
  const SCORE_SERVICE_PREFIX = 800;
  const SCORE_BUSINESS_PREFIX = 700;
  const SCORE_PARTIAL_SERVICE = 600;
  const SCORE_PARTIAL_BUSINESS = 500;
  const SCORE_EXACT_CATEGORY = 400;
  const SCORE_PARTIAL_CATEGORY = 300;
  const SCORE_DESC_MATCH = 200;
  const SCORE_WEAK_MATCH = 100;

  if (!targetLower) {
    return { matchScore: 0, matchReason: "", matchingServices, matchesIntent: true };
  }

  const exactSvc = activeServices.find(s => isPluralOrSingularMatch(s.name, targetLower));
  const partialSvc = activeServices.find(s => s.name?.toLowerCase().includes(targetLower));
  
  const getServiceDesc = (svc: { description?: string; [key: string]: unknown }): string => {
    if (!svc.description) return "";
    try {
      return (JSON.parse(svc.description).description as string) || "";
    } catch {
      return svc.description as string;
    }
  };
  const descSvc = activeServices.find(s => getServiceDesc(s).toLowerCase().includes(targetLower));

  const norm = (s: string) => (s || "").toLowerCase().replace(/[\s_]+/g, "-");

  if (exactSvc) {
    matchScore = SCORE_EXACT_SERVICE;
    matchesIntent = true;
    matchReason = `Offers ${exactSvc.name}`;
    const matched = activeServices.filter(s => isPluralOrSingularMatch(s.name, targetLower));
    const rest = activeServices.filter(s => !isPluralOrSingularMatch(s.name, targetLower));
    matchingServices = [...matched, ...rest];
  }
  else if (pName === targetLower || pName === rawQueryLower) {
    matchScore = SCORE_EXACT_BUSINESS;
    matchesIntent = true;
    matchReason = "Exact business match";
    matchingServices = activeServices;
  }
  else if (activeServices.some(s => s.name?.toLowerCase().startsWith(targetLower))) {
    const prefixSvc = activeServices.find(s => s.name?.toLowerCase().startsWith(targetLower));
    matchScore = SCORE_SERVICE_PREFIX;
    matchesIntent = true;
    matchReason = prefixSvc ? `Offers ${prefixSvc.name}` : "Service match";
    const matched = activeServices.filter(s => s.name?.toLowerCase().startsWith(targetLower));
    const rest = activeServices.filter(s => !s.name?.toLowerCase().startsWith(targetLower));
    matchingServices = [...matched, ...rest];
  }
  else if (pName.startsWith(targetLower) || pName.startsWith(rawQueryLower)) {
    matchScore = SCORE_BUSINESS_PREFIX;
    matchesIntent = true;
    matchReason = "Business match";
    matchingServices = activeServices;
  }
  else if (partialSvc) {
    matchScore = SCORE_PARTIAL_SERVICE;
    matchesIntent = true;
    matchReason = `Offers ${partialSvc.name}`;
    const matched = activeServices.filter(s => s.name?.toLowerCase().includes(targetLower));
    const rest = activeServices.filter(s => !s.name?.toLowerCase().includes(targetLower));
    matchingServices = [...matched, ...rest];
  }
  else if (pName.includes(targetLower) || pName.includes(rawQueryLower)) {
    matchScore = SCORE_PARTIAL_BUSINESS;
    matchesIntent = true;
    matchReason = "Business match";
    matchingServices = activeServices;
  }
  else if (pCat === normalizedTarget || norm(pCat) === norm(targetLower)) {
    matchScore = SCORE_EXACT_CATEGORY;
    matchesIntent = true;
    matchReason = `${pCat || 'Category'} match`;
    matchingServices = activeServices;
  }
  else if (pCat.includes(targetLower) || normalizedTarget.includes(pCat)) {
    matchScore = SCORE_PARTIAL_CATEGORY;
    matchesIntent = true;
    matchReason = `${pCat || 'Category'} match`;
    matchingServices = activeServices;
  }
  else if (descSvc) {
    matchScore = SCORE_DESC_MATCH;
    matchesIntent = true;
    matchReason = `Offers ${descSvc.name}`;
    const matched = activeServices.filter(s => getServiceDesc(s).toLowerCase().includes(targetLower));
    const rest = activeServices.filter(s => !getServiceDesc(s).toLowerCase().includes(targetLower));
    matchingServices = [...matched, ...rest];
  } else {
    matchScore = SCORE_WEAK_MATCH;
    matchesIntent = false; 
  }

  return { matchScore, matchReason, matchingServices, matchesIntent };
}

