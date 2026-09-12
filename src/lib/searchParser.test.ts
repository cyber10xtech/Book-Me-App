import { describe, it, expect } from 'vitest';
import { parseQuery, normalizeTarget, isPluralOrSingularMatch, formatServicePriceLabel } from './searchParser';

describe('Universal Search & Parser System Tests', () => {

  describe('parseQuery - Query Extraction', () => {
    it('extracts "Barbers" and "Owerri" from "Barbers in Owerri"', () => {
      const res = parseQuery("Barbers in Owerri");
      expect(res.target).toBe("barbers");
      expect(res.location).toBe("owerri");
    });

    it('extracts "Haircut" and "Owerri" from "Haircut in Owerri"', () => {
      const res = parseQuery("Haircut in Owerri");
      expect(res.target).toBe("haircut");
      expect(res.location).toBe("owerri");
    });

    it('extracts "Car inspection" and "Owerri" from "Car inspection in Owerri"', () => {
      const res = parseQuery("Car inspection in Owerri");
      expect(res.target).toBe("car inspection");
      expect(res.location).toBe("owerri");
    });

    it('extracts "Mechanics" and "Port Harcourt" from "Mechanics near Port Harcourt"', () => {
      const res = parseQuery("Mechanics near Port Harcourt");
      expect(res.target).toBe("mechanics");
      expect(res.location).toBe("port harcourt");
    });

    it('extracts "Photographers" and "Rivers State" from "Photographers Rivers State"', () => {
      const res = parseQuery("Photographers Rivers State");
      expect(res.target).toBe("photographers");
      expect(res.location).toBe("rivers state");
    });

    it('extracts "Visex Salon" and "Owerri" from "Visex Salon in Owerri"', () => {
      const res = parseQuery("Visex Salon in Owerri");
      expect(res.target).toBe("visex salon");
      expect(res.location).toBe("owerri");
    });

    it('extracts "Visex Salon" with no location from "Visex Salon"', () => {
      const res = parseQuery("Visex Salon");
      expect(res.target).toBe("visex salon");
      expect(res.location).toBe("");
    });
  });

  describe('normalizeTarget & Plural/Singular Matching', () => {
    it('normalizes category aliases', () => {
      expect(normalizeTarget("barbing")).toBe("barbers");
      expect(normalizeTarget("mechanic")).toBe("mechanics");
      expect(normalizeTarget("cleaners")).toBe("cleaning-services");
      expect(normalizeTarget("photography")).toBe("photographers");
    });

    it('matches singular and plural forms', () => {
      expect(isPluralOrSingularMatch("haircut", "haircuts")).toBe(true);
      expect(isPluralOrSingularMatch("barbers", "barber")).toBe(true);
      expect(isPluralOrSingularMatch("mechanics", "mechanic")).toBe(true);
      expect(isPluralOrSingularMatch("car inspection", "car inspections")).toBe(true);
    });
  });

  describe('formatServicePriceLabel - Strict Price Rules', () => {
    it('returns "Price after inspection" ONLY when pricing_type is inspection_required', () => {
      const res = formatServicePriceLabel({ price: 0, pricing_type: "inspection_required" });
      expect(res.label).toBe("Price after inspection");
      expect(res.isBadge).toBe(true);
    });

    it('returns formatted naira price for positive fixed service', () => {
      const res = formatServicePriceLabel({ price: 2500, pricing_type: "fixed" });
      expect(res.label).toBe("₦2,500");
      expect(res.isBadge).toBe(false);
    });

    it('returns formatted price range for valid range service', () => {
      const res = formatServicePriceLabel({ price: 2000, max_price: 5000, pricing_type: "range" });
      expect(res.label).toBe("₦2,000 – ₦5,000");
      expect(res.isBadge).toBe(false);
    });

    it('returns "Contact provider for price" for zero price without pricing type', () => {
      const res = formatServicePriceLabel({ price: 0 });
      expect(res.label).toBe("Contact provider for price");
      expect(res.label).not.toBe("Price after inspection");
      expect(res.label).not.toBe("Free");
      expect(res.label).not.toBe("₦0");
      expect(res.isBadge).toBe(true);
    });

    it('returns "Contact provider for price" for null price', () => {
      const res = formatServicePriceLabel({ price: null });
      expect(res.label).toBe("Contact provider for price");
      expect(res.isBadge).toBe(true);
    });

    it('does not label zero price without confirmed pricing_type as inspection-based', () => {
      const res = formatServicePriceLabel({ price: 0, pricing_type: undefined });
      expect(res.label).toBe("Contact provider for price");
      expect(res.label).not.toBe("Price after inspection");
    });
  });

  describe('Business Ranking & Filtering Logic Simulation', () => {
    const mockProviders = [
      {
        id: "p1",
        business_name: "Visex Salon",
        category: "barbers",
        city: "Owerri",
        state: "Imo",
        is_active: true,
        services: [
          { id: "s1", name: "Fade Haircut", price: 2000, pricing_type: "fixed", is_active: true },
          { id: "s2", name: "Beard Trim", price: 1000, pricing_type: "fixed", is_active: true }
        ]
      },
      {
        id: "p2",
        business_name: "Owerri Auto Mechanics",
        category: "mechanics",
        city: "Owerri",
        state: "Imo",
        is_active: true,
        services: [
          { id: "s3", name: "Car inspection", price: 0, pricing_type: "inspection_required", is_active: true },
          { id: "s4", name: "Engine Repair", price: 50000, pricing_type: "fixed", is_active: true },
          { id: "s5", name: "Unconfirmed Zero Service", price: 0, is_active: true }
        ]
      },
      {
        id: "p3",
        business_name: "Lagos Cut Barber",
        category: "barbers",
        city: "Lagos",
        state: "Lagos",
        is_active: true,
        services: [
          { id: "s6", name: "Haircut", price: 3000, pricing_type: "fixed", is_active: true }
        ]
      },
      {
        id: "p4",
        business_name: "Inactive Business",
        category: "barbers",
        city: "Owerri",
        state: "Imo",
        is_active: false,
        services: [
          { id: "s7", name: "Haircut", price: 1000, pricing_type: "fixed", is_active: true }
        ]
      }
    ];

    it('ranks exact business-name match above service-only matches', () => {
      const q = "Visex Salon";
      const { target } = parseQuery(q);
      
      const scored = mockProviders
        .filter(p => p.is_active)
        .map(p => {
          let score = 0;
          const pName = p.business_name.toLowerCase();
          if (pName === target.toLowerCase()) score = 1000;
          else if (p.services.some(s => s.name.toLowerCase().includes(target.toLowerCase()))) score = 400;
          return { p, score };
        })
        .sort((a, b) => b.score - a.score);

      expect(scored[0].p.business_name).toBe("Visex Salon");
      expect(scored[0].score).toBe(1000);
    });

    it('strictly filters by p.city when city is specified in query ("Haircut in Owerri")', () => {
      const q = "Haircut in Owerri";
      const { target, location } = parseQuery(q);

      const matches = mockProviders
        .filter(p => p.is_active)
        .filter(p => p.city.toLowerCase() === location.toLowerCase())
        .filter(p => p.services.some(s => isPluralOrSingularMatch(s.name, target) || s.name.toLowerCase().includes(target.toLowerCase())));

      expect(matches.length).toBe(1);
      expect(matches[0].business_name).toBe("Visex Salon");
      expect(matches[0].city).toBe("Owerri");
    });

    it('excludes unconfirmed zero-price services from numeric Price Range matching', () => {
      const minVal = 0;
      const maxVal = 5000;

      const matchesPriceRange = (svc: any) => {
        if (svc.pricing_type === 'inspection_required') return false;
        const pVal = svc.price;
        if (pVal == null || isNaN(pVal) || pVal <= 0) return false;
        return pVal >= minVal && pVal <= maxVal;
      };

      const unconfirmedZeroSvc = { price: 0 };
      const inspectionSvc = { price: 0, pricing_type: "inspection_required" };
      const validSvc = { price: 2000, pricing_type: "fixed" };

      expect(matchesPriceRange(unconfirmedZeroSvc)).toBe(false);
      expect(matchesPriceRange(inspectionSvc)).toBe(false);
      expect(matchesPriceRange(validSvc)).toBe(true);
    });

    it('detects conflict between typed location and selected state dropdown', () => {
      const typedLocation = "aba"; // Abia
      const selectedStateDropdown = "Imo";
      
      const isConflict = Boolean(
        typedLocation &&
        selectedStateDropdown &&
        !selectedStateDropdown.toLowerCase().includes(typedLocation) &&
        !typedLocation.includes(selectedStateDropdown.toLowerCase())
      );

      expect(isConflict).toBe(true);
    });
  });
});
