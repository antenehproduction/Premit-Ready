// ArchDraw Intel — public auth config
// ─────────────────────────────────────
// Read by lib/auth.js to talk to Supabase.
//
// SAFE TO COMMIT: the URL is public; the anon key is public-by-design
// (Supabase Auth is built around it). Row Level Security on every table
// keeps cross-user reads/writes blocked. Service-role keys NEVER live in
// this file — they are Vercel env-only and the Edge Function reads them
// via process.env.SUPABASE_SERVICE_ROLE_KEY at runtime.
//
// HOSTED_KEY rollout flag:
//   - When `enabled=true`, new sessions go through Supabase Auth and AI
//     calls are routed through /api/ai/* with a Bearer JWT. The browser
//     never sees an Anthropic key.
//   - When `enabled=false` (default), the legacy BYOK path stays active.
//     This is the safe-rollback default during P0-1 ramp.
//
// Owner setup (one-time):
//   1. Create a Supabase project (or use the existing connected one).
//   2. Run supabase/migrations/0001_p0_1_auth_schema.sql in the SQL editor.
//   3. Copy the project URL + anon key from Settings → API.
//   4. Paste into the placeholders below.
//   5. Set ANTHROPIC_KEY + SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY as
//      Vercel env vars on the deployment that hosts api/[...path].js.
//   6. Flip `enabled` to `true` here OR set localStorage.ADI_HOSTED_KEY=1
//      in the browser to opt into the hosted flow per-session.

window.ADI_AUTH_CONFIG = {
  // PASTE: https://<your-ref>.supabase.co
  supabaseUrl: 'https://jfiafdeppfsksxrzqumw.supabase.co',
  // PASTE: eyJhbGciOi... (the anon / public key, NOT service-role)
  supabaseAnonKey: 'sb_publishable_3KyuJYc3PTBbo3rpQsk3XQ_ikTL7Mu6',

  // P0-1 rollout flag. Default false until env vars + migration are live.
  // Per-session override: localStorage.ADI_HOSTED_KEY = '1'
  enabled: false,

  // Plan labels surfaced in the paywall + account UI. Quotas are enforced
  // server-side by public.plan_quota() in the migration.
  plans: {
    trial: { label: 'Free trial',     quotaLabel: '1 analysis' },
    pro:   { label: 'Pro',            quotaLabel: '50 analyses / mo' },
    team:  { label: 'Team',           quotaLabel: '250 analyses / mo' },
  },
};
