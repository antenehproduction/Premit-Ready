# ArchDraw — `project-coordinator` Operating Manual

**Companion to:** `AGENTS.md`
**Audience:** the `project-coordinator` agent and the human owner reviewing its work
**Scope:** task backlog, sequencing, and quality standards required to take ArchDraw from current state to **WA launch readiness** (King · Pierce · Snohomish counties)
**Drafted:** April 2026
**Status:** v1.0 — review and amend before adopting

---

## 1. Purpose

`AGENTS.md` defines *who* does what. This document defines *what* needs doing, *in what order*, and *how done is measured*. The `project-coordinator` reads this on every dispatch decision.

If `AGENTS.md` is the org chart, this is the quarterly plan plus the engineering standards.

This document is **not** an addition to `AGENTS.md`'s guardrails. Where my recommendations conflict with existing guardrails (Section 7), the conflict is flagged and the human owner decides — `project-coordinator` does not unilaterally override.

---

## 2. Relationship to existing roster

`project-coordinator` already orchestrates six executors per the `AGENTS.md` dependency graph. This manual changes nothing about the dispatch graph. It adds:

- A **prioritized backlog** (Section 4) with each task routed to the right executor
- **Cross-cutting standards** (Section 5) every PR must satisfy
- A **launch checklist** (Section 6) that defines "done"
- A list of **architectural conflicts** (Section 7) requiring human decisions before work can begin
- **Reporting cadence** (Section 9) so the human owner can track progress without inspecting every PR

Where this document references an agent by name (`site-intel`, `zoning-legal`, etc.) it uses the names from `AGENTS.md`. Where it references a *new* responsibility no current agent owns, it is marked **`[NEW SCOPE]`** and routed to the closest existing agent with a note that the agent's `description` frontmatter may need updating.

---

## 3. Honest current-state assessment

### What's solid

- The 7-agent architecture in `AGENTS.md` is well thought out — clear single-responsibility, real veto mechanism on `architect-advisor`, source-citation discipline on `checklist-auto`.
- Real GIS pulls work: 35 county registries, 14 permit portals, 5 hazard overlay types.
- Data-quality discipline is mature: `_unverified[]` arrays, `verifiedDate` per matrix entry, three-tier lot-dimension fallback (county → OSM → vision-trace).
- The `architect-advisor` disclosure block is legally appropriate.
- Vercel proxy with FEMA endpoint fallback chain is solid engineering.
- CI/CD works: every push to `main` deploys.

### What's not solid

- **No authentication.** BYOK only. Cannot become a paid product without breaking the user contract.
- **Snohomish County is missing** from the county registry — 1 of 3 launch counties has no parcel-data path.
- **Most WA cities are missing** from the zoning matrix (only Seattle + Shoreline). For Bellevue, Tacoma, Everett, Redmond, etc. the app falls back to AI-research mode for setbacks, which hallucinates.
- **WA permit portals are missing** except Seattle. Pierce, Snohomish, Bellevue, Tacoma, Everett — none registered.
- **HB 1110 (WA middle-housing law) is not modeled** as a first-class data structure. It overrides single-family zoning across the entire launch market and is mentioned only in one notes field.
- **No automated test coverage** is visible in the deployed bundle or commit history.
- **271 KB single-file `index.html`** is approaching the limit of what's maintainable in a single file with no framework.
- **`corsproxy.io` is a production fallback** — third-party free service ArchDraw doesn't control.
- **Two Vercel projects exist** in the team (`archdraw` and `production`) — one needs to die or be repurposed.
- **No production observability** — no error tracking, no analytics, no SLO definition.
- **Direct-to-`main` deploys** mean every commit ships immediately. No staging gate.

These are not criticisms of the team; they are the natural debt of a fast-moving prototype that earned the right to become a product. Section 4 turns each into a concrete, routable task.

---

## 4. Priority backlog

**Sequencing rule:** P0 blocks P1 blocks P2 blocks P3. `project-coordinator` does not authorize an executor to start P2 work while a P0 in the same domain is open. Cross-domain parallelism is allowed (e.g., `site-intel` on P0-2 while `zoning-legal` on P0-3).

