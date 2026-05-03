// ═══ ZONING_MATRIX_DB — hand-curated development standards by jurisdiction × district ═══
// When runPhase_zone matches a jurisdiction + district, we return the verified matrix
// instead of relying on AI research. Supplements municipal code text with a structured
// values object the drawing engine can consume directly.
//
// Each entry sits under `<jurisdiction>:<district_code>` (case-insensitive lookup).
// Values from the most recent published municipal code as of {{CHECKED_DATE}}.
// Always annotate with codeURL so users can verify.
//
// Scope for v1: top ~10 residential jurisdictions; expand as needed.

window.ZONING_MATRIX_DB = {
  // ── Seattle, WA ──
  'seattle,wa:NR1': {
    jurisdiction: 'Seattle', state: 'WA', district: 'NR1',
    fullName: 'Neighborhood Residential 1',
    codeURL: 'https://library.municode.com/wa/seattle/codes/municipal_code?nodeId=TIT23LAUSCO',
    frontSetback: 15, rearSetback: 25, leftSetback: 5, rightSetback: 5,
    maxHeightFt: 30, maxStories: 2, maxFAR: 0.5, maxLotCoverage: 35,
    parkingPerUnit: 1, aduAllowed: true, aduMaxSqFt: 1000,
    densityBonus: null, sb9Eligible: false,
    notes: 'Single-family + one ADU or one DADU; Mandatory Housing Affordability overlay may allow more.',
    verifiedDate: '2025-01',
  },
  'seattle,wa:NR2': {
    jurisdiction: 'Seattle', state: 'WA', district: 'NR2',
    fullName: 'Neighborhood Residential 2',
    codeURL: 'https://library.municode.com/wa/seattle/codes/municipal_code?nodeId=TIT23LAUSCO',
    frontSetback: 15, rearSetback: 25, leftSetback: 5, rightSetback: 5,
    maxHeightFt: 30, maxStories: 2, maxFAR: 0.65, maxLotCoverage: 40,
    parkingPerUnit: 1, aduAllowed: true, aduMaxSqFt: 1000,
    densityBonus: null, sb9Eligible: false,
    verifiedDate: '2025-01',
  },

  // ── Shoreline, WA ──
  'shoreline,wa:R-6': {
    jurisdiction: 'Shoreline', state: 'WA', district: 'R-6',
    fullName: 'Residential 6 du/ac',
    codeURL: 'https://www.codepublishing.com/WA/Shoreline/',
    frontSetback: 20, rearSetback: 15, leftSetback: 5, rightSetback: 5,
    maxHeightFt: 30, maxStories: 2, maxFAR: 0.5, maxLotCoverage: 35,
    parkingPerUnit: 2, aduAllowed: true, aduMaxSqFt: 1200,
    densityBonus: 'Affordable housing density bonus (20% affordable = +25% density)',
    sb9Eligible: false,
    notes: 'HB1110 middle-housing bill effective 2025 may override caps for 4-plex in transit areas.',
    verifiedDate: '2025-01',
  },

  // ── Bellevue, WA ──
  'bellevue,wa:R-1': {
    jurisdiction: 'Bellevue', state: 'WA', district: 'R-1',
    fullName: 'Single-Family Residential Estate District (1 du/acre) — maps to current LL-1',
    codeURL: 'https://bellevue.municipal.codes/LUC/20.20.010',
    frontSetback: 35, rearSetback: 25, leftSetback: 5, rightSetback: 5,
    maxHeightFt: 30, maxStories: 2,
    maxFAR: 0.5,
    maxLotCoverage: 35,
    parkingPerUnit: null,
    aduAllowed: true, aduMaxSqFt: 1200,
    densityBonus: null, sb9Eligible: false,
    notes: 'ZONE-RENAME FINDING (2026-04-24 manual copy): Bellevue LUC 20.20.010 Chart now uses LL-1 / LL-2 / SR-1..SR-4 / LDR-1..3 / MDR-1..2 codes. Legacy R-1 ≈ LL-1 (estate tier, min lot 35,000 sf; front 35ft, rear 25ft, side min 5ft + combined 20ft total). Side-yard combined-total rule: each ≥5ft, both sides ≥20ft total for LL-1. Height 30ft base to flat roof / 35ft to ridge (footnote 44); FAR 0.5 tiered (first 10,000sf @ 0.5; remainder @ 0.3). ADU max 1,200 sf per LUC 20.20.390 (Ord 6746, 2024). HB 1110 (Ord 6851, eff 2025-07-01): Tier 1 — 4 du citywide by right, 6 near major transit; middle-housing cap 32ft flat / 35ft ridge (LUC 20.20.538). Zoning MAP may still label parcels "R-1" (open data portal lag); chart uses LL-1. Site-intel should match either string.',
    verifiedDate: '2026-04-24',
    _sourceMethod: 'manual',
    _sourceSnapshot: '2026-04-24',
    _unverified: ['parkingPerUnit'],
  },
  'bellevue,wa:R-5': {
    jurisdiction: 'Bellevue', state: 'WA', district: 'R-5',
    fullName: 'Single-Family Residential District (5 du/acre, 7,200 sf min lot) — maps to current SR-4',
    codeURL: 'https://bellevue.municipal.codes/LUC/20.20.010',
    frontSetback: 20, rearSetback: 20,
    leftSetback: 5, rightSetback: 5,
    maxHeightFt: 30, maxStories: 2,
    maxFAR: 0.5,
    maxLotCoverage: 40,
    parkingPerUnit: null,
    aduAllowed: true, aduMaxSqFt: 1200,
    densityBonus: null, sb9Eligible: false,
    notes: 'ZONE-RENAME FINDING (2026-04-24 manual copy): Legacy R-5 ≈ current SR-4 (min lot 7,200 sf — exact match with old R-5). Chart-confirmed values: front 20ft, rear 20ft, side min 5ft per side + COMBINED 15ft total for 2 sides. The combined-total rule means leftSetback=5/rightSetback=5 satisfies the per-side minimum but NOT the 15ft-total rule (sum would be 10); drawing-engine must pick a split (e.g. 5+10 or 7.5+7.5). Height 30ft flat / 35ft ridge (footnote 44); FAR 0.5 tiered (first 10,000 sf @ 0.5; remainder @ 0.3). Lot coverage 40% CONFIRMED. ADU max 1,200 sf per LUC 20.20.390 (Ord 6746, 2024); owner-occupancy removed; 1 parking/ADU waived within 0.5mi major transit. HB 1110 (Ord 6851, eff 2025-07-01): Tier 1 — 4 du by right, 6 near major transit. Shoreline overlay (LUC 20.25E.065): 40% coverage in SMP jurisdiction. Site-intel should match either "R-5" or "SR-4".',
    verifiedDate: '2026-04-24',
    _sourceMethod: 'manual',
    _sourceSnapshot: '2026-04-24',
    _unverified: ['parkingPerUnit'],
  },
  'bellevue,wa:R-7.5': {
    jurisdiction: 'Bellevue', state: 'WA', district: 'R-7.5',
    fullName: 'Single-Family Residential District (7.5 du/acre) — maps to current LDR-1',
    codeURL: 'https://bellevue.municipal.codes/LUC/20.20.010',
    frontSetback: 20, rearSetback: 20, leftSetback: 5, rightSetback: 5,
    maxHeightFt: 30, maxStories: 2,
    maxFAR: 0.5,
    maxLotCoverage: 40,
    parkingPerUnit: null,
    aduAllowed: true, aduMaxSqFt: 1200,
    densityBonus: null, sb9Eligible: false,
    notes: 'ZONE-RENAME FINDING (2026-04-24 manual copy): Legacy R-7.5 ≈ current LDR-1 (min lot 4,700 sf — higher density than SR tier). Chart-confirmed: front 20ft, rear 20ft, side per-side min 5ft + COMBINED 10ft total (tighter than SR-4 at 15ft combined — reflects LDR denser-infill intent). Height 30ft flat / 35ft ridge; FAR 0.5 tiered. Lot coverage 40%. ADU max 1,200 sf. HB 1110 (Ord 6851, eff 2025-07-01): same as R-5 — 4/6 units. Site-intel should match either "R-7.5" or "LDR-1".',
    verifiedDate: '2026-04-24',
    _sourceMethod: 'manual',
    _sourceSnapshot: '2026-04-24',
    _unverified: ['parkingPerUnit'],
  },
  'bellevue,wa:R-15': {
    jurisdiction: 'Bellevue', state: 'WA', district: 'R-15',
    fullName: 'Multifamily Residential District (15 du/acre, attached dwellings) — maps to current MDR-1',
    codeURL: 'https://bellevue.municipal.codes/LUC/20.20.010',
    frontSetback: 20, rearSetback: 20, leftSetback: 5, rightSetback: 5,
    maxHeightFt: 40, maxStories: 3,
    maxFAR: null,
    maxLotCoverage: 40,
    parkingPerUnit: null,
    aduAllowed: null, aduMaxSqFt: null,
    densityBonus: null, sb9Eligible: false,
    notes: 'ZONE-RENAME FINDING (2026-04-24 manual copy): Legacy R-15 (multifamily, 15 du/acre) ≈ current MDR-1 (20 du/acre — slight density bump). Chart-confirmed: front 20ft, rear 20ft, side per-side 5ft + combined 10ft, height 40ft, lot coverage 40%. MDR uses du/acre not FAR. MDR-1 = 20 du/acre citywide. MDR-2 = 30 du/acre. Adjacent-lot multifamily may reduce side yard to 0 on consolidated lots (LUC 20.20.538). Shoreline overlay (LUC 20.25E.065): 35% coverage in SMP jurisdiction. HB 1110 (Ord 6851, eff 2025-07-01): applies citywide; multifamily tiers may interact differently with middle-housing rights. OWNER-DECISION: manual §P0-3 paired R-15 with R-1/R-5/R-7.5 as a single-family batch; R-15 is and always was multifamily. ADU fields kept null (MDR multifamily ADU rules not captured in this chart).',
    verifiedDate: '2026-04-24',
    _sourceMethod: 'manual',
    _sourceSnapshot: '2026-04-24',
    _unverified: ['maxFAR', 'parkingPerUnit', 'aduAllowed', 'aduMaxSqFt'],
  },
  // Bellevue new-chart dual entries (option C — also match current LUC 20.20.010 district codes).
  // Same dimensional data as legacy R-X sibling; site-intel can match either naming.
  'bellevue,wa:LL-1': {
    jurisdiction: 'Bellevue', state: 'WA', district: 'LL-1',
    fullName: 'Large Lot 1 (current chart code; ≈ legacy R-1 estate, min lot 35,000 sf)',
    codeURL: 'https://bellevue.municipal.codes/LUC/20.20.010',
    frontSetback: 35, rearSetback: 25, leftSetback: 5, rightSetback: 5,
    maxHeightFt: 30, maxStories: 2,
    maxFAR: 0.5,
    maxLotCoverage: 35,
    parkingPerUnit: null,
    aduAllowed: true, aduMaxSqFt: 1200,
    densityBonus: null, sb9Eligible: false,
    notes: 'Current LUC 20.20.010 Chart district code. Equivalent to legacy bellevue,wa:R-1 entry — same dimensional values; dual-entry per STATUS.md option C so site-intel matches whichever name the parcel-data layer returns. Side-yard rule: per-side min 5ft + 2-sides combined min 20ft (the per-side 5+5=10 alone does NOT satisfy the 20ft combined rule — drawing-engine must pick a valid split, e.g. 5+15 or 10+10). Height 30ft flat / 35ft ridge (footnote 44). FAR tiered: 0.5 on first 10,000 sf + 0.3 on remainder. ADU max 1,200 sf (LUC 20.20.390, Ord 6746). HB 1110 (Ord 6851, eff 2025-07-01): 4 du citywide by right, 6 near major transit.',
    verifiedDate: '2026-04-24',
    _sourceMethod: 'manual',
    _sourceSnapshot: '2026-04-24',
    _legacy_key: 'bellevue,wa:R-1',
    _unverified: ['parkingPerUnit'],
  },
  'bellevue,wa:SR-4': {
    jurisdiction: 'Bellevue', state: 'WA', district: 'SR-4',
    fullName: 'Single-Family Residential 4 (current chart code; ≈ legacy R-5, min lot 7,200 sf)',
    codeURL: 'https://bellevue.municipal.codes/LUC/20.20.010',
    frontSetback: 20, rearSetback: 20, leftSetback: 5, rightSetback: 5,
    maxHeightFt: 30, maxStories: 2,
    maxFAR: 0.5,
    maxLotCoverage: 40,
    parkingPerUnit: null,
    aduAllowed: true, aduMaxSqFt: 1200,
    densityBonus: null, sb9Eligible: false,
    notes: 'Current LUC 20.20.010 Chart district code. Equivalent to legacy bellevue,wa:R-5 — exact lot-size match (both 7,200 sf min). Side-yard combined rule: 5ft per side + 15ft combined. FAR 0.5 tiered. Height 30ft flat / 35ft ridge. Coverage 40%. ADU 1,200 sf. HB 1110 compliance via Ord 6851. Shoreline overlay: 40% coverage in SMP jurisdiction.',
    verifiedDate: '2026-04-24',
    _sourceMethod: 'manual',
    _sourceSnapshot: '2026-04-24',
    _legacy_key: 'bellevue,wa:R-5',
    _unverified: ['parkingPerUnit'],
  },
  'bellevue,wa:LDR-1': {
    jurisdiction: 'Bellevue', state: 'WA', district: 'LDR-1',
    fullName: 'Low-Density Residential 1 (current chart code; ≈ legacy R-7.5, min lot 4,700 sf)',
    codeURL: 'https://bellevue.municipal.codes/LUC/20.20.010',
    frontSetback: 20, rearSetback: 20, leftSetback: 5, rightSetback: 5,
    maxHeightFt: 30, maxStories: 2,
    maxFAR: 0.5,
    maxLotCoverage: 40,
    parkingPerUnit: null,
    aduAllowed: true, aduMaxSqFt: 1200,
    densityBonus: null, sb9Eligible: false,
    notes: 'Current LUC 20.20.010 Chart district code. Equivalent to legacy bellevue,wa:R-7.5. Side-yard combined rule tighter than SR series: 5ft per side + 10ft combined total (vs. 15ft for SR). Min lot 4,700 sf. Height 30ft flat / 35ft ridge. Coverage 40%. ADU 1,200 sf. HB 1110 compliance via Ord 6851.',
    verifiedDate: '2026-04-24',
    _sourceMethod: 'manual',
    _sourceSnapshot: '2026-04-24',
    _legacy_key: 'bellevue,wa:R-7.5',
    _unverified: ['parkingPerUnit'],
  },
  'bellevue,wa:MDR-1': {
    jurisdiction: 'Bellevue', state: 'WA', district: 'MDR-1',
    fullName: 'Medium-Density Residential 1 (current chart code; ≈ legacy R-15 MF, 20 du/acre)',
    codeURL: 'https://bellevue.municipal.codes/LUC/20.20.010',
    frontSetback: 20, rearSetback: 20, leftSetback: 5, rightSetback: 5,
    maxHeightFt: 40, maxStories: 3,
    maxFAR: null,
    maxLotCoverage: 40,
    parkingPerUnit: null,
    aduAllowed: null, aduMaxSqFt: null,
    densityBonus: null, sb9Eligible: false,
    notes: 'Current LUC 20.20.010 Chart district code. Equivalent to legacy bellevue,wa:R-15 — multifamily tier at 20 du/acre (slight density bump vs legacy 15 du/ac). Side-yard: 5ft per side + 10ft combined. Height 40ft. Coverage 40%. MDR uses du/acre, not FAR. MDR-2 sibling zone is 30 du/acre. Adjacent-lot MF may reduce side yard to 0 on consolidated lots (LUC 20.20.538). Shoreline overlay: 35% coverage in SMP. HB 1110 (Ord 6851) applies citywide.',
    verifiedDate: '2026-04-24',
    _sourceMethod: 'manual',
    _sourceSnapshot: '2026-04-24',
    _legacy_key: 'bellevue,wa:R-15',
    _unverified: ['maxFAR', 'parkingPerUnit', 'aduAllowed', 'aduMaxSqFt'],
  },

  // ── Tacoma, WA ──
  // NOTE: Tacoma abolished R-1/R-2/R-3 districts effective 2025-02-01 via Ord. 28986
  // (Home in Tacoma Phase 2). All parcels remapped to UR-1/UR-2/UR-3.
  // Site-intel SiteRecords from current sources will return "UR-X" — old "R-X"
  // codes will not appear except in pre-2025 cached data.
  'tacoma,wa:UR-1': {
    jurisdiction: 'Tacoma', state: 'WA', district: 'UR-1',
    fullName: 'Urban Residential District 1 (low-scale middle housing)',
    codeURL: 'https://cms.cityoftacoma.org/cityclerk/Files/MunicipalCode/Title13-LandUseRegulatoryCode.PDF',
    frontSetback: 15, rearSetback: 25, leftSetback: 5, rightSetback: 5,
    maxHeightFt: 35, maxStories: null,
    maxFAR: 0.6,
    maxLotCoverage: null,
    parkingPerUnit: 0,
    aduAllowed: true, aduMaxSqFt: 1000,
    densityBonus: 'UR Bonus 1: 1 du / 1,000 sf; UR Bonus 2: 1 du / 750 sf (vs base 1 du / 1,500 sf). Affordability or building-retention dedication required (TMC 13.06.020.F.1).',
    sb9Eligible: false,
    notes: 'Ord. 28986 (Home in Tacoma Phase 2, eff. 2025-02-01) abolished prior R-1 and remapped all parcels to UR-1. Tacoma is HB 1110 Tier 1 (pop. >75k) — 4 du by right citywide, 6 within 0.25mi major transit; UR-1 satisfies and exceeds the Tier 1 mandate. FAR 0.6 (1–2 units) / 0.8 (3+ units) — matrix carries the lower; consumers must branch on unit count. Rear-25-ft of lot capped at 25ft height. Garage door facing street setback min 20ft. Amenity yard 5% of lot per dwelling. WA HB 1337 (eff. 2025-07-23) sets statewide ADU floor of 1,000 sf (matches local). WA SB 5184 (2025) constrains parking minimums.',
    verifiedDate: '2026-04-24',
    _legacy_key: 'tacoma,wa:R-1',
    _unverified: ['maxStories', 'maxLotCoverage'],
  },
  'tacoma,wa:UR-2': {
    jurisdiction: 'Tacoma', state: 'WA', district: 'UR-2',
    fullName: 'Urban Residential District 2 (mid-low middle housing; near transit / parks / schools)',
    codeURL: 'https://cms.cityoftacoma.org/cityclerk/Files/MunicipalCode/Title13-LandUseRegulatoryCode.PDF',
    frontSetback: 15, rearSetback: 25, leftSetback: 5, rightSetback: 5,
    maxHeightFt: 35, maxStories: null,
    maxFAR: 0.8,
    maxLotCoverage: null,
    parkingPerUnit: 0,
    aduAllowed: true, aduMaxSqFt: 1000,
    densityBonus: 'UR Bonus 1: 1 du / 750 sf; UR Bonus 2: 1 du / 500 sf (vs base 1 du / 1,000 sf). Affordability or building-retention dedication required (TMC 13.06.020.F.1).',
    sb9Eligible: false,
    notes: 'Ord. 28986 (Home in Tacoma Phase 2, eff. 2025-02-01) abolished prior R-2 and remapped all parcels to UR-2. UR-2 is Tacoma\'s primary near-transit upzone, satisfying the HB 1110 Tier 1 6-du-within-0.25mi-transit requirement. FAR 0.8 (1–2 units) / 1.0 (3+ units) — matrix carries the lower. Rear-25-ft of lot capped at 25ft height. Side setback reducible with tree-retention credit. WA HB 1337 + SB 5184 statewide overrides apply.',
    verifiedDate: '2026-04-24',
    _legacy_key: 'tacoma,wa:R-2',
    _unverified: ['maxStories', 'maxLotCoverage'],
  },
  'tacoma,wa:UR-3': {
    jurisdiction: 'Tacoma', state: 'WA', district: 'UR-3',
    fullName: 'Urban Residential District 3 (mid-scale; commercial-edge / transit corridors)',
    codeURL: 'https://cms.cityoftacoma.org/cityclerk/Files/MunicipalCode/Title13-LandUseRegulatoryCode.PDF',
    frontSetback: 10, rearSetback: 25, leftSetback: 5, rightSetback: 5,
    maxHeightFt: 35, maxStories: null,
    maxFAR: 1.0,
    maxLotCoverage: null,
    parkingPerUnit: 0,
    aduAllowed: true, aduMaxSqFt: 1000,
    densityBonus: 'UR Bonus 1: 1 du / 500 sf, height 45ft / 4 stories; UR Bonus 2: 1 du / 375 sf, height 45ft / 5 stories. Affordability or building-retention dedication required (TMC 13.06.020.F.1).',
    sb9Eligible: false,
    notes: 'Ord. 28986 (Home in Tacoma Phase 2, eff. 2025-02-01) abolished prior R-3 and remapped all parcels to UR-3. UR-3 is Tacoma\'s highest-intensity residential zone, sited at commercial edges and transit corridors. Multiplex (7+ stacked units) by right ONLY in UR-3 (not UR-1/UR-2). FAR 1.0 (1–2 units) / 1.2 (3+ units) — matrix carries the lower. Bonus front setback path: Bonus 1 = 7.5ft, Bonus 2 = 5ft. Bonus height to 45ft. WA HB 1337 + SB 5184 statewide overrides apply.',
    verifiedDate: '2026-04-24',
    _legacy_key: 'tacoma,wa:R-3',
    _unverified: ['maxStories', 'maxLotCoverage'],
  },
  // Tacoma legacy stubs (option C — graceful resolution when stale parcel data tags pre-Ord-28986 codes)
  'tacoma,wa:R-1': {
    jurisdiction: 'Tacoma', state: 'WA', district: 'R-1',
    fullName: 'R-1 (REPEALED 2025-02-01 — see tacoma,wa:UR-1)',
    codeURL: 'https://cms.cityoftacoma.org/cityclerk/Files/MunicipalCode/Title13-LandUseRegulatoryCode.PDF',
    notes: 'Repealed by Ordinance 28986 (Home in Tacoma Phase 2), eff. 2025-02-01. Successor: tacoma,wa:UR-1.',
    verifiedDate: '2026-04-24',
    _repealed: true,
    _replacedBy: 'tacoma,wa:UR-1',
  },
  'tacoma,wa:R-2': {
    jurisdiction: 'Tacoma', state: 'WA', district: 'R-2',
    fullName: 'R-2 (REPEALED 2025-02-01 — see tacoma,wa:UR-2)',
    codeURL: 'https://cms.cityoftacoma.org/cityclerk/Files/MunicipalCode/Title13-LandUseRegulatoryCode.PDF',
    notes: 'Repealed by Ordinance 28986 (Home in Tacoma Phase 2), eff. 2025-02-01. Successor: tacoma,wa:UR-2.',
    verifiedDate: '2026-04-24',
    _repealed: true,
    _replacedBy: 'tacoma,wa:UR-2',
  },
  'tacoma,wa:R-3': {
    jurisdiction: 'Tacoma', state: 'WA', district: 'R-3',
    fullName: 'R-3 (REPEALED 2025-02-01 — see tacoma,wa:UR-3)',
    codeURL: 'https://cms.cityoftacoma.org/cityclerk/Files/MunicipalCode/Title13-LandUseRegulatoryCode.PDF',
    notes: 'Repealed by Ordinance 28986 (Home in Tacoma Phase 2), eff. 2025-02-01. Successor: tacoma,wa:UR-3.',
    verifiedDate: '2026-04-24',
    _repealed: true,
    _replacedBy: 'tacoma,wa:UR-3',
  },

  // ── Everett, WA ──
  // District codes unchanged (no Tacoma-style rename). HB 1110 compliance via
  // Ord 4101-25 (comp plan) + Ord 4102-25 (dev regs), eff. 2025-07-08.
  // Setbacks via Table 6-2 (EMC 19.06.020) — table not retrievable (everett.municipal.codes
  // and everettwa.gov DocumentCenter both 403'd WebFetch).
  'everett,wa:R-1': {
    jurisdiction: 'Everett', state: 'WA', district: 'R-1',
    fullName: 'Single-Family Detached Low Density Residential Zone',
    codeURL: 'https://everett.municipal.codes/EMC/19.06',
    frontSetback: null, rearSetback: null,
    leftSetback: 5, rightSetback: 5,
    maxHeightFt: 28, maxStories: null,
    maxFAR: null,
    maxLotCoverage: 35,
    parkingPerUnit: 1,
    aduAllowed: true, aduMaxSqFt: 1000,
    densityBonus: 'HB 1110 (Tier 1, Ord 4102-25 eff. 2025-07-08): 4 du by right citywide; 6 du within 0.25mi of major transit. No separate local density-bonus overlay for R-1 as of April 2026.',
    sb9Eligible: false,
    notes: 'EMC 19.22.020 height 28ft confirmed. EMC 19.06.010 lot coverage 35% confirmed. EMC 19.06.020 Table 6-2 (front/rear setbacks) not directly readable — front ~20ft inferred from staff memos but unverified. Side 5ft confirmed via ADU ordinance cross-references. Everett uses lot coverage + height envelope, not FAR. ADU per EMC 19.08.100 (as amended by Ord 4102-25): max 1,000 sf, 2 ADUs/lot, no owner-occupancy, no parking required for buildings <1,200 sf — aligned with WA HB 1337 (eff. 2025-07-01, RCW 35A.21.314). WA SB 5184 (May 2025): caps SFR parking at 1/unit; Everett (>50k pop) has ~18 months to codify (~early 2027); EMC 19.34 may still show higher minimums in transition. UNCAPTURED OVERLAYS: R-2(A) variant zone (alley access, 4,500sf min); Metro Everett overlay (EMC 19.20, downtown — substantially different rules); Historic (H) overlay (24ft eave-to-side cap, design review). Parcels in mapped overlays must be cross-checked. 2026-04-24 UPDATE: Owner-uploaded current EMC 19.06.020 Table 6-2 HTML shows the live code uses zones NR-C / NR / UR4 / UR7 / MU* — NOT R-1/R-2. Ord 4102-25 (Everett 2044) performed a Redmond-style zone rewrite. See new everett,wa:NR-C (equivalent low-density) and everett,wa:NR (HB-1110 middle housing) entries for current values. parkingPerUnit updated to 1 per Table 34-1 Dwelling-unit row (applies citywide). DECISION PENDING (STATUS.md): retain R-1/R-2 as current (open data portal as of Sept 2025 still labelled them) or deprecate via _repealed stubs pointing to NR-C/NR.',
    verifiedDate: '2026-04-24',
    _unverified: ['frontSetback', 'rearSetback', 'maxStories', 'maxFAR'],
  },
  'everett,wa:R-2': {
    jurisdiction: 'Everett', state: 'WA', district: 'R-2',
    fullName: 'Single-Family Medium Density Residential Zone',
    codeURL: 'https://everett.municipal.codes/EMC/19.06',
    frontSetback: null, rearSetback: null,
    leftSetback: 5, rightSetback: 5,
    maxHeightFt: 28, maxStories: null,
    maxFAR: null,
    maxLotCoverage: 40,
    parkingPerUnit: 1,
    aduAllowed: true, aduMaxSqFt: 1000,
    densityBonus: 'HB 1110 (Tier 1, Ord 4102-25 eff. 2025-07-08): 4 du by right citywide; 6 du within 0.25mi of major transit. Duplex permitted by right in R-2 (EMC 19.05); duplex min lot 7,500sf (EMC 19.06.010).',
    sb9Eligible: false,
    notes: 'R-2 permits duplex by right (EMC 19.05); R-1 does not pre-HB 1110, but HB 1110 requires up to 4 du by right in both. Min lot area: 4,500 sf with alley, 5,000 sf standard (EMC 19.06.010). Duplex min lot: 7,500 sf. EMC 19.22.020 height 28ft confirmed; lot coverage 40% confirmed (EMC 19.06.010). Front/rear setbacks via Table 6-2 not directly readable — ~20ft inferred. Side 5ft confirmed via ADU ordinance. ADU rules and statewide overlays match R-1: HB 1337 (max 1,000sf, no owner-occ, ≥2/lot), SB 5184 (parking transition until ~early 2027). UNCAPTURED OVERLAYS: R-2(A) alley-access variant; Metro Everett (EMC 19.20); Historic (H) overlay. Parcel-level overlay check required. 2026-04-24 UPDATE: same zone-rewrite finding as R-1 — current Table 6-2 uses NR/UR/MU codes. parkingPerUnit updated to 1 per Table 34-1. See everett,wa:NR for current HB-1110-compliant middle-housing equivalent.',
    verifiedDate: '2026-04-24',
    _unverified: ['frontSetback', 'rearSetback', 'maxStories', 'maxFAR'],
  },
  // NEW — post-Ord-4102-25 zone codes confirmed from owner-uploaded Table 6-2 HTML
  // (source: https://everett.municipal.codes/EMC/19.06.020; snapshot: 2026-04-24).
  // These sit alongside R-1/R-2 pending owner decision on whether to deprecate the
  // older entries (STATUS.md new decision item).
  'everett,wa:NR-C': {
    jurisdiction: 'Everett', state: 'WA', district: 'NR-C',
    fullName: 'Neighborhood Residential — Cottage (low-density traditional-neighborhood)',
    codeURL: 'https://everett.municipal.codes/EMC/19.06.020',
    frontSetback: 20, rearSetback: 20, leftSetback: 5, rightSetback: 5,
    maxHeightFt: 28, maxStories: null,
    maxFAR: null,
    maxLotCoverage: null,
    parkingPerUnit: 1,
    aduAllowed: true, aduMaxSqFt: 1000,
    densityBonus: 'HB 1110 (Tier 1, Ord 4102-25 eff. 2025-07-08): 4 du by right citywide; 6 du within 0.25mi major transit.',
    sb9Eligible: false,
    notes: 'Post-Everett-2044 zone code (Ord 4102-25 eff. 2025-07-08). Likely successor to pre-2044 R-1 in terms of dimensional profile. Table 6-2 confirmed values: front 20ft, rear-no-alley 20ft, rear-with-alley 20ft (footnote 5: no side-interior setback required when side lot line abuts alley), side-street 10ft, side-interior 5ft. Height 28ft carried from EMC 19.22.020 (unchanged by Ord 4102-25, per zoning-legal earlier research). Table 34-1 parking: 1 per dwelling unit. maxLotCoverage not in Table 6-2 (would be in Table 6-1 — not in owner upload; likely 35% matching R-1 precedent but unverified). Same statewide overlays: HB 1337 (ADU 1,000 sf floor, 2/lot), SB 5184 (1/unit parking already codified).',
    verifiedDate: '2026-04-24',
    _sourceMethod: 'manual',
    _sourceSnapshot: '2026-04-24',
    _unverified: ['maxStories', 'maxFAR', 'maxLotCoverage'],
  },
  'everett,wa:NR': {
    jurisdiction: 'Everett', state: 'WA', district: 'NR',
    fullName: 'Neighborhood Residential (HB 1110 middle-housing upzone)',
    codeURL: 'https://everett.municipal.codes/EMC/19.06.020',
    frontSetback: 10, rearSetback: 5, leftSetback: 5, rightSetback: 5,
    maxHeightFt: 28, maxStories: null,
    maxFAR: null,
    maxLotCoverage: null,
    parkingPerUnit: 1,
    aduAllowed: true, aduMaxSqFt: 1000,
    densityBonus: 'HB 1110 (Tier 1, Ord 4102-25 eff. 2025-07-08): 4 du by right citywide; 6 du within 0.25mi major transit. NR is the middle-housing-oriented zone receiving the denser dimensional envelope.',
    sb9Eligible: false,
    notes: 'Post-Everett-2044 zone code (Ord 4102-25 eff. 2025-07-08). Likely successor to pre-2044 R-2 in terms of dimensional profile. Table 6-2 confirmed values: front 10ft, rear-no-alley 5ft, rear-with-alley 0 (None), side-street 5ft, side-interior 5ft (footnote 5: 0 when side lot line abuts alley). Significantly more compact than NR-C — this is Everett\'s HB-1110 middle-housing zone. Height 28ft carried from EMC 19.22.020. Table 34-1 parking: 1 per dwelling unit. maxLotCoverage not in Table 6-2 (would be in Table 6-1 — not in owner upload; likely 40% matching R-2 precedent but unverified). Same statewide overlays apply.',
    verifiedDate: '2026-04-24',
    _sourceMethod: 'manual',
    _sourceSnapshot: '2026-04-24',
    _unverified: ['maxStories', 'maxFAR', 'maxLotCoverage'],
  },

  // ── Redmond, WA ──
  // MAJOR STRUCTURAL RENAME: Ord 3186 (adopted 2024-11-19, eff. 2025-01-01)
  // consolidated 11 residential zones into 2 — NR (Neighborhood Residential)
  // and NMF (Neighborhood Multifamily). R-4, R-6, R-8 are all REPEALED and
  // remapped to NR. Legacy keys ship as repealed-stub entries below for
  // graceful resolution of stale parcel data.
  'redmond,wa:NR': {
    jurisdiction: 'Redmond', state: 'WA', district: 'NR',
    fullName: 'Neighborhood Residential',
    codeURL: 'https://redmond.municipal.codes/RZC/21.08',
    frontSetback: 10, rearSetback: 5, leftSetback: 3, rightSetback: 3,
    maxHeightFt: 38, maxStories: null,
    maxFAR: null,
    maxLotCoverage: 60,
    parkingPerUnit: 0,
    aduAllowed: true, aduMaxSqFt: 1000,
    densityBonus: 'HB 1110 (Tier 1, eff. 2023-07-23): 4 du citywide by right; 6 du within 0.25mi major transit. Redmond went further via Ord 3186 (eff. 2025-01-01): NR allows 6 du/lot citywide by right; 8 du/lot with one on-site affordable unit (≤80% AMI, ≥50yr covenant) per RZC 21.20.060.A.1.b.ii.',
    sb9Eligible: false,
    notes: 'DISTRICT RENAME: Ord 3186 (adopted 2024-11-19, eff. 2025-01-01) repealed R-4/R-6/R-8 and 8 others; consolidated into NR + NMF. SCHEMA NOTE: Redmond has since reorganized further — RZC 21.08.143 and .147 individual sections do NOT exist in current code; all dimensional standards live in Ch. 21.08 shared tables (Table 21.08.200.B density/height/coverage, Table 21.08.300.A building placement/setbacks). Values extracted from owner-uploaded HTML (2026-04-24). FULL CHART DATA: Front 10ft, rear 5ft, side-interior 3ft (each side min), side-street 10ft, alley setback 2ft, Lake Sammamish overlay setback 35ft, building separation 5ft min. Base height 38ft. Base max du 6 per lot; 8 with one on-site affordable unit (RZC 21.20.060.A.1.b.ii). Lot coverage: 50%/60% tiered (chart footnote — exact trigger needs verification; 60% used conservatively). Impervious surface 70%. ADU: aduMaxSqFt field carries 1,000 sf DADU cap (WA HB 1337 floor); RZC 21.08.220 allows AADU up to 1,500 sf. Light-rail major-transit stations: Overlake Village + Redmond Technology (2024-04-27), Downtown Redmond (2025). WA HB 1337 (eff. 2025-07-01): 2 ADUs/lot, no owner-occ, no ADU parking. WA SB 5184: parking minimums already eliminated. URBAN CENTERS — DO NOT USE NR FOR: Overlake (Ch. 21.12), Downtown (Ch. 21.10), Marymoor Village (Ch. 21.13).',
    verifiedDate: '2026-04-24',
    _sourceMethod: 'manual',
    _sourceSnapshot: '2026-04-24',
    _legacy_key: ['redmond,wa:R-4', 'redmond,wa:R-6', 'redmond,wa:R-8'],
    _unverified: ['maxStories'],
  },
  'redmond,wa:NMF': {
    jurisdiction: 'Redmond', state: 'WA', district: 'NMF',
    fullName: 'Neighborhood Multifamily',
    codeURL: 'https://redmond.municipal.codes/RZC/21.08',
    frontSetback: 30, rearSetback: 10, leftSetback: 15, rightSetback: 15,
    maxHeightFt: 60, maxStories: null,
    maxFAR: 1.1,
    maxLotCoverage: 60,
    parkingPerUnit: 0,
    aduAllowed: true, aduMaxSqFt: 1000,
    densityBonus: 'HB 1110 (Tier 1): same citywide 6-du baseline as NR. NMF uses FAR rather than du count. Base maximum FAR 1.1 (w/o incentives); 1.5 with incentives (Table 21.08.200.B). Parcels within 0.25mi of Overlake Village / Redmond Technology / Downtown Redmond Link stations qualify for transit-area maximums under RZC 21.20.060.',
    sb9Eligible: false,
    notes: 'NEW ZONE created by Ord 3186 (eff. 2025-01-01) as part of 11-zone consolidation. Replaces higher-density predecessors (R-10 and above). Current code stores dimensional standards in Ch. 21.08 shared tables — no longer in a dedicated RZC 21.08.147 section (that path returns "could not be found" on municipal.codes). Values from owner-uploaded HTML (2026-04-24): Front 30ft, rear 10ft, side-interior 15ft, side-street 15ft, alley 4ft, building separation 15ft. Note NMF setbacks are LARGER than NR despite higher density — reflects buffer requirements for denser multifamily. Base FAR 1.1 (1.5 with incentives). Base height 60ft. Lot coverage 60%. Impervious surface 75%. Parking eliminated (post-Ord-3186 citywide). Same HB 1110 / HB 1337 / SB 5184 statewide overlays apply. Same urban-center exclusions: do NOT use NMF for parcels inside Overlake (Ch. 21.12), Downtown (Ch. 21.10), or Marymoor Village (Ch. 21.13).',
    verifiedDate: '2026-04-24',
    _sourceMethod: 'manual',
    _sourceSnapshot: '2026-04-24',
    _unverified: ['maxStories'],
  },
  // Legacy stubs — resolve gracefully when stale parcel data tags an old code
  'redmond,wa:R-4': {
    jurisdiction: 'Redmond', state: 'WA', district: 'R-4',
    fullName: 'R-4 (REPEALED 2025-01-01 — see redmond,wa:NR)',
    codeURL: 'https://redmond.municipal.codes/RZC/21.08.060',
    notes: 'Repealed by Ordinance 3186, eff. 2025-01-01. Successor: redmond,wa:NR.',
    verifiedDate: '2026-04-24',
    _repealed: true,
    _replacedBy: 'redmond,wa:NR',
  },
  'redmond,wa:R-6': {
    jurisdiction: 'Redmond', state: 'WA', district: 'R-6',
    fullName: 'R-6 (REPEALED 2025-01-01 — see redmond,wa:NR)',
    codeURL: 'https://redmond.municipal.codes/RZC/21.08.090',
    notes: 'Repealed by Ordinance 3186, eff. 2025-01-01. Successor: redmond,wa:NR.',
    verifiedDate: '2026-04-24',
    _repealed: true,
    _replacedBy: 'redmond,wa:NR',
  },
  'redmond,wa:R-8': {
    jurisdiction: 'Redmond', state: 'WA', district: 'R-8',
    fullName: 'R-8 (REPEALED 2025-01-01 — see redmond,wa:NR)',
    codeURL: 'https://redmond.municipal.codes/RZC/21.08.100',
    notes: 'Repealed by Ordinance 3186, eff. 2025-01-01. Successor: redmond,wa:NR.',
    verifiedDate: '2026-04-24',
    _repealed: true,
    _replacedBy: 'redmond,wa:NR',
  },

  // ── Kirkland, WA ──
  // District codes UNCHANGED (no rename). First Tier-1 WA city in the P0-3 sweep
  // that kept its legacy zone names through HB 1110 compliance. Ord O-4905
  // (adopted 2025-06-17) implements HB 1110 / HB 1337 / SB 5184 without
  // restructuring the RSA-family (RSA 1 / RSA 4 / RSA 6 / RSA 8) codes.
  'kirkland,wa:RSA 6': {
    jurisdiction: 'Kirkland', state: 'WA', district: 'RSA 6',
    fullName: 'Single-Family Residential — 6 units per acre',
    codeURL: 'https://www.codepublishing.com/WA/Kirkland/html/KirklandZ15/KirklandZ15.html',
    frontSetback: 20, rearSetback: 10, leftSetback: 5, rightSetback: 5,
    maxHeightFt: 30, maxStories: null,
    maxFAR: 0.50,
    maxLotCoverage: 50,
    parkingPerUnit: 2,
    aduAllowed: true, aduMaxSqFt: 1000,
    densityBonus: 'WA HB 1110 (Tier 1, Ord. O-4905, adopted 2025-06-17): 4 units by right citywide; 6 units by right within 0.25 mi of major transit stop. KZC ch. 112 Multifamily Affordable Housing Incentives may provide additional FAR for affordable set-aside projects. Peaked-roof bonus: FAR rises to 0.60 when ridge roof is used (KZC 15.30).',
    sb9Eligible: false,
    notes: 'Kirkland RETAINED zone names through HB 1110 compliance (unlike Tacoma/Redmond/Everett/Bellevue/Bothell). Ord O-4905 (adopted 2025-06-17) amends KZC chs. 113 and 115. ROUND 4 (2026-04-25 owner upload of KZC 15.30): Density/Dimensions table § 15.30.060 "Detached Dwelling Unit" row chart-confirms RSA values: front 20\', side 5\' (per side; combined min 15ft per KZC 5.10.775), rear 10\', height 30\' above ABE (Average Building Elevation), lot coverage 50%. Min lot 5,100 sf (RSA 6) / 3,800 sf (RSA 8) — pre-existing matrix values consistent with chart context. Chart uses height-not-stories (maxStories stays null). FAR 0.50 flat / 0.60 peaked roof per KZC 15.30 special regs. parkingPerUnit=2 reflects CURRENT KZC 15.40 (2 spaces/SFR); WA SB 5184 caps SFR parking at 1/unit pending local codification (~early 2027 deadline). ADU per KZC ch. 115 + WA HB 1337: 2 ADUs/lot, ≥1,000 sf, no owner-occupancy. aduMaxSqFt 1,000 = state floor; chart did not surface a higher local cap. UNCAPTURED OVERLAYS: Totem Lake Urban Center (KZC 40–50), Rose Hill Business District, NE 85th St Station Form-Based Code (KZC ch. 57, East Link terminus — supersedes RSA), Carillon Woods (PLA 6E), Shoreline (KZC 83), Pipeline Corridor (KZC 118). Do NOT use RSA 6 for parcels inside these overlays.',
    verifiedDate: '2026-04-25',
    _sourceMethod: 'manual',
    _sourceSnapshot: '2026-04-25',
    _unverified: [],
  },
  'kirkland,wa:RSA 8': {
    jurisdiction: 'Kirkland', state: 'WA', district: 'RSA 8',
    fullName: 'Single-Family Residential — 8 units per acre',
    codeURL: 'https://www.codepublishing.com/WA/Kirkland/html/KirklandZ15/KirklandZ15.html',
    frontSetback: 20, rearSetback: 10, leftSetback: 5, rightSetback: 5,
    maxHeightFt: 30, maxStories: null,
    maxFAR: 0.50,
    maxLotCoverage: 50,
    parkingPerUnit: 2,
    aduAllowed: true, aduMaxSqFt: 1000,
    densityBonus: 'WA HB 1110 (Tier 1, Ord. O-4905, adopted 2025-06-17): 4 units by right citywide; 6 units by right within 0.25 mi of major transit stop. KZC ch. 112 Multifamily Affordable Housing Incentives may provide additional FAR for affordable set-aside projects. Peaked-roof bonus: FAR rises to 0.60 with ridge roof for first 5,000 sf of lot area.',
    sb9Eligible: false,
    notes: 'Same RSA-family structure as RSA 6 — zone names retained. RSA 8 min lot 3,800 sf (smaller than RSA 6 at 5,100 sf), typically Finn Hill and Cross Kirkland areas. ROUND 4 (2026-04-25 owner upload of KZC 15.30): chart-confirmed identical to RSA 6 — front 20\', side 5\', rear 10\', height 30\' ABE, lot coverage 50%. Above 25 ft ABE, structures must be below existing grade and screened by vegetative earthen berm (KZC 15.30 special regulation). Same HB 1110 / HB 1337 / SB 5184 framework. Same uncaptured overlays: Totem Lake, Rose Hill, NE 85th St Station Form-Based Code (KZC ch. 57), Carillon Woods (PLA 6E), Shoreline (KZC 83), Pipeline Corridor (KZC 118).',
    verifiedDate: '2026-04-25',
    _sourceMethod: 'manual',
    _sourceSnapshot: '2026-04-25',
    _unverified: [],
  },

  // ── Auburn, WA ──
  // ZONE RENAME (round 5, decision #23 RESOLVED 2026-04-25): owner-uploaded
  // ACC 18.07.030 chart confirms Auburn went through a Tacoma/Redmond-style
  // rewrite. Current zone columns are RC, R-1, R-2, R-3, R-4, R-NM, R-F.
  // Legacy R-5 (4–5 du/ac) and R-7 (5–7 du/ac) both map to current R-2
  // (min density 7 du/ac, 6,222 sf lot area per unit) — HB 1110 forced
  // minimum-density floors up and consolidated the SF tier. Pattern mirrors
  // Redmond's 11→2 zone consolidation (Ord 3186): legacy keys deprecated
  // via _repealed stubs pointing to the current district.
  'auburn,wa:R-2': {
    jurisdiction: 'Auburn', state: 'WA', district: 'R-2',
    fullName: 'Residential Zone — Min 7 du/net acre, 6,222 sf lot area per unit (current ACC 18.07.030; replaces legacy R-5 and R-7)',
    codeURL: 'https://auburn.municipal.codes/ACC/18.07.030',
    frontSetback: 10, rearSetback: 15,
    leftSetback: 5, rightSetback: 5,
    maxHeightFt: 35, maxStories: null,
    maxFAR: null,
    maxLotCoverage: 75,
    parkingPerUnit: 1,
    aduAllowed: true, aduMaxSqFt: 1000,
    densityBonus: 'WA HB 1110 (Tier 1, Ord 6959/6960 eff. 2024-12-27): chart row D1 confirms 4 du base citywide; D2 confirms 6 du with transit OR affordability bonus. Lot-area-per-unit-above-base allowance 1,250 sf (chart row D3). MFTE per RCW 84.14 may stack on residential target area parcels.',
    sb9Eligible: false,
    notes: 'ROUND 5 ZONE-RENAME RESOLUTION (decision #23, 2026-04-25): Auburn 2024 comp plan (Ord 6959/6960 eff. 2024-12-27) renamed and reconsolidated residential zones. Current ACC 18.07.030 chart columns: RC / R-1 / R-2 / R-3 / R-4 / R-NM / R-F. Legacy R-5 and R-7 both map to current R-2 by density (7 du/ac min, 6,222 sf per unit). Chart-confirmed values (column 3): residence front 10ft (E1), garage front 20ft / 15ft alley-loaded (E2), interior side 5ft (5), street side 10ft (6), rear 15ft (7), max impervious 75% (F), max building height 35ft (G), max accessory height 24ft (H). HB 1110 base 4 / transit-or-affordability 6 (D1, D2). ADU per ACC 18.32.010: 2 ADUs/lot, 1,000 sf max, 0 parking within 0.5mi major transit / 1 space/ADU beyond. WA HB 1337 + WA SB 5184 statewide overlays apply. UNCAPTURED OVERLAYS: Lea Hill (ACC 18.21.010), West Hill (ACC 18.21.020), Lakeland Hills South PUD, Auburn Way North Plan corridor, Downtown Urban Center (ACC 18.29). MUCKLESHOOT TRUST-LAND CARVE-OUT: Auburn zoning code does NOT apply to MIT trust parcels (BIA-held); site-intel must verify fee vs. trust status — the Muckleshoot Reservation is a checkerboard within Auburn city limits.',
    verifiedDate: '2026-04-25',
    _sourceMethod: 'manual',
    _sourceSnapshot: '2026-04-25',
    _legacy_key: ['auburn,wa:R-5', 'auburn,wa:R-7'],
    _unverified: [],
  },
  // Legacy stubs — graceful resolution when stale parcel data tags pre-rename codes
  'auburn,wa:R-5': {
    jurisdiction: 'Auburn', state: 'WA', district: 'R-5',
    fullName: 'R-5 (REPEALED 2024-12-27 — see auburn,wa:R-2)',
    codeURL: 'https://auburn.municipal.codes/ACC/18.07.030',
    notes: 'Repealed by Ord 6959/6960 (Auburn 2024 comp plan), eff. 2024-12-27. Successor: auburn,wa:R-2 (consolidates legacy R-5 + R-7 by density mapping; new min density 7 du/ac, 6,222 sf lot area per unit). Maintained as a stub so parcel data layers still tagging "R-5" resolve cleanly via _replacedBy.',
    verifiedDate: '2026-04-25',
    _repealed: true,
    _replacedBy: 'auburn,wa:R-2',
  },
  'auburn,wa:R-7': {
    jurisdiction: 'Auburn', state: 'WA', district: 'R-7',
    fullName: 'R-7 (REPEALED 2024-12-27 — see auburn,wa:R-2)',
    codeURL: 'https://auburn.municipal.codes/ACC/18.07.030',
    notes: 'Repealed by Ord 6959/6960 (Auburn 2024 comp plan), eff. 2024-12-27. Successor: auburn,wa:R-2 (consolidates legacy R-5 + R-7 by density mapping). Maintained as a stub so parcel data layers still tagging "R-7" resolve cleanly via _replacedBy.',
    verifiedDate: '2026-04-25',
    _repealed: true,
    _replacedBy: 'auburn,wa:R-2',
  },

  // ── Bothell, WA ──
  // ZONE-RENAME FINDING: Dec 2024 Comprehensive Plan Periodic Update (City Council
  // ── Bothell, WA ──
  // Dec 2024 Comprehensive Plan zone-rename: lot-size-named series replaced by
  // descriptive tiers (R-C, R-L1, R-L2, R-M1..M4, R-AC). Round 3 owner-uploaded
  // BMC 12.14.030 chart (2026-04-25) confirms the dimensional standards table.
  // HB 1110 TIER 2: pop. 48,161 (2020 Census). Statutory floor 2 du citywide /
  // 4 du transit-or-affordable. Bothell adopted EXACTLY the floor (NOT the
  // "4 citywide / 6 transit" the P0-3 search-snippet sweep claimed — that was
  // misreading the R-M1 multifamily column). Decision #17 RESOLVED.
  // PARKING: Bothell City Council voted 5-1 in July 2025 to eliminate ALL
  // off-street parking minimums voluntarily.
  'bothell,wa:R-L1': {
    jurisdiction: 'Bothell', state: 'WA', district: 'R-L1',
    fullName: 'Low-Density Residential 1 (current code; legacy R 9,600 series; min lot 6,000 sf per BMC 12.14.030 chart)',
    codeURL: 'https://bothell.municipal.codes/BMC/12.14.030',
    frontSetback: 15, rearSetback: 15,
    leftSetback: 5, rightSetback: 5,
    maxHeightFt: 35, maxStories: null,
    maxFAR: null,
    maxLotCoverage: 55,
    parkingPerUnit: 0,
    aduAllowed: true, aduMaxSqFt: 1200,
    densityBonus: 'WA HB 1110 (Tier 2, BMC 12.14.030 + 12.14.134, eff. 2025-06-30): 2 du by right citywide; 4 du within 0.25mi major transit OR with one affordable unit (combined transit/affordable column on the chart). Matches Tier 2 statutory floor exactly. Affordable-housing density bonus may apply via BMC 12.07 (parameters not confirmed).',
    sb9Eligible: false,
    notes: 'ZONE RENAME: Legacy "R 9,600" → "R-L1" (Dec 2024 Comprehensive Plan). ROUND 3 (2026-04-25 owner upload of BMC 12.14.030): chart-confirmed values. Min lot 6,000 sf (chart, NOT 9,600 sf as P0-3 inferred). Front yard: 20ft garage door / 15ft all others. Rear yard: 15ft no-alley / 0 with alley / 3ft alley garage doors. Side yard: 5ft per side. Max building height 35ft. Max hard surface coverage 55%. Middle housing per BMC 12.14.134: base 2 du / transit-or-affordable 4 du (matches HB 1110 Tier 2 statutory floor). Max 2 ADUs/lot. ADU per BMC 12.14.135: max 1,200 sf (exceeds HB 1337 floor of 1,000 — local rule governs); 2 ADUs/lot; detached up to 30ft (33ft over existing accessory structure); no owner-occupancy. PARKING: Bothell eliminated all off-street parking minimums July 2025 via 5-1 council vote — parkingPerUnit=0; preempts SB 5184. UNCAPTURED OVERLAYS: Canyon Park Subarea (BMC 12.46), Northshore Senior Services Center SSHO (BMC 12.66.060), Northwest Mobile Estates (BMC 12.44.030), Shoreline Master Program (BMC 13.07.030). Downtown Subarea Plan (BMC Ch. 12.64) is a SEPARATE downtown overlay.',
    verifiedDate: '2026-04-25',
    _sourceMethod: 'manual',
    _sourceSnapshot: '2026-04-25',
    _legacy_key: 'bothell,wa:R-9600',
    _unverified: [],
  },
  'bothell,wa:R-L2': {
    jurisdiction: 'Bothell', state: 'WA', district: 'R-L2',
    fullName: 'Low-Density Residential 2 (current code; legacy R 7,200 series; min lot 3,600 sf per BMC 12.14.030 chart)',
    codeURL: 'https://bothell.municipal.codes/BMC/12.14.030',
    frontSetback: 15, rearSetback: 15,
    leftSetback: 5, rightSetback: 5,
    maxHeightFt: 35, maxStories: null,
    maxFAR: null,
    maxLotCoverage: 60,
    parkingPerUnit: 0,
    aduAllowed: true, aduMaxSqFt: 1200,
    densityBonus: 'WA HB 1110 (Tier 2, BMC 12.14.030 + 12.14.134, eff. 2025-06-30): 2 du by right citywide; 4 du within 0.25mi major transit OR with one affordable unit. Matches Tier 2 statutory floor exactly. Corner-lot duplexes already permitted in R 7,200 zone since 2021 (pre-HB 1110 city action).',
    sb9Eligible: false,
    notes: 'ZONE RENAME: Legacy "R 7,200" → "R-L2" (Dec 2024 Comprehensive Plan). ROUND 3 (2026-04-25 owner upload of BMC 12.14.030): chart-confirmed values. Min lot 3,600 sf (chart, NOT 7,200 sf as P0-3 inferred — R-L2 is denser than the legacy R 7,200 mapping suggested). Same setback/side/height profile as R-L1 (front 20ft garage / 15ft all others, rear 15ft no-alley / 0 with alley / 3ft alley garage doors, side 5ft, height 35ft). Hard surface coverage 60% (vs R-L1\'s 55%). Middle housing same as R-L1: base 2 / transit-or-affordable 4 (HB 1110 Tier 2 floor). Corner-lot duplexes legal pre-HB 1110. ADU rules same as R-L1 (1,200 sf max; 2/lot; no owner-occupancy). Parking 0 (Jul 2025 voluntary elimination). Same overlay framework as R-L1.',
    verifiedDate: '2026-04-25',
    _sourceMethod: 'manual',
    _sourceSnapshot: '2026-04-25',
    _legacy_key: 'bothell,wa:R-7200',
    _unverified: [],
  },
  // Bothell legacy stubs — graceful resolution when stale parcel data tags pre-rename codes
  'bothell,wa:R-9600': {
    jurisdiction: 'Bothell', state: 'WA', district: 'R-9600',
    fullName: 'R 9,600 (RENAMED 2024-12-10 — see bothell,wa:R-L1)',
    codeURL: 'https://bothell.municipal.codes/BMC/12.04.020',
    notes: 'Renamed by Bothell 2024 Comprehensive Plan Periodic Update (City Council 2024-12-10). Successor: bothell,wa:R-L1.',
    verifiedDate: '2026-04-25',
    _repealed: true,
    _replacedBy: 'bothell,wa:R-L1',
  },
  'bothell,wa:R-7200': {
    jurisdiction: 'Bothell', state: 'WA', district: 'R-7200',
    fullName: 'R 7,200 (RENAMED 2024-12-10 — see bothell,wa:R-L2)',
    codeURL: 'https://bothell.municipal.codes/BMC/12.04.020',
    notes: 'Renamed by Bothell 2024 Comprehensive Plan Periodic Update (City Council 2024-12-10). Successor: bothell,wa:R-L2.',
    verifiedDate: '2026-04-25',
    _repealed: true,
    _replacedBy: 'bothell,wa:R-L2',
  },

  // ── Renton, WA ──
  // District codes R-4 and R-8 RETAINED through HB 1110 compliance (Ord adopted
  // 2025-06-24, eff. ~2025-07-24). RMC 4-2-110A is dimensional standards section;
  // codepublishing.com 403'd. Wall plate heights confirmed from snippets.
  'renton,wa:R-4': {
    jurisdiction: 'Renton', state: 'WA', district: 'R-4',
    fullName: 'Residential-4 (low-density; 4 du/net acre base)',
    codeURL: 'https://www.codepublishing.com/WA/Renton/html/Renton04/Renton0402/Renton0402110A.html',
    frontSetback: null, rearSetback: null,
    leftSetback: null, rightSetback: null,
    maxHeightFt: 32, maxStories: null,
    maxFAR: null,
    maxLotCoverage: null,
    parkingPerUnit: null,
    aduAllowed: true, aduMaxSqFt: 1000,
    densityBonus: 'WA HB 1110 (Tier 1, Ord adopted 2025-06-24): 4 du citywide by right; 6 du within 0.25mi major transit (Stride BRT terminal at Renton Landing qualifies). RMC 4-9-065 density bonus review also available.',
    sb9Eligible: false,
    notes: 'Zone name R-4 RETAINED — Renton did NOT rename residential districts in its 2025-06-24 HB 1110 ordinance (unlike Tacoma/Redmond/Everett/Bellevue/Bothell). Wall plate height 32ft confirmed from RMC 4-2-110A search snippet (R-4 is 32ft tier; R-8/R-6/R-10/R-14 are the 24ft tier — counterintuitive but reflects denser-zone bulk control). HB 1337 (eff. 2025-07-23, RCW 35A.21.314) fully implemented in same June 2025 ordinance package: ADU floor 1,000 sf, 2 ADUs/lot, no owner-occupancy. WA SB 5184 (May 2025): caps SFR parking at 1 space/unit; Renton (~108k pop) must codify by 2027-01-27. Cottage-cluster standards in RMC 4-2-110G may apply. UNCAPTURED OVERLAYS: Renton Landing/The Landing commercial overlay; Sunset Area Master Plan; Cedar River Shoreline Master Program (RMC 4-3-090); Aquifer Protection Wellfield Tiers I/II (RMC 4-3-050) — covers significant residential acreage. FAR not used as primary residential control in Renton (lot-coverage based). FETCH NOTE: codepublishing.com, rentonwa.gov, yourvoice.rentonwa.gov, edocs.rentonwa.gov, rentonreporter.com all returned 403; values via Google/Bing search snippets only. Most numeric fields in _unverified.',
    verifiedDate: '2026-04-25',
    _sourceMethod: 'search-snippet',
    _sourceSnapshot: '2026-04-25',
    _unverified: ['frontSetback', 'rearSetback', 'leftSetback', 'rightSetback', 'maxStories', 'maxFAR', 'maxLotCoverage', 'parkingPerUnit'],
  },
  'renton,wa:R-8': {
    jurisdiction: 'Renton', state: 'WA', district: 'R-8',
    fullName: 'Residential-8 (moderate-density; 8 du/net acre base)',
    codeURL: 'https://www.codepublishing.com/WA/Renton/html/Renton04/Renton0402/Renton0402110A.html',
    frontSetback: null, rearSetback: null,
    leftSetback: null, rightSetback: null,
    maxHeightFt: 24, maxStories: null,
    maxFAR: null,
    maxLotCoverage: null,
    parkingPerUnit: null,
    aduAllowed: true, aduMaxSqFt: 1000,
    densityBonus: 'WA HB 1110 (Tier 1, Ord adopted 2025-06-24): 4 du citywide by right; 6 du within 0.25mi major transit (Stride BRT terminal at Renton Landing). RMC 4-9-065 density bonus review available.',
    sb9Eligible: false,
    notes: 'Zone name R-8 RETAINED. Wall plate height 24ft (lower than R-4\'s 32ft despite denser zone — bulk control via lower plate). Same June 2025 ordinance package implemented HB 1110 + HB 1337. SB 5184 same as R-4 (codification deadline 2027-01-27). Same uncaptured overlays as R-4: The Landing, Sunset Area Master Plan, Cedar River SMP, Aquifer Protection Wellfield Tiers. Cottage-cluster (RMC 4-2-110G) may apply. FAR not the primary control. FETCH NOTE: same 403 block as R-4.',
    verifiedDate: '2026-04-25',
    _sourceMethod: 'search-snippet',
    _sourceSnapshot: '2026-04-25',
    _unverified: ['frontSetback', 'rearSetback', 'leftSetback', 'rightSetback', 'maxStories', 'maxFAR', 'maxLotCoverage', 'parkingPerUnit'],
  },

  // ── Kent, WA ──
  // District codes SR-6 and SR-8 RETAINED through ReCode Kent Phase 1 (Ord 4517
  // adopted 2025-06-30, eff. 2025-07-30). KCC 15.04 governs but
  // codepublishing.com/WA/Kent/ 403'd; values are best-available from search
  // snippets and SEPA checklist excerpts; flagged in _unverified pending direct
  // chart read.
  'kent,wa:SR-6': {
    jurisdiction: 'Kent', state: 'WA', district: 'SR-6',
    fullName: 'Single-Family Residential 6 du/acre',
    codeURL: 'https://www.codepublishing.com/WA/Kent/html/Kent15/Kent1504.html',
    frontSetback: 20, rearSetback: 20,
    leftSetback: 5, rightSetback: 5,
    maxHeightFt: 35, maxStories: 2,
    maxFAR: null,
    maxLotCoverage: null,
    parkingPerUnit: 1,
    aduAllowed: true, aduMaxSqFt: 1000,
    densityBonus: 'WA HB 1110 (Tier 1, Ord 4517, eff. 2025-07-30): 4 du by right citywide; 6 du within 0.25mi major transit (Sounder Kent Station + planned ST2 Link extension).',
    sb9Eligible: false,
    notes: 'Zone name SR-6 RETAINED. Density 6.05 du/ac confirmed (Kent Reporter subdivision approval). Setback values (front 20, rear 20, side 5 per side) are best-guess from KCC 15.08 general SR-zone provisions snippets — KCC 15.04.170 district table not directly readable. NOTE: one snippet stated "side minimum 15 feet" which may be the COMBINED rule rather than per-side; chart access needed to disambiguate. Height 35ft / 2.5 stories from SEPA checklist excerpt (apps.ecology.wa.gov DocumentId=198716). HB 1110 / HB 1337 / SB 5184 framework: ReCode Kent Phase 1 implements HB 1110 (4 du citywide, 6 near transit). ADU per Ord 4325 (eff. 2023-06-15) ahead of HB 1337: 2 ADUs/lot, max 1,000 sf, max 24ft height, no owner-occupancy, no parking required, first ADU impact-fee waived + second 50% of SFR rate. SB 5184: parking cap 1/SFR; Kent (~136k pop) compliance deadline 2027-01-27 — parkingPerUnit=1 reflects the cap. UNCAPTURED OVERLAYS: Downtown Subarea Action Plan (commercial corridors), Midway Subarea Plan (commercial), Kent Valley industrial overlays (Green River M-1/M-2), Shoreline Master Program (within 200ft of Green River / Lake Fenwick). All numeric fields flagged _unverified pending direct read of KCC 15.04.170. FETCH NOTE: codepublishing.com + engage.kentwa.gov + apps.ecology.wa.gov + kentwa.gov WebLink all 403\'d.',
    verifiedDate: '2026-04-25',
    _sourceMethod: 'search-snippet',
    _sourceSnapshot: '2026-04-25',
    _unverified: ['frontSetback', 'rearSetback', 'leftSetback', 'rightSetback', 'maxHeightFt', 'maxStories', 'maxFAR', 'maxLotCoverage', 'parkingPerUnit'],
  },
  'kent,wa:SR-8': {
    jurisdiction: 'Kent', state: 'WA', district: 'SR-8',
    fullName: 'Single-Family Residential 8 du/acre',
    codeURL: 'https://www.codepublishing.com/WA/Kent/html/Kent15/Kent1504.html',
    frontSetback: 20, rearSetback: 20,
    leftSetback: 5, rightSetback: 5,
    maxHeightFt: 35, maxStories: 2,
    maxFAR: null,
    maxLotCoverage: null,
    parkingPerUnit: 1,
    aduAllowed: true, aduMaxSqFt: 1000,
    densityBonus: 'WA HB 1110 (Tier 1, Ord 4517, eff. 2025-07-30): 4 du by right citywide; 6 du within 0.25mi major transit (Sounder/Link).',
    sb9Eligible: false,
    notes: 'Zone name SR-8 RETAINED. Higher-density single-family tier (~8 du/ac, ~5,400 sf implied lot). Dimensional standards CARRIED from SR-6 (KCC 15.04.170 not directly read; same Ch. 15.08 general SR-zone provisions assumed) — possible SR-8 has reduced setbacks vs SR-6 (denser intent), unverified. Same HB 1110 / HB 1337 / SB 5184 framework, ADU rules, and uncaptured overlays as SR-6. Drawing-engine should verify per-lot floor-area headroom — SR-8 may trigger HB 1110 6-unit threshold faster than SR-6 due to smaller base lot. FETCH NOTE: same 403 block as SR-6.',
    verifiedDate: '2026-04-25',
    _sourceMethod: 'search-snippet',
    _sourceSnapshot: '2026-04-25',
    _unverified: ['frontSetback', 'rearSetback', 'leftSetback', 'rightSetback', 'maxHeightFt', 'maxStories', 'maxFAR', 'maxLotCoverage', 'parkingPerUnit'],
  },

  // ── Federal Way, WA ──
  // District codes RS 7.2 and RS 9.6 RETAINED through HB 1110 compliance.
  // Middle-housing ordinance adopted 2025-06-03 (effective ~2025-07-03 per
  // standard 30-day rule, unverified from ordinance text).
  // CRITICAL DATE: Federal Way Link Extension (1 Line ext to Federal Way
  // Downtown station) opened 2025-12-06 — NOT 2024-08-30 (that was Lynnwood
  // Link). HB 1110 transit bonus applies as of Dec 2025.
  'federal way,wa:RS 7.2': {
    jurisdiction: 'Federal Way', state: 'WA', district: 'RS 7.2',
    fullName: 'Single-Family Residential — 7,200 sq ft minimum lot',
    codeURL: 'https://www.codepublishing.com/WA/FederalWay/html/FederalWay19/FederalWay19200.html',
    frontSetback: 20, rearSetback: 5, leftSetback: 5, rightSetback: 5,
    maxHeightFt: 30, maxStories: null,
    maxFAR: null,
    maxLotCoverage: 60,
    parkingPerUnit: 1,
    aduAllowed: true, aduMaxSqFt: 1000,
    densityBonus: 'WA HB 1110 (Tier 1, Ord adopted 2025-06-03): 4 du by right citywide; 6 du within 0.25mi major transit. Federal Way Link Downtown station (opened 2025-12-06) qualifies; parcels within 0.25mi walking distance eligible for 6 du/lot.',
    sb9Eligible: false,
    notes: 'ROUND 5g (2026-04-25 owner-uploaded FWRC 19.200.010 chart, "Detached dwelling unit"): chart-confirmed values for the RS 15.0 / 9.6 / 7.2 / 5.0 group ("Otherwise:" sub-row): front 20ft, side 5ft per side (10ft on corner-lot street side per note 3), rear 5ft. Height 30ft above average building elevation (universal across all RS zones). Min lot 7,200 sf (chart note 1d). Lot coverage 60% (chart note 6d). Chart parking 2 per dwelling unit; matrix carries 1 to reflect WA SB 5184 cap (~102k pop city, applyWaStatewide enforces SB5184:statutoryCap mode at runtime). Note that RS 35.0 has different setbacks (front 20 / side 10 / rear 10) — separate sub-row at top of chart. WA HB 1337: 2 ADUs/lot, 1,000 sf floor (state-floor governs where local pre-HB-1337 cap was 300–800 sf with 40% GFA). UNCAPTURED OVERLAYS: City Center Core (CC-C, FWRC 19.225) and City Center Frame (CC-F, FWRC 19.230); Twin Lakes Subarea Plan; Shoreline Master Program (FWRC Ch. 15.05) — 200ft from OHWM of Puget Sound + named lakes (Star, Steel, Dolloff, North, Geneva, Killarney, Five Mile) supersedes RS base.',
    verifiedDate: '2026-04-25',
    _sourceMethod: 'manual',
    _sourceSnapshot: '2026-04-25',
    _unverified: ['maxStories', 'maxFAR'],
  },
  'federal way,wa:RS 9.6': {
    jurisdiction: 'Federal Way', state: 'WA', district: 'RS 9.6',
    fullName: 'Single-Family Residential — 9,600 sq ft minimum lot',
    codeURL: 'https://www.codepublishing.com/WA/FederalWay/html/FederalWay19/FederalWay19200.html',
    frontSetback: 20, rearSetback: 5, leftSetback: 5, rightSetback: 5,
    maxHeightFt: 30, maxStories: null,
    maxFAR: null,
    maxLotCoverage: 60,
    parkingPerUnit: 1,
    aduAllowed: true, aduMaxSqFt: 1000,
    densityBonus: 'WA HB 1110 (Tier 1, Ord adopted 2025-06-03): 4 du by right citywide; 6 du within 0.25mi major transit. Federal Way Link Downtown station (opened 2025-12-06) qualifies.',
    sb9Eligible: false,
    notes: 'ROUND 5g (2026-04-25 owner-uploaded FWRC 19.200.010 chart): chart-confirmed values per the RS 15.0 / 9.6 / 7.2 / 5.0 "Otherwise:" sub-row. Same setbacks/height/coverage profile as RS 7.2 (front 20ft, side 5ft per side, rear 5ft, height 30ft above ABE, lot coverage 60%). RS 9.6 = 9,600 sf min lot (chart note 1c). Larger-lot sibling to RS 7.2; same HB 1110 / HB 1337 / SB 5184 framework, same overlay carve-outs (CC-C/CC-F, SMP, Twin Lakes). Chart parking 2 per dwelling unit; matrix carries 1 (SB 5184 cap via applyWaStatewide).',
    verifiedDate: '2026-04-25',
    _sourceMethod: 'manual',
    _sourceSnapshot: '2026-04-25',
    _unverified: ['maxStories', 'maxFAR'],
  },

  // ── San Francisco, CA ──
  'san francisco,ca:RH-1': {
    jurisdiction: 'San Francisco', state: 'CA', district: 'RH-1',
    fullName: 'Residential House, One-Family',
    codeURL: 'https://codelibrary.amlegal.com/codes/san_francisco/',
    frontSetback: 15, rearSetback: 45, leftSetback: 0, rightSetback: 0,
    maxHeightFt: 40, maxStories: 3, maxFAR: 1.8, maxLotCoverage: 55,
    parkingPerUnit: 1, aduAllowed: true, aduMaxSqFt: 1200,
    densityBonus: 'State density bonus (SB35, SB9); HOME-SF affordable housing',
    sb9Eligible: true,
    notes: 'SB9 lot split + duplex by right. State density bonus unlocks up to 4 units.',
    verifiedDate: '2025-01',
  },
  'san francisco,ca:RH-2': {
    jurisdiction: 'San Francisco', state: 'CA', district: 'RH-2',
    fullName: 'Residential House, Two-Family',
    codeURL: 'https://codelibrary.amlegal.com/codes/san_francisco/',
    frontSetback: 15, rearSetback: 45, leftSetback: 0, rightSetback: 0,
    maxHeightFt: 40, maxStories: 3, maxFAR: 1.8, maxLotCoverage: 55,
    parkingPerUnit: 1, aduAllowed: true, aduMaxSqFt: 1200,
    densityBonus: 'State density bonus + AB 2011 (multifamily on commercial corridors)',
    sb9Eligible: true,
    verifiedDate: '2025-01',
  },

  // ── Los Angeles, CA ──
  'los angeles,ca:R1': {
    jurisdiction: 'Los Angeles', state: 'CA', district: 'R1',
    fullName: 'One-Family Residential',
    codeURL: 'https://codelibrary.amlegal.com/codes/los_angeles/',
    frontSetback: 20, rearSetback: 15, leftSetback: 5, rightSetback: 5,
    maxHeightFt: 33, maxStories: 2.5, maxFAR: 0.5, maxLotCoverage: 45,
    parkingPerUnit: 2, aduAllowed: true, aduMaxSqFt: 1200,
    densityBonus: 'State density bonus (SB9 by-right duplex + lot split)',
    sb9Eligible: true,
    notes: 'Ministerial duplex + JADU by AB 2221. Up to 4 units on R1 lot with SB9 split.',
    verifiedDate: '2025-01',
  },

  // ── Portland, OR ──
  'portland,or:R5': {
    jurisdiction: 'Portland', state: 'OR', district: 'R5',
    fullName: 'Single-Dwelling Residential (5,000sf)',
    codeURL: 'https://www.portlandoregon.gov/citycode/28197',
    frontSetback: 10, rearSetback: 5, leftSetback: 5, rightSetback: 5,
    maxHeightFt: 30, maxStories: 2.5, maxFAR: 0.5, maxLotCoverage: 50,
    parkingPerUnit: 0, aduAllowed: true, aduMaxSqFt: 800,
    densityBonus: 'RIP (Residential Infill Project) — up to 4 units on any R-zone lot',
    sb9Eligible: false,
    notes: 'HB2001 statewide middle-housing: duplexes by right; 4-plex in transit corridors.',
    verifiedDate: '2025-01',
  },

  // ── Austin, TX ──
  'austin,tx:SF-3': {
    jurisdiction: 'Austin', state: 'TX', district: 'SF-3',
    fullName: 'Family Residence',
    codeURL: 'https://library.municode.com/tx/austin/codes/',
    frontSetback: 25, rearSetback: 10, leftSetback: 5, rightSetback: 5,
    maxHeightFt: 35, maxStories: 2.5, maxFAR: 0.4, maxLotCoverage: 40,
    parkingPerUnit: 2, aduAllowed: true, aduMaxSqFt: 1100,
    densityBonus: null, sb9Eligible: false,
    verifiedDate: '2025-01',
  },

  // ── Expansion batch 2 (researched by zoning-legal agent, verified 2026-04) ──
  // Where a numeric field is contextual, formula-driven, or graphic-only in the
  // code (NYC contextual front yards, Chicago RS-3 setbacks, Miami T3-R graphic
  // standards, DC R-3 row-house contextual setbacks) the value is set to null
  // and the field name is added to _unverified[]. checklist-auto surfaces
  // these as 🔍 VERIFY items so the user knows to research per-parcel.

  'new york,ny:R6': {
    jurisdiction: 'New York City', state: 'NY', district: 'R6',
    fullName: 'Residence District R6',
    codeURL: 'https://zr.planning.nyc.gov/article-ii/chapter-3',
    frontSetback: null, rearSetback: 30, leftSetback: null, rightSetback: null,
    maxHeightFt: 70, maxStories: null, maxFAR: 3.0, maxLotCoverage: 80,
    parkingPerUnit: 0.5, aduAllowed: true, aduMaxSqFt: 800,
    densityBonus: 'Inclusionary Housing Program: up to 0.6 bonus FAR for affordable units',
    sb9Eligible: false,
    notes: 'Dual-path: height-factor or Quality Housing. Narrow-street variant (lot >100ft from wide street) caps FAR at 2.2 / height 55ft. Front yard contextual; rear yard 30ft for lots <40ft wide, 20ft for 40ft+. Side yards: none for attached/semi-detached, 5ft each for detached. Parking 0.5/DU (waived if ≤5 required). City of Yes for Housing Opportunity (eff Jan 2025): ADUs legalised citywide up to 800 sf; parking minimums eliminated for ADUs.',
    verifiedDate: '2026-04',
    _unverified: ['frontSetback','leftSetback','rightSetback','maxStories'],
  },

  'boston,ma:1F-5000': {
    jurisdiction: 'Boston', state: 'MA', district: '1F-5000',
    fullName: 'Single-Family Residential Subdistrict, 5,000 sf min lot',
    codeURL: 'https://library.municode.com/ma/boston/codes/redevelopment_authority?nodeId=ART13DIRE',
    frontSetback: 20, rearSetback: 20, leftSetback: 5, rightSetback: 5,
    maxHeightFt: 35, maxStories: 2.5, maxFAR: 0.5, maxLotCoverage: null,
    parkingPerUnit: 1, aduAllowed: true, aduMaxSqFt: 900,
    densityBonus: null, sb9Eligible: false,
    notes: 'Boston Zoning Code Article 13. Boston is exempt from MGL Ch. 40A so MA Affordable Homes Act (Aug 2024 mandating ADUs ≤900sf statewide) does not auto-apply; Boston is developing its own ordinance. BPDA Neighborhood Housing initiative (2024) enables detached ADUs by right on owner-occupied lots in select neighborhoods. Lot coverage not in Article 13 base table for 1F.',
    verifiedDate: '2026-04',
    _unverified: ['maxLotCoverage'],
  },

  'chicago,il:RS-3': {
    jurisdiction: 'Chicago', state: 'IL', district: 'RS-3',
    fullName: 'Residential Single-Unit (Detached House) District',
    codeURL: 'https://codelibrary.amlegal.com/codes/chicago/latest/chicagozoning_il/0-0-0-48935',
    frontSetback: null, rearSetback: null, leftSetback: null, rightSetback: null,
    maxHeightFt: 30, maxStories: 2, maxFAR: 0.9, maxLotCoverage: null,
    parkingPerUnit: 1, aduAllowed: true, aduMaxSqFt: null,
    densityBonus: null, sb9Eligible: false,
    notes: 'Chicago Zoning Ordinance Ch. 17-2-0300. ALL setbacks formula-driven, not fixed: front = average of nearest two on block face (Sec. 17-2-0306); rear = 28% of lot depth or 50ft (whichever less); sides = combined 20% of width, min 2ft per side. Min lot area/DU: 2,500 sf. Citywide ADU ordinance (coach houses + conversion units) eff Apr 1, 2026 with aldermanic opt-in; RS-3 capped at 3 coach house permits per block per year. Coach house max 22ft height.',
    verifiedDate: '2026-04',
    _unverified: ['frontSetback','rearSetback','leftSetback','rightSetback','maxLotCoverage','aduMaxSqFt'],
  },

  'phoenix,az:R1-6': {
    jurisdiction: 'Phoenix', state: 'AZ', district: 'R1-6',
    fullName: 'Single-Family Residence District (6,000 sf min lot)',
    codeURL: 'https://phoenix.municipal.codes/ZO/613',
    frontSetback: 20, rearSetback: 15, leftSetback: 5, rightSetback: 5,
    maxHeightFt: 30, maxStories: 2, maxFAR: null, maxLotCoverage: 40,
    parkingPerUnit: 2, aduAllowed: true, aduMaxSqFt: 1000,
    densityBonus: null, sb9Eligible: false,
    notes: 'Phoenix ZO Sec. 613/701/706. FAR not specified — density via lot coverage and setbacks. Up to 2 ADUs/lot with single-family primary; 3rd permitted if one is affordable on lots ≥43,560 sf. ADU max = lesser of 1,000 sf or 75% of primary GFA (lots ≤10,000 sf). AZ HB 2720 (2023) limits municipal ADU restrictions below state minimums.',
    verifiedDate: '2026-04',
    _unverified: ['maxFAR'],
  },

  'denver,co:U-SU-C': {
    jurisdiction: 'Denver', state: 'CO', district: 'U-SU-C',
    fullName: 'Urban Single Unit C',
    codeURL: 'https://www.denvergov.org/content/dam/denvergov/Portals/646/documents/Zoning/DZC/Denver_Zoning_Code_Article5_Urban.pdf',
    frontSetback: null, rearSetback: null, leftSetback: null, rightSetback: null,
    maxHeightFt: 35, maxStories: 2.5, maxFAR: null, maxLotCoverage: 50,
    parkingPerUnit: 1, aduAllowed: true, aduMaxSqFt: 864,
    densityBonus: null, sb9Eligible: false,
    notes: 'Denver Zoning Code Article 5. Min lot 5,500 sf. Primary street setback block-sensitive (DZC 13.1.1.3) — must match adjacent lots, no fixed minimum. Height: 30ft / 2.5 stories in front 65% of lot depth; 17ft / 1 story in rear 35% (with allowances). 2024 citywide ADU text amendment: max 864 sf footprint on 6,000-7,000 sf lots; 650 sf on smaller. No ADU parking required.',
    verifiedDate: '2026-04',
    _unverified: ['frontSetback','rearSetback','leftSetback','rightSetback','maxFAR'],
  },

  'miami,fl:T3-R': {
    jurisdiction: 'Miami', state: 'FL', district: 'T3-R',
    fullName: 'Sub-Urban Transect Zone — Restricted (Single-Family)',
    codeURL: 'https://www.miami.gov/Planning-Zoning-Land-Use/View-City-of-Miami-Zoning-Code-Miami-21',
    frontSetback: null, rearSetback: 20, leftSetback: null, rightSetback: null,
    maxHeightFt: 25, maxStories: 2, maxFAR: null, maxLotCoverage: 50,
    parkingPerUnit: 1.5, aduAllowed: false, aduMaxSqFt: null,
    densityBonus: null, sb9Eligible: false,
    notes: 'Miami 21 form-based code, Article 5. T3-R = ONE principal SFR per lot (duplexes need T3-O or T3-L). 2nd-story coverage capped at 30%. Min lot 5,000 sf, min width 50ft. Front and side setbacks defined GRAPHICALLY in Illustration 5.3 — direct code review required per parcel. ADU ordinance proposed Feb 2025 (1-story, ≤800 sf, owner-occupied) but not yet adopted as of Apr 2026.',
    verifiedDate: '2026-04',
    _unverified: ['frontSetback','leftSetback','rightSetback','maxFAR','aduMaxSqFt'],
  },

  'atlanta,ga:R-4': {
    jurisdiction: 'Atlanta', state: 'GA', district: 'R-4',
    fullName: 'Single-Family Residential District',
    codeURL: 'https://library.municode.com/ga/atlanta/codes/code_of_ordinances?nodeId=PTIIICOORANDECO_PT16ZO_CH6SIMIREDIRE',
    frontSetback: 35, rearSetback: 15, leftSetback: 7, rightSetback: 7,
    maxHeightFt: 35, maxStories: 2, maxFAR: 0.5, maxLotCoverage: 50,
    parkingPerUnit: 2, aduAllowed: true, aduMaxSqFt: 750,
    densityBonus: null, sb9Eligible: false,
    notes: 'Atlanta Code Pt. III, Pt. 16, Ch. 6 (Secs. 16-06.007–009). ADU ≤750 sf; combined house+ADU coverage ≤55%; ADU height ≤20ft; ADU may not cover >25% of rear yard. No owner-occupancy required as of 2024 amendment.',
    verifiedDate: '2026-04',
    _unverified: [],
  },

  'dallas,tx:R-7.5(A)': {
    jurisdiction: 'Dallas', state: 'TX', district: 'R-7.5(A)',
    fullName: 'Single Family District, 7,500 sf min lot',
    codeURL: 'https://codelibrary.amlegal.com/codes/dallas/latest/dallas_tx/0-0-0-73675',
    frontSetback: 25, rearSetback: 5, leftSetback: 5, rightSetback: 5,
    maxHeightFt: 36, maxStories: 2.5, maxFAR: null, maxLotCoverage: 45,
    parkingPerUnit: 2, aduAllowed: true, aduMaxSqFt: 800,
    densityBonus: null, sb9Eligible: false,
    notes: 'Dallas Dev Code Ch. 51A (Secs. 51A-4.112, 51A-4.410). FAR not specified — coverage + setbacks govern. ADU NOT by-right citywide; requires neighborhood ADU Overlay (Sec. 51A-4.510) or BoA special exception. Where overlay applies: ≤800 sf, 1BR, owner-occupied.',
    verifiedDate: '2026-04',
    _unverified: ['maxFAR'],
  },

  'minneapolis,mn:R1A': {
    jurisdiction: 'Minneapolis', state: 'MN', district: 'R1A',
    fullName: 'Single-Family Residential District',
    codeURL: 'https://library.municode.com/mn/minneapolis/codes/code_of_ordinances?nodeId=MICOOR_TIT20ZOCO_CH546REDI_ARTIIR1MUMIDI_546.240BUBURE',
    frontSetback: null, rearSetback: 5, leftSetback: 5, rightSetback: 5,
    maxHeightFt: 35, maxStories: 2.5, maxFAR: 0.5, maxLotCoverage: 45,
    parkingPerUnit: 1, aduAllowed: true, aduMaxSqFt: 800,
    densityBonus: 'Minneapolis 2040 Comp Plan: up to 3 dwelling units by right on all residentially-zoned lots citywide',
    sb9Eligible: false,
    notes: 'Minneapolis Ch. 546, Article II Table 546-5. SF/2-family: max 2.5 stories / 28ft wall plate / 33ft to peak (35ft cap is for other principal structures). Front setback contextual per Ch. 535 — not in Table 546-5. Minneapolis 2040 Comp Plan (adopted 2019, affirmed by MN Sup Ct 2023) allows triplexes by right on all residential lots. ADU: 1/lot, detached ≤800 sf, attached ≤1,200 sf, no owner-occupancy required.',
    verifiedDate: '2026-04',
    _unverified: ['frontSetback'],
  },

  'washington,dc:R-3': {
    jurisdiction: 'Washington DC', state: 'DC', district: 'R-3',
    fullName: 'Residential House Zone — Row Dwelling',
    codeURL: 'https://handbook.dcoz.dc.gov/zones/residential/r-3/',
    frontSetback: null, rearSetback: 20, leftSetback: null, rightSetback: null,
    maxHeightFt: 40, maxStories: 3, maxFAR: null, maxLotCoverage: 70,
    parkingPerUnit: 1, aduAllowed: true, aduMaxSqFt: null,
    densityBonus: null, sb9Eligible: false,
    notes: '11 DCMR Subtitle D, Ch. 11-D3 (2016 Zoning Regs). Lot occupancy 70% (Sec. 11-403). Rear yard 20ft for row buildings. Front setback contextual — must fall within range of existing setbacks on block face. Side yard: 5ft for semi-detached; none for attached row. FAR not expressed as a discrete number for R zones — density via lot occupancy and height. ADU (Accessory Apartment) by-right; OWNER-OCCUPANCY required (Subtitle U §253). ADU max = 35% of principal GFA; principal must have ≥1,200 sf GFA.',
    verifiedDate: '2026-04',
    _unverified: ['frontSetback','leftSetback','rightSetback','maxFAR','aduMaxSqFt'],
  },

  'las vegas,nv:R-1': {
    jurisdiction: 'Las Vegas', state: 'NV', district: 'R-1',
    fullName: 'Single Family Residential District',
    codeURL: 'https://files.lasvegasnevada.gov/planning/Title-19-Development-Standards.pdf',
    frontSetback: 20, rearSetback: 10, leftSetback: 5, rightSetback: 5,
    maxHeightFt: 35, maxStories: 2, maxFAR: null, maxLotCoverage: 50,
    parkingPerUnit: 2, aduAllowed: null, aduMaxSqFt: null,
    densityBonus: null, sb9Eligible: false,
    notes: 'City of Las Vegas Title 19 Ch. 19.08 Table 1. FAR not specified — coverage/setbacks govern. ADU status requires direct verification: NV SB 174 (2021) prohibits municipal ADU bans, but Las Vegas-specific size/owner-occupancy rules vary. NOT to be confused with Clark County or North Las Vegas R-1.',
    verifiedDate: '2026-04',
    _unverified: ['maxFAR','aduAllowed','aduMaxSqFt'],
  },

  // Houston intentionally omitted: the city has no zoning ordinance; deed
  // restrictions are parcel-specific private instruments and cannot be
  // expressed in a district-level standards matrix.
};

// Normalize + look up.
// Tolerates dash↔space variants in the district name (round 5n / issue #1
// fix): site-intel often returns "RSA-6" while the matrix key is "RSA 6".
// Returns the matched key when found, otherwise the canonical-form key
// (consumer treats null match as no override).
window.zoningMatrixKey = function(jurisdiction, state, district) {
  if (!jurisdiction || !district) return null;
  const j = String(jurisdiction).toLowerCase().trim();
  const s = String(state || '').toLowerCase().trim();
  const d = String(district).trim();
  // Generate candidate district variants: original, dashes→spaces,
  // spaces→dashes, no-separators, normalized whitespace.
  const variants = [];
  const seen = new Set();
  for (const v of [d, d.replace(/-/g, ' '), d.replace(/\s+/g, '-'), d.replace(/[\s-]+/g, ''), d.replace(/\s+/g, ' ')]) {
    if (!seen.has(v)) { seen.add(v); variants.push(v); }
  }
  for (const v of variants) {
    const key = `${j},${s}:${v}`;
    if (window.ZONING_MATRIX_DB && window.ZONING_MATRIX_DB[key]) return key;
  }
  // No match — return canonical-form key (caller will see undefined override)
  return `${j},${s}:${d}`;
};
