// ArchDraw Intel — CORS / auth proxy
// Deployed as a Cloudflare Worker (free tier: 100K requests/day).
// Sits between the static GitHub Pages app and third-party data APIs,
// adding CORS headers, holding secret keys, and caching common queries.
//
// ═══ DEPLOYMENT ═══
// 1. npm install -g wrangler
// 2. wrangler login
// 3. cd workers/ && wrangler deploy proxy.js --name adi-proxy
// 4. Copy the resulting URL (e.g. https://adi-proxy.<your-subdomain>.workers.dev)
// 5. In the app, open DevTools console and run:
//      localStorage.setItem('ADI_PROXY','https://adi-proxy.<your-subdomain>.workers.dev');
//    Or edit index.html: set window.ADI_PROXY_DEFAULT to the same value.
// 6. Reload the app. FEMA / assessor / municode fetches now route through the proxy.
//
// ═══ ROUTES ═══
//   GET /fema?lat=&lon=          → FEMA NFHL flood zone
//   GET /arcgis?url=<encoded>    → any ArcGIS REST query (CORS-open upstream)
//   GET /municode?url=<encoded>  → municipal code text (municode/ecode360/codepublishing)
//   GET /permits/<city>?q=       → Socrata permit search (see PERMIT_ENDPOINTS)
//
// ═══ SECRETS ═══
// If you want to use paid data (ATTOM, Bridge MLS), set via `wrangler secret put KEY_NAME`:
//   ATTOM_API_KEY, BRIDGE_API_KEY, etc.
// The worker reads them from env.<KEY_NAME> and never exposes them to the client.

const ALLOWED_ORIGINS = [
  'https://antenehproduction.github.io',
  'http://localhost:8080', // local dev
  'http://127.0.0.1:8080',
]; // retained for documentation; v5 CORS policy is permissive (see below)

const PROXY_VERSION = '6'; // v6 — FEMA endpoint fallback chain (old /gis/nfhl path retired by FEMA)

// CORS policy: public data (FEMA, county GIS, Socrata permits) is non-sensitive.
// Reflect the requesting origin so the proxy works from any deployment target
// (github.io, vercel.app, custom domains, localhost). When we add paid-API
// secrets in the future, tighten this to an allowlist again.
const CORS_HEADERS = (origin) => ({
  'Access-Control-Allow-Origin': origin || '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
  'X-Adi-Proxy-Version': PROXY_VERSION,
});

const PERMIT_ENDPOINTS = {
  seattle:  'https://data.seattle.gov/resource/76t5-zqzr.json',       // Building permits
  sf:       'https://data.sfgov.org/resource/i98e-djp9.json',          // Building permits
  nyc:      'https://data.cityofnewyork.us/resource/ipu4-2q9a.json',   // DOB Job Application
  boston:   'https://data.boston.gov/api/3/action/datastore_search?resource_id=6ddcd912-32a0-43df-9908-63574f8c7e77',
  austin:   'https://data.austintexas.gov/resource/3syk-w9eu.json',    // Issued construction permits
  chicago:  'https://data.cityofchicago.org/resource/ydr8-5enu.json',  // Building permits
  la:       'https://data.lacity.org/resource/yv23-pmwf.json',         // Building and Safety permits
};

function corsResponse(body, origin, status = 200, extraHeaders = {}) {
  return new Response(typeof body === 'string' ? body : JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS(origin), 'Content-Type': 'application/json', ...extraHeaders },
  });
}