**Source citation rule:** every research task produces a `source` URL + access date. No exceptions. Inherits from `checklist-auto`'s discipline.

---

### P0 — must complete before any user-facing launch

#### P0-1 · Hosted-key authentication architecture

**Why now:** BYOK is incompatible with paid SaaS, prevents per-user metering, exposes user keys in DevTools, and blocks the HubSpot CRM integration from being meaningful. Every other P1+ item assumes this is done.

**Target architecture:**
- **Supabase Auth** for sign-up / sign-in (email + Google). MCP already connected.
- **Anthropic API key in Vercel env var**, never in client.
- **Supabase Edge Functions** as the AI proxy: `/api/ai/run-phase`, `/api/ai/parcel-trace`, etc. Existing `api/[...path].js` Edge Function pattern extends naturally.
- **Postgres tables** in Supabase: `users`, `analyses`, `usage_events` (for metering).
- **Per-plan rate limits** enforced at the edge: free trial = 1 analysis, paid = N/month.
- **Stripe deferred** — billing is P1, not P0. P0 is the auth + metering substrate; pricing can come later.

**Migration approach:**
- Feature flag `HOSTED_KEY` (read from a `localStorage` key for now, env var later).
- BYOK code path stays alive in parallel for the first wave of dogfooders. No big-bang cutover.
- When `HOSTED_KEY=true`, the client never reads `localStorage.ANTHROPIC_KEY`; all calls go through `/api/ai/*`.

**Routing:**
- `site-intel` **`[NEW SCOPE: backend]`** — owns the Edge Function rewrite. Update its `description` frontmatter to include "edge function authoring."
- `frontend-design` — owns the auth UI screens (sign-up, sign-in, paywall, account page).
- `architect-advisor` — reviews every disclosure-bearing surface to confirm the new auth UI doesn't accidentally drop the disclosure banner.
- `project-coordinator` — owns the integration PR.

**Success criteria:**
- New user signs up with email → confirms → runs 1 free analysis → sees usage counter at 1/1 → second attempt hits paywall screen.
- Existing BYOK users who set `localStorage.ANTHROPIC_KEY` before this PR still work without changes.
- Network tab in DevTools shows no `Authorization: Bearer sk-ant-…` header on any request originating from a hosted-key session.
- Edge function rejects requests without a valid Supabase JWT with HTTP 401.
- Smoke test: 50 concurrent requests from the same user are rate-limited per plan, not allowed to exceed quota.

**Effort estimate:** 5–7 days end-to-end.

---

#### P0-2 · Snohomish County registry entry

**Why now:** 1 of 3 launch counties has no parcel-data path. Every Snohomish address falls through to OSM + vision tracing — slower, more expensive per analysis, lower confidence.

**Source of truth:** Snohomish County GIS — `https://gis.snoco.org/`. Locate the public ArcGIS REST endpoint for parcels, query its metadata (`?f=json`) to get the real field names (do not guess), confirm CORS responds.

**Routing:** `site-intel`

**Success criteria:**
- New entry `WA:Snohomish` in `data/county-registry.js` with `parcelQuery`, correct `fields{}`, `corsOk: true`, `notes`, `assessorURL`.
- Manual smoke test against 3 real Snohomish addresses returns parcel polygon (one each in: incorporated city, unincorporated, near-water).
- Field-name accuracy verified via the layer's metadata endpoint, not assumed from sibling counties.
- `verifiedDate` set to today.

**Effort estimate:** 1–2 hours.

---

#### P0-3 · WA city zoning matrix expansion

**Why now:** matrix covers 2 of ~30 cities in launch market. Bellevue, Tacoma, Everett alone account for the majority of likely launch addresses by population.

**Cities to add (priority order = population × likelihood of dev activity):**

