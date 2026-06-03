# P1-A — Server-Authoritative Quota & Billing

**Date:** 2026-06-02 · **Status:** **implemented + dry-run-validated** — migration NOT yet applied to prod (deploys with the code, see §7).
**Closes:** AUDIT.md #5–#11 + live Supabase security-advisor findings.
**Artifacts:** `supabase/migrations/0002_p1_a_quota_hardening.sql`, Edge (`api/ai/[...path].js`), client (`lib/proxy.js`, `index.html`), this doc.

## 0. Validation status (2026-06-02)

Supabase **branching requires Pro** (project is free-tier), so true staging wasn't available. Instead the migration was validated by **`BEGIN … ROLLBACK` dry-runs against prod** (verified non-persisting first; prod confirmed unchanged after). Two bugs were caught and fixed:

1. **`REVOKE … FROM PUBLIC` was insufficient** — Supabase default-privileges grant function `EXECUTE` to `anon`/`authenticated` directly, so the lockdown must revoke from `public, anon, authenticated`.
2. **`analyses` had stray `DELETE/TRIGGER/TRUNCATE/REFERENCES`** grants (out-of-band `grant all`) — switched to `REVOKE ALL` then `GRANT SELECT`.

Final dry-run — all green: `analyses` authenticated grants = `[SELECT]`; `current_period_usage`/`handle_new_user`/`plan_quota`/`can_run_analysis` no longer client-executable; `reserve_analysis` callable by `authenticated` only (not `anon`); `has_active_analysis` callable by `service_role`. **Functional test** (simulated authenticated user via `request.jwt.claims`): 1st `reserve_analysis` → OK, `has_active` → true, 2nd reserve at trial=1 → **`quota_exceeded`**, after `complete_analysis` → active false.

---

## 1. The problem (today)

Plan and usage live in **client-writable rows that the server then counts**, so a signed-in user can tamper from the browser with the anon key:

