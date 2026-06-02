// ═══ WA_STATEWIDE_DB — HB 1337 + SB 5184 (P0-4 sibling to HB 1110) ═══
//
// Two WA statewide laws that override local residential standards across the
// entire launch market and were previously embedded in per-city `notes`
// fields. Modeling them first-class so the renderer applies them uniformly:
//
//   HB 1337 (RCW 36.70A.681) — statewide ADU floor.
//     ≥2 ADUs per residential lot, ADU max ≥1,000 sf (cities can't cap
//     below), no owner-occupancy requirement, no parking required within
//     0.5mi of major transit.  Applies to GMA-planning cities/counties.
//
//   SB 5184 (ESSB 5184, 2025) — off-street parking caps.
//     SFR cap 1 / unit, multifamily cap 0.5 / unit, ADU cap 0.
//     Applies to cities >50k population (GMA).  Cities have ~18 months
//     after the May 2025 signing to codify (~early 2027 deadline).
//
// Source data: extracted from data/zoning-matrix.js notes (P0-3 sweep).
// ─────────────────────────────────────────────────────────────────────────────

window.WA_STATEWIDE_DB = {

  HB1337: {
    fullTitle: 'WA HB 1337 — statewide ADU rules',
    statuteCite: 'RCW 36.70A.681',
    effective: '2024-06-06',
    appliesTo: 'GMA-planning cities & counties',
    minADUsPerLot: 2,
    minADUFloorSqFt: 1000,
    ownerOccupancyAllowed: false,
    parkingNearTransit: { withinMi: 0.5, parkingPerADU: 0 },
    parkingDefault: { parkingPerADU: 1 },
    cityImplementationOverrides: {
      // Cities that codified above the statewide floor:
      'bothell,wa': { aduMaxSqFt: 1200, notes: 'BMC 12.14.135 — local cap above the 1,000 sf state floor.' },
      'redmond,wa': { aduMaxSqFtAttached: 1500, aduMaxSqFtDetached: 1000, notes: 'RZC 21.08.220 — AADU up to 1,500 sf; DADU 1,000 sf.' },
      'bellevue,wa': { aduMaxSqFt: 1200, notes: 'LUC 20.20.390 (Ord 6746, 2024) — local cap above floor.' },
      'kent,wa': { notes: 'Ord 4325 (eff. 2023-06-15) implemented HB 1337 ahead of statewide effective date; first ADU impact-fee waived, second 50% of SFR rate.' },
    },
    codeURL: 'https://app.leg.wa.gov/RCW/default.aspx?cite=36.70A.681',
    verifiedDate: '2026-04-25',
    _sourceMethod: 'zoning-matrix-notes',
  },

  SB5184: {
    fullTitle: 'WA ESSB 5184 — residential off-street parking caps',
    statuteCite: 'ESSB 5184',
    effective: '2025-05-19',
    appliesTo: 'cities >50k population (GMA)',
    parkingCaps: { sfr: 1, multifamily: 0.5, adu: 0 },
    complianceDeadlineDefault: '2027-01-27',
    cityImplementations: {
      // Cities that have already codified compliance (eliminated minimums or
      // capped at SB 5184 levels). For these, parkingPerUnit in the matrix
      // already reflects the cap; the helper need not re-apply.
      'redmond,wa': { effective: '2025-01-01', cap: 0, notes: 'Ord 3186 eliminated all residential parking minimums.' },
      'tacoma,wa': { effective: '2025-02-01', cap: 0, notes: 'Home in Tacoma Phase 2 (Ord 28986) set residential parking minimums to 0.' },
      'bothell,wa': { effective: '2025-07-15', cap: 0, notes: 'July 2025 council vote 5-1 eliminated all off-street parking minimums (preempts SB 5184).' },
      'everett,wa': { effective: '2025-07-08', cap: 1, notes: 'EMC Table 34-1 codifies 1/du citywide post-Ord 4102-25.' },
    },
    citiesPendingCompliance: {
      // Cities >50k that have not yet codified — renderer should apply the
      // SB 5184 cap defensively until each city's local code lands.
      'bellevue,wa': { population: 151574 },
      'kirkland,wa': { population: 92175 },
      'auburn,wa': { population: 89110 },
      'renton,wa': { population: 108145 },
      'kent,wa': { population: 136588 },
      'federal way,wa': { population: 102978 },
    },
    codeURL: 'https://app.leg.wa.gov/billsummary?BillNumber=5184&Year=2025',
    verifiedDate: '2026-04-25',
    _sourceMethod: 'zoning-matrix-notes',
  },

};