1. Bellevue, WA — R-1, R-5, R-7.5, R-15
2. Tacoma, WA — R-1, R-2, R-3
3. Everett, WA — R-1, R-2
4. Redmond, WA — R-4, R-6, R-8
5. Kirkland, WA — RSA 6, RSA 8
6. Renton, WA — R-4, R-8
7. Bothell, WA — R-9600, R-7200
8. Auburn, WA — R-5, R-7
9. Kent, WA — SR-6, SR-8
10. Federal Way, WA — RS 7.2, RS 9.6

**Routing:** `zoning-legal` — one PR per city, not one PR for all 10. Keeps reviews focused.

**Success criteria per city:**
- All listed districts entered with `frontSetback / rearSetback / leftSetback / rightSetback / maxHeightFt / maxStories / maxFAR / maxLotCoverage / parkingPerUnit / aduAllowed / aduMaxSqFt`.
- Fields the code defines contextually (Chicago-style) marked `null` and added to `_unverified[]`.
- `codeURL` points at the live municipal-code section, not a portal homepage.
- `verifiedDate` is today.
- HB 1110 implications noted in `notes` (see P0-4 — these two ship together).

**Effort estimate:** 4–6 hours per city × 10 = ~1 week of `zoning-legal` time.

---

#### P0-4 · HB 1110 middle-housing as first-class data

**Why now:** WA's middle-housing law overrides single-family zoning across most of King/Pierce/Snohomish. A Bellevue R-5 lot can typically support 4 units (6 near transit) regardless of base zoning. Returning the pre-1110 single-family numbers is a wrong answer to the developer's question "what can I build here."

**Schema change to `data/zoning-matrix.js`:** add a top-level `middleHousing` block per city OR as a separate matrix keyed by jurisdiction:

```javascript
window.MIDDLE_HOUSING_DB = {
  'bellevue,wa': {
    statuteName: 'WA HB 1110',
    populationTier: 'tier1',          // tier1 ≥75k, tier2 25–74k
    baseUnits: 4,
    transitProximityBonus: {
      maxUnits: 6,
      criteria: 'within 0.25mi of major transit stop',
      majorTransitDefinition: 'WSDOT high-capacity transit list',
    },
    affordabilityBonus: {
      maxUnits: 6,
      criteria: 'one unit ≤80% AMI for ≥50yr covenant',
    },
    effectiveDate: '2025-06-30',
    overridesBaseZoning: true,
    exceptions: ['critical areas', 'historic districts'],
    codeURL: 'https://app.leg.wa.gov/RCW/default.aspx?cite=36.70A.635',
    cityImplementation: 'https://bellevuewa.gov/...',
    verifiedDate: '2026-04',
    _unverified: [],
  },
  // …
};
```

**Routing:** `zoning-legal` (research + entries) → `architect-advisor` (review whether HB 1110 entries should change RDP-required flagging on certain projects) → `drawing-engine` (downstream — does the renderer need to know about unit count to compose a 4-plex layout?).

**Success criteria:**
- New file `data/middle-housing.js` checked in with all 10 P0-3 cities populated.
- A new function `effectiveZoning(jurisdiction, district)` merges base zoning + middle-housing overlay, returning a single envelope object the rest of the pipeline consumes.
- A test fixture: same Bellevue R-5 address evaluated with HB 1110 enabled vs disabled returns different unit counts and footprints.
- The Site phase output explicitly states "Base zoning: 1 unit. HB 1110 effective: up to 4 units (6 near transit)." Never a silent override.

**Effort estimate:** 2–3 days of research + schema + 10-city fill, plus 1–2 days for `drawing-engine` integration if multi-unit massing isn't already supported.

---

#### P0-5 · WA permit portals expansion

**Why now:** comp phase can't cross-check real permit history in 9 of 10 launch cities. Today only Seattle has a registered portal.

**Sources:**
- **Seattle** — already done (Socrata).
- **MyBuildingPermit.com** — single Accela tenant covers ~17 King Co cities including Bellevue, Bothell, Kirkland, Kenmore, Mercer Island, Sammamish, Issaquah, Snoqualmie. **One integration unlocks them all.**
- **Pierce County / Tacoma / Lakewood** — Pierce uses Accela; check for public Socrata or ArcGIS endpoint.
- **Snohomish County / Everett** — `mySnoco` portal; investigate API.

