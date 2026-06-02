// test/middle-housing.test.js
// Node-runnable test for window.effectiveZoning() and the WA HB 1110 overlay.
// Project has no test framework yet — this is the first test file. Uses
// node:assert + node:vm to load the data files (which assume a `window`
// global from the browser context) without a build step.
//
// Run:  node test/middle-housing.test.js
//
// On success the script exits 0 and prints "PASS <name>" per case. On any
// failed assertion it exits non-zero with the assertion error.

const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const assert = require('node:assert/strict');

// ── load data/zoning-matrix.js and data/middle-housing.js into a sandbox ──
const root = path.resolve(__dirname, '..');
const sandbox = { window: {}, console };
vm.createContext(sandbox);
for (const f of ['data/zoning-matrix.js', 'data/middle-housing.js', 'data/wa-statewide.js']) {
  const src = fs.readFileSync(path.join(root, f), 'utf8');
  vm.runInContext(src, sandbox, { filename: f });
}
const { ZONING_MATRIX_DB, MIDDLE_HOUSING_DB, WA_STATEWIDE_DB } = sandbox.window;
const effectiveZoning = sandbox.window.effectiveZoning;
const applyWaStatewide = sandbox.window.applyWaStatewide;

assert.ok(ZONING_MATRIX_DB, 'ZONING_MATRIX_DB loaded');
assert.ok(MIDDLE_HOUSING_DB, 'MIDDLE_HOUSING_DB loaded');
assert.equal(typeof effectiveZoning, 'function', 'effectiveZoning is a function');

let passed = 0;
function pass(name) { console.log('PASS', name); passed++; }

// ── Coverage: all 10 P0-3 cities present in the overlay ──
const expectedCities = [
  'bellevue,wa', 'tacoma,wa', 'everett,wa', 'redmond,wa', 'kirkland,wa',
  'auburn,wa', 'bothell,wa', 'renton,wa', 'kent,wa', 'federal way,wa',
];
for (const c of expectedCities) {
  assert.ok(MIDDLE_HOUSING_DB[c], `MIDDLE_HOUSING_DB has ${c}`);
}
pass('All 10 P0-3 cities have a middle-housing overlay');

// ── Each overlay carries the required fields ──
for (const c of expectedCities) {
  const o = MIDDLE_HOUSING_DB[c];
  assert.equal(o.statuteName, 'WA HB 1110', `${c}: statuteName`);
  assert.match(o.populationTier, /^tier[12]$/, `${c}: populationTier`);
  assert.ok(o.statutoryFloor, `${c}: statutoryFloor`);
  assert.equal(typeof o.statutoryFloor.baseUnits, 'number', `${c}: baseUnits is number`);
  assert.ok(o.localOrdinance, `${c}: localOrdinance`);
  assert.ok(o.codeURL, `${c}: codeURL`);
  assert.ok(o.cityImplementationURL, `${c}: cityImplementationURL`);
  assert.ok(o.verifiedDate, `${c}: verifiedDate`);
}
pass('All overlays carry required schema fields');

// ── Bothell is the only Tier 2; all others Tier 1 ──
assert.equal(MIDDLE_HOUSING_DB['bothell,wa'].populationTier, 'tier2', 'Bothell tier2');
const bothellFloor = MIDDLE_HOUSING_DB['bothell,wa'].statutoryFloor;
assert.equal(bothellFloor.baseUnits, 2, 'Bothell Tier 2 base 2');
assert.equal(bothellFloor.transitUnits, 4, 'Bothell Tier 2 transit 4');
assert.equal(bothellFloor.affordableUnits, 4, 'Bothell Tier 2 affordable 4');
for (const c of expectedCities) {
  if (c === 'bothell,wa') continue;
  assert.equal(MIDDLE_HOUSING_DB[c].populationTier, 'tier1', `${c} is tier1`);
}
pass('Bothell is Tier 2 with statutory 2/4/4 floor; all others Tier 1');

// ── KEY FIXTURE: same Bellevue R-5 evaluated with HB 1110 enabled vs disabled
//                returns different unit counts (per PROJECT_COORDINATOR.md §P0-4
//                success criterion). ──
const bellevueWithoutHB = effectiveZoning('Bellevue', 'R-5', { enableMiddleHousing: false });
const bellevueWithHB = effectiveZoning('Bellevue', 'R-5', { enableMiddleHousing: true });
assert.equal(bellevueWithoutHB.effective.maxUnits, 1, 'Bellevue R-5 without HB 1110 → 1 unit');
assert.equal(bellevueWithHB.effective.maxUnits, 4, 'Bellevue R-5 with HB 1110 → 4 units');
assert.notEqual(
  bellevueWithoutHB.effective.maxUnits,
  bellevueWithHB.effective.maxUnits,
  'Bellevue R-5 unit count differs with vs. without HB 1110',
);
pass('Bellevue R-5: HB 1110 toggle changes unit count (1 → 4)');

