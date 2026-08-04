// This Worker does two jobs:
// 1. Serves the built frontend (the static files in ./dist) for normal page loads.
// 2. Handles requests to /api/backend by forwarding them to the Apps Script
//    backend *from the server*, then returning the result to the browser.
//
// Why this exists: calling the Apps Script /exec URL directly from the
// browser hits a CORS wall, because Apps Script's response goes through an
// internal redirect that's missing the CORS header fetch() requires. A
// server-to-server request (this Worker -> Apps Script) has no such
// restriction, and the browser only ever talks to its own origin, where
// CORS doesn't apply at all.

export interface Env {
  ASSETS: Fetcher;
}

// Same Apps Script Web App URL used before — kept in one place here since
// this is now the only thing that talks to it directly.
const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbxJntnxypKbId06p05ryjGW5-JXHS2x78K68SnBU7Xiy7VS5JDsNy9Z94pb6jjzzj-D/exec";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/backend") {
      return proxyToAppsScript(request, url);
    }

    // anything else (the app itself, its JS/CSS, etc.) — serve as normal
    return env.ASSETS.fetch(request);
  },
};

async function proxyToAppsScript(request: Request, url: URL): Promise<Response> {
  const target = new URL(APPS_SCRIPT_URL);
  // carry over query params like ?action=photos&folderId=...
  url.searchParams.forEach((value, key) => target.searchParams.set(key, value));

  try {
    const init: RequestInit = {
      method: request.method,
      headers: {
        // Google's endpoint can reject requests that don't look like they
        // came from an ordinary browser — these headers just make our
        // server-to-server request look like a normal page visit.
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "*/*",
      },
    };
    if (request.method === "POST") {
      // matches the plain-text POST body the frontend already sends
      init.body = await request.text();
      init.headers = { ...init.headers, "Content-Type": "text/plain;charset=UTF-8" };
    }

    const upstream = await fetch(target.toString(), init);
    const body = await upstream.text();

    return new Response(body, {
      status: upstream.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: "Could not reach the backend. Please try again." }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }
}