**Routing:** `site-intel`

**Success criteria:**
- `data/permit-registry.js` adds entries for `mybuildingpermit` (covering its tenant cities), `tacoma`, `pierce_county_unincorp`, `everett`, `snohomish_county_unincorp`.
- `searchByAddress` and `radiusSearch` builders work per the existing pattern.
- Verified with one real address per portal.
- Where a portal has no public API (web-only search), entry is added with `searchByAddress: null` and a `portalURL` so `checklist-auto` can still link the user there.

**Effort estimate:** 2–3 days.

---

#### P0-6 · Reconcile two Vercel projects

**Why now:** the team has both `archdraw` and `production` as separate Vercel projects. If both receive deployments, environment drift and split-brain bugs are inevitable.

**Routing:** human owner decides which is canonical, then `project-coordinator` deletes or repurposes the other. No agent action until decision is made.

**Success criteria:**
- One Vercel project is the source of truth for production.
- The other is deleted, archived, or repurposed (e.g., a staging environment).
- `vercel.json` and any environment variables are reconciled.

**Effort estimate:** 30 minutes after decision.

---

### P1 — required for paid product but not for first dogfooders

#### P1-1 · Stripe billing integration

Pre-requisite: P0-1 is shipped and stable. Routes through Supabase Edge Functions. Standard Stripe Checkout + webhook pattern. Plans: `free` (trial) → `pro` ($X/mo, N analyses) → `team` (multi-seat). No agent currently owns billing — recommend adding `[NEW SCOPE: billing]` to `site-intel` or creating an 8th agent.

#### P1-2 · Replace `corsproxy.io` fallback with own infra

Audit every call site that falls back to `corsproxy.io`. Either route everything through the existing Vercel Edge proxy (preferred) or stand up a Cloudflare Worker as a second proxy. Goal: zero third-party-controlled hops in the production data path.

**Routing:** `site-intel`.

#### P1-3 · Production observability

Add error tracking (Sentry), uptime monitoring (Better Stack or Vercel built-in), and a minimal analytics dashboard (Vercel Analytics or PostHog). Define 3 SLOs: time-to-first-record, time-to-first-drawing, % of analyses that complete all 7 phases without error.

**Routing:** `site-intel` **`[NEW SCOPE: observability]`**.

#### P1-4 · Caching layer for AI calls

Vision parcel tracing is currently in-memory only — lost on refresh, costs ~$0.01 per call. Move to Supabase Postgres cache keyed on `(lat, lon, zoom)`. Same for any AI call that's deterministic given inputs (zoning interpretation for a given parcel).

**Routing:** `site-intel`.

#### P1-5 · Output PDF quality audit

`jsPDF` is fine for prototype but professional permit drawings often need precise vector control `jsPDF` struggles with. Evaluate `pdf-lib` or `pdfmake`. Decision: keep `jsPDF` if output meets King County e-permit standards on a real submittal test; switch otherwise.

**Routing:** `drawing-engine`.

#### P1-6 · Per-jurisdiction sheet templates

Permit packages have standardized title blocks, sheet numbering, and required sheets per jurisdiction. Today the renderer produces one generic template. Add a `data/sheet-templates.js` keyed by jurisdiction with title-block layout, required cover info, sheet sequence.

**Routing:** `drawing-engine` + `site-intel` (research per-city requirements).

---

### P2 — quality, maintainability, future-proofing

#### P2-1 · Test coverage

No automated tests visible. At minimum:
- Unit tests for `effectiveZoning()` (the HB 1110 merger function from P0-4)
- Unit tests for `countyRegistryKey()` and `permitRegistryKey()` normalizers
- Integration test: known address → expected envelope (golden-file pattern)
- Smoke test in CI: deploy to a preview, hit the homepage, confirm 200

**Routing:** every executor owns tests for code they wrote going forward. Backfill assigned to `site-intel` for data-layer normalizers.

#### P2-2 · Field-name normalization in county registry

