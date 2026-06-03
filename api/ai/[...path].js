// ArchDraw Intel — /api/ai/* nested catch-all (P0-1 hosted-key)
// ──────────────────────────────────────────────────────────────
// Why this file exists separately from api/[...path].js:
// Vercel's filesystem routing reliably matches single-segment paths
// (`/api/health`) through `api/[...path].js`, but the two-segment
// `/api/ai/messages` was returning 404 with empty body on this project.
// Adding an explicit nested catch-all at `api/ai/[...path].js` takes
// priority for any `/api/ai/*` path and bypasses that routing issue.
//
// Routes handled here:
//   POST /api/ai/messages   — JWT-gated Anthropic proxy with quota enforcement
//   GET  /api/ai/whoami     — debug: returns {user, plan, used, quota}
//
// Required Vercel env vars (Production environment):
//   ANTHROPIC_KEY
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY

export const config = { runtime: 'edge' };

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const PLAN_QUOTAS = { trial: 1, pro: 50, team: 250 };

// P1-B: this is the credentialed AI path (Bearer JWT in, Anthropic completion
// out) — CORS is locked to the app's own origins so an arbitrary site cannot
// drive the authenticated proxy. A disallowed origin gets the canonical origin
// back, which the browser rejects on ACAO mismatch.
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
const corsHeaders = (origin) => ({
  'Access-Control-Allow-Origin': allowOrigin(origin),
  'Vary': 'Origin',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
  'X-Adi-Ai-Route': '1',
});

