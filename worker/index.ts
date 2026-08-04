// Same Apps Script Web App URL as before — the only place it needs to live
// now, since the frontend calls this Worker instead of Apps Script directly.
const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbxJntnxypKbId06p05ryjGW5-JXHS2x78K68SnBU7Xiy7VS5JDsNy9Z94pb6jjzzj-D/exec";

export interface Env {
  // Serves the static site (dist/) — bound via the "assets" block in
  // wrangler.jsonc so this Worker can still fall through to it.
  ASSETS: Fetcher;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/backend") {
      return proxyToAppsScript(request, url);
    }

    // Anything else (the site itself, JS/CSS bundles, etc.) is served as
    // static assets exactly as before.
    return env.ASSETS.fetch(request);
  },
};

// Forwards the request to Apps Script from the Worker itself — a
// server-to-server fetch, which is never subject to a browser's CORS
// policy — then returns the result to the browser as same-origin JSON.
// Apps Script's own response never needs to (and can't) carry CORS
// headers; this Worker adds them instead.
async function proxyToAppsScript(request: Request, url: URL): Promise<Response> {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders() });
  }

  const target = new URL(APPS_SCRIPT_URL);
  url.searchParams.forEach((value, key) => target.searchParams.set(key, value));

  const init: RequestInit = { method: request.method };
  if (request.method === "POST") {
    // text/plain avoids the browser->Worker leg needing a preflight too,
    // and Apps Script's doPost reads e.postData.contents regardless of
    // the declared content type.
    init.headers = { "Content-Type": "text/plain;charset=utf-8" };
    init.body = await request.text();
  }

  try {
    const res = await fetch(target.toString(), init);
    const body = await res.text();
    return new Response(body, {
      status: res.status,
      headers: { "Content-Type": "application/json", ...corsHeaders() },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: "Could not reach the backend." }),
      { status: 502, headers: { "Content-Type": "application/json", ...corsHeaders() } }
    );
  }
}

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}
