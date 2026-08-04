import { rowToEntry, type RawSheetRow, type Entry } from "@/types";

// Requests go through this site's own Worker at /api/backend, which
// forwards them to Apps Script server-to-server. Apps Script Web Apps
// can't send Access-Control-Allow-Origin headers on their own responses,
// so calling them directly from the browser always gets blocked by CORS —
// routing through our own domain avoids that entirely (same-origin, no
// CORS check needed). See worker/index.ts for the proxy + the real
// Apps Script URL.
const API_BASE = "/api/backend";

const ENTRIES_CACHE_KEY = "monitoring-search:entries-cache";

// Reads whatever's cached from the last successful fetch, if any — used to
// show something on screen immediately while a fresh fetch happens in the
// background, instead of a blank loading state every single visit.
export function getCachedEntries(): (Entry & { id: string })[] | null {
  try {
    const raw = localStorage.getItem(ENTRIES_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function fetchWithRetry(url: string, init?: RequestInit, retries = 1): Promise<Response> {
  try {
    const res = await fetch(url, init);
    if (!res.ok) throw new Error(`Backend returned ${res.status}`);
    return res;
  } catch (err) {
    if (retries > 0) {
      await new Promise((r) => setTimeout(r, 800)); // brief pause, Apps Script cold starts are common
      return fetchWithRetry(url, init, retries - 1);
    }
    throw err;
  }
}

export async function fetchEntries(): Promise<(Entry & { id: string })[]> {
  const res = await fetchWithRetry(API_BASE);
  const rows: RawSheetRow[] = await res.json();
  const entries = rows.map(rowToEntry).filter((e) => e.brand);
  try {
    localStorage.setItem(ENTRIES_CACHE_KEY, JSON.stringify(entries));
  } catch {
    // storage full or unavailable — not critical, just skip caching
  }
  return entries;
}

export interface NewEntryPhoto {
  name: string;
  mimeType: string;
  base64Data: string;
}

export interface NewEntryInput {
  brand: string;
  site: string;
  panel?: string;
  direction?: string;
  date: string;
  department?: string;
  photos: NewEntryPhoto[];
}

async function postToBackend(body: Record<string, unknown>): Promise<{ ok: boolean; error?: string; folderUrl?: string }> {
  const res = await fetch(API_BASE, {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Backend returned ${res.status}`);
  return res.json();
}

export interface DrivePhoto {
  id: string;
  name: string;
  url: string;
}

export function extractFolderId(driveUrl: string): string | null {
  const match = driveUrl.match(/folders\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

// In-memory only (cleared on page refresh) — avoids refetching a folder's
// photos every time you reopen it within the same visit.
const photoCache = new Map<string, DrivePhoto[]>();

export async function fetchFolderPhotos(folderLink: string): Promise<DrivePhoto[]> {
  const folderId = extractFolderId(folderLink);
  if (!folderId) return [];

  const cached = photoCache.get(folderId);
  if (cached) return cached;

  const res = await fetchWithRetry(`${API_BASE}?action=photos&folderId=${folderId}`);
  const data = await res.json();
  const photos = Array.isArray(data) ? data : [];
  photoCache.set(folderId, photos);
  return photos;
}

export function verifyPassword(password: string) {
  return postToBackend({ action: "verify", password });
}

export function addEntry(password: string, entry: NewEntryInput) {
  return postToBackend({ action: "add", password, ...entry });
}

export function deleteEntry(password: string, folderLink: string) {
  return postToBackend({ action: "delete", password, folderLink });
}

// Converts a browser File into the base64 shape the backend expects.
export function fileToBase64(file: File): Promise<NewEntryPhoto> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64Data = result.split(",")[1] ?? "";
      resolve({ name: file.name, mimeType: file.type, base64Data });
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