// ─────────────────────────────────────────────────────────────────────────────
// applyWaStatewide(envelope, opts)
//
// Layers HB 1337 + SB 5184 onto the envelope returned by effectiveZoning().
// Pure: returns a new envelope (does not mutate the input).
//
// envelope: { jurisdiction, district, baseZoning, middleHousing, effective, warnings }
// opts:
//   enableHB1337           : boolean default true
//   enableSB5184           : boolean default true
//   parcelNearMajorTransit : boolean default false  (drives ADU parking = 0)
//   isMultifamily          : boolean default false  (drives 0.5/unit parking cap)
//
// Returns the same envelope shape with `effective` and `appliedRules` updated
// and `appliedStatewide: { hb1337, sb5184 }` added.
// ─────────────────────────────────────────────────────────────────────────────

window.applyWaStatewide = function applyWaStatewide(envelope, opts) {
  opts = opts || {};
  var enableHB = opts.enableHB1337 !== false;
  var enableSB = opts.enableSB5184 !== false;
  var nearTransit = !!opts.parcelNearMajorTransit;
  var isMF = !!opts.isMultifamily;

  if (!envelope || !envelope.baseZoning) return envelope;

  var state = (envelope.baseZoning.state || '').toLowerCase();
  if (state !== 'wa') return envelope;

  var jKey = (envelope.baseZoning.jurisdiction || '').toLowerCase().trim() + ',wa';
  var db = window.WA_STATEWIDE_DB || {};

  // Shallow-clone so we don't mutate the caller's envelope.
  var eff = {};
  for (var k in envelope.effective) eff[k] = envelope.effective[k];
  var rules = (envelope.effective.appliedRules || []).slice();
  var warnings = (envelope.warnings || []).slice();
  var applied = { hb1337: null, sb5184: null };

  // ── HB 1337 ──
  if (enableHB && db.HB1337) {
    var hb = db.HB1337;
    var override = (hb.cityImplementationOverrides || {})[jKey] || null;
    var floor = hb.minADUFloorSqFt;
    var localCap = override && (override.aduMaxSqFt || override.aduMaxSqFtDetached);
    var aduFinal = Math.max(eff.aduMaxSqFt || 0, localCap || 0, floor);
    if (aduFinal !== eff.aduMaxSqFt) {
      eff.aduMaxSqFt = aduFinal;
      rules.push('HB1337:aduFloor');
    }
    if (eff.aduAllowed !== true) {
      eff.aduAllowed = true;
      rules.push('HB1337:aduMandate');
    }
    eff.minADUsPerLot = hb.minADUsPerLot;
    eff.aduOwnerOccupancyRequired = false;
    eff.aduParkingPerUnit = nearTransit ? hb.parkingNearTransit.parkingPerADU : hb.parkingDefault.parkingPerADU;
    if (override) rules.push('HB1337:cityOverride');
    applied.hb1337 = { override: override, aduMaxSqFt: aduFinal, nearTransit: nearTransit };
  }

  // ── SB 5184 ──
  if (enableSB && db.SB5184) {
    var sb = db.SB5184;
    var localImpl = (sb.cityImplementations || {})[jKey] || null;
    var pending = (sb.citiesPendingCompliance || {})[jKey] || null;
    var capKey = isMF ? 'multifamily' : 'sfr';
    var capValue = sb.parkingCaps[capKey];

    if (localImpl) {
      // City has already codified — its matrix value should already comply.
      // Only apply the cap if the matrix value somehow exceeds it.
      if (eff.parkingPerUnit != null && eff.parkingPerUnit > capValue) {
        warnings.push('SB 5184: matrix parkingPerUnit (' + eff.parkingPerUnit + ') exceeds the city\'s codified ' + localImpl.cap + ' for ' + jKey + '; capping to local rule.');
        eff.parkingPerUnit = localImpl.cap;
      }
      rules.push('SB5184:cityCodified');
      applied.sb5184 = { mode: 'cityCodified', cap: localImpl.cap };
    } else if (pending) {
      // City >50k pending codification — apply the statewide cap defensively.
      if (eff.parkingPerUnit == null || eff.parkingPerUnit > capValue) {
        warnings.push('SB 5184 (eff. ' + sb.effective + '): caps ' + capKey + ' parking at ' + capValue + '/unit. ' + jKey + ' has not yet codified (deadline ' + sb.complianceDeadlineDefault + '); applying cap defensively.');
        eff.parkingPerUnit = capValue;
        rules.push('SB5184:statutoryCap');
      }
      applied.sb5184 = { mode: 'statutoryCap', cap: capValue, complianceDeadline: sb.complianceDeadlineDefault };
    } else {
      // City <50k or non-WA — no SB 5184 obligation.
      applied.sb5184 = { mode: 'notApplicable' };
    }
  }

  eff.appliedRules = rules;

  return {
    jurisdiction: envelope.jurisdiction,
    district: envelope.district,
    baseZoning: envelope.baseZoning,
    middleHousing: envelope.middleHousing,
    effective: eff,
    warnings: warnings,
    appliedStatewide: applied,
  };
};
