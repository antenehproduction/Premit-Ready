# ArchDraw Intel — AI Permit Architect

> AI-powered architectural analysis, floor plan generation, and permit-ready drawing set for US residential development. Single HTML file. No installation.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-blue)](https://antenehproduction.github.io/archdraw)

---

## What it does

Enter any US property address. ArchDraw Intel:

1. **Researches the site** — jurisdiction, county assessor parcel polygon, OSM existing buildings, FEMA flood zone
2. **Pulls live zoning data** — setbacks, FAR, height limits, ADU rights, permitted uses (verified against the 56-entry zoning matrix; falls back to AI research)
3. **Applies WA HB 1110 + HB 1337 + SB 5184** — middle-housing unit floors, ADU rules, parking caps modeled as first-class data and surfaced in the zoning panel
4. **Searches county records** — verified ArcGIS parcel endpoints (35 counties), OSM Overpass, FEMA NFHL, Socrata permit feeds
5. **Presents 2–5 development options** — cost estimates (BLS PPI inflation-adjusted), ROI, timeline, green certifications
6. **Researches 2019–2024 comparables** — competitor projects, design innovations, structural improvements
7. **Generates expert floor plans** — IBC-compliant room dimensions, structural bay grid, irregular parcel polygons
8. **Produces a complete permit drawing set** — 6 sheets (A-0 Cover through A-5 Schedules), exact 36"×24" PDF
9. **Builds a jurisdiction-specific permit checklist** — 50-state codes, FEMA + historic + hillside + coastal + fire + liquefaction overlays, fee estimates

---

## Quick start

### Claude.ai (no key required)
Open the [live demo](https://antenehproduction.github.io/archdraw) — API is pre-authorized inside Claude.ai.

### Standalone Chrome
1. Download `index.html`
2. Open directly in Chrome
3. Enter your Anthropic API key (`sk-ant-...`) from [console.anthropic.com](https://console.anthropic.com/settings/keys)

Cost: ~$0.03–$0.08 per full analysis.

### URL toggles
- `?legacy=1` — revert from the vault landing UI (default) to the original dark-card landing for A/B comparison.

---

## Features

| Feature | Details |
|---------|---------|
| 🎬 Vault landing UI | Blueprint background, "credentials verified" flash, unrolling-paper form (`?legacy=1` reverts) |
| 🛰️ Satellite map | Esri World Imagery + OSM building footprints via Leaflet |
| 📐 Instant floor plans | Local geometry engine — no AI timeout, always completes; rear-setback-aware room placement |
| 🗺️ Irregular parcel | County-verified polygon path-rendered (not rectangle) when available |
| 📄 PDF permit set | 36"×24" sheets, exact aspect ratio: Cover, Site Plan, Floor Plans, Elevations, Sections, Schedules |
| 🏗️ 3D massing | Three.js model with hip roof, orbit controls |
| 📋 50-state checklist | FEMA auto-detect, 6 overlay types, fee estimates |
| 🎯 Development options | 2–5 programs with cost/ROI/green cert comparison; BLS PPI inflation-adjusted |
| ✏️ Expert design | PhD architect prompt, structural member sizes, passive solar specs |
| 🏘️ HB 1110 / HB 1337 / SB 5184 | WA middle-housing law modeled as first-class data; effective unit count + ADU floor + parking cap surfaced per parcel |
| ⌨️ Keyboard shortcuts | ← → sheets, F=fit, M=map, P=plan, 3=3D, Esc=close |
| 📍 Address autocomplete | Nominatim-powered suggestions |
| 📥 CSV checklist export | Download permit tracking sheet |

---

## WA launch coverage

Permit-data verified for the launch market (King + Pierce + Snohomish + Tacoma):

| Jurisdiction | Permit data | Zoning matrix |
|---|---|---|
| Seattle | ✓ Socrata `76t5-zqzr` | NR1 / NR2 |
| Bellevue | via MyBuildingPermit | LL-1 / SR-4 / LDR-1 / MDR-1 + legacy R-X duals |
| Tacoma | ✓ ArcGIS `accela_permit_data` | UR-1 / UR-2 / UR-3 + R-X stubs |
| Everett | ✓ Socrata `3w3u-656c` Trakit Permits | NR-C / NR + legacy R-1/R-2 |
| Redmond | via MyBuildingPermit | NR / NMF + legacy R-X stubs |
| Kirkland | via MyBuildingPermit | RSA 6 / RSA 8 |
| Auburn | via MyBuildingPermit | R-2 + legacy R-5/R-7 stubs |
| Bothell | via MyBuildingPermit | R-L1 / R-L2 + legacy R-9600/R-7200 stubs |
| Renton | via MyBuildingPermit | R-4 / R-8 |
| Kent | via MyBuildingPermit | SR-6 / SR-8 |
| Federal Way | via MyBuildingPermit | RS 7.2 / RS 9.6 |
| Pierce County (unincorp.) | ✓ Socrata `nhnt-v7ka` | — |
| Snohomish County (unincorp.) | ArcGIS `Issued_Permits` (radius search) | — |

Counties: `WA:King`, `WA:Pierce`, `WA:Snohomish` parcel endpoints all verified by automated smoke test.

---

## Stack

- **Mostly single HTML file** (`index.html`) — zero build step, zero install. Per §7-A decision, P0-1 added a small `lib/` split for auth (`lib/auth.js`, `lib/proxy.js`); data registries continue under `data/*.js`.
- **Anthropic Claude** — Sonnet 4.6 for fast deterministic research; Opus 4.7 routing planned for high-stakes reasoning (RDP detection, zoning interpretation)
- **Supabase** — Auth + Postgres + RLS for the hosted-key path. P0-1 scaffolding shipped (`lib/auth.js`, `supabase/migrations/0001_p0_1_auth_schema.sql`); flip on by pasting Supabase URL+anon key into `data/auth-config.js` and setting Vercel env vars per `supabase/README.md`. Default is BYOK so existing users see no change.
- **Vercel Edge Functions** (`api/[...path].js`) — CORS proxy for FEMA, county ArcGIS, Socrata, municipal codes; extended in P0-1 with `/api/ai/messages` (JWT-gated, server-side Anthropic key, per-plan quota)
- **GitHub Actions** — schema-fetch + smoke-test workflows that auto-PR new permit-portal schemas to the registry; bypasses Cloudflare anti-scrape walls via runner egress
- **Leaflet.js** — satellite map (Esri World Imagery tiles)
- **Three.js** — 3D massing model
- **jsPDF** — permit drawing PDF export

External free APIs: OSM Overpass, FEMA NFHL, Nominatim, BLS PPI (cost index).

---

## Drawing sheets

| Sheet | Content | Scale |
|-------|---------|-------|
| A-0 | Cover — project data, code compliance, sheet index | N.T.S. |
| A-1 | Site plan — parcel polygon, setbacks, footprint, parking | 1/8"=1'-0" |
| A-2 | Floor plans — all levels, structural grid, IBC room dims | 1/4"=1'-0" |
| A-3 | Exterior elevations — all 4 sides, windows, materials | 1/4"=1'-0" |
| A-4 | Building sections — 2 sections, foundation, insulation | 1/4"=1'-0" |
| A-5 | Door/window schedule + energy compliance table | N.T.S. |

PDF page is exactly 914.4×609.6 mm (= 36"×24") with no aspect-ratio distortion.

---

## Optional backend proxy

For CORS-blocked data sources (FEMA, county ArcGIS, municipal codes, Socrata), deploy the proxy on either platform:

- **Vercel Edge Functions** → see [`api/README.md`](api/README.md). Git-deploy via web UI, no CLI required, free tier 100K invocations/day. **Auto-detected by the client when running on `*.vercel.app`** — no configuration needed.
- **Cloudflare Workers** → see [`workers/README.md`](workers/README.md). CLI deploy in 5 min, free tier 100K req/day.

The client uses `localStorage.ADI_PROXY` to point at a deployed proxy URL. **No third-party fallback** — standalone users without a proxy see a clear error directing them to set `ADI_PROXY` (the legacy `corsproxy.io` hop was removed for the production data path).

---

## Repository layout

```
index.html              ~290 KB orchestration shell
data/
  auth-config.js            P0-1 Supabase URL + anon key + HOSTED_KEY flag (placeholder values)
  zoning-matrix.js          56 entries × ~30 fields each
  middle-housing.js         WA HB 1110 overlay (10 cities)
  wa-statewide.js           HB 1337 + SB 5184
  county-registry.js        35 verified parcel endpoints
  permit-registry.js        20 permit-portal entries (4 WA-launch graduated)
  overlay-registry.js       FEMA / historic / hillside / coastal / fire / liquefaction
  cost-index.js             BLS PPI inflation multiplier (quarterly)
  _socrata-schemas.json     bot-maintained Socrata field schemas
  _arcgis-schemas.json      bot-maintained ArcGIS layer schemas
lib/                      P0-1 split (per §7-A decision)
  auth.js                   ADIAuth — Supabase client wrapper, sign-in/up/out, isHostedMode
  proxy.js                  ADIProxy — hosted-AI client (JWT → /api/ai/messages)
api/[...path].js        Vercel Edge proxy + /api/ai/messages (P0-1)
supabase/
  migrations/0001_p0_1_auth_schema.sql   profiles + analyses + usage_events + RLS
  README.md                               owner setup guide
workers/proxy.js        Cloudflare Worker alternative
scripts/
  fetch-socrata-schemas.py  Pulls + normalizes Socrata dataset metadata
  fetch-arcgis-schemas.py   Pulls AGO Hub items + ArcGIS REST layer metadata
  sync-permit-registry.py   Ranks dataset candidates by permit-shapedness
  smoke-snohomish-parcels.py  P0-2 acceptance smoke test
  integrate-charts.py       Auto-extract dimensional values from chart HTML
  extract-viewsource.py     Decoder for Chrome view-source HTML saves
test/
  middle-housing.test.js    17 test groups; pure Node, no framework
.github/workflows/
  fetch-schemas.yml         Daily Socrata + ArcGIS schema refresh; auto-PR
  smoke-county-parcels.yml  Weekly P0-2 smoke test
```

---

## Development

This project is maintained as a single `index.html` file for maximum portability. Claude Code is the primary development tool.

```bash
git clone https://github.com/antenehproduction/archdraw.git
cd archdraw
# Open index.html in Chrome to run locally
node test/middle-housing.test.js   # 17 test groups
# Use Claude Code for AI-assisted development
```

See [CLAUDE.md](CLAUDE.md) for architecture details and critical rules. See [PROJECT_COORDINATOR.md](PROJECT_COORDINATOR.md) for the priority backlog and launch checklist. See [STATUS.md](STATUS.md) for daily progress notes.

### Multi-agent dispatch

The project uses a 7-agent model — `project-coordinator`, `site-intel`, `zoning-legal`, `use-case-advisor`, `drawing-engine`, `architect-advisor`, `checklist-auto`. Every export passes through `architect-advisor` for the professional-disclosure block. See [AGENTS.md](AGENTS.md) for the dispatch graph.

---

## License

MIT — free to use, modify, and distribute.
