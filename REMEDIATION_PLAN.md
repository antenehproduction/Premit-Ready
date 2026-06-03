# ArchDraw Intel — Remediation Plan

**Date:** 2026-06-01
**Basis:** [AUDIT.md](AUDIT.md) (20 findings) + feature diagnostic (development-options recommendation & competitor research).
**Ordering principle:** availability first (app must not brick) → security before any paid/public exposure → truthfulness/correctness (things that mislead users or create liability) → polish/latent.

Effort key: **S** ≤ ½ day · **M** ~1–2 days · **L** ~3+ days / redesign.
Each task lists: what · files · effort · depends-on · acceptance criteria. ⚑ = needs an owner decision.

---

## PHASE 0 — Stabilize availability (do now)

The app can lock itself out through normal operation. Smallest, highest-urgency changes.

### P0-A · Graceful BYOK fallback when hosted backend is unreachable — **M**
- **Issue:** AUDIT #1. `isConfigured()` only checks strings exist; a paused free-tier Supabase bricks the app (caused today's lockout, recurs ~weekly when idle).
- **Files:** `index.html` (`adiInitAuth` ~4199), `lib/auth.js`, `lib/proxy.js`.
- **Fix:** add a fast reachability probe (HEAD/`/auth/v1/health` with a short `Promise.race` timeout) in `adiInitAuth`; on failure, fall through to `bootstrapStoredKey()`/`probeConnection()` (BYOK) and show a banner ("Hosted service unavailable — using your own API key").
- **Accept:** with Supabase unreachable, the app loads into a usable BYOK state within ~3s; no infinite modal.

### P0-B · Catch thrown network errors in auth submit handlers — **S**
- **Issue:** AUDIT #2. `adiSubmitSignIn`/`adiSubmitSignUp` (and `signIn`/`signUp` in `lib/auth.js`) assume the call returns `{error}`; a thrown `Failed to fetch` leaves the UI stuck on "Creating account…".
- **Files:** `index.html:4269-4288`, `lib/auth.js:142-158`.
- **Fix:** wrap in try/catch; surface "Network error — backend unreachable" and (with P0-A) offer the BYOK path.
- **Accept:** offline sign-up shows a clear error within timeout, no unhandled rejection in console.

### P0-C · Keep the Supabase project warm — **S** ⚑
- **Issue:** root cause of today's outage; free tier pauses after ~7 idle days.
- **Fix:** add a scheduled ping (GitHub Actions cron hitting `/auth/v1/health`, or upgrade tier). ⚑ Owner decides cron vs paid tier.
- **Accept:** a daily job pings the project; pause no longer occurs.

### P0-D · Decide hosted-mode rollout state — **S** ⚑
- **Issue:** AUDIT #3. `getProxyBase()` returns null on `github.io`, so `enabled:true` invites users into a flow the Pages deploy can't finish.
- **Fix:** ⚑ Owner choice — (a) flip `enabled:false` until the Vercel-hosted deploy is the canonical URL, or (b) point production at the Vercel deployment. Pairs with P0-A as the safety net.
- **Accept:** every production URL either completes hosted sign-in→analysis, or cleanly runs BYOK.

---

## PHASE 1 — Security before any paid or public exposure

Do **before** turning on billing or advertising the proxy. Tier 2 is a unit (shared root cause: plan/usage live in client-writable rows the server then counts).

