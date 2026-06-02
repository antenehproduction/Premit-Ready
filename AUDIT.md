# ArchDraw Intel — Security & Correctness Audit

**Date:** 2026-06-01
**Scope:** Full codebase at commit `28eac2e` (post Path 1/2 + P0-1 hosted-auth merge).
**Method:** Five parallel read-only review passes — hosted-auth client, Vercel edge proxy/API, Supabase schema + RLS, Cloudflare worker + data registries, core app/pipeline.
**Status:** Findings only. No code changed by this audit.

The standout theme — confirmed independently by three review passes from different angles — is that **the hosted-mode quota/billing system is client-authoritative and trivially bypassable**. The second theme is **availability**: the production app can brick itself through normal operation (no attacker required).

Severity legend: 🟥 Critical · 🟧 High · 🟨 Medium · 🟦 Low.

---

## TIER 1 — Availability: the live app can break for everyone

Triggered by normal operation, not an attacker.

| # | Sev | Finding | Location |
|---|-----|---------|----------|
| 1 | 🟥 | **No BYOK fallback when hosted Supabase is unreachable.** `isConfigured()` only checks config strings exist, not reachability. Free-tier Supabase auto-pauses after ~7 idle days → login modal forever, no escape. (This caused the 2026-06-01 lockout; it will recur.) | `index.html:4205` |
| 2 | 🟧 | **Sign-in/sign-up network errors are uncaught.** A thrown `Failed to fetch` leaves the UI stuck on "Creating account…" with an unhandled rejection. Confirmed by the live stack trace (`auth.js:145` → `index.html:4284`, neither try/caught). | `index.html:4274`, `:4284` |
| 3 | 🟧 | **Hosted mode is a dead end on the production GitHub Pages URL.** `getProxyBase()` returns `null` for `*.github.io`; the first AI call fails mid-pipeline with "Hosted AI requires a deployed proxy." With `enabled:true`, the live Pages site invites users into a flow it cannot complete. | `lib/proxy.js:18`, `:82` |
| 4 | 🟧 | **Worker missing `/overpass` route.** When `ADI_PROXY` is set, OSM building fetch + lot calibration call `/overpass` → worker 404 → existing-buildings overlay and lot calibration break every analysis. | `workers/proxy.js:210` |

> Combined, #1–#3 mean the production app is in a fragile/broken state for hosted mode depending on deployment target. Fastest stabilizer: `enabled:false` (BYOK). Real fix: #1 + #2.

---

## TIER 2 — Security/money: quota & billing are NOT enforced

Becomes real the moment hosted mode runs against the owner's Anthropic key with real users. Root cause: **plan + usage live in client-writable rows, and the server counts those same rows.**

| # | Sev | Finding | Location |
|---|-----|---------|----------|
| 5 | 🟥 | **User can self-upgrade their plan from the browser.** `grant update on profiles to authenticated` + `USING`-only policy (no `WITH CHECK`, no column guard) → `supabase.from('profiles').update({plan:'team'})` grants 250/mo instantly. | `supabase/migrations/0001_p0_1_auth_schema.sql:148-150,174` |
| 6 | 🟥 | **User can reset usage to zero.** Client has INSERT/UPDATE on its own `analyses` rows incl. `status`/`completed_at`; quota = `count(status='completed')`. Flip rows to `running` or backdate `completed_at` past the 30-day window → unlimited analyses. | `0001_…sql:155-163` |
| 7 | 🟥 | **The AI endpoint never increments what it counts.** Quota reads `analyses`, but a successful call only writes `usage_events`. Calling `/api/ai/messages` directly never moves the counter → unbounded spend. | `api/ai/[...path].js:87-98` |
| 8 | 🟥 | **Quota check is non-atomic read-modify-write.** N concurrent requests read the same `used` before any increment → race double-spend, even if #5–#7 were fixed. | `api/ai/[...path].js:113` |
| 9 | 🟧 | **Quota fails OPEN.** If `SUPABASE_SERVICE_ROLE_KEY` is unset, auth falls back to anon key and a usage-read error returns `{plan:'trial', used:0}` — misconfig gives everyone free calls. | `api/ai/[...path].js:41`, `:90` |
| 10 | 🟧 | **JWT trusted without role/aud checks.** Any 200 from `/auth/v1/user` containing an `id` passes; no `role==='authenticated'` / `aud` assertion. | `api/ai/[...path].js:39-52` |
| 11 | 🟨 | **No `max_tokens`/model/body-size cap on the AI proxy.** Caller-controlled `max_tokens` and `model` → cost amplification per request. | `api/ai/[...path].js:133` |

> Fix as a unit: move plan/usage writes to the service-role edge function; revoke client write on `profiles.plan` and `analyses`; make the quota check atomic and fail-closed; add `WITH CHECK` + column guards to every update policy. This is a redesign, not a patch.

---

## TIER 3 — SSRF / open proxies

