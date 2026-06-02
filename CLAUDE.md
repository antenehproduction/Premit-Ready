# ArchDraw Intel — Claude Code Context

## Project overview

Single-file HTML application (`index.html`) that generates permit-ready architectural floor plans for US residential development. No build step. No framework. No npm.

**Live at:** https://antenehproduction.github.io/Premit-Ready (GitHub Pages)

**Agent architecture:** See [AGENTS.md](AGENTS.md) and `.claude/agents/*.md` for the seven-agent model (project-coordinator, site-intel, zoning-legal, use-case-advisor, drawing-engine, architect-advisor, checklist-auto). Every export must pass through `architect-advisor` for the professional-disclosure block.

---

## Current state

**Active branch:** `main`  
**Working version:** v14 (all sprint fixes shipped; parse errors resolved)

### v14 sprint fixes included
- API-3 retry wrappers with exponential backoff (`callAIWithRetry`, `callJSONWithRetry`)
- UX-6 keyboard shortcuts, UX-7 address autocomplete, UX-9 responsive layout
- GEOM-3 min-room-dim filter (IBC §1208.1), GEOM-4 parking stalls
- DRAW-3/6/8/9/10 drawing fixes (baseline, floor restore, door swings, wall thickness, window sill/head annotations)
- CODE-2 per-state energy schedule, CHK-3 CSV checklist export
- PIPE-3/4/5 pipeline robustness (cancel handlers, progress dots)
- `probeConnection()` and `saveKey()` are byte-identical to v13 — still locked, do not alter without confirmed bug report.

