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