- `grant update on profiles to authenticated` + a `USING`-only policy → `update profiles set plan='team'` ([0001:148,174](supabase/migrations/0001_p0_1_auth_schema.sql#L148)) → instant 250/mo.
- `grant insert, update on analyses to authenticated` ([0001:175](supabase/migrations/0001_p0_1_auth_schema.sql#L175)) → flip `status` back to `running`, or backdate `completed_at` past the window → unlimited.
- Quota = `count(analyses where status='completed')` — the exact rows the user controls.
- The Edge endpoint reads that count but never increments it, and the check is a non-atomic read-modify-write (race double-spend).
- **Live advisor adds:** `plan_quota` has a mutable `search_path`; `current_period_usage`, `can_run_analysis`, `handle_new_user`, `plan_quota`, and an out-of-band **`rls_auto_enable`** are all RPC-callable by `anon`/`authenticated`; leaked-password protection is off.

Live state confirmed: schema is applied (`profiles`=2, `analyses`=2, `usage_events`=0 rows), RLS on. So the migration **alters existing objects**.

---

## 2. The fix — one trust boundary

> **Clients can read their own rows. They can change their `display_name`. Everything that affects money or quota is server-only.**

| Surface | Before | After |
|---|---|---|
| `profiles.plan` / `trial_used` / `stripe_*` | client UPDATE | **service-role only** (Stripe webhook / admin) |
| `profiles.display_name` | client UPDATE (whole row) | client UPDATE (column grant) + `WITH CHECK` |
| `analyses` insert/close | client INSERT/UPDATE | **SECURITY DEFINER RPCs** (`reserve_analysis`, `complete_analysis`) |
| quota count | `count(completed)` (forgeable) | `completed-in-window + recent running`, server-computed |
| concurrency | none (race) | `reserve_analysis` locks the profile row (`FOR UPDATE`) → serialized |
| `completed_at` | client clock | `now()` server-side |
| SECURITY DEFINER RPC exposure | anon + authenticated | revoked; only the 2 client RPCs are `authenticated`-callable |

---

## 3. The flow (1 analysis = 1 quota unit)

```
pipeline start ──► supabase.rpc('reserve_analysis', {address,...})
                      │  (atomic: lock profile, count usage, check quota, insert 'running')
                      ├─ quota_exceeded ─► client shows paywall, pipeline aborts
                      └─ returns analysis_id
each AI phase ──► POST /api/ai/messages  { analysis_id, model, max_tokens, messages }
                      │  Edge: verify JWT(role=authenticated) → has_active_analysis(uid,aid)?
                      │        → clamp max_tokens, pin model → stream Anthropic → log usage_events
                      └─ (messages within a reserved analysis are NOT separately metered)
pipeline end  ──► supabase.rpc('complete_analysis', {id, status})
                      │  server sets status + completed_at=now()
```

Why reserve-at-start: the quota unit is the *pipeline run*, but the Edge only sees per-message calls. Reserving a `running` row up front (counted toward usage, with a 30-min TTL) makes quota atomic and lets the Edge authorize each message by "does this user hold a fresh reservation?" without re-counting. Failed/abandoned runs become `failed` or age out, so they don't permanently burn quota.

---

## 4. Edge Function changes — `api/ai/[...path].js` (to implement after sign-off)

Builds on the P1-B version (already origin-locked CORS). Changes to `handleMessages`:

1. **JWT role check (#10):** after `supabaseUserFromJWT`, require `user.role === 'authenticated'` and a present `aud` — reject service/anon tokens.
2. **Fail closed (#9):** if `SUPABASE_SERVICE_ROLE_KEY` is unset, return 500 (do **not** fall back to anon key or to `{used:0}`). Any usage-read error → deny, not free-pass.
3. **Authorize via reservation (#7,#8):** read `body.analysis_id`; call `has_active_analysis(user.id, analysis_id)` via service-role. If false → `402 no_active_analysis`. This replaces the old `getUserPlanAndUsage` per-message count (which never matched the per-analysis model).
4. **Caps (#11):** `max_tokens = Math.min(body.max_tokens || 1500, 4096)`; **pin** `model` server-side to `claude-sonnet-4-6` (ignore client `model`); reject bodies over ~256 KB.
5. **Errors:** return generic codes to the client; never echo `authErr`/`e.message`/env detail (AUDIT #H "leak"). `whoami` stops returning `email`.
6. Delete the now-unused `getUserPlanAndUsage`; quota lives in SQL.

`reserve_analysis` enforces the *count* gate; the Edge enforces *authorization + caps*. Both needed.

## 5. Client changes — `lib/proxy.js` + `index.html`

- `startAnalysis()` → `const { data, error } = await client.rpc('reserve_analysis', {p_address, p_jurisdiction, p_state, p_zoning})`. On `quota_exceeded` set `e.quotaExceeded=true` → existing paywall path. Returns `analysis_id`.
- `completeAnalysis(id,status)` → `client.rpc('complete_analysis', {p_id:id, p_status:status})` (drop the client-supplied timestamp).
- `callAI`/`callAIWithImg` include `analysis_id` in the POST body (thread `S._adiAnalysisId` through).
- No direct `.from('analyses').insert/update` anywhere (those grants are gone).

## 6. Owner decisions ⚑

1. **Quota window** — keep **rolling 30-day** (current, simplest) vs **calendar/plan period** (`plan_renews_at`, cleaner for paid billing). Draft keeps rolling-30; one-line swap noted in the migration. *Recommendation: rolling-30 now, revisit when Stripe lands.*
2. **Leaked-password protection** — enable in Auth → Providers (advisor). One toggle, no code.
3. **Stripe / plan changes** — out of scope here; when added, the webhook (service-role) is the only writer of `profiles.plan`. This migration makes that boundary real.
4. **`can_run_analysis`** — becomes dead after this (replaced by reserve flow). Left in place but locked down; drop in a later cleanup.

## 7. Rollout & test plan

**Apply order (same release):** (a) run `0002` migration → (b) deploy Edge + client changes. The migration alone (without the client RPC switch) would break analysis creation, so they ship together. Use a Supabase **branch/staging** project first if available.

Acceptance (attempt each from DevTools with a real session — all must fail):
- [ ] `update profiles set plan='team'` → **0 rows / RLS error**
- [ ] `insert into analyses(...status='completed')` → **permission denied**
- [ ] `update analyses set status='running'` → **permission denied**
- [ ] direct `POST /api/ai/messages` with no `analysis_id` → **402 no_active_analysis**
- [ ] 2 concurrent `reserve_analysis` at quota 1 → exactly **one** succeeds, one `quota_exceeded`
- [ ] unset service-role env → endpoint **500/deny** (not free trial)
- [ ] `max_tokens: 200000` / `model: 'claude-opus...'` → clamped to 4096 / pinned model
- [ ] advisor re-run → search_path + SECURITY-DEFINER-execute findings cleared
Happy path: sign in → analyze → reserve→messages→complete → second run blocked at trial=1 with paywall.

**Rollback:** `0002` is additive/permission-only; revert by re-granting the old privileges and restoring the `0001` policies. Keep a `0003_revert` ready before applying to prod. The migration is wrapped in `begin/commit`.

---

## 8. What I need from you to proceed to implementation
- ✅/✏️ on the **migration** (esp. the reserve/complete RPC contract + the window decision §6.1).
- Confirm I should implement §4/§5 (Edge + client) on a branch **stacked on `feat/p1-proxy-hardening`** (the P1-B work), so the CORS hardening and quota hardening land together.
- Whether to apply `0002` to a **staging** Supabase branch first (recommended) or straight to prod after review.
