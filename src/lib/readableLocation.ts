import { useEffect, useState } from "react";

export interface LocationFields {
  address?: string | null;
  neighbourhood?: string | null;
  neighborhood?: string | null;
  suburb?: string | null;
  city?: string | null;
  lga?: string | null;
  state?: string | null;
  location_name?: string | null;
  formatted_address?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
}

const cache = new Map<string, string>();
const pending = new Map<string, Promise<string | null>>();

// Matches raw coordinate strings (e.g., "5.48, 7.03", "Latitude: 5.48 Longitude: 7.03", "lat: 5.48, lng: 7.03")
const COORDINATE_TEXT = /^\s*(?:lat(?:itude)?\s*:\s*)?(-?\d+(?:\.\d+)?)\s*(?:,|\s+lng(?:itude)?\s*:\s*|\s+)\s*(?:lng(?:itude)?\s*:\s*)?(-?\d+(?:\.\d+)?)\s*$/i;

const clean = (value?: string | null) => value?.trim().replace(/\s+/g, " ") || "";
const uniqueParts = (parts: string[]) => [...new Set(parts.map(clean).filter(Boolean))].join(", ");

/**
 * Parses raw coordinate string if present, returning { latitude, longitude } or null.
 */
export const parseCoordinates = (value?: string | null): { latitude: number; longitude: number } | null => {
  const text = clean(value);
  if (!text) return null;
  const match = text.match(COORDINATE_TEXT);
  if (!match) return null;
  const latitude = Number(match[1]);
  const longitude = Number(match[2]);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180) {
    return { latitude, longitude };
  }
  return null;
};

export const coordinateKey = (latitude: number, longitude: number) => `${latitude.toFixed(5)},${longitude.toFixed(5)}`;

/**
 * Returns existing saved readable address or City/State combination.
 * Guaranteed never to return a raw coordinate string.
 */
export const getReadableLocation = (fields: LocationFields = {}): string => {
  const preferred = [fields.formatted_address, fields.location_name, fields.address]
    .map(clean)
    .find(val => val && !parseCoordinates(val));

  if (preferred) return preferred;

  const suburb = fields.neighbourhood || fields.neighborhood || fields.suburb || "";
  const city = fields.city || "";
  const lga = fields.lga || "";
  let state = fields.state || "";
  if (state && !/ state$/i.test(state)) {
    state = `${state} State`;
  }

  return uniqueParts([suburb, city, lga, state]);
};

/**
 * Reverse geocodes coordinates using OpenStreetMap Nominatim with memory & session caching.
 */
const reverseGeocode = async (latitude: number, longitude: number): Promise<string | null> => {
  const key = coordinateKey(latitude, longitude);
  const cached = cache.get(key) || sessionStorage.getItem(`bookme-location:${key}`);
  if (cached) {
    cache.set(key, cached);
    return cached;
  }
  if (pending.has(key)) return pending.get(key)!;

  const request = fetch(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}`,
    { headers: { Accept: "application/json" } }
  )
    .then(async (response) => {
      if (!response.ok) return null;
      const result = await response.json();
      const addr = result.address || {};

      let state = addr.state || "";
      if (state && !/ state$/i.test(state)) {
        state = `${state} State`;
      }
      const city = addr.city || addr.town || addr.village || addr.municipality || addr.county || addr.state_district || "";
      const suburb = addr.neighbourhood || addr.suburb || addr.quarter || addr.residential || "";

      const readable = uniqueParts([suburb, city, state]) || clean(result.display_name);
      if (readable && !parseCoordinates(readable)) {
        cache.set(key, readable);
        try {
          sessionStorage.setItem(`bookme-location:${key}`, readable);
        } catch {
          /* optional session cache fallback */
        }
        return readable;
      }
      return null;
    })
    .catch(() => null)
    .finally(() => pending.delete(key));

  pending.set(key, request);
  return request;
};

/**
 * Asynchronously resolves location in order of display priority:
 * 1. Saved readable address
 * 2. City + State
 * 3. Reverse geocoded location
 * 4. "Location unavailable" (never outputs raw coordinates)
 */
export const resolveReadableLocation = async (fields: LocationFields = {}): Promise<string> => {
  const readable = getReadableLocation(fields);
  if (readable) return readable;

  const coordinates =
    fields.latitude != null && fields.longitude != null
      ? { latitude: Number(fields.latitude), longitude: Number(fields.longitude) }
      : parseCoordinates(fields.address);

  if (!coordinates || !Number.isFinite(coordinates.latitude) || !Number.isFinite(coordinates.longitude)) {
    const rawAddress = clean(fields.address);
    if (rawAddress && !parseCoordinates(rawAddress)) return rawAddress;
    return "Location unavailable";
  }

  const geocoded = await reverseGeocode(coordinates.latitude, coordinates.longitude);
  if (geocoded) return geocoded;

  return "Location unavailable";
};

/**
 * React Hook for rendering human-readable locations in UI components.
 */
export const useReadableLocation = (fields: LocationFields = {}): string => {
  const [location, setLocation] = useState(() => getReadableLocation(fields) || "");

  useEffect(() => {
    let active = true;
    resolveReadableLocation(fields).then((value) => {
      if (active) setLocation(value);
    });
    return () => {
      active = false;
    };
  }, [
    fields.address,
    fields.city,
    fields.state,
    fields.lga,
    fields.location_name,
    fields.formatted_address,
    fields.latitude,
    fields.longitude,
  ]);

  return location || "Location unavailable";
};
