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
//   GET /api/diag?url=      → upstream debugging passthrough

const PROXY_VERSION = '7-vercel'; // v7 — P0-1 hosted-AI routes (/api/ai/messages) with Supabase JWT + per-user quota

// v5: permissive CORS for public data. Reflect the requesting origin so the
// proxy works from any deployment target (github.io, vercel.app, custom
// domains, localhost). Tighten again when we add paid-API secrets.
const ALLOWED_ORIGINS = null; // unused; kept for doc

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
  'Access-Control-Allow-Origin': origin || '*',
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

async function handleArcgis(params, origin) {
  const url = params.get('url');
  if (!url) return jsonResponse({ error: 'url required' }, origin, 400);
  if (!/arcgis|services\.arcgisonline|gismaps|portlandmaps|hazards\.fema|dpw\.gis\.lacounty|sfplanninggis|acgov|hazards\.usgs|coast\.noaa|apps\.fs\.usda|fortress\.wa\.gov|gis\.dnr\.wa\.gov|gis\.conservation\.ca\.gov|services1\.arcgis|services6\.arcgis|fdot|saccounty|kingcounty|mcassessor|clarkcountynv|colorado\.gov|jeffco|miamidade|hillsborough|ocpafl|fultoncountyga|cobbcountyga|dekalbcountyga|wakegov|charlottenc|fairfaxcounty|franklincountyohio|cuyahogacounty|pasda\.psu|alleghenycounty|hennepin|webgis\.sccgov|gis-public\.sandiegocounty|countyofriverside|mapservices\.gis\.saccounty|gisportal\.jeffco|maps\.hillsboroughcounty|vgispublic\.ocpafl|gismaps\.fultoncountyga|geo-cobbcountyga|dcgis\.dekalbcountyga|maps\.wakegov|gis\.charlottenc|fairfaxcounty|gis\.franklincountyohio|gis\.cuyahogacounty|gisdata\.alleghenycounty|gis\.hennepin|www\.ocgis|clvgis|denvergov\.org|mapdata\.lasvegasnevada|sandiegocounty/i.test(url))
    return jsonResponse({ error: 'url must be an ArcGIS REST endpoint' }, origin, 400);
  const resp = await fetch(url, { headers: PROXY_HEADERS });
  return jsonPassthrough(resp, origin, 'arcgis');
}

async function handleMunicode(params, origin) {
  const url = params.get('url');
  if (!url) return jsonResponse({ error: 'url required' }, origin, 400);
  if (!/municode|ecode360|codepublishing|legistar|amlegal/i.test(url))
    return jsonResponse({ error: 'url must be a recognized municipal-code domain' }, origin, 400);
  const resp = await fetch(url);
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

// ═══ P0-1 — Hosted-AI proxy ═══════════════════════════════
// /api/ai/messages — POST { model, max_tokens, messages, system? }
// Validates Supabase JWT, enforces per-plan quota, proxies to Anthropic
// using the server-side ANTHROPIC_KEY env var, and logs a usage_events row.
//
// Required env vars (Vercel project settings):
//   ANTHROPIC_KEY                  — sk-ant-... server-side
//   SUPABASE_URL                   — https://<ref>.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY      — eyJ... (NEVER ship to client)
//
// 401 — no/invalid JWT
// 402 — quota exceeded (UI should show paywall)
// 429 — Anthropic rate limit propagated upstream
// 502 — Anthropic upstream error

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const PLAN_QUOTAS = { trial: 1, pro: 50, team: 250 };

function aiCors(origin, status, body) {
  return new Response(typeof body === 'string' ? body : JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

async function supabaseUserFromJWT(jwt) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return { error: 'supabase_env_missing', user: null };
  try {
    const r = await fetch(`${url}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${jwt}`, apikey: key },
    });
    if (!r.ok) return { error: `auth_${r.status}`, user: null };
    const u = await r.json();
    return { user: u, error: null };
  } catch (e) {
    return { error: e.message, user: null };
  }
}

async function supabaseSelect(table, query) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { error: 'service_role_missing', data: null };
  const r = await fetch(`${url}/rest/v1/${table}?${query}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' },
  });
  if (!r.ok) return { error: `select_${r.status}`, data: null };
  return { data: await r.json(), error: null };
}

async function supabaseInsert(table, row) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { error: 'service_role_missing' };
  const r = await fetch(`${url}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(row),
  });
  if (!r.ok) {
    let detail = '';
    try { detail = await r.text(); } catch (_) {}
    return { error: `insert_${r.status}: ${detail.substring(0, 200)}` };
  }
  return { error: null };
}

async function getUserPlanAndUsage(userId) {
  // Profile → plan
  const profileResp = await supabaseSelect('profiles',
    `select=plan,plan_renews_at&id=eq.${encodeURIComponent(userId)}&limit=1`);
  if (profileResp.error || !profileResp.data?.length) return { plan: 'trial', used: 0, error: profileResp.error };
  const plan = profileResp.data[0].plan || 'trial';
  // Usage — completed analyses; trial=lifetime, paid=last 30d
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const dateClause = plan === 'trial' ? '' : `&completed_at=gte.${encodeURIComponent(since)}`;
  const usageResp = await supabaseSelect('analyses',
    `select=id&user_id=eq.${encodeURIComponent(userId)}&status=eq.completed${dateClause}`);
  const used = usageResp.data?.length || 0;
  return { plan, used, quota: PLAN_QUOTAS[plan] || 0, error: null };
}

