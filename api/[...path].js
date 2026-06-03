// ArchDraw Intel — CORS / auth proxy (Vercel Edge Function)
// Catch-all route at api/[...path].js — handles every /api/* path with one function.
// Runtime: 'edge' uses V8 isolates (similar to Cloudflare Workers), no cold start.
//
// ═══ DEPLOYMENT ═══
// Option A — Git deploy (recommended, no CLI):
//   1. https://vercel.com/new → "Import Git Repository" → select Premit-Ready
//   2. Framework: "Other" · Root: leave default · Build: leave empty
//   3. Click Deploy
//   4. Copy the deployment URL (e.g. https://premit-ready.vercel.app)
//
// Option B — CLI:
//   1. npm i -g vercel
//   2. cd Premit-Ready/ && vercel deploy --prod
//
// ═══ WIRE INTO THE APP ═══
// Open DevTools console on the live app:
//   localStorage.setItem('ADI_PROXY', 'https://<your-deployment>.vercel.app/api');
//   location.reload();
// Note the trailing /api — Vercel routes serverless functions under /api by default.
//
// ═══ ROUTES ═══
//   GET /api/health        → version + route list
//   GET /api/fema?lat=&lon= → FEMA NFHL flood zone
//   GET /api/arcgis?url=    → any ArcGIS REST query (whitelisted)
//   GET /api/municode?url=  → municipal code text
//   GET /api/permits/<city>?... → Socrata permit search
// (/api/ai/* is served by api/ai/[...path].js. /api/diag removed in P1-B.)

const PROXY_VERSION = '9-vercel'; // v9 — P1-B/C: anchored SSRF allowlist, origin-locked CORS, /diag removed, AI dedup

// P1-B: CORS restricted to the app's own origins (github.io + the app's
// *.vercel.app deployments + localhost). A disallowed origin gets the canonical
// origin back, which the browser rejects on ACAO mismatch.
const ALLOWED_ORIGINS = [
  'https://antenehproduction.github.io',
  'http://localhost:8080',
  'http://127.0.0.1:8080',
];
function allowOrigin(origin) {
  if (!origin) return ALLOWED_ORIGINS[0];
  if (ALLOWED_ORIGINS.includes(origin)) return origin;
  try { if (new URL(origin).hostname.endsWith('.vercel.app')) return origin; } catch (_) {}
  return ALLOWED_ORIGINS[0];
}
// P1-B: anchored upstream validation (replaces bypassable substring matching).
// https-only, no IP-literal/internal hosts (kills metadata/SSRF), hostname must
// match an allowlisted suffix. '.gov' covers FEMA/USGS/NOAA/USDA + most counties.
function validUpstream(rawUrl, suffixes) {
  let u; try { u = new URL(rawUrl); } catch (_) { return false; }
  if (u.protocol !== 'https:') return false;
  const h = u.hostname.toLowerCase();
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h) || h.includes(':')) return false; // no IPv4/IPv6 literals
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.internal') || h.endsWith('.local')) return false;
  return suffixes.some(s => h === s || h.endsWith('.' + s));
}
const ARCGIS_SUFFIXES = ['gov','arcgis.com','arcgisonline.com','portlandmaps.com','sfgov.org','acgov.org','wakegov.com','denvergov.org','hillsboroughcounty.org','ocpafl.org','cobbcounty.org','sccgov.org','cuyahogacounty.us','alleghenycounty.us','hennepin.us','countyofriverside.us','jeffco.us','psu.edu'];
const MUNICODE_SUFFIXES = ['municode.com','ecode360.com','codepublishing.com','legistar.com','amlegal.com'];

const PERMIT_ENDPOINTS = {
  seattle:  'https://data.seattle.gov/resource/76t5-zqzr.json',
  sf:       'https://data.sfgov.org/resource/i98e-djp9.json',
  nyc:      'https://data.cityofnewyork.us/resource/ipu4-2q9a.json',
  boston:   'https://data.boston.gov/api/3/action/datastore_search?resource_id=6ddcd912-32a0-43df-9908-63574f8c7e77',
  austin:   'https://data.austintexas.gov/resource/3syk-w9eu.json',
  chicago:  'https://data.cityofchicago.org/resource/ydr8-5enu.json',
  la:       'https://data.lacity.org/resource/yv23-pmwf.json',
};

const PROXY_HEADERS = { 'User-Agent': 'ArchDrawIntel-Proxy/1.0', 'Accept': 'application/json' };

const corsHeaders = (origin) => ({
  'Access-Control-Allow-Origin': allowOrigin(origin),
  'Vary': 'Origin',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
  'X-Adi-Proxy-Version': PROXY_VERSION,
});

