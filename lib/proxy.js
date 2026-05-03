// ArchDraw Intel — hosted-AI proxy client (P0-1)
// ────────────────────────────────────────────────
// When ADIAuth.isHostedMode() is true, AI calls are forwarded to
// /api/ai/messages (Vercel Edge) instead of api.anthropic.com directly.
// The Edge Function:
//   1. Validates the Supabase JWT
//   2. Looks up the user's plan + period usage
//   3. Rejects if quota exceeded
//   4. Calls Anthropic with the server-side ANTHROPIC_KEY
//   5. Records a usage_events row on success
//
// Exposes window.ADIProxy.{ callAI, callJSON, callAIWithImg } that
// match the existing in-page signatures byte-for-byte.

(function () {
  'use strict';

  function getProxyBase() {
    // Reuse the existing ADI_PROXY resolver from index.html if available.
    // Fall back to /api when same-origin (vercel.app / localhost).
    if (typeof window.getProxyBase === 'function') {
      const v = window.getProxyBase();
      if (v) return v;
    }
    try {
      const explicit = localStorage.getItem('ADI_PROXY') || window.ADI_PROXY_DEFAULT;
      if (explicit) return explicit;
    } catch (_) {}
    if (typeof location !== 'undefined' &&
        (/\.vercel\.app$/.test(location.hostname) ||
         location.hostname === 'localhost' ||
         location.hostname === '127.0.0.1')) {
      return '/api';
    }
    return null;
  }

  async function authHeaders() {
    const tok = await window.ADIAuth?.getAccessToken();
    if (!tok) throw new Error('Not signed in. Please sign in to run an analysis.');
    return { 'Authorization': 'Bearer ' + tok, 'Content-Type': 'application/json' };
  }

  // Mirror of callAI in index.html. Returns the assistant text body.
  async function callAI(msgs, sys, maxTok = 2200, timeoutMs = 90000) {
    const base = getProxyBase();
    if (!base) throw new Error('Hosted AI requires a deployed proxy (Vercel /api). Set localStorage.ADI_PROXY or deploy to *.vercel.app.');
    const headers = await authHeaders();
    const body = { model: 'claude-sonnet-4-6', max_tokens: maxTok, messages: msgs };
    if (sys) body.system = sys;
    const t0 = Date.now();
    const label = (msgs[0]?.content || '').toString().substring(0, 40).replace(/\n/g, ' ');
    if (window.L) window.L.info(`→ HOSTED AI: "${label}..." maxTok=${maxTok}`);

    const fetchP = fetch(base + '/ai/messages', {
      method: 'POST', headers, body: JSON.stringify(body),
    }).then(async r => {
      const ms = Date.now() - t0;
      if (!r.ok) {
        let detail = '';
        try { detail = (await r.json())?.error || ''; } catch (_) { try { detail = await r.text(); } catch (_) {} }
        const em = `Hosted AI ${r.status}: ${String(detail).substring(0, 160)}`;
        if (r.status === 401) throw new Error('Session expired. Please sign in again.');
        if (r.status === 402 || r.status === 429) {
          const e = new Error(em); e.code = r.status; e.quotaExceeded = (r.status === 402); throw e;
        }
        if (window.L) window.L.error(`← HOSTED FAIL ${ms}ms — ${em}`);
        throw new Error(em);
      }
      const d = await r.json();
      const txt = (d.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n');
      if (window.L) window.L.info(`← HOSTED OK ${ms}ms — ${txt.length} chars stop=${d.stop_reason}`);
      return txt;
    });
    const tp = new Promise((_, rej) => setTimeout(() => rej(new Error(`Timeout after ${Math.round(timeoutMs / 1000)}s`)), timeoutMs));
    return Promise.race([fetchP, tp]);
  }

  // Mirror of callJSON: same JSON-fence repair logic as the inline copy.
  async function callJSON(msgs, sys, maxTok = 2200, timeoutMs = 90000) {
    const jsonSys = (sys || '') + '\n\nCRITICAL: Respond with ONLY valid JSON. Start with { end with }. No preamble, no markdown, no explanation.';
    const raw = await callAI(msgs, jsonSys, maxTok, timeoutMs);
    const repair = window.repairJSON || (s => s.replace(/,(\s*[}\]])/g, '$1').replace(/\/\/[^\n]*/g, '').replace(/[“”]/g, '"').replace(/:\s*(undefined|NaN)\b/g, ':null'));
    const tryP = s => { try { return JSON.parse(s); } catch (_) {} try { return JSON.parse(repair(s)); } catch (_) {} return null; };
    let m = raw.match(/```json\s*([\s\S]*?)```/); if (m) { const r = tryP(m[1].trim()); if (r) return r; }
    m = raw.match(/```\s*(\{[\s\S]*?\})\s*```/); if (m) { const r = tryP(m[1].trim()); if (r) return r; }
    const si = raw.indexOf('{'), ei = raw.lastIndexOf('}');
    if (si !== -1 && ei > si) { const r = tryP(raw.slice(si, ei + 1)); if (r) return r; }
    throw new Error('JSON parse failed (hosted). Preview: ' + raw.substring(0, 200));
  }

  async function callAIWithImg(prompt, b64, mime, sys, maxTok = 1000) {
    const base = getProxyBase();
    if (!base) throw new Error('Hosted AI requires a deployed proxy (Vercel /api).');
    const headers = await authHeaders();
    const body = {
      model: 'claude-sonnet-4-6', max_tokens: maxTok,
      messages: [{ role: 'user', content: [
        { type: 'image', source: { type: 'base64', media_type: mime, data: b64 } },
        { type: 'text', text: prompt },
      ] }],
    };
    if (sys) body.system = sys;
    const fp = fetch(base + '/ai/messages', { method: 'POST', headers, body: JSON.stringify(body) })
      .then(async r => {
        if (!r.ok) {
          if (r.status === 401) throw new Error('Session expired. Please sign in again.');
          if (r.status === 402) { const e = new Error('Quota exceeded'); e.quotaExceeded = true; throw e; }
          throw new Error('Hosted AI ' + r.status);
        }
        const d = await r.json();
        return (d.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n');
      });
    return Promise.race([fp, new Promise((_, r) => setTimeout(() => r(new Error('Image timeout')), 30000))]);
  }

  // Analyses lifecycle — used by index.html to record the audit row when
  // a pipeline starts and to flip status=completed when phase 7 succeeds.
  async function startAnalysis(meta) {
    if (!window.ADIAuth?.isHostedMode()) return null;
    const c = window.ADIAuth?.client();
    const u = await window.ADIAuth?.getUser();
    if (!c || !u) return null;
    try {
      const profile = await window.ADIAuth.getProfile();
      const plan = profile?.plan || 'trial';
      const { data, error } = await c.from('analyses').insert({
        user_id: u.id,
        address: meta?.address || '',
        jurisdiction: meta?.jurisdiction || null,
        state: meta?.state || null,
        zoning_district: meta?.zoningDistrict || null,
        plan_at_time: plan,
        status: 'running',
        metadata: meta?.extra || {},
      }).select('id').single();
      if (error) { console.warn('[ADIProxy] startAnalysis error:', error.message); return null; }
      return data?.id || null;
    } catch (e) {
      console.warn('[ADIProxy] startAnalysis threw:', e?.message);
      return null;
    }
  }

  async function completeAnalysis(id, status, errorMessage) {
    if (!id) return;
    const c = window.ADIAuth?.client();
    if (!c) return;
    try {
      await c.from('analyses').update({
        status: status || 'completed',
        completed_at: new Date().toISOString(),
        error_message: errorMessage || null,
      }).eq('id', id);
    } catch (e) {
      console.warn('[ADIProxy] completeAnalysis threw:', e?.message);
    }
  }

  window.ADIProxy = { callAI, callJSON, callAIWithImg, startAnalysis, completeAnalysis };
})();