async function handleAIMessages(request, origin) {
  // Auth
  const authz = request.headers.get('authorization') || '';
  const jwt = authz.replace(/^Bearer\s+/i, '').trim();
  if (!jwt) return aiCors(origin, 401, { error: 'missing_authorization' });
  const { user, error: authErr } = await supabaseUserFromJWT(jwt);
  if (authErr || !user?.id) return aiCors(origin, 401, { error: 'invalid_token', detail: authErr });

  // Body
  let body;
  try { body = await request.json(); } catch (_) { return aiCors(origin, 400, { error: 'invalid_json_body' }); }
  if (!body?.messages || !Array.isArray(body.messages)) {
    return aiCors(origin, 400, { error: 'messages_required' });
  }

  // Quota
  const { plan, used, quota } = await getUserPlanAndUsage(user.id);
  if ((quota || 0) <= 0) {
    return aiCors(origin, 402, { error: 'no_active_plan', plan, used, quota });
  }
  if (used >= quota) {
    return aiCors(origin, 402, { error: 'quota_exceeded', plan, used, quota });
  }

  // Anthropic key
  const anthroKey = process.env.ANTHROPIC_KEY;
  if (!anthroKey) return aiCors(origin, 500, { error: 'anthropic_key_missing' });

  // Forward to Anthropic
  const t0 = Date.now();
  const upstream = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'x-api-key': anthroKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: body.model || 'claude-sonnet-4-6',
      max_tokens: body.max_tokens || 1500,
      messages: body.messages,
      ...(body.system ? { system: body.system } : {}),
    }),
  });
  const elapsed = Date.now() - t0;
  const upstreamText = await upstream.text();
  if (!upstream.ok) {
    return new Response(upstreamText || JSON.stringify({ error: 'anthropic_upstream', status: upstream.status }), {
      status: upstream.status === 429 ? 429 : 502,
      headers: { ...corsHeaders(origin), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  }
  let parsed;
  try { parsed = JSON.parse(upstreamText); } catch (_) { parsed = null; }
  if (parsed) {
    // Best-effort usage log; fail-soft so a logging error never breaks the call.
    const tokensIn = parsed.usage?.input_tokens || null;
    const tokensOut = parsed.usage?.output_tokens || null;
    supabaseInsert('usage_events', {
      user_id: user.id,
      event_type: 'ai_message',
      tokens_in: tokensIn,
      tokens_out: tokensOut,
      model: parsed.model || body.model || 'claude-sonnet-4-6',
      ms_elapsed: elapsed,
    }).catch(() => {});
  }
  return new Response(upstreamText, {
    status: 200,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

async function handleAIWhoami(request, origin) {
  const authz = request.headers.get('authorization') || '';
  const jwt = authz.replace(/^Bearer\s+/i, '').trim();
  if (!jwt) return aiCors(origin, 401, { error: 'missing_authorization' });
  const { user, error: authErr } = await supabaseUserFromJWT(jwt);
  if (authErr || !user?.id) return aiCors(origin, 401, { error: 'invalid_token', detail: authErr });
  const { plan, used, quota } = await getUserPlanAndUsage(user.id);
  return aiCors(origin, 200, { user: { id: user.id, email: user.email }, plan, used, quota });
}

async function handleDiag(params, origin) {
  const url = params.get('url');
  if (!url) return jsonResponse({ error: 'pass ?url=... to diagnose any endpoint' }, origin, 400);
  try {
    const t0 = Date.now();
    const resp = await fetch(url, { headers: PROXY_HEADERS });
    const text = await resp.text();
    return jsonResponse({
      url,
      upstreamStatus: resp.status,
      upstreamContentType: resp.headers.get('content-type') || '(none)',
      bodyLength: text.length,
      bodyPreview: text.substring(0, 500),
      elapsedMs: Date.now() - t0,
      proxyVersion: PROXY_VERSION,
    }, origin);
  } catch (e) {
    return jsonResponse({ error: e.message, url, proxyVersion: PROXY_VERSION }, origin, 500);
  }
}

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
        routes: ['/api/fema?lat=&lon=', '/api/arcgis?url=', '/api/municode?url=', '/api/permits/:city', '/api/diag?url=', '/api/ai/messages', '/api/ai/whoami'],
        permitCities: Object.keys(PERMIT_ENDPOINTS),
        aiHosted: !!process.env.ANTHROPIC_KEY && !!process.env.SUPABASE_URL,
      }, origin);
    }
    if (route === 'fema') return await handleFema(u.searchParams, origin);
    if (route === 'arcgis') return await handleArcgis(u.searchParams, origin);
    if (route === 'municode') return await handleMunicode(u.searchParams, origin);
    if (route === 'permits' && segments[1]) return await handlePermits(segments[1], u.searchParams, origin);
    if (route === 'diag') return await handleDiag(u.searchParams, origin);
    if (route === 'ai' && segments[1] === 'messages') {
      if (request.method !== 'POST') return jsonResponse({ error: 'POST required' }, origin, 405);
      return await handleAIMessages(request, origin);
    }
    if (route === 'ai' && segments[1] === 'whoami') return await handleAIWhoami(request, origin);
    return jsonResponse({ error: 'not found', tried: subPath }, origin, 404);
  } catch (e) {
    return jsonResponse({ error: e.message, route }, origin, 500);
  }
}