Some entries use `'SHAPE_Area'`, others `'shape_area'`. The dispatcher should case-normalize before lookup. Audit + fix.

**Routing:** `site-intel`.

#### P2-3 · `yearBuilt: null` backfill

~10 county entries have `yearBuilt: null` because the data lives on a separate CAMA table. For each, investigate whether a second endpoint can be joined client-side.

**Routing:** `site-intel`.

#### P2-4 · Bundle vendor libraries

`Three.js`, `Leaflet`, `jsPDF` are loaded from `cdnjs.cloudflare.com`. CDN outage → app is broken. Bundle them or self-host on the same Vercel deployment.

**Routing:** `frontend-design`.

#### P2-5 · Mobile / responsive layout

The deployed CSS uses `overflow:hidden` on `html, body` — desktop-only by design. The field-use case (developer on a site visit pulling the address up on phone) needs at least a read-only mobile view of completed analyses.

**Routing:** `frontend-design`.

#### P2-6 · Accessibility audit

Vanilla JS apps with custom UI rarely pass WCAG. Target: keyboard navigation works for all primary flows; ARIA labels on the API-key card and address input; focus visible on all interactive elements.

**Routing:** `frontend-design`.

#### P2-7 · Output validation layer between AI and renderer

When an AI call returns an envelope (setbacks, FAR, etc.), validate against a schema before the renderer consumes it. A hallucinated `frontSetback: -5` should fail loudly, not draw a building in the street.

**Routing:** `drawing-engine` (consumer side) + `architect-advisor` (defining the validation rules).

#### P2-8 · `verifiedDate` staleness surfacing

Zoning codes change. After 12 months, a `verifiedDate` is suspect. Add a `_stale` boolean computed at runtime; surface in the UI as "this entry was verified 14 months ago — verify with the jurisdiction before relying on it."

**Routing:** `zoning-legal` defines the threshold; `frontend-design` surfaces in UI.

---

### P3 — defer until P0+P1 done

- Single-file refactor (see Section 7-A — needs human decision)
- TypeScript migration (see Section 7-B)
- 8th agent for billing (see P1-1 routing note)
- Multi-language support
- White-label for architect firms
- Comparable-image scraping for richer comps

---

## 5. Cross-cutting workflow standards

These apply to every PR from every executor. `project-coordinator` rejects PRs that don't satisfy them.

### 5.1 Git workflow

- Feature branches only. No direct commits to `main` from executors. (`project-coordinator` may merge.)
- Branch naming: `agent/<agent-name>/<short-slug>` — e.g., `agent/site-intel/snohomish-registry`.
- PRs target `main`. Production deploys on merge.
- Every PR description states: (a) the backlog item ID it addresses, (b) the success criteria from this manual it satisfies, (c) anything in the success criteria it does *not* satisfy and why.

### 5.2 Source citations

- Every data-layer change cites a primary source (municipal code URL, GIS service docs, statute text). Wikipedia and forum posts are not primary sources.
- The citation goes in the PR description AND in the file's `notes` field where relevant.

### 5.3 The `_unverified[]` discipline

When an executor cannot find an authoritative value for a field, the field is `null` and added to `_unverified[]`. **Never invent a number to fill a gap.** This rule inherits from existing `zoning-matrix.js` practice and is now mandatory across all data files.

### 5.4 Disclosure preservation

Any change to the export pipeline, the rendering pipeline, or the cover-sheet template must be reviewed by `architect-advisor`. The disclosure block (per `AGENTS.md` veto section) must remain on A-0 cover and as footer on every sheet, verbatim.

### 5.5 Test requirements

- New data-layer functions: unit tests required.
- New UI components: at minimum a render-without-error smoke test.
- Bug fixes: regression test that fails before the fix and passes after.

### 5.6 Deployment gates

- `main` auto-deploys to production. This is the current behavior and stays in place for now.
- Add a manual gate (Vercel "skip deploy" label or branch protection) for any PR that touches the auth path (P0-1) or the disclosure block.
- Critical incidents (production down, wrong output served): `project-coordinator` may roll back via Vercel directly without waiting for an agent dispatch.