// Passes upstream response through as JSON only if it actually IS JSON.
// If upstream returned HTML or an error status, wrap it in a structured JSON error
// so the client can JSON.parse() without choking on "<html>..." bodies.
async function jsonPassthrough(resp, origin, label) {
  const contentType = resp.headers.get('content-type') || '';
  const text = await resp.text();
  const looksJson = contentType.includes('json') || /^\s*[\{\[]/.test(text);
  if (!resp.ok || !looksJson) {
    const bodyPreview = text.substring(0, 200).replace(/\s+/g, ' ').trim();
    return corsResponse({
      error: 'upstream_non_json',
      label,
      upstreamStatus: resp.status,
      upstreamContentType: contentType,
      preview: bodyPreview,
      hint: 'Upstream returned HTML/error. Worker did not cache; the next request will retry upstream cleanly.',
    }, origin, 502, ERR_CACHE);
  }
  return new Response(text, {
    status: 200,
    headers: { ...CORS_HEADERS(origin), 'Content-Type': 'application/json', ...OK_CACHE },
  });
}

// Edge cache strategy:
//   We do NOT use cf.cacheTtl* hints on outbound fetches anymore. The previous
//   implementation cached upstream responses regardless of body validity, so
//   when FEMA returned HTML with HTTP 200 (a soft failure or maintenance page),
//   the edge pinned that HTML for hours. Subsequent worker deploys had no
//   effect because cache returned before the worker ran.
//
//   New approach: every outbound fetch is fresh. Validation runs on every
//   request. The worker's RESPONSE to the client carries an explicit
//   Cache-Control header: max-age=300 only on validated success; no-store on
//   error. So Cloudflare's reverse-proxy cache stores only good responses.
const PROXY_HEADERS = { 'User-Agent': 'ArchDrawIntel-Proxy/1.0', 'Accept': 'application/json' };
const OK_CACHE = { 'Cache-Control': 'public, max-age=300, s-maxage=300' };
const ERR_CACHE = { 'Cache-Control': 'no-store' };

// FEMA NFHL endpoint candidates — tried in order until one returns valid JSON.
// FEMA has restructured GIS paths multiple times. Add new paths at the top when
// discovered.
const FEMA_ENDPOINTS = [
  'https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/28/query',
  'https://hazards.fema.gov/arcgis/rest/services/FEMA/NFHL/MapServer/28/query',
  'https://msc.fema.gov/arcgis/rest/services/NFHL/MapServer/28/query',
  'https://hazards.fema.gov/gis/nfhl/rest/services/public/NFHL/MapServer/28/query', // legacy (404 as of 2026)
];

async function handleFema(params, origin) {
  const lat = params.get('lat'), lon = params.get('lon');
  if (!lat || !lon) return corsResponse({ error: 'lat + lon required' }, origin, 400);
  const qs = `?geometry=${lon},${lat}&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects&outFields=FLD_ZONE,SFHA_TF&returnGeometry=false&f=json`;
  const failures = [];
  for (const base of FEMA_ENDPOINTS) {
    try {
      const resp = await fetch(`${base}${qs}`, { headers: PROXY_HEADERS });
      const ct = resp.headers.get('content-type') || '';
      const text = await resp.text();
      const looksJson = ct.includes('json') || /^\s*[\{\[]/.test(text);
      if (resp.ok && looksJson) {
        let parsed = null;
        try { parsed = JSON.parse(text); } catch (_) {}
        if (parsed && (parsed.features !== undefined || parsed.error === undefined)) {
          return new Response(text, {
            status: 200,
            headers: { ...CORS_HEADERS(origin), 'Content-Type': 'application/json', ...OK_CACHE },
          });
        }
      }
      failures.push({ base, status: resp.status, contentType: ct, preview: text.substring(0, 120) });
    } catch (e) {
      failures.push({ base, error: e.message });
    }
  }
  return corsResponse({
    error: 'fema_all_endpoints_failed',
    label: 'fema',
    tried: failures,
    hint: 'All known FEMA NFHL REST endpoints returned errors. FEMA may have moved their service again — check https://msc.fema.gov/portal/search manually and add the new URL to FEMA_ENDPOINTS in proxy source.',
  }, origin, 502, ERR_CACHE);
}

async function handleArcgis(params, origin) {
  const url = params.get('url');
  if (!url) return corsResponse({ error: 'url required' }, origin, 400);
  if (!/arcgis|services\.arcgisonline|gismaps|portlandmaps|hazards\.fema|dpw\.gis\.lacounty|sfplanninggis|acgov|hazards\.usgs|coast\.noaa|apps\.fs\.usda|fortress\.wa\.gov|gis\.dnr\.wa\.gov|gis\.conservation\.ca\.gov|services1\.arcgis|services6\.arcgis|fdot|saccounty|kingcounty|mcassessor|clarkcountynv|colorado\.gov|jeffco|miamidade|hillsborough|ocpafl|fultoncountyga|cobbcountyga|dekalbcountyga|wakegov|charlottenc|fairfaxcounty|franklincountyohio|cuyahogacounty|pasda\.psu|alleghenycounty|hennepin|webgis\.sccgov|gis-public\.sandiegocounty|countyofriverside|mapservices\.gis\.saccounty|gisportal\.jeffco|maps\.hillsboroughcounty|vgispublic\.ocpafl|gismaps\.fultoncountyga|geo-cobbcountyga|dcgis\.dekalbcountyga|maps\.wakegov|gis\.charlottenc|fairfaxcounty|gis\.franklincountyohio|gis\.cuyahogacounty|gisdata\.alleghenycounty|gis\.hennepin|www\.ocgis|clvgis|denvergov\.org|mapdata\.lasvegasnevada|sandiegocounty/i.test(url))
    return corsResponse({ error: 'url must be an ArcGIS REST endpoint' }, origin, 400);
  const resp = await fetch(url, { headers: PROXY_HEADERS });
  return jsonPassthrough(resp, origin, 'arcgis');
}

async function handleMunicode(params, origin) {
  const url = params.get('url');
  if (!url) return corsResponse({ error: 'url required' }, origin, 400);
  if (!/municode|ecode360|codepublishing|legistar|amlegal/i.test(url))
    return corsResponse({ error: 'url must be a recognized municipal-code domain' }, origin, 400);
  const resp = await fetch(url);
  if (!resp.ok) return corsResponse({ error: 'upstream_failed', upstreamStatus: resp.status }, origin, 502, ERR_CACHE);
  const text = await resp.text();
  return new Response(text, {
    status: 200,
    headers: { ...CORS_HEADERS(origin), 'Content-Type': 'text/plain; charset=utf-8', ...OK_CACHE },
  });
}

async function handlePermits(path, params, origin) {
  const city = path.split('/')[2];
  const endpoint = PERMIT_ENDPOINTS[city];
  if (!endpoint) return corsResponse({ error: `unknown city '${city}'. Supported: ${Object.keys(PERMIT_ENDPOINTS).join(', ')}` }, origin, 400);
  const q = params.toString();
  const url = `${endpoint}${endpoint.includes('?') ? '&' : '?'}${q}`;
  const resp = await fetch(url, { headers: PROXY_HEADERS });
  return jsonPassthrough(resp, origin, `permits:${city}`);
}

// Diagnostic — bypasses everything, fetches upstream raw, returns full info
async function handleDiag(params, origin) {
  const url = params.get('url');
  if (!url) return corsResponse({ error: 'pass ?url=... to diagnose any endpoint' }, origin, 400);
  try {
    const t0 = Date.now();
    const resp = await fetch(url, { headers: PROXY_HEADERS });
    const text = await resp.text();
    return corsResponse({
      url,
      upstreamStatus: resp.status,
      upstreamContentType: resp.headers.get('content-type') || '(none)',
      bodyLength: text.length,
      bodyPreview: text.substring(0, 500),
      elapsedMs: Date.now() - t0,
      proxyVersion: PROXY_VERSION,
    }, origin, 200, ERR_CACHE);
  } catch (e) {
    return corsResponse({ error: e.message, url, proxyVersion: PROXY_VERSION }, origin, 500, ERR_CACHE);
  }
}

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get('Origin') || '';
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS(origin) });
    }
    const u = new URL(request.url);
    const path = u.pathname;
    try {
      if (path === '/fema') return await handleFema(u.searchParams, origin);
      if (path === '/arcgis') return await handleArcgis(u.searchParams, origin);
      if (path === '/municode') return await handleMunicode(u.searchParams, origin);
      if (path.startsWith('/permits/')) return await handlePermits(path, u.searchParams, origin);
      if (path === '/diag') return await handleDiag(u.searchParams, origin);
      if (path === '/' || path === '/health') {
        return corsResponse({
          ok: true,
          version: PROXY_VERSION,
          routes: ['/fema', '/arcgis', '/municode', '/permits/:city', '/diag?url='],
          permitCities: Object.keys(PERMIT_ENDPOINTS),
        }, origin);
      }
      return corsResponse({ error: 'not found' }, origin, 404);
    } catch (e) {
      return corsResponse({ error: e.message }, origin, 500);
    }
  },
};
