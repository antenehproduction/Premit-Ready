# ArchDraw Intel — Supabase setup (P0-1 hosted-key)

This folder ships everything needed to run ArchDraw's hosted-key authentication path:

- `migrations/0001_p0_1_auth_schema.sql` — `profiles`, `analyses`, `usage_events` tables, RLS policies, and the `current_period_usage / can_run_analysis / plan_quota` helpers.

The legacy BYOK path stays alive in parallel. Hosted mode is **off by default** until you complete the steps below.

---

## 1. Run the migration

In the Supabase dashboard → **SQL Editor** → paste the entire contents of `migrations/0001_p0_1_auth_schema.sql` → **Run**.

You should now see three tables under **Database → Tables**:

- `public.profiles` (1 row per signed-up user)
- `public.analyses` (1 row per pipeline run)
- `public.usage_events` (1 row per AI call)

A trigger on `auth.users` auto-creates a `profiles` row on every sign-up. RLS is enabled on all three tables — users can only read their own rows; `usage_events` writes are restricted to the service-role key (the Edge Function).

---

## 2. Paste public credentials into `data/auth-config.js`

Settings → API → copy:

- **Project URL** → `supabaseUrl`
- **anon / public** key → `supabaseAnonKey`

```js
window.ADI_AUTH_CONFIG = {
  supabaseUrl: 'https://YOUR-REF.supabase.co',
  supabaseAnonKey: 'eyJhbGciOi...',
  enabled: false,    // flip to true to turn hosted mode on for everyone
  ...
};
```

The anon key is safe to commit — Supabase Auth is built around it being public, and RLS keeps cross-user reads/writes blocked.

---

## 3. Set Vercel environment variables

On the Vercel project that hosts `api/[...path].js`, set three env vars:

| Variable | Value | Required |
|---|---|---|
| `ANTHROPIC_KEY` | `sk-ant-...` (server-side only) | yes |
| `SUPABASE_URL` | `https://YOUR-REF.supabase.co` | yes |
| `SUPABASE_SERVICE_ROLE_KEY` | service-role key from Settings → API | yes |

> The service-role key bypasses RLS. **Never** commit it to git or expose it in the browser. Setting it as a Vercel env var keeps it inside the Edge runtime, where the `/api/ai/messages` handler reads it via `process.env`.

After setting env vars, redeploy the Vercel project so the Edge Function picks them up.

Verify with:

```bash
curl https://YOUR-DEPLOYMENT.vercel.app/api/health
# → { ..., "aiHosted": true }
```

`aiHosted: true` confirms both `ANTHROPIC_KEY` and `SUPABASE_URL` are present.

---

## 4. Enable Google OAuth (optional)

Supabase dashboard → **Authentication → Providers → Google**. Add a Google Cloud OAuth client and paste the Client ID + Secret. Add your deployment URL (and `http://localhost` for dev) to **Redirect URLs**.

---

## 5. Roll out

Two ways to enable hosted mode:

**Per-session (testing):**
```js
localStorage.setItem('ADI_HOSTED_KEY', '1');
location.reload();
```
Auth modal appears immediately.

**Site-wide:**
Flip `enabled: true` in `data/auth-config.js` and redeploy. Every visitor goes through Supabase Auth.

The legacy BYOK path remains code-resident for safe rollback — set `localStorage.removeItem('ADI_HOSTED_KEY')` and `enabled: false` to revert.

---

## 6. Verify the success criteria from PROJECT_COORDINATOR.md §P0-1

- [ ] Sign up with email → confirm → run 1 analysis → usage shows 1/1 → second run hits paywall.
- [ ] Existing users with `ADI_ANTHROPIC_KEY` in `localStorage` still work (set `enabled:false` or omit `ADI_HOSTED_KEY`).
- [ ] DevTools → Network: no `Authorization: Bearer sk-ant-...` header on any request from a hosted-key session — only `Bearer eyJ...` (Supabase JWT) to `/api/ai/messages`.
- [ ] `curl -X POST .../api/ai/messages` without a JWT → `401`.
- [ ] After hitting quota → `/api/ai/messages` → `402` with `{error:'quota_exceeded'}` and the UI shows the paywall banner.

Once all five boxes pass on a real deployment, P0-1 is shippable.