// ── Bellevue R-5 + transit → 6 units; height cap 32ft from dimensionalOverrides ──
const bellevueTransit = effectiveZoning('Bellevue', 'R-5', { nearMajorTransit: true });
assert.equal(bellevueTransit.effective.maxUnits, 6, 'Bellevue R-5 transit → 6 units');
assert.equal(bellevueTransit.effective.maxHeightFt, 32, 'Bellevue R-5 transit → 32ft middle-housing height cap');
assert.ok(
  bellevueTransit.effective.appliedRules.includes('dimensionalOverride:maxHeightFt'),
  'Bellevue applies maxHeightFt override',
);
// Height was 30ft before the override
assert.equal(bellevueWithoutHB.effective.maxHeightFt, 30, 'Bellevue R-5 base height 30ft');
pass('Bellevue R-5 transit: 6 units + 32ft middle-housing height cap');

// ── Redmond NR exceeds the floor: 6 du base, 8 du affordable ──
const redmondBase = effectiveZoning('Redmond', 'NR');
assert.equal(redmondBase.effective.maxUnits, 6, 'Redmond NR base → 6 units (city exceeds floor)');
const redmondAffordable = effectiveZoning('Redmond', 'NR', { includesAffordableUnit: true });
assert.equal(redmondAffordable.effective.maxUnits, 8, 'Redmond NR + affordable → 8 units');
assert.match(redmondAffordable.effective.sourceOfUnits, /:city$/, 'Redmond uses cityImplementationUnits');
pass('Redmond NR: city exceeds floor (6 base / 8 affordable)');

// ── Bothell: BMC 12.14.030 chart (round-3 manual copy) confirms exactly the
//    Tier 2 statutory floor — no city excess. cityImplementationUnits null.
const bothellBase = effectiveZoning('Bothell', 'R-L1');
assert.equal(bothellBase.effective.maxUnits, 2, 'Bothell R-L1 base → 2 units (Tier 2 statutory floor)');
const bothellTransit = effectiveZoning('Bothell', 'R-L1', { nearMajorTransit: true });
assert.equal(bothellTransit.effective.maxUnits, 4, 'Bothell R-L1 transit → 4 units (Tier 2 statutory)');
assert.match(bothellBase.effective.sourceOfUnits, /:statute$/, 'Bothell uses statutoryFloor (matches city implementation)');
assert.equal(MIDDLE_HOUSING_DB['bothell,wa'].cityImplementationUnits, null, 'Bothell cityImplementationUnits null after #17 resolution');
pass('Bothell R-L1: BMC 12.14.030 chart confirms Tier 2 floor (decision #17 resolved)');

// ── inException option suppresses the HB 1110 override ──
const redmondInException = effectiveZoning('Redmond', 'NR', { inException: true });
assert.equal(redmondInException.effective.maxUnits, 1, 'Redmond NR in exception → base 1 unit');
assert.ok(
  redmondInException.warnings.some(w => /exception/i.test(w)),
  'Redmond exception warning surfaced',
);
pass('inException flag suppresses middle-housing override');

// ── Repealed-redirect: redmond,wa:R-4 is _repealed → resolves to redmond,wa:NR ──
const redmondR4 = effectiveZoning('Redmond', 'R-4');
assert.equal(redmondR4.effective.maxUnits, 6, 'Redmond R-4 (repealed) redirects to NR → 6 units');
assert.ok(
  redmondR4.warnings.some(w => /repealed/i.test(w) || /redirect/i.test(w)),
  'Repealed redirect warning surfaced',
);
pass('Repealed-zone redirect (redmond R-4 → NR) works');

// ─────────────────────────────────────────────────────────────────────────────
// WA statewide overlay (HB 1337 + SB 5184)
// ─────────────────────────────────────────────────────────────────────────────

assert.ok(WA_STATEWIDE_DB, 'WA_STATEWIDE_DB loaded');
assert.ok(WA_STATEWIDE_DB.HB1337, 'HB1337 entry present');
assert.ok(WA_STATEWIDE_DB.SB5184, 'SB5184 entry present');
assert.equal(typeof applyWaStatewide, 'function', 'applyWaStatewide is a function');
pass('WA statewide DB + applyWaStatewide loaded');

// ── HB 1337 raises ADU floor to 1,000 sf when the matrix is below ──
{
  // Synthesize an envelope with an ADU floor below 1,000 sf
  const env = {
    jurisdiction: 'TestCity',
    district: 'X',
    baseZoning: { jurisdiction: 'TestCity', state: 'WA', district: 'X', aduMaxSqFt: 800, aduAllowed: false, parkingPerUnit: 2 },
    middleHousing: null,
    effective: { aduMaxSqFt: 800, aduAllowed: false, parkingPerUnit: 2, appliedRules: [] },
    warnings: [],
  };
  const out = applyWaStatewide(env);
  assert.equal(out.effective.aduMaxSqFt, 1000, 'HB 1337 raises ADU max to 1000');
  assert.equal(out.effective.aduAllowed, true, 'HB 1337 mandates ADU allowed');
  assert.equal(out.effective.minADUsPerLot, 2, 'HB 1337 mandates min 2 ADUs/lot');
  assert.equal(out.effective.aduOwnerOccupancyRequired, false, 'HB 1337 prohibits owner-occupancy req');
  assert.ok(out.effective.appliedRules.includes('HB1337:aduFloor'), 'HB 1337 rule applied');
}
pass('HB 1337 raises ADU floor to 1,000 sf and mandates 2/lot');

