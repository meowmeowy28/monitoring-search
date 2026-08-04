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
 * Turns coordinates into a rough place name. Tries BigDataCloud's free
 * client-side reverse-geocode API first (built specifically for browser
 * use, no key needed, reliable CORS support); falls back to OpenStreetMap's
 * Nominatim if that's unavailable. Best-effort only — if both fail, the
 * caller just leaves the Site field blank for the person to type in
 * themselves, which is exactly the fallback they'd want if GPS is off.
 */
export async function reverseGeocode(coords: Coords): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${coords.lat}&longitude=${coords.lon}&localityLanguage=en`
    );
    if (res.ok) {
      const data = await res.json();
      const name =
        data.locality || data.city || data.principalSubdivision || data.localityInfo?.administrative?.[0]?.name;
      if (name) return name;
    }
  } catch {
    // fall through to the backup provider below
  }

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