### v14 rewrite history (for context)
The original v14 drop had parse errors from unescaped apostrophes in single-quoted string literals (violates critical rule #2) and one comment-swallows-code line. These were fixed before shipping to `main`. `probeConnection`/`saveKey` were never actually changed in v14 — the apparent "API connection bug" was a script parse failure that prevented the entire `<script>` block from executing.

---

## Architecture

Most code lives in `index.html`. Per §7-A decision, P0-1 introduced a small `lib/` split for the auth path; data registries continue to be hand-curated under `data/`.

```
index.html              Orchestration shell (CSS + landing/workspace HTML + inline script)
data/
  auth-config.js          P0-1 — Supabase URL + anon key + HOSTED_KEY flag
  zoning-matrix.js        56-entry zoning DB
  middle-housing.js       HB 1110 overlay (10 WA cities)
  wa-statewide.js         HB 1337 + SB 5184
  county-registry.js      35 verified parcel endpoints
  permit-registry.js      20 permit-portal entries
  overlay-registry.js     hazard overlays
  cost-index.js           BLS PPI inflation multiplier
lib/
  auth.js                 ADIAuth — Supabase Auth wrapper, isHostedMode, signIn/Up/Out, getSession
  proxy.js                ADIProxy — hosted-AI client (callAI routes via /api/ai/messages)
api/[...path].js        Vercel Edge proxy (extended in P0-1 with /api/ai/messages JWT-gated)
supabase/
  migrations/0001_p0_1_auth_schema.sql   profiles + analyses + usage_events + RLS
  README.md                               owner setup guide
```

Inside the inline script:
- State `const S = { ... }` (now with `mode='hosted'` branch added in P0-1)
- LOG system, STATE_DB, API layer (`callAI`/`callJSON`/`callAIWithImg`)
- Connection: `probeConnection()` / `saveKey()` — LOCKED for the BYOK path
- Auth gate: `adiInitAuth()` runs at INIT — picks BYOK or hosted path based on `ADIAuth.isHostedMode()`
- Pipeline 7 phases: site → zone → record → opts → comp → plan → chk
- Map engine, floor plan (`localFloorPlan()`), `renderSheet()`, 3D model, checklist

---

## Critical rules — read before every edit

1. **No AbortController / AbortSignal anywhere** — breaks in Claude.ai iframe (postMessage structured clone). Use `Promise.race([fetch(...), timeoutPromise])` instead.

2. **No escaped apostrophes in JS** — `\'` is invalid outside string literals. Use `"double quotes"` for object keys. Python string generation has caused this bug twice.

3. **probeConnection() and saveKey() are locked** — v13 versions work. Do not alter them without a confirmed bug report. One minimal addition is permitted on success path: `saveKey` persists the verified key to `localStorage.ADI_ANTHROPIC_KEY`, and `bootstrapStoredKey()` loads it on init. `probeConnection` body itself is unchanged.

4. **Model string is `claude-sonnet-4-6`** — do not change to any other string.

5. **callJSON() must accept and forward `timeoutMs`** — signature: `callJSON(msgs, sys, maxTok=2200, timeoutMs=90000)`. Dropping the 4th arg silently defaults to 90s and kills floor plan generation.

6. **Floor plan is local** — `localFloorPlan(z, selectedOption)` has no API call. Do not add one. The timeout issues that plagued v1–v9 were caused by asking AI to generate JSON geometry.

7. **Single file mostly** — keep everything in `index.html` UNLESS the work is in the §7-A approved split set: `data/*.js` (data registries) and `lib/*.js` (auth + hosted-AI proxy only, added in P0-1). Anything else still belongs inline.

8. **Hosted mode is additive** — P0-1 added `S.mode='hosted'` as a third branch in `callAI`/`callAIWithImg`, gated by `ADIAuth.isHostedMode()`. The legacy BYOK path (`bootstrapStoredKey` → `probeConnection` → `saveKey`) must keep working when hosted mode is off. Never delete the BYOK path — feature-flag rollout is the design.

9. **Service-role keys never leave the Edge runtime** — `SUPABASE_SERVICE_ROLE_KEY` and `ANTHROPIC_KEY` only live in Vercel env vars. They must never be read by any code in `index.html` / `lib/*` / `data/*`.

---

## Pipeline phases (v13/v14)

| Phase | Function | API? | Notes |
|-------|----------|------|-------|
| 1 Site | `runPhase_site()` | Yes — callAIWithRetry 1500 tok | Geocodes address via Nominatim |
| 2 Zone | `runPhase_zone()` | Yes — callJSONWithRetry 1500 tok | Returns zoning JSON |
| 3 Records | `runPhase_record()` | No — OSM + FEMA fetch | Non-blocking, CORS-safe |
| 4 Options | `runPhase_opts()` | No — `generateOptions(z)` | Pauses for user selection |
| 5 Comp | `runPhase_comp()` | Yes — callAIWithRetry 1000 tok | Non-critical, no throw |
| 6 Plan | `runPhase_plan()` | No — `localFloorPlan()` | Instant, 0ms |
| 7 Checklist | `runPhase_chk()` | No — static template | Instant, state-aware |

---

## Token budgets (never exceed without testing)

| Call | Tokens | Timeout |
|------|--------|---------|
| Site research | 1500 | 90s default |
| Zoning JSON | 1500 | 90s default |
| Zoning text | 1000 | 90s default |
| Best use | 1000 | 90s default |
| Competitor | 1000 | 90s default |
| Probe / saveKey | 5–10 | 15s / 12s |

---

## External dependencies (CDN only)

```html
three.js r128     cdnjs.cloudflare.com
leaflet 1.9.4     cdnjs.cloudflare.com
jspdf 2.5.1       cdnjs.cloudflare.com
Google Fonts      fonts.googleapis.com
```

---

## Free external APIs used

| API | Purpose | Key? | CORS? |
|-----|---------|------|-------|
| Nominatim OSM | Geocoding + autocomplete | No | OK |
| Esri World Imagery | Satellite tiles | No | OK |
| OSM Overpass | Existing buildings | No | OK |
| FEMA NFHL | Flood zone | No | Blocked in standalone |
| ESRI ArcGIS (county) | Parcel data | No | Sometimes blocked |

---

## Active bugs to fix (v14 → v15)

Priority order:
1. ~~**API-CONN** — probeConnection / saveKey broken in v14~~ — resolved
2. ~~**DRAW-5** — PDF aspect ratio distortion~~ — resolved (914.4×609.6mm)
3. ~~**GEOM-2** — ADU rooms can exceed rear setback~~ — resolved
4. ~~**MAP-6** — Parcel shown as rectangle~~ — resolved (path-drawing when polygon available)
5. ~~**DATA-2** — Cost estimates fixed $/SF~~ — resolved (BLS PPI inflation multiplier)

P0 backlog (per PROJECT_COORDINATOR.md):
- ~~P0-1 hosted-key auth~~ — scaffolding shipped; awaiting owner Supabase URL+anon paste + Vercel env vars + migration run (see supabase/README.md)
- ~~P0-2 Snohomish County registry~~ — done
- ~~P0-3 WA city zoning matrix expansion~~ — done (10 cities)
- ~~P0-4 HB 1110 middle-housing~~ — done
- ~~P0-5 WA permit portals~~ — done (Pierce/Tacoma/Snohomish/Everett/MyBuildingPermit)
- P0-6 Reconcile two Vercel projects — owner decision pending

---

## File history

```
index.html    v14 — sprint fixes, retries, autocomplete, CSV export, responsive layout
archdraw-intel-v14.html  snapshot kept for reference; do not edit
```

Do not create additional versioned files. Git history tracks versions.

---

## Testing checklist before any commit

BYOK path (default — `enabled:false` in `data/auth-config.js`):
- [ ] Paste into browser → no console errors on load
- [ ] Probe fires → shows "Checking connection" then key input (standalone) or "Connected" (Claude.ai)
- [ ] Enter key → "✓ Connected" in under 12s
- [ ] Enter address → Analyze → all 7 phases complete
- [ ] Options panel appears → selecting an option continues pipeline
- [ ] MAP / PLAN / 3D / PDF export all work
- [ ] `node test/middle-housing.test.js` passes (17 groups)

Hosted path (when `localStorage.ADI_HOSTED_KEY=1` OR `enabled:true`):
- [ ] Auth modal appears at INIT instead of BYOK card
- [ ] Sign-up → confirm email → sign-in → analyze runs
- [ ] DevTools Network tab: `/api/ai/messages` carries `Authorization: Bearer eyJ...` (Supabase JWT), NOT `sk-ant-...`
- [ ] Quota exhausted → 402 → paywall banner appears
- [ ] Sign out → auth modal returns