function jsonResponse(body, origin, status = 200, cacheControl = 'no-store') {
  return new Response(typeof body === 'string' ? body : JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json', 'Cache-Control': cacheControl },
  });
}

async function jsonPassthrough(resp, origin, label) {
  const contentType = resp.headers.get('content-type') || '';
  const text = await resp.text();
  const looksJson = contentType.includes('json') || /^\s*[\{\[]/.test(text);
  if (!resp.ok || !looksJson) {
    return jsonResponse({
      error: 'upstream_non_json',
      label,
      upstreamStatus: resp.status,
      upstreamContentType: contentType,
      preview: text.substring(0, 200).replace(/\s+/g, ' ').trim(),
      hint: 'Upstream returned HTML/error. Not cached; the next request will retry upstream cleanly.',
    }, origin, 502, 'no-store');
  }
  return new Response(text, {
    status: 200,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300, s-maxage=300' },
  });
}

// FEMA NFHL endpoint candidates. The agency has restructured GIS paths several
// times; we try each in order and use whichever returns valid JSON. New paths
// can be added at the TOP of this array when discovered.
const FEMA_ENDPOINTS = [
  // 2024+ layout (most likely current)
  'https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/28/query',
  'https://hazards.fema.gov/arcgis/rest/services/FEMA/NFHL/MapServer/28/query',
  // Historical ArcGIS Server REST path
  'https://msc.fema.gov/arcgis/rest/services/NFHL/MapServer/28/query',
  // Legacy (now returns 404 — kept last so it still works if FEMA restores it)
  'https://hazards.fema.gov/gis/nfhl/rest/services/public/NFHL/MapServer/28/query',
];

async function handleFema(params, origin) {
  const lat = params.get('lat'), lon = params.get('lon');
  if (!lat || !lon) return jsonResponse({ error: 'lat + lon required' }, origin, 400);
  const qs = `?geometry=${lon},${lat}&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects&outFields=FLD_ZONE,SFHA_TF&returnGeometry=false&f=json`;
  const failures = [];
  for (const base of FEMA_ENDPOINTS) {
    try {
      const resp = await fetch(`${base}${qs}`, { headers: PROXY_HEADERS });
      const ct = resp.headers.get('content-type') || '';
      const text = await resp.text();
      const looksJson = ct.includes('json') || /^\s*[\{\[]/.test(text);
      // Accept: 2xx with valid JSON body that has a features array (even if empty)
      if (resp.ok && looksJson) {
        let parsed;
        try { parsed = JSON.parse(text); } catch (_) { parsed = null; }
        if (parsed && (parsed.features !== undefined || parsed.error === undefined)) {
          return new Response(text, {
            status: 200,
            headers: { ...corsHeaders(origin), 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300, s-maxage=300' },
          });
        }
      }
      failures.push({ base, status: resp.status, contentType: ct, preview: text.substring(0, 120) });
    } catch (e) {
      failures.push({ base, error: e.message });
    }
  }
  // All candidates failed
  return jsonResponse({
    error: 'fema_all_endpoints_failed',
    label: 'fema',
    tried: failures,
    hint: 'All known FEMA NFHL REST endpoints returned errors. FEMA may have moved their service again — check https://msc.fema.gov/portal/search manually and add the new URL to FEMA_ENDPOINTS in proxy source.',
  }, origin, 502, 'no-store');
}

// Some ArcGIS endpoints (USGS hazards, USDA wildland, several county GIS
// servers fronted by Cloudflare) bot-block the default ArchDrawIntel-Proxy
// User-Agent. They return 403 / refuse the TLS handshake / hang. Sending
// a real-browser UA bypasses the heuristic. Accept-Language nudges some
// CDNs to serve content rather than a captcha page.
const ARCGIS_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain;q=0.9, */*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

async function handleArcgis(params, origin) {
  const url = params.get('url');
  if (!url) return jsonResponse({ error: 'url required' }, origin, 400);
  if (!validUpstream(url, ARCGIS_SUFFIXES))
    return jsonResponse({ error: 'url must be an https ArcGIS/GIS host on the allowlist' }, origin, 400);
  // Wrap fetch + passthrough so any error surfaces in the response body
  // instead of reaching the outer handler() catch-all (which swallows
  // upstream context). The pre-PR version was returning a generic 500
  // for both DNS failures and 403 bot-block walls — both look the same
  // to the client.
  try {
    const resp = await fetch(url, { headers: ARCGIS_HEADERS });
    return jsonPassthrough(resp, origin, 'arcgis');
  } catch (e) {
    // Edge runtime fetch throws on DNS failures, TLS errors, refused
    // connections. Surface the message + URL host so we can tell why.
    let host = '(unparseable)';
    try { host = new URL(url).host; } catch (_) {}
    return jsonResponse({
      error: 'arcgis_fetch_threw',
      message: String(e?.message || e).substring(0, 240),
      host,
      hint: 'Edge runtime could not establish the upstream request. Common causes: DNS resolution failure, TLS handshake rejected, IP-blocked by the upstream (some county GIS + USGS endpoints bot-block Vercel egress).',
    }, origin, 502);
  }
}

async function handleOverpass(params, origin) {
  const data = params.get('data');
  if (!data) return jsonResponse({ error: 'data required (Overpass QL query)' }, origin, 400);
  // Conservative size cap — defends against accidental loops in caller.
  if (data.length > 5000) return jsonResponse({ error: 'data too large (>5000 chars)' }, origin, 400);
  try {
    const upstream = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: {
        'User-Agent': ARCGIS_HEADERS['User-Agent'],
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'data=' + encodeURIComponent(data),
    });
    return jsonPassthrough(upstream, origin, 'overpass');
  } catch (e) {
    return jsonResponse({
      error: 'overpass_fetch_threw',
      message: String(e?.message || e).substring(0, 240),
    }, origin, 502);
  }
}

async function handleMunicode(params, origin) {
  const url = params.get('url');
  if (!url) return jsonResponse({ error: 'url required' }, origin, 400);
  if (!validUpstream(url, MUNICODE_SUFFIXES))
    return jsonResponse({ error: 'url must be an https municipal-code host on the allowlist' }, origin, 400);
  const resp = await fetch(url, { headers: PROXY_HEADERS });
  if (!resp.ok) return jsonResponse({ error: 'upstream_failed', upstreamStatus: resp.status }, origin, 502);
  const text = await resp.text();
  return new Response(text, {
    status: 200,
    headers: { ...corsHeaders(origin), 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=86400' },
  });
}

async function handlePermits(city, params, origin) {
  const endpoint = PERMIT_ENDPOINTS[city];
  if (!endpoint) return jsonResponse({ error: `unknown city '${city}'. Supported: ${Object.keys(PERMIT_ENDPOINTS).join(', ')}` }, origin, 400);
  const q = params.toString();
  const url = `${endpoint}${endpoint.includes('?') ? '&' : '?'}${q}`;
  const resp = await fetch(url, { headers: PROXY_HEADERS });
  return jsonPassthrough(resp, origin, `permits:${city}`);
}

// ═══ Hosted-AI proxy ═══════════════════════════════════
// The hosted-AI endpoints (/api/ai/messages, /api/ai/whoami) live in
// api/ai/[...path].js — the streaming implementation that takes Vercel
// routing priority for /api/ai/*. The non-streaming duplicate that used to
// live here was removed in P1-C (single source of truth). The /diag open
// fetch proxy was removed in P1-B (unauthenticated SSRF surface).

export const config = { runtime: 'edge' };

export default async function handler(request) {
  const origin = request.headers.get('Origin') || '';
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }
  const u = new URL(request.url);
  // path is the catch-all segment array, joined back into a string
  // Vercel passes the rest of the URL after /api/ as the dynamic segment
  // Strip /api/ prefix so we can route on the remaining path
  const subPath = u.pathname.replace(/^\/api\/?/, '').replace(/\/$/, '');
  const segments = subPath.split('/').filter(Boolean);
  const route = segments[0] || 'health';
  try {
    if (route === 'health' || route === '') {
      return jsonResponse({
        ok: true,
        version: PROXY_VERSION,
        platform: 'vercel-edge',
        routes: ['/api/fema?lat=&lon=', '/api/arcgis?url=', '/api/overpass?data=', '/api/municode?url=', '/api/permits/:city', '/api/ai/messages', '/api/ai/whoami'],
        permitCities: Object.keys(PERMIT_ENDPOINTS),
        aiHosted: !!process.env.ANTHROPIC_KEY && !!process.env.SUPABASE_URL,
      }, origin);
    }
    if (route === 'fema') return await handleFema(u.searchParams, origin);
    if (route === 'arcgis') return await handleArcgis(u.searchParams, origin);
    if (route === 'overpass') return await handleOverpass(u.searchParams, origin);
    if (route === 'municode') return await handleMunicode(u.searchParams, origin);
    if (route === 'permits' && segments[1]) return await handlePermits(segments[1], u.searchParams, origin);
    // /api/ai/* is served by api/ai/[...path].js (P1-C: single source of truth).
    // /diag was removed (P1-B: it was an unauthenticated open-fetch SSRF surface).
    if (route === 'ai') return jsonResponse({ error: 'route_moved', detail: 'served by api/ai/[...path].js' }, origin, 404);
    return jsonResponse({ error: 'not found', tried: subPath }, origin, 404);
  } catch (e) {
    return jsonResponse({ error: e.message, route }, origin, 500);
  }
}
