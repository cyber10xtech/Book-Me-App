import { describe, it, expect } from "vitest";
import {
  getStates,
  getLgasForState,
  normalizeStateName,
} from "../data/nigeriaLocations";

describe("Authoritative Nigerian Location Dataset", () => {
  it("contains all 36 States plus FCT (37 total entries)", () => {
    const states = getStates();
    expect(states.length).toBe(37);
    expect(states).toContain("Lagos");
    expect(states).toContain("Federal Capital Territory (FCT)");
    expect(states).toContain("Kano");
    expect(states).toContain("Rivers");
  });

  it("returns correct LGAs for Lagos State", () => {
    const lagosLgas = getLgasForState("Lagos");
    expect(lagosLgas.length).toBe(20);
    expect(lagosLgas).toContain("Ikeja");
    expect(lagosLgas).toContain("Eti-Osa");
  });

  it("returns 6 Area Councils for Federal Capital Territory (FCT)", () => {
    const fctLgas = getLgasForState("Federal Capital Territory (FCT)");
    expect(fctLgas.length).toBe(6);
    expect(fctLgas).toContain("Abuja Municipal Area Council (AMAC)");
    expect(fctLgas).toContain("Bwari");
  });

  it("supports aliases for FCT and case-insensitive lookups", () => {
    expect(getLgasForState("FCT")).toContain("Abuja Municipal Area Council (AMAC)");
    expect(getLgasForState("Abuja")).toContain("Bwari");
    expect(getLgasForState("lagos")).toContain("Ikeja");
  });

  it("normalizes state names correctly", () => {
    expect(normalizeStateName("abuja")).toBe("Federal Capital Territory (FCT)");
    expect(normalizeStateName("fct")).toBe("Federal Capital Territory (FCT)");
    expect(normalizeStateName("lagos")).toBe("Lagos");
  });

  it("returns empty array for invalid state", () => {
    expect(getLgasForState("InvalidState")).toEqual([]);
    expect(getLgasForState("")).toEqual([]);
  });
});
