export interface Coords {
  lat: number;
  lon: number;
}

/**
 * Asks the browser for the current GPS position. Resolves to null (rather
 * than throwing) if permission is denied, the device has no GPS, or it
 * times out — location is a convenience for pre-filling the form, never a
 * requirement for saving an entry.
 */
export function getCurrentLocation(): Promise<Coords | null> {
  return new Promise((resolve) => {
    if (!("geolocation" in navigator)) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
}

/**
 * Turns coordinates into a rough place name using OpenStreetMap's free
 * Nominatim service (no API key needed). Best-effort only — if it fails or
 * is unreachable, the caller just leaves the Site field blank for the
 * person to type in themselves, which is exactly the fallback they asked
 * for in case GPS gives a wrong reading.
 */
export async function reverseGeocode(coords: Coords): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${coords.lat}&lon=${coords.lon}&zoom=16`,
      { headers: { Accept: "application/json" } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const addr = data.address || {};
    return (
      addr.suburb ||
      addr.neighbourhood ||
      addr.village ||
      addr.town ||
      addr.city_district ||
      addr.city ||
      data.name ||
      null
    );
  } catch {
    return null;
  }
}
