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
const COORDINATE_TEXT = /^\s*(?:lat\s*:\s*)?(-?\d+(?:\.\d+)?)\s*(?:,|\s+lng\s*:\s*)\s*(?:lng\s*:\s*)?(-?\d+(?:\.\d+)?)\s*$/i;

const clean = (value?: string | null) => value?.trim().replace(/\s+/g, " ") || "";
const uniqueParts = (parts: string[]) => [...new Set(parts.map(clean).filter(Boolean))].join(", ");

export const parseCoordinates = (value?: string | null): { latitude: number; longitude: number } | null => {
  const match = clean(value).match(COORDINATE_TEXT);
  if (!match) return null;
  const latitude = Number(match[1]);
  const longitude = Number(match[2]);
  return Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : null;
};

export const coordinateKey = (latitude: number, longitude: number) => `${latitude.toFixed(5)},${longitude.toFixed(5)}`;

export const getReadableLocation = (fields: LocationFields = {}): string => {
  const preferred = [fields.formatted_address, fields.location_name, fields.address]
    .map(clean).find(value => value && !parseCoordinates(value));
  if (preferred) return preferred;
  return uniqueParts([
    fields.neighbourhood || fields.neighborhood || fields.suburb || "",
    fields.city || "",
    fields.lga || "",
    fields.state || "",
  ]);
};

const reverseGeocode = async (latitude: number, longitude: number): Promise<string | null> => {
  const key = coordinateKey(latitude, longitude);
  const cached = cache.get(key) || sessionStorage.getItem(`bookme-location:${key}`);
  if (cached) { cache.set(key, cached); return cached; }
  if (pending.has(key)) return pending.get(key)!;
  const request = fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}`, {
    headers: { Accept: "application/json" },
  }).then(async response => {
    if (!response.ok) return null;
    const result = await response.json();
    const address = result.address || {};
    const readable = uniqueParts([
      address.neighbourhood || address.suburb || address.quarter || "",
      address.city || address.town || address.village || address.municipality || "",
      address.county || address.state_district || "",
      address.state || "",
    ]) || clean(result.display_name);
    if (readable) {
      cache.set(key, readable);
      try { sessionStorage.setItem(`bookme-location:${key}`, readable); } catch { /* storage is optional */ }
    }
    return readable || null;
  }).catch(() => null).finally(() => pending.delete(key));
  pending.set(key, request);
  return request;
};

export const resolveReadableLocation = async (fields: LocationFields = {}): Promise<string> => {
  const readable = getReadableLocation(fields);
  if (readable) return readable;
  const coordinates = fields.latitude != null && fields.longitude != null
    ? { latitude: Number(fields.latitude), longitude: Number(fields.longitude) }
    : parseCoordinates(fields.address);
  if (!coordinates || !Number.isFinite(coordinates.latitude) || !Number.isFinite(coordinates.longitude)) {
    return clean(fields.address) || "Location unavailable";
  }
  return (await reverseGeocode(coordinates.latitude, coordinates.longitude)) || `${coordinates.latitude.toFixed(4)}, ${coordinates.longitude.toFixed(4)}`;
};

export const useReadableLocation = (fields: LocationFields = {}) => {
  const [location, setLocation] = useState(() => getReadableLocation(fields) || "");
  useEffect(() => {
    let active = true;
    resolveReadableLocation(fields).then(value => { if (active) setLocation(value); });
    return () => { active = false; };
  }, [fields.address, fields.city, fields.state, fields.lga, fields.location_name, fields.formatted_address, fields.latitude, fields.longitude]);
  return location || "Location unavailable";
};