| # | Sev | Finding | Location |
|---|-----|---------|----------|
| 12 | 🟧 | **Unauthenticated `/diag` open fetch proxy (two copies).** Any URL, no allowlist, returns a body preview. Can probe cloud metadata (`169.254.169.254`) and internal hosts. Remove from prod or token-gate. | `workers/proxy.js:181`, `api/[...path].js:389` |
| 13 | 🟧 | **Unanchored allowlist regex on `/arcgis` + `/municode`.** Substring match against the whole URL: `http://169.254.169.254/?x=arcgis` and `https://arcgis.attacker.com/` both pass. Validate `new URL(url).hostname` against an anchored suffix allowlist; block private/link-local IPs. | `workers/proxy.js:150`, `api/[...path].js:144` |
| 14 | 🟧 | **CORS reflects arbitrary Origin on credentialed AI responses.** `ALLOWED_ORIGINS` is dead code; README claims an allowlist that does not exist. | `api/ai/[...path].js:24`, `workers/proxy.js:40` |

---

## TIER 4 — Correctness: silently wrong output / dead features

| # | Sev | Finding | Location |
|---|-----|---------|----------|
| 15 | 🟥 | **Permit cross-check dead for SF/NYC/LA/Miami + 13 more cities.** `permitRegistryKey('San Francisco')→"sanfrancisco"` but registry key is `sf`; worker only knows 7 cities. The permit-filings card silently never renders. | `data/permit-registry.js:264`, `index.html:1813` |
| 16 | 🟧 | **`permitRegistryKey` regex mangles keys.** `/city(of)?/` unanchored + non-global → `'Jersey City'→"jersey"`; strips `city` mid-word. | `data/permit-registry.js:266` |
| 17 | 🟧 | **`callAIWithRetry`/`callJSONWithRetry` can resolve to `undefined`.** No post-loop throw; callers do `fmt(res)`→`t.replace()`→"Cannot read properties of undefined" crash. | `index.html:792` |
| 18 | 🟨 | **Two cost models disagree on $/SF.** Options panel vs checklist quote materially different costs (e.g. $220 vs $260 base) for the same NY/FL project. | `index.html:1651`, `:1876` |
| 19 | 🟨 | **FEMA acceptance too loose.** Any 200 JSON without an `error` key is accepted as a flood result → silent wrong/empty determination. Require `Array.isArray(parsed.features)`. | `workers/proxy.js:106` |
| 20 | 🟨 | **`adiOnSignedIn` runs twice per sign-in** (direct call + `onAuthChange`); `TOKEN_REFRESHED` re-runs the full paywall check and can pop the paywall mid-session. | `index.html:4276`, `:4228` |

---

## TIER 5 — Lower / latent

- Sign-up "check your email" message contradicts `mailer_autoconfirm:true`; no "already registered" handling — `index.html:4286`.
- `valPlan` setback clipping can silently drop rooms on shallow lots (relates to GEOM-2) — `index.html:1143`.
- Structural grid column label exceeds `'Z'` past 26 bays — `index.html:3411`.
- `usage()` reads non-existent `quotaNum` from config → configured plan numbers are dead code — `lib/auth.js:129`.
- `runPhase_comp` leaks its progress interval on error (keeps mutating overlay text) — `index.html:1771`.
- Anthropic key stored in `localStorage` cleartext — XSS-exfiltratable (pre-existing, BYOK path) — `index.html:894`, `:910`.
- Dead/duplicate code: two AI proxy implementations (`api/[...path].js` vs `api/ai/[...path].js`); unused SQL `plan_quota()`/`can_run_analysis()` while JS reimplements quota (drift risk).

---

## Verified clean

- No `AbortController`/`AbortSignal` anywhere (rule #1) — all timeouts use `Promise.race` + `setTimeout`.
- Model string is `claude-sonnet-4-6` everywhere (rule #4).
- `callJSON` forwards `timeoutMs` (rule #5).
- `localFloorPlan` has no API call (rule #6).
- `probeConnection`/`saveKey` intact vs. v13 contract (rule #3).
- All `data/*.js` pass `node --check`; every `\'` is inside a valid single-quoted literal (rule #2).
- Cross-**user** RLS isolation is correct (RLS enabled on every table, all policies scope to `auth.uid()`, `usage_events` is read-only to clients).
- DRAW-5 PDF aspect ratio already fixed (`[914.4,609.6]` matches 1440×960).
- State reset between analyses is thorough in `startAnalysis`.

---

## Recommended order of operations

1. **Today (availability):** Fix Tier 1 #1+#2 (graceful BYOK fallback + caught network errors), or set `enabled:false` to stabilize immediately. Add a cron ping to keep Supabase warm.
2. **Before any paid launch (must-fix):** Tier 2 as a unit — service-role-only writes for plan/usage, atomic fail-closed quota check, `WITH CHECK` + column guards on update policies.
3. **Before exposing the proxies publicly:** Tier 3 — remove `/diag`, anchor the allowlists, fix CORS.
4. **Opportunistic:** Tier 4 correctness (the permit-key fix is tiny and restores a whole feature).

---

*Generated by a five-agent parallel audit pass. Re-run before each release; update this file rather than creating new audit docs.*