// ── HB 1337 cityImplementationOverride preserves above-floor local cap ──
{
  const bellevueR5 = effectiveZoning('Bellevue', 'R-5');
  const out = applyWaStatewide(bellevueR5);
  assert.equal(out.effective.aduMaxSqFt, 1200, 'Bellevue local cap 1,200 sf preserved (above floor)');
  assert.ok(out.effective.appliedRules.includes('HB1337:cityOverride'), 'cityOverride rule applied');
}
pass('HB 1337 city override preserves above-floor caps (Bellevue 1,200sf)');

// ── HB 1337 transit-proximity zeroes ADU parking ──
{
  const env = {
    jurisdiction: 'X', district: 'X',
    baseZoning: { jurisdiction: 'X', state: 'WA', district: 'X', aduMaxSqFt: 1000, aduAllowed: true, parkingPerUnit: 1 },
    middleHousing: null,
    effective: { aduMaxSqFt: 1000, aduAllowed: true, parkingPerUnit: 1, appliedRules: [] },
    warnings: [],
  };
  const noTransit = applyWaStatewide(env, { parcelNearMajorTransit: false });
  const transit = applyWaStatewide(env, { parcelNearMajorTransit: true });
  assert.equal(noTransit.effective.aduParkingPerUnit, 1, 'ADU parking 1 by default');
  assert.equal(transit.effective.aduParkingPerUnit, 0, 'ADU parking 0 within 0.5mi major transit');
}
pass('HB 1337 zeroes ADU parking within 0.5mi of major transit');

// ── SB 5184 caps SFR parking at 1/unit for >50k cities pending compliance ──
{
  // Federal Way is in citiesPendingCompliance with a current matrix value not 0.
  // Synthesize a high parking value to verify the cap fires.
  const env = {
    jurisdiction: 'Federal Way', district: 'RS 7.2',
    baseZoning: { jurisdiction: 'Federal Way', state: 'WA', district: 'RS 7.2', parkingPerUnit: 2, aduMaxSqFt: 1000, aduAllowed: true },
    middleHousing: MIDDLE_HOUSING_DB['federal way,wa'],
    effective: { parkingPerUnit: 2, aduMaxSqFt: 1000, aduAllowed: true, appliedRules: [] },
    warnings: [],
  };
  const out = applyWaStatewide(env);
  assert.equal(out.effective.parkingPerUnit, 1, 'SB 5184 caps Federal Way SFR parking 2 → 1');
  assert.equal(out.appliedStatewide.sb5184.mode, 'statutoryCap', 'mode = statutoryCap');
  assert.ok(
    out.warnings.some(w => /SB 5184/.test(w)),
    'SB 5184 cap warning surfaced',
  );
}
pass('SB 5184 caps SFR parking 1/unit for cities pending compliance (Federal Way)');

// ── SB 5184 'cityCodified' mode for cities that pre-codified ──
{
  const env = {
    jurisdiction: 'Tacoma', district: 'UR-1',
    baseZoning: { jurisdiction: 'Tacoma', state: 'WA', district: 'UR-1', parkingPerUnit: 0, aduMaxSqFt: 1000, aduAllowed: true },
    middleHousing: MIDDLE_HOUSING_DB['tacoma,wa'],
    effective: { parkingPerUnit: 0, aduMaxSqFt: 1000, aduAllowed: true, appliedRules: [] },
    warnings: [],
  };
  const out = applyWaStatewide(env);
  assert.equal(out.appliedStatewide.sb5184.mode, 'cityCodified', 'Tacoma already codified');
  assert.equal(out.effective.parkingPerUnit, 0, 'Tacoma parking remains 0');
}
pass('SB 5184 cityCodified mode for Tacoma (already at 0 via Ord 28986)');

// ── Non-WA envelope is left untouched ──
{
  const env = {
    jurisdiction: 'Portland', district: 'R5',
    baseZoning: { jurisdiction: 'Portland', state: 'OR', district: 'R5', parkingPerUnit: 0, aduMaxSqFt: 800, aduAllowed: true },
    middleHousing: null,
    effective: { parkingPerUnit: 0, aduMaxSqFt: 800, aduAllowed: true, appliedRules: [] },
    warnings: [],
  };
  const out = applyWaStatewide(env);
  assert.equal(out.effective.aduMaxSqFt, 800, 'Portland envelope untouched (non-WA)');
  assert.equal(out.appliedStatewide, undefined, 'No appliedStatewide on non-WA envelope');
}
pass('applyWaStatewide is a no-op for non-WA envelopes');

// ── Unknown jurisdiction ──
const unknown = effectiveZoning('Atlantis', 'A-1');
assert.equal(unknown.baseZoning, null, 'Unknown jurisdiction returns null base');
assert.ok(unknown.warnings.length > 0, 'Unknown jurisdiction emits warning');
pass('Unknown jurisdiction handled gracefully');

console.log(`\nAll ${passed} test groups passed.`);