### P1-A · Make quota/billing server-authoritative — **L** ⚑
- **Issues:** AUDIT #5,#6,#7,#8 (+#9,#10,#11).
- **Files:** `supabase/migrations/000X_quota_hardening.sql` (new), `api/ai/[...path].js`, `lib/proxy.js`.
- **Fix:**
  1. **Revoke client writes:** drop `update` on `profiles.plan`/`trial_used`/`stripe_*` and `insert/update` on `analyses` from `authenticated`; clients get SELECT only. Add `WITH CHECK (auth.uid()=id)` + column guards to every update policy.
  2. **Server owns the lifecycle:** the edge function (service role) creates the `running` row and flips it to `completed`.
  3. **Atomic reserve-before-call:** a Postgres `rpc` that increments-and-checks in one statement (or unique-constraint gate) reserved *before* the Anthropic call; #7 (count the table the endpoint writes), #8 (no race).
  4. **Fail closed:** missing service-role key or any usage-read error ⇒ deny (not `used:0`); assert JWT `role='authenticated'`/`aud` (#10).
  5. **Caps:** clamp `max_tokens`, pin/allowlist `model`, bound request body (#11).
  6. ⚑ Decide rolling-30-day vs calendar-month/`plan_renews_at` window (AUDIT Tier-4 note).
- **Accept:** a logged-in user cannot self-upgrade plan, reset usage, or exceed quota via the console or direct endpoint calls; concurrent burst can't double-spend; misconfig denies rather than free-passes.

### P1-B · Close SSRF / open proxies — **M**
- **Issues:** AUDIT #12 (`/diag` open fetch, two copies), #13 (unanchored allowlist regex), #14 (CORS reflects any origin).
- **Files:** `workers/proxy.js`, `api/[...path].js`.
- **Fix:** remove or token-gate `/diag`; replace substring `test(url)` with `new URL(url).hostname` checked against an **anchored** suffix allowlist; reject non-https + RFC-1918/link-local/`169.254.*`; replace `origin||'*'` with an explicit origin allowlist; fix READMEs that claim an allowlist exists.
- **Accept:** `/diag` is gone/gated; `http://169.254.169.254/?x=arcgis` and `https://arcgis.attacker.com/` are rejected; only known origins get CORS.

### P1-C · Remove duplicate AI proxy implementation — **S**
- **Issue:** AUDIT Tier-5. Two AI proxies (`api/[...path].js` vs `api/ai/[...path].js`) → fixes must be doubled or drift.
- **Fix:** delete the dead copy after confirming routing; consolidate.
- **Accept:** one AI path; P1-A/P1-B applied once.

---

## PHASE 2 — Truthfulness & correctness (mislead users / liability)

These make the product assert things it hasn't verified — the heart of the "recommendation isn't tied to zoning" concern.

> **Status (2026-06-02):**
> ✅ **P2-A** done (`bdde35d` + `d09d983`) — entitlement classifier + scorer; recommendation is zone-aware and never picks an illegal program. Deferred sub-items now **also done** (`d09d983`): density cap (HB 1110 `maxUnits`), height-in-feet check, and use-case-driven scoring (risk tolerance / unit target / priority). *Remaining (minor):* no min-lot-area density field exists in the zone schema outside HB 1110 — non-WA density still rides the use-tier gate.
> ✅ **P2-B** done (`b1218df`) — permit-key normalization + alias map (15/15 tests). *Deferred:* worker `/permits` city-list reconciliation (only matters when `ADI_PROXY` is set; entangled with Phase 1 SSRF work).
> ✅ **P2-C** done (`2fffe9c`) — prompt de-fabrication + unverified disclaimer. *Deferred:* re-sequencing comp before opts and feeding real permit hits into the prompt (pipeline-order change — left for a focused pass).
> ✅ **P2-D** done (`b1218df`) — unified `baseCostPerSF()` + FEMA `features`-array gate.

### P2-A · Real, zoning-aware option scorer (replace hardcoded recommendation) — **L**
- **Issue:** Feature diagnostic §1–§2. `recommended:true` is hardcoded on Option 3 ([index.html:1676](index.html#L1676)); the ⭐ "AI Recommended" badge is cosmetic; options ignore use rights, density, height, overlays.
- **Files:** `index.html` (`generateOptions` 1628, `runPhase_opts` 1692), `data/middle-housing.js`, `data/wa-statewide.js`, `data/overlay-registry.js`.
- **Fix:**
  1. **Use-rights gate:** read the district's permitted-use list; do not emit (or clearly flag as "requires variance/CUP") any program the zone doesn't allow. Stop hardcoding `permits:'By-right…'`.
  2. **Density-derived units:** compute unit count from min-lot-area-per-unit / units-per-acre, not `adu?4:2`.
  3. **Height in feet** check, not just stories.
  4. **Consult overlays** (HB 1110 / SB 9 / SB 5184) instead of the `isCA/isWA` branch.
  5. **Score, don't hardcode:** rank by a weighted objective (ROI, risk, and the use-case-advisor goal/budget); the top legal option gets the badge.
  6. **Honest labeling:** rename to "Best fit for your goal" (or keep "AI" only if a model actually scores).
  7. **Liability:** route any "by-right/ministerial" assertion through `architect-advisor`.
- **Accept:** for an R-1 lot the tool no longer offers a 4-plex as "by-right"; the recommended option changes with lot/zone/goal; unit counts respect density caps.

### P2-B · Fix permit-registry key mismatch (unblocks competitor cross-check) — **S**
- **Issue:** AUDIT #15/#16. `permitRegistryKey('San Francisco')→"sanfrancisco"` ≠ key `sf`; regex strips `city` mid-word → cross-check silently dead for SF/NYC/LA/Miami +13.
- **Files:** `data/permit-registry.js:264-267`, `workers/proxy.js:47-55` (sync city list or accept passthrough `?url=`).
- **Fix:** alias map (or key the registry by normalized full name); anchor the `/city(of)?/` strip; reconcile worker `PERMIT_ENDPOINTS`.
- **Accept:** the verified-permit-filings card renders for the major cities; worker no longer 400s on registry cities.

### P2-C · Ground & re-sequence competitor research — **M**
- **Issue:** Feature diagnostic §3. Single ungrounded AI recall invites fabricated projects/permits/prices; output doesn't feed the design; runs after option selection.
- **Files:** `index.html` (`runPhase_comp` 1768, pipeline order).
- **Fix:** lead with the real permit-portal/Socrata + OSM data (post P2-B) and have the model synthesize *from* it; label AI-recalled comparables "illustrative — verify independently"; move a light market pass *before* option selection so it can inform P2-A's score; either feed the recommended innovations/unit-mix back into scoring or stop claiming they're "incorporated"; raise token budget / add a verification pass.
- **Accept:** comparables are grounded or clearly labeled unverified; market intel informs the recommendation; no fabricated permit numbers presented as verified.

### P2-D · Unify cost model + tighten FEMA acceptance — **S**
- **Issues:** AUDIT #18 (two `$/SF` bases disagree, [index.html:1651](index.html#L1651) vs [:1876](index.html#L1876)), #19 (FEMA accepts any non-error JSON).
- **Fix:** extract one `baseCostPerSF(state)` used by both sites; require `Array.isArray(parsed.features)` before accepting a FEMA result.
- **Accept:** identical $/SF for the same project across panels; a non-NFHL JSON response falls through instead of being shown as a flood determination.

---

## PHASE 3 — Polish & latent

Lower impact; batch when touching nearby code. (AUDIT #20, Tier-5.)

- `adiOnSignedIn` double-dispatch + `TOKEN_REFRESHED` paywall pop — **S** (`index.html:4276,4228`).
- Sign-up "check your email" vs `mailer_autoconfirm:true` mismatch + "already registered" handling — **S** (`index.html:4286`).
- `callAIWithRetry`/`callJSONWithRetry` add post-loop `throw` (avoid `undefined`→`fmt()` crash) — **S** (`index.html:792`).
- `valPlan` clamp with `Math.max(0,…)` + log dropped rooms on shallow lots (GEOM-2) — **S** (`index.html:1143`).
- Structural grid label rollover past 'Z' (AA/AB) — **S** (`index.html:3411`).
- `runPhase_comp` clear progress interval in catch — **S** (`index.html:1771`).
- `usage()` dead `quotaNum` lookup — **S** (`lib/auth.js:129`).
- Move Anthropic key out of cleartext `localStorage` (XSS exfil) — **M**, security review (`index.html:894,910`).
- Delete unused SQL `plan_quota()`/`can_run_analysis()` or have the edge fn call them (drift) — **S**.

---

## Sequencing notes

- **Phase 0 is independent** — ship it today; it does not block anything.
- **P2-B (permit keys) is a quick win that unblocks P2-C** — do it early even though it sits in Phase 2.
- **P1-A is the true gate on "P0-1 hosted mode is done"** — no billing until it's complete.
- **P2-A is the highest-leverage correctness fix** and the direct answer to the "recommendation isn't tied to zoning" concern; it depends on the overlay DBs already in `data/`.
- ⚑ Owner decisions to confirm before starting: P0-C (cron vs paid), P0-D (enabled flag / canonical URL), P1-A window semantics (rolling vs calendar) + whether Stripe lands this cycle.

## Suggested first PRs
1. **PR-1 (Phase 0):** P0-A + P0-B + P0-C — availability safety net. Small, high value.
2. **PR-2:** P2-B + P2-D — quick correctness wins, unblock competitor grounding.
3. **PR-3:** P1-B + P1-C — proxy hardening + dedupe.
4. **PR-4 (design-first):** P2-A — zoning-aware scorer (plan before coding).
5. **PR-5 (design-first):** P1-A — quota redesign (plan + migration review before coding).