function jsonResp(body, origin, status = 200) {
  return new Response(typeof body === 'string' ? body : JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

async function supabaseUserFromJWT(jwt) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY; // P1-A #9: no anon fallback — fail closed
  if (!url || !key) return { error: 'service_role_missing', user: null };
  try {
    const r = await fetch(`${url}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${jwt}`, apikey: key },
    });
    if (!r.ok) return { error: `auth_${r.status}`, user: null };
    return { user: await r.json(), error: null };
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

// P1-A: call a SECURITY DEFINER RPC via service-role (e.g. has_active_analysis,
// current_period_usage). Returns { data, error }.
async function rpcCall(fn, args) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { error: 'service_role_missing', data: null };
  try {
    const r = await fetch(`${url}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(args || {}),
    });
    if (!r.ok) return { error: `rpc_${r.status}`, data: null };
    let data = null; try { data = await r.json(); } catch (_) {}
    return { data, error: null };
  } catch (e) {
    return { error: e.message, data: null };
  }
}

// Authoritative plan + period usage (used by /whoami). `used` comes from the
// SQL current_period_usage() RPC, NOT a client-forgeable row count.
// P1-A #9: fail closed — a read error reports used=Infinity (deny), never a
// usable trial state.
async function getUserPlanAndUsage(userId) {
  const profileResp = await supabaseSelect('profiles',
    `select=plan&id=eq.${encodeURIComponent(userId)}&limit=1`);
  if (profileResp.error) return { plan: null, used: Infinity, quota: 0, error: profileResp.error };
  const plan = profileResp.data?.[0]?.plan || 'trial';
  const usageResp = await rpcCall('current_period_usage', { uid: userId });
  if (usageResp.error) return { plan, used: Infinity, quota: PLAN_QUOTAS[plan] || 0, error: usageResp.error };
  return { plan, used: usageResp.data || 0, quota: PLAN_QUOTAS[plan] || 0, error: null };
}

async function handleMessages(request, origin) {
  const authz = request.headers.get('authorization') || '';
  const jwt = authz.replace(/^Bearer\s+/i, '').trim();
  if (!jwt) return jsonResp({ error: 'missing_authorization' }, origin, 401);
  const { user, error: authErr } = await supabaseUserFromJWT(jwt);
  if (authErr || !user?.id) return jsonResp({ error: 'unauthorized' }, origin, 401); // P1-A: no detail leak
  // P1-A #10: only genuine signed-in end-users — reject anon / service tokens.
  if (user.role !== 'authenticated') return jsonResp({ error: 'unauthorized' }, origin, 401);

  let body;
  try { body = await request.json(); } catch (_) { return jsonResp({ error: 'invalid_json_body' }, origin, 400); }
  if (!body?.messages || !Array.isArray(body.messages)) {
    return jsonResp({ error: 'messages_required' }, origin, 400);
  }
  // P1-A #11: bound request size (cost-amplification guard).
  if (JSON.stringify(body.messages).length > 256 * 1024) {
    return jsonResp({ error: 'payload_too_large' }, origin, 413);
  }
  // P1-A #7/#8: authorize against a fresh reservation. reserve_analysis (client
  // RPC) already created the 'running' row and enforced quota atomically; here
  // we only confirm the user holds that live reservation — no per-message count,
  // no race. Direct calls without a reservation get 402.
  const analysisId = body.analysis_id;
  if (!analysisId) return jsonResp({ error: 'no_active_analysis' }, origin, 402);
  const active = await rpcCall('has_active_analysis', { uid: user.id, aid: analysisId });
  if (active.error) return jsonResp({ error: 'authz_unavailable' }, origin, 503); // fail closed
  if (active.data !== true) return jsonResp({ error: 'no_active_analysis' }, origin, 402);

  const anthroKey = process.env.ANTHROPIC_KEY;
  if (!anthroKey) return jsonResp({ error: 'anthropic_key_missing' }, origin, 500);

  // Always stream from Anthropic. Vercel Edge enforces a 25-30s wall-clock
  // limit on non-streaming Edge function responses, but allows long-running
  // streaming responses (headers fire within ~1s; body trickles). Sonnet 4.6
  // generating 1500+ tokens routinely exceeds the non-streaming limit.
  const t0 = Date.now();
  const upstream = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'x-api-key': anthroKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',                                          // P1-A #11: pinned server-side
      max_tokens: Math.min(Math.max(1, Number(body.max_tokens) || 1500), 4096), // P1-A #11: clamped
      messages: body.messages,
      stream: true,
      ...(body.system ? { system: body.system } : {}),
    }),
  });
  if (!upstream.ok) {
    const errText = await upstream.text();
    return new Response(errText || JSON.stringify({ error: 'anthropic_upstream', status: upstream.status }), {
      status: upstream.status === 429 ? 429 : 502,
      headers: { ...corsHeaders(origin), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  }
  // Tee the upstream stream: one half flows to the client; the other half is
  // consumed asynchronously to extract token-usage telemetry without blocking
  // the response. usage_events insert is fire-and-forget.
  const [streamForClient, streamForLog] = upstream.body.tee();
  (async () => {
    try {
      const reader = streamForLog.getReader();
      const decoder = new TextDecoder();
      let usage = null;
      let modelName = null;
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop();
        for (const ev of events) {
          const dataLine = ev.split('\n').find(l => l.startsWith('data:'));
          if (!dataLine) continue;
          try {
            const d = JSON.parse(dataLine.slice(5).trim());
            if (d.type === 'message_start') {
              if (d.message?.usage) usage = { ...d.message.usage };
              if (d.message?.model) modelName = d.message.model;
            }
            if (d.type === 'message_delta' && d.usage) {
              usage = { ...(usage || {}), ...d.usage };
            }
          } catch (_) {}
        }
      }
      if (usage) {
        await supabaseInsert('usage_events', {
          user_id: user.id,
          analysis_id: analysisId,
          event_type: 'ai_message',
          tokens_in: usage.input_tokens || null,
          tokens_out: usage.output_tokens || null,
          model: modelName || 'claude-sonnet-4-6',
          ms_elapsed: Date.now() - t0,
        });
      }
    } catch (_) {}
  })();
  return new Response(streamForClient, {
    status: 200,
    headers: {
      ...corsHeaders(origin),
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

async function handleWhoami(request, origin) {
  const authz = request.headers.get('authorization') || '';
  const jwt = authz.replace(/^Bearer\s+/i, '').trim();
  if (!jwt) return jsonResp({ error: 'missing_authorization' }, origin, 401);
  const { user, error: authErr } = await supabaseUserFromJWT(jwt);
  if (authErr || !user?.id) return jsonResp({ error: 'unauthorized' }, origin, 401);
  if (user.role !== 'authenticated') return jsonResp({ error: 'unauthorized' }, origin, 401);
  const { plan, used, quota } = await getUserPlanAndUsage(user.id);
  return jsonResp({ plan, used, quota }, origin, 200); // P1-A: no id/email echo
}

export default async function handler(request) {
  const origin = request.headers.get('Origin') || '';
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }
  const u = new URL(request.url);
  // pathname is /api/ai/<sub>; strip the prefix and grab the leaf segment
  const subPath = u.pathname.replace(/^\/api\/ai\/?/, '').replace(/\/$/, '');
  const leaf = subPath.split('/').filter(Boolean)[0] || '';
  try {
    if (leaf === 'messages') {
      if (request.method !== 'POST') return jsonResp({ error: 'POST required' }, origin, 405);
      return await handleMessages(request, origin);
    }
    if (leaf === 'whoami') return await handleWhoami(request, origin);
    return jsonResp({ error: 'not_found' }, origin, 404);
  } catch (e) {
    return jsonResp({ error: 'internal_error' }, origin, 500); // P1-A: no e.message leak
  }
}
