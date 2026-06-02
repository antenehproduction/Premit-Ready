// ArchDraw Intel — auth library (P0-1 hosted-key)
// ─────────────────────────────────────────────────
// Single import surface for everything Supabase Auth + plan/quota.
// Loaded as a plain <script> in index.html — exposes window.ADIAuth.
//
// Depends on:
//   data/auth-config.js          (window.ADI_AUTH_CONFIG)
//   @supabase/supabase-js v2     (global `supabase` from jsDelivr UMD bundle)
//
// Contracts:
//   ADIAuth.isHostedMode()       → boolean. True if config.enabled or
//                                  localStorage.ADI_HOSTED_KEY=1.
//   ADIAuth.client()             → Supabase JS client (or null if not
//                                  configured). Lazy-initialized.
//   ADIAuth.getSession()         → Promise<Session|null>
//   ADIAuth.getAccessToken()     → Promise<string|null>  (JWT for /api/ai/*)
//   ADIAuth.getProfile()         → Promise<{plan, plan_renews_at,...}|null>
//   ADIAuth.usage()              → Promise<{used, quota, plan}>
//   ADIAuth.signUp(email, pw)    → Promise<{user, error}>
//   ADIAuth.signIn(email, pw)    → Promise<{user, error}>
//   ADIAuth.signInWithGoogle()   → triggers OAuth redirect
//   ADIAuth.signOut()            → Promise<void>
//   ADIAuth.onAuthChange(fn)     → unsubscribe fn
//
// LOCKED: the legacy BYOK path (probeConnection / saveKey in index.html)
// is untouched. ADIAuth is purely additive — when isHostedMode() is false
// the rest of the app behaves exactly as it did pre-P0-1.

(function () {
  'use strict';

  const CFG = window.ADI_AUTH_CONFIG || {};
  let _client = null;
  let _initWarned = false;

  function isHostedMode() {
    try {
      if (localStorage.getItem('ADI_HOSTED_KEY') === '1') return true;
    } catch (_) {}
    return !!CFG.enabled;
  }

  function isConfigured() {
    return !!(CFG.supabaseUrl && CFG.supabaseAnonKey);
  }

  function client() {
    if (_client) return _client;
    if (!isConfigured()) {
      if (!_initWarned) {
        console.warn('[ADIAuth] supabaseUrl + supabaseAnonKey not set in data/auth-config.js — hosted mode unavailable.');
        _initWarned = true;
      }
      return null;
    }
    if (typeof supabase === 'undefined' || !supabase.createClient) {
      if (!_initWarned) {
        console.warn('[ADIAuth] @supabase/supabase-js not loaded — check the CDN <script> tag in index.html.');
        _initWarned = true;
      }
      return null;
    }
    _client = supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: window.localStorage,
        storageKey: 'adi-supabase-auth',
      },
    });
    return _client;
  }

  async function getSession() {
    const c = client();
    if (!c) return null;
    try {
      const { data } = await c.auth.getSession();
      return data?.session || null;
    } catch (e) {
      console.warn('[ADIAuth] getSession failed:', e?.message);
      return null;
    }
  }

  async function getAccessToken() {
    const s = await getSession();
    return s?.access_token || null;
  }

  async function getUser() {
    const s = await getSession();
    return s?.user || null;
  }

  async function getProfile() {
    const c = client();
    if (!c) return null;
    const u = await getUser();
    if (!u) return null;
    try {
      const { data, error } = await c
        .from('profiles')
        .select('id, email, display_name, plan, plan_renews_at, trial_used, created_at')
        .eq('id', u.id)
        .maybeSingle();
      if (error) {
        console.warn('[ADIAuth] getProfile error:', error.message);
        return null;
      }
      return data;
    } catch (e) {
      console.warn('[ADIAuth] getProfile threw:', e?.message);
      return null;
    }
  }

  async function usage() {
    const c = client();
    if (!c) return { used: 0, quota: 0, plan: 'trial' };
    const u = await getUser();
    if (!u) return { used: 0, quota: 0, plan: 'trial' };
    try {
      // Count completed analyses inside the current period
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const profile = await getProfile();
      const plan = profile?.plan || 'trial';
      const quota = (CFG.plans?.[plan]?.quotaNum) || ({ trial: 1, pro: 50, team: 250 }[plan] || 0);
      const q = c.from('analyses').select('id', { count: 'exact', head: true }).eq('user_id', u.id).eq('status', 'completed');
      // Trial = lifetime; paid = last 30 days
      const { count } = plan === 'trial'
        ? await q
        : await q.gte('completed_at', since);
      return { used: count || 0, quota, plan };
    } catch (e) {
      console.warn('[ADIAuth] usage threw:', e?.message);
      return { used: 0, quota: 0, plan: 'trial' };
    }
  }

  async function signUp(email, password, displayName) {
    const c = client();
    if (!c) return { user: null, error: { message: 'Auth not configured' } };
    const { data, error } = await c.auth.signUp({
      email,
      password,
      options: { data: { full_name: displayName || email } },
    });
    return { user: data?.user || null, session: data?.session || null, error };
  }

  async function signIn(email, password) {
    const c = client();
    if (!c) return { user: null, error: { message: 'Auth not configured' } };
    const { data, error } = await c.auth.signInWithPassword({ email, password });
    return { user: data?.user || null, session: data?.session || null, error };
  }

  async function signInWithGoogle() {
    const c = client();
    if (!c) return { error: { message: 'Auth not configured' } };
    const redirectTo = (typeof location !== 'undefined') ? location.origin + location.pathname : undefined;
    return c.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
  }

  async function sendPasswordReset(email) {
    const c = client();
    if (!c) return { error: { message: 'Auth not configured' } };
    const redirectTo = (typeof location !== 'undefined') ? location.origin + location.pathname : undefined;
    return c.auth.resetPasswordForEmail(email, { redirectTo });
  }

  async function signOut() {
    const c = client();
    if (!c) return;
    try { await c.auth.signOut(); } catch (_) {}
  }

  function onAuthChange(fn) {
    const c = client();
    if (!c) return () => {};
    const sub = c.auth.onAuthStateChange((event, session) => {
      try { fn(event, session); } catch (e) { console.warn('[ADIAuth] onAuthChange handler threw:', e?.message); }
    });
    return () => { try { sub?.data?.subscription?.unsubscribe(); } catch (_) {} };
  }

  window.ADIAuth = {
    isHostedMode,
    isConfigured,
    client,
    getSession,
    getAccessToken,
    getUser,
    getProfile,
    usage,
    signUp,
    signIn,
    signInWithGoogle,
    sendPasswordReset,
    signOut,
    onAuthChange,
  };
})();