### 5.7 Existing guardrails inherited from `CLAUDE.md` / `AGENTS.md`

- No `AbortController` / `AbortSignal` — use `Promise.race` with plain timeout.
- No escaped apostrophes outside string literals.
- `probeConnection()` and `saveKey()` are locked.
- Model string is `claude-sonnet-4-6` (see Section 7-C — recommended re-evaluation post P0-1).
- `callJSON()` / `callJSONWithRetry()` must forward `timeoutMs`.
- Floor-plan geometry is local; no API calls during rendering.
- Single-file constraint (see Section 7-A — recommended re-evaluation).

---

## 6. Definition of Done — WA launch checklist

When every line below is checked, ArchDraw is ready for WA launch announcement. Not before.

### Data coverage
- [ ] `WA:King`, `WA:Pierce`, `WA:Snohomish` all in `county-registry.js` with verified field schemas
- [ ] Top 10 WA cities (P0-3) in `zoning-matrix.js` with no missing required fields outside `_unverified[]`
- [ ] HB 1110 entries in `middle-housing.js` for all 10 cities
- [ ] WA permit portals (P0-5) registered, including MyBuildingPermit.com tenant set
- [ ] Smoke test: 5 real addresses across the 3 counties, each producing a complete 7-phase analysis without falling through to vision-trace

### Architecture
- [ ] Hosted-key auth (P0-1) live for new sign-ups; BYOK preserved for existing users
- [ ] Anthropic API key never visible in browser DevTools on hosted path
- [ ] Per-user usage metering active in Supabase
- [ ] Free trial → paywall flow works end-to-end
- [ ] Single Vercel project (P0-6) is canonical; the other is deleted or archived
- [ ] Sentry or equivalent capturing production errors

### Quality
- [ ] All P0 items shipped
- [ ] Test coverage on `effectiveZoning()`, `countyRegistryKey()`, `permitRegistryKey()`
- [ ] Disclosure block verified present on A-0 cover and every sheet footer
- [ ] No production calls fall back to `corsproxy.io` (P1-2 done OR fallback is gated behind a feature flag visible in logs)

### Legal posture
- [ ] Marketing copy reviewed by `architect-advisor` for any "permit-ready" claim creep
- [ ] Terms of Service include the disclosure language
- [ ] Sign-up flow includes affirmative acceptance of the disclosure

### Operational
- [ ] On-call escalation defined for the human owner
- [ ] Rollback procedure documented (Vercel one-click + DB migration reversibility)
- [ ] First-week launch SLOs defined and dashboarded

---

## 7. Architectural conflicts requiring human decision

Three of my recommendations conflict with existing guardrails. `project-coordinator` does not unilaterally resolve these. The human owner decides; the decision is documented here and in `AGENTS.md`.

### 7-A · Single-file constraint vs. growing complexity

**Existing guardrail:** "Single-file: all code lives in `index.html` unless splitting is explicitly requested."

**Tension:** the file is 271 KB and growing. With 7 agents producing output and the auth/billing layer pending, the orchestration logic in `index.html` will keep ballooning. Code review at this size is hard, regression risk grows non-linearly with file size, and editor tooling slows down past ~5K LOC in one HTML file.

**Options:**
1. **Keep single-file** — accept the cost; mitigate with strict section markers (`// ═══ AUTH ═══`) and a CI check on file size to force conscious decisions.
2. **Split data files only** — `data/*.js` already exists; expand to `lib/auth.js`, `lib/proxy.js`, `lib/render.js`. `index.html` keeps the orchestration shell.
3. **Migrate to a framework** — Vite + React or Vite + Svelte. Largest disruption; biggest long-term payoff.

**Recommendation:** Option 2 for now. Defer Option 3 to P3.

**Decision needed by:** before starting P0-1 (auth code is too big to live cleanly in `index.html`).

### 7-B · TypeScript migration

**Existing guardrail:** none, but the codebase is vanilla JS.

