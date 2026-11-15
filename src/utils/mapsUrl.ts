export interface Coordinates {
  lat: number;
  lng: number;
}

function isValidLatLng(lat: number, lng: number): boolean {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return false;
  if (lat === 0 && lng === 0) return false;
  return true;
}

/**
 * Extracts latitude/longitude coordinates from common Google Maps URLs
 * (e.g. `@lat,lng`, `?q=lat,lng`, `?ll=lat,lng`, `!3dlat!4dlng`) or direct `lat, lng` text.
 */
export function parseGoogleMapsUrl(rawInput: string): Coordinates | null {
  const input = rawInput.trim();
  if (!input) return null;

  // 1. Direct "lat, lng" coordinate input
  const plainMatch = /^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/.exec(input);
  if (plainMatch) {
    const lat = Number(plainMatch[1]);
    const lng = Number(plainMatch[2]);
    return isValidLatLng(lat, lng) ? { lat, lng } : null;
  }

  // 2. Embed / Place !3d<lat>!4d<lng> pattern
  const dataPinMatch = /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/.exec(input);
  if (dataPinMatch) {
    const lat = Number(dataPinMatch[1]);
    const lng = Number(dataPinMatch[2]);
    if (isValidLatLng(lat, lng)) return { lat, lng };
  }

  // 3. Path / viewport @lat,lng pattern (e.g. https://www.google.com/maps/place/.../@-6.2297,106.8573,17z)
  const atMatch = /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/.exec(input);
  if (atMatch) {
    const lat = Number(atMatch[1]);
    const lng = Number(atMatch[2]);
    if (isValidLatLng(lat, lng)) return { lat, lng };
  }

  // 4. Query parameter ?q=lat,lng, ?ll=lat,lng, ?query=lat,lng, ?center=lat,lng
  try {
    const parsedUrl = new URL(input);
    for (const key of ['q', 'query', 'll', 'center', 'destination']) {
      const val = parsedUrl.searchParams.get(key);
      if (!val) continue;
      const coordMatch = /(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/.exec(val.trim());
      if (coordMatch) {
        const lat = Number(coordMatch[1]);
        const lng = Number(coordMatch[2]);
        if (isValidLatLng(lat, lng)) return { lat, lng };
      }
    }
  } catch {
    // Not a full URL; ignore URL parsing error cleanly
  }

  return null;
}

/**
 * Generates a canonical clickable Google Maps URL for a pinned coordinate pair.
 */
export function buildGoogleMapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}`;
}

/**
 * Checks whether a string is a valid HTTP(S) Google Maps or web link suitable for external navigation.
 */
export function isValidMapsUrl(rawUrl: string): boolean {
  const trimmed = rawUrl.trim();
  if (!trimmed) return false;
  try {
    const url = new URL(trimmed);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}
