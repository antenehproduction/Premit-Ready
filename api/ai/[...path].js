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

const corsHeaders = (origin) => ({
  'Access-Control-Allow-Origin': origin || '*',
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
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return { error: 'supabase_env_missing', user: null };
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

async function getUserPlanAndUsage(userId) {
  const profileResp = await supabaseSelect('profiles',
    `select=plan,plan_renews_at&id=eq.${encodeURIComponent(userId)}&limit=1`);
  if (profileResp.error || !profileResp.data?.length) return { plan: 'trial', used: 0, error: profileResp.error };
  const plan = profileResp.data[0].plan || 'trial';
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const dateClause = plan === 'trial' ? '' : `&completed_at=gte.${encodeURIComponent(since)}`;
  const usageResp = await supabaseSelect('analyses',
    `select=id&user_id=eq.${encodeURIComponent(userId)}&status=eq.completed${dateClause}`);
  const used = usageResp.data?.length || 0;
  return { plan, used, quota: PLAN_QUOTAS[plan] || 0, error: null };
}

async function handleMessages(request, origin) {
  const authz = request.headers.get('authorization') || '';
  const jwt = authz.replace(/^Bearer\s+/i, '').trim();
  if (!jwt) return jsonResp({ error: 'missing_authorization' }, origin, 401);
  const { user, error: authErr } = await supabaseUserFromJWT(jwt);
  if (authErr || !user?.id) return jsonResp({ error: 'invalid_token', detail: authErr }, origin, 401);

  let body;
  try { body = await request.json(); } catch (_) { return jsonResp({ error: 'invalid_json_body' }, origin, 400); }
  if (!body?.messages || !Array.isArray(body.messages)) {
    return jsonResp({ error: 'messages_required' }, origin, 400);
  }

  const { plan, used, quota } = await getUserPlanAndUsage(user.id);
  if ((quota || 0) <= 0) return jsonResp({ error: 'no_active_plan', plan, used, quota }, origin, 402);
  if (used >= quota)     return jsonResp({ error: 'quota_exceeded', plan, used, quota }, origin, 402);

  const anthroKey = process.env.ANTHROPIC_KEY;
  if (!anthroKey) return jsonResp({ error: 'anthropic_key_missing' }, origin, 500);

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
    supabaseInsert('usage_events', {
      user_id: user.id,
      event_type: 'ai_message',
      tokens_in: parsed.usage?.input_tokens || null,
      tokens_out: parsed.usage?.output_tokens || null,
      model: parsed.model || body.model || 'claude-sonnet-4-6',
      ms_elapsed: elapsed,
    }).catch(() => {});
  }
  return new Response(upstreamText, {
    status: 200,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

async function handleWhoami(request, origin) {
  const authz = request.headers.get('authorization') || '';
  const jwt = authz.replace(/^Bearer\s+/i, '').trim();
  if (!jwt) return jsonResp({ error: 'missing_authorization' }, origin, 401);
  const { user, error: authErr } = await supabaseUserFromJWT(jwt);
  if (authErr || !user?.id) return jsonResp({ error: 'invalid_token', detail: authErr }, origin, 401);
  const { plan, used, quota } = await getUserPlanAndUsage(user.id);
  return jsonResp({ user: { id: user.id, email: user.email }, plan, used, quota }, origin, 200);
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
    return jsonResp({ error: 'not found', tried: subPath, scope: 'api/ai' }, origin, 404);
  } catch (e) {
    return jsonResp({ error: e.message, scope: 'api/ai' }, origin, 500);
  }
}