**Tension:** with multiple agents producing data structures consumed by other agents (`UseCaseBrief`, zoning envelope, record pack), runtime shape mismatches will keep biting. TypeScript catches these at edit time.

**Recommendation:** start with `.d.ts` type declarations for the data files (`zoning-matrix.d.ts`, `county-registry.d.ts`). No runtime change. Adopt `// @ts-check` in `lib/*.js` files as Option 7-A creates them.

**Decision needed by:** P1 phase.

### 7-C · Model selection

**Existing guardrail:** "Model string is `claude-sonnet-4-6`."

**Tension:** Sonnet is fast and cheap, appropriate for most calls. But the harder reasoning tasks (zoning code interpretation, RDP-trigger detection, multi-source brief corroboration) may benefit from Opus 4.7. With hosted-key auth (P0-1), per-call cost shifts from user to ArchDraw, so model selection becomes a margin question, not a user-cost question.

**Recommendation:** route by task class.
- `site-intel` parcel data: Sonnet (fast, deterministic).
- `architect-advisor` RDP detection: Opus (high-stakes, low-volume).
- `zoning-legal` matrix authoring: Opus (precision matters).
- `use-case-advisor` Q&A: Sonnet.
- `drawing-engine` parameter extraction: Sonnet.

**Decision needed by:** P0-1 ship.

---

## 8. Open questions for the human owner

Things `project-coordinator` cannot decide alone. Answers feed back into this document.

1. **Pricing.** What's the free-trial allowance? What's the paid tier price and quota? (Drives Stripe integration design in P1-1.)
2. **Branding finalization.** Is the product called "ArchDraw" long-term? The Vercel project, repo, and domains all use it; locking it in unblocks domain purchase, logo, marketing.
3. **Geographic expansion sequencing.** After WA launch, which market next? CA (already 5 counties registered), OR (Portland already in matrix), or stay-in-WA depth (add all 30 cities)?
4. **Architect partnership model.** "Drafts for architect review" implies a downstream architect workflow. Is ArchDraw planning to operate a marketplace of stamp-ready architects? Self-service hand-off? Both?
5. **Liability insurance.** At what point in user growth does E&O insurance become necessary? (Talk to a broker; not a `project-coordinator` decision.)
6. **Two Vercel projects (P0-6).** Which is canonical: `archdraw` or `production`?
7. **Single-file (Section 7-A) and TypeScript (7-B) decisions.**

---

## 9. Reporting cadence

`project-coordinator` produces three artifacts on a regular cadence:

### Daily — backlog state
A short status update committed to `STATUS.md` in the repo root, listing:
- Items moved to `in-progress` today (with assignee agent and PR link)
- Items moved to `done` today (with PR link)
- Blockers surfaced
- Decisions awaiting the human owner

### Weekly — risk review
Posted in PR description of a `weekly-risk-review` PR (no code, just markdown):
- Items that have been `in-progress` >7 days (why)
- New risks identified
- Items where the success criteria turned out to be wrong
- Suggested re-prioritization, if any

### Per launch-checklist line — ship report
When a checkbox in Section 6 is satisfied, `project-coordinator` opens a PR titled `[launch-checklist] <line text>` that:
- Quotes the success criteria from this document
- Demonstrates each criterion is met (test output, screenshot, smoke-test transcript)
- Updates Section 6 to check the box
- Tags the human owner for sign-off before merge

Once all boxes in Section 6 are checked, `project-coordinator` opens the final `[launch] WA market ready` PR and stops dispatching new P0/P1 work until the human owner decides whether to ship.

---

## Appendix A — How to amend this document

This document is owned by the human owner. `project-coordinator` may **propose** amendments (in the form of a PR against this file) but does not commit them unilaterally. Common reasons to amend:

- A success criterion turned out to be wrong or unmeasurable
- A new P0 issue was discovered (rare; most should fit existing categories)
- A guardrail conflict (Section 7) was resolved — record the decision
- An agent's scope was expanded in `AGENTS.md` and a `[NEW SCOPE]` annotation here is now stale

When in doubt, propose; do not assume.

---

*End of document.*

