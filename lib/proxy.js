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

  // P1-A: the current reserved analysis id (from reserve_analysis). Threaded
  // into every /api/ai/messages call so the Edge can authorize against the
  // live reservation instead of metering per message.
  let _currentAnalysisId = null;

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

  // Parse Anthropic SSE stream into a single text string (mirrors the
  // non-streaming `d.content[].text.join('\n')` shape). The Edge function
  // forwards Anthropic's `stream: true` response unchanged so we don't hit
  // Vercel's 25-30s execution limit on long completions.
  async function consumeAnthropicSSE(response) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let text = '';
    let stopReason = null;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split('\n\n');
      buffer = events.pop();
      for (const ev of events) {
        const dataLine = ev.split('\n').find(l => l.startsWith('data:'));
        if (!dataLine) continue;
        const payload = dataLine.slice(5).trim();
        if (payload === '[DONE]') continue;
        let d;
        try { d = JSON.parse(payload); } catch (_) { continue; }
        if (d.type === 'content_block_delta' && d.delta?.type === 'text_delta' && typeof d.delta.text === 'string') {
          text += d.delta.text;
        } else if (d.type === 'message_delta' && d.delta?.stop_reason) {
          stopReason = d.delta.stop_reason;
        } else if (d.type === 'error') {
          throw new Error(d.error?.message || 'anthropic_stream_error');
        }
      }
    }
    return { text, stopReason };
  }

  // Mirror of callAI in index.html. Returns the assistant text body.
  async function callAI(msgs, sys, maxTok = 2200, timeoutMs = 90000) {
    const base = getProxyBase();
    if (!base) throw new Error('Hosted AI requires a deployed proxy (Vercel /api). Set localStorage.ADI_PROXY or deploy to *.vercel.app.');
    const headers = await authHeaders();
    const body = { model: 'claude-sonnet-4-6', max_tokens: maxTok, messages: msgs, analysis_id: _currentAnalysisId };
    if (sys) body.system = sys;
    const t0 = Date.now();
    const label = (msgs[0]?.content || '').toString().substring(0, 40).replace(/\n/g, ' ');
    if (window.ADILog) window.ADILog.info(`→ HOSTED AI: "${label}..." maxTok=${maxTok}`);

    const fetchP = fetch(base + '/ai/messages', {
      method: 'POST', headers, body: JSON.stringify(body),
    }).then(async r => {
      const ms0 = Date.now() - t0;
      if (!r.ok) {
        let detail = '';
        try { detail = (await r.json())?.error || ''; } catch (_) { try { detail = await r.text(); } catch (_) {} }
        const em = `Hosted AI ${r.status}: ${String(detail).substring(0, 160)}`;
        if (r.status === 401) throw new Error('Session expired. Please sign in again.');
        if (r.status === 402 || r.status === 429) {
          const e = new Error(em); e.code = r.status; e.quotaExceeded = (r.status === 402); throw e;
        }
        if (window.ADILog) window.ADILog.error(`← HOSTED FAIL ${ms0}ms — ${em}`);
        throw new Error(em);
      }
      const ct = r.headers.get('content-type') || '';
      // Streaming response — parse SSE chunks
      if (ct.includes('text/event-stream')) {
        const { text, stopReason } = await consumeAnthropicSSE(r);
        const ms = Date.now() - t0;
        if (window.ADILog) window.ADILog.info(`← HOSTED OK ${ms}ms — ${text.length} chars stop=${stopReason} (streamed)`);
        return text;
      }
      // Fallback: non-streaming JSON shape (kept for backward compat)
      const d = await r.json();
      const txt = (d.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n');
      const ms = Date.now() - t0;
      if (window.ADILog) window.ADILog.info(`← HOSTED OK ${ms}ms — ${txt.length} chars stop=${d.stop_reason}`);
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
      model: 'claude-sonnet-4-6', max_tokens: maxTok, analysis_id: _currentAnalysisId,
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
          // Surface the upstream body — Anthropic 400s on vision payloads
          // include a helpful "messages.0.content.0.source.data: invalid" or
          // similar message that's worthless if we drop it.
          let detail = '';
          try { detail = (await r.json())?.error?.message || (await r.json())?.error || ''; }
          catch (_) { try { detail = await r.text(); } catch (_) {} }
          throw new Error('Hosted AI ' + r.status + (detail ? ': ' + String(detail).substring(0, 200) : ''));
        }
        const ct = r.headers.get('content-type') || '';
        if (ct.includes('text/event-stream')) {
          const { text } = await consumeAnthropicSSE(r);
          return text;
        }
        const d = await r.json();
        return (d.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n');
      });
    // Image timeout bumped to 60s — streaming holds the connection open longer
    return Promise.race([fp, new Promise((_, r) => setTimeout(() => r(new Error('Image timeout')), 60000))]);
  }

  // Analyses lifecycle (P1-A: server-authoritative). The client can no longer
  // INSERT/UPDATE analyses directly — both ends go through SECURITY DEFINER
  // RPCs that enforce quota and set timestamps server-side.
  //
  // startAnalysis RESERVES the run: reserve_analysis() atomically checks quota
  // and inserts the 'running' row, returning its id. On quota exhaustion it
  // throws an error with .quotaExceeded so the caller shows the paywall.
  async function startAnalysis(meta) {
    if (!window.ADIAuth?.isHostedMode()) return null;
    const c = window.ADIAuth?.client();
    if (!c) return null;
    try {
      const { data, error } = await c.rpc('reserve_analysis', {
        p_address: meta?.address || '',
        p_jurisdiction: meta?.jurisdiction || null,
        p_state: meta?.state || null,
        p_zoning: meta?.zoningDistrict || null,
      });
      if (error) {
        if (/quota_exceeded/i.test(String(error.message || '')) || error.code === 'P0001') {
          const e = new Error('quota_exceeded'); e.quotaExceeded = true; throw e;
        }
        console.warn('[ADIProxy] reserve_analysis error:', error.message);
        return null;
      }
      _currentAnalysisId = data || null; // rpc returns the new uuid scalar
      return _currentAnalysisId;
    } catch (e) {
      if (e && e.quotaExceeded) throw e; // bubble up so the caller can paywall
      console.warn('[ADIProxy] startAnalysis threw:', e?.message);
      return null;
    }
  }

  // completeAnalysis CLOSES the run server-side (status + completed_at = now()).
  async function completeAnalysis(id, status, errorMessage) {
    const aid = id || _currentAnalysisId;
    _currentAnalysisId = null;
    if (!aid) return;
    const c = window.ADIAuth?.client();
    if (!c) return;
    try {
      await c.rpc('complete_analysis', {
        p_id: aid,
        p_status: status || 'completed',
        p_error: errorMessage || null,
      });
    } catch (e) {
      console.warn('[ADIProxy] completeAnalysis threw:', e?.message);
    }
  }

  window.ADIProxy = { callAI, callJSON, callAIWithImg, startAnalysis, completeAnalysis };
})();
