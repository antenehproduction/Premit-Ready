// ═══ MIDDLE_HOUSING_DB — WA HB 1110 first-class overlay (P0-4) ═══
// RCW 36.70A.635 (effective 2023-07-23) requires WA cities to permit middle
// housing on residentially-zoned lots. Tiers:
//   Tier 1  (≥75k pop)    : 4 du citywide / 6 du transit / 6 du affordable
//   Tier 2  (25k–75k pop) : 2 du citywide / 4 du transit / 4 du affordable
//
// `statutoryFloor` is the RCW-mandated minimum and is authoritative for the
// renderer. `cityImplementationUnits`, when present, is what the city's local
// ordinance has adopted in excess of (or — if `_unverified` — claimed beyond)
// the floor. The renderer prefers cityImplementationUnits when present AND
// not flagged `_unverified`. When `_unverified` is true, the floor is used
// and a warning is surfaced.
//
// Source data: extracted from data/zoning-matrix.js notes / densityBonus
// fields (P0-3 sweep, 2026-04-23..25). No external research performed.
// ─────────────────────────────────────────────────────────────────────────────

window.MIDDLE_HOUSING_DB = {

  'bellevue,wa': {
    statuteName: 'WA HB 1110',
    statuteCite: 'RCW 36.70A.635',
    populationTier: 'tier1',
    statutoryFloor: { baseUnits: 4, transitUnits: 6, affordableUnits: 6 },
    cityImplementationUnits: null,
    localOrdinance: { number: 'Ord 6851', effective: '2025-07-01' },
    transitProximityBonus: {
      criteria: 'within 0.25mi walking distance of a major transit stop',
      majorTransitDefinition: 'WSDOT high-capacity transit list',
    },
    affordabilityBonus: { criteria: 'one unit ≤80% AMI for ≥50yr covenant' },
    transitStations: ['East Link (multiple Bellevue stations)'],
    dimensionalOverrides: { maxHeightFt: 32, maxHeightFtPeakedRoof: 35 },
    overridesBaseZoning: true,
    exceptions: ['critical areas', 'historic districts', 'shoreline overlay'],
    codeURL: 'https://app.leg.wa.gov/RCW/default.aspx?cite=36.70A.635',
    cityImplementationURL: 'https://bellevue.municipal.codes/LUC/20.20.538',
    verifiedDate: '2026-04-25',
    _sourceMethod: 'zoning-matrix-notes',
    _sourceSnapshot: '2026-04-24',
    _unverified: [],
    notes: 'Middle-housing height cap 32ft flat / 35ft ridge per LUC 20.20.538.',
  },

  'tacoma,wa': {
    statuteName: 'WA HB 1110',
    statuteCite: 'RCW 36.70A.635',
    populationTier: 'tier1',
    statutoryFloor: { baseUnits: 4, transitUnits: 6, affordableUnits: 6 },
    cityImplementationUnits: { baseUnits: 4, transitUnits: 6, affordableUnits: 6 },
    localOrdinance: { number: 'Ord 28986', effective: '2025-02-01' },
    transitProximityBonus: {
      criteria: 'within 0.25mi of major transit; bonus levels (UR Bonus 1/2) yield 1 du / 750–500 sf in UR-1/UR-2',
      majorTransitDefinition: 'WSDOT high-capacity transit + Sound Transit Link/Sounder',
    },
    affordabilityBonus: {
      criteria: 'affordability or building-retention dedication unlocks UR Bonus 1/2 (TMC 13.06.020.F.1)',
    },
    transitStations: ['Tacoma Dome Sounder/Link', 'Tacoma Link Hilltop', 'Tacoma Link Stadium District'],
    dimensionalOverrides: null,
    overridesBaseZoning: true,
    exceptions: ['critical areas', 'historic districts'],
    codeURL: 'https://app.leg.wa.gov/RCW/default.aspx?cite=36.70A.635',
    cityImplementationURL: 'https://cms.cityoftacoma.org/cityclerk/Files/MunicipalCode/Title13-LandUseRegulatoryCode.PDF',
    verifiedDate: '2026-04-25',
    _sourceMethod: 'zoning-matrix-notes',
    _sourceSnapshot: '2026-04-24',
    _unverified: [],
    notes: 'Home in Tacoma Phase 2: UR-1/UR-2/UR-3 already implement and exceed Tier 1 floor via lot-area-per-unit ladder. UR-3 allows multiplex (7+ stacked units) by right.',
  },

  'everett,wa': {
    statuteName: 'WA HB 1110',
    statuteCite: 'RCW 36.70A.635',
    populationTier: 'tier1',
    statutoryFloor: { baseUnits: 4, transitUnits: 6, affordableUnits: 6 },
    cityImplementationUnits: null,
    localOrdinance: { number: 'Ord 4102-25 (dev regs); Ord 4101-25 (comp plan)', effective: '2025-07-08' },
    transitProximityBonus: {
      criteria: 'within 0.25mi of major transit',
      majorTransitDefinition: 'Swift BRT + planned Everett Link light rail (post-2036)',
    },
    affordabilityBonus: { criteria: 'one unit ≤80% AMI for ≥50yr covenant (HB 1110 default)' },
    transitStations: ['Everett Station Sounder', 'Swift Blue/Green BRT corridors'],
    dimensionalOverrides: null,
    overridesBaseZoning: true,
    exceptions: ['critical areas', 'historic districts', 'Metro Everett overlay (EMC 19.20)'],
    codeURL: 'https://app.leg.wa.gov/RCW/default.aspx?cite=36.70A.635',
    cityImplementationURL: 'https://everett.municipal.codes/EMC/19.06.020',
    verifiedDate: '2026-04-25',
    _sourceMethod: 'zoning-matrix-notes',
    _sourceSnapshot: '2026-04-24',
    _unverified: [],
    notes: 'Everett 2044 (Ord 4102-25) performed full zone rewrite — current code uses NR-C / NR / UR4 / UR7 / MU* (not legacy R-1/R-2). NR is the HB-1110 middle-housing zone receiving the denser dimensional envelope. Transit walkshed shifts as Swift BRT and future Link stations open — annual re-verification recommended.',
  },

  'redmond,wa': {
    statuteName: 'WA HB 1110',
    statuteCite: 'RCW 36.70A.635',
    populationTier: 'tier1',
    statutoryFloor: { baseUnits: 4, transitUnits: 6, affordableUnits: 6 },
    cityImplementationUnits: { baseUnits: 6, transitUnits: 6, affordableUnits: 8 },
    localOrdinance: { number: 'Ord 3186', adopted: '2024-11-19', effective: '2025-01-01' },
    transitProximityBonus: {
      criteria: 'parcels within 0.25mi of light-rail station qualify for transit-area maximums under RZC 21.20.060',
      majorTransitDefinition: 'Sound Transit 2 Line (Eastside Link) light-rail stations',
    },
    affordabilityBonus: {
      criteria: 'one on-site affordable unit (≤80% AMI, ≥50yr covenant) per RZC 21.20.060.A.1.b.ii',
    },
    transitStations: [
      'Overlake Village Link (opened 2024-04-27)',
      'Redmond Technology Link (opened 2024-04-27)',
      'Downtown Redmond Link (opened 2025)',
    ],
    dimensionalOverrides: null,
    overridesBaseZoning: true,
    exceptions: [
      'critical areas',
      'historic districts',
      'Overlake Urban Center (RZC Ch. 21.12)',
      'Downtown Urban Center (RZC Ch. 21.10)',
      'Marymoor Village Urban Center (RZC Ch. 21.13)',
    ],
    codeURL: 'https://app.leg.wa.gov/RCW/default.aspx?cite=36.70A.635',
    cityImplementationURL: 'https://redmond.municipal.codes/RZC/21.08',
    verifiedDate: '2026-04-25',
    _sourceMethod: 'zoning-matrix-notes',
    _sourceSnapshot: '2026-04-24',
    _unverified: [],
    notes: 'Redmond EXCEEDS the Tier 1 statutory floor: NR allows 6 du/lot citywide by right (vs. statutory 4) and 8 du/lot with one on-site affordable unit (vs. statutory 6). NMF uses FAR rather than du count.',
  },

  'kirkland,wa': {
    statuteName: 'WA HB 1110',
    statuteCite: 'RCW 36.70A.635',
    populationTier: 'tier1',
    statutoryFloor: { baseUnits: 4, transitUnits: 6, affordableUnits: 6 },
    cityImplementationUnits: null,
    localOrdinance: { number: 'Ord O-4905', adopted: '2025-06-17' },
    transitProximityBonus: {
      criteria: 'within 0.25mi of a major transit stop',
      majorTransitDefinition: 'Sound Transit 2 Line (East Link) + ST Express',
    },
    affordabilityBonus: {
      criteria: 'one unit ≤80% AMI for ≥50yr covenant (HB 1110 default); KZC ch. 112 Multifamily Affordable Housing Incentives may stack',
    },
    transitStations: ['NE 85th St Station (East Link terminus, KZC ch. 57 form-based code area)'],
    dimensionalOverrides: null,
    overridesBaseZoning: true,
    exceptions: [
      'critical areas',
      'historic districts',
      'Totem Lake Urban Center (KZC 40–50)',
      'NE 85th St Station Form-Based Code (KZC ch. 57) — supersedes RSA in station-area boundary',
      'Shoreline overlay (KZC ch. 83)',
    ],
    codeURL: 'https://app.leg.wa.gov/RCW/default.aspx?cite=36.70A.635',
    cityImplementationURL: 'https://www.codepublishing.com/WA/Kirkland/',
    verifiedDate: '2026-04-25',
    _sourceMethod: 'zoning-matrix-notes',
    _sourceSnapshot: '2026-04-24',
    _unverified: [],
    notes: 'Kirkland RETAINED RSA-family zone names through HB 1110 compliance (unlike Tacoma/Redmond/Everett/Bellevue/Bothell). Implementation via Multiplex + cottage/carriage framework in KZC chs. 113 and 115.',
  },

  'auburn,wa': {
    statuteName: 'WA HB 1110',
    statuteCite: 'RCW 36.70A.635',
    populationTier: 'tier1',
    statutoryFloor: { baseUnits: 4, transitUnits: 6, affordableUnits: 6 },
    cityImplementationUnits: null,
    localOrdinance: { number: 'Ord 6959 / ACC 18.02.067', effective: '2024-12-27' },
    transitProximityBonus: {
      criteria: 'within 0.25mi of major transit (Auburn Sounder station)',
      majorTransitDefinition: 'Sound Transit Sounder commuter rail',
    },
    affordabilityBonus: { criteria: 'HB 1110 default + Auburn MFTE participation per RCW 84.14' },
    transitStations: ['Auburn Sounder Station'],
    dimensionalOverrides: null,
    overridesBaseZoning: true,
    exceptions: [
      'critical areas',
      'historic districts',
      'MUCKLESHOOT TRUST-LAND CARVE-OUT — Auburn zoning does not apply to MIT trust parcels (BIA-held)',
      'Lea Hill (ACC 18.21.010) and West Hill (ACC 18.21.020) pre-annexation plats',
      'Lakeland Hills South PUD',
      'Downtown Urban Center (ACC 18.29)',
    ],
    codeURL: 'https://app.leg.wa.gov/RCW/default.aspx?cite=36.70A.635',
    cityImplementationURL: 'https://auburn.municipal.codes/ACC/18.07',
    verifiedDate: '2026-04-25',
    _sourceMethod: 'zoning-matrix-notes',
    _sourceSnapshot: '2026-04-24',
    _unverified: [],
    notes: 'Auburn pop. ~89k (King + Pierce). Permitted middle-housing types: SFR, duplex, triplex, fourplex, stacked flats, courtyard housing, cottage housing (ACC 18.07.020 + ACC 18.25). Site-intel must verify fee vs. trust status before applying overlay — Muckleshoot Reservation is a checkerboard within Auburn city limits.',
  },

  'bothell,wa': {
    statuteName: 'WA HB 1110',
    statuteCite: 'RCW 36.70A.635',
    populationTier: 'tier2',
    statutoryFloor: { baseUnits: 2, transitUnits: 4, affordableUnits: 4 },
    // Decision #17 RESOLVED 2026-04-25 via owner-uploaded BMC 12.14.030 chart:
    // Bothell adopted EXACTLY the Tier 2 statutory floor (2 base / 4 transit
    // or affordable). The P0-3 zoning-legal claim of "4 citywide / 6 transit"
    // was misreading the R-M1 multifamily column. cityImplementationUnits
    // null = no city excess over statute.
    cityImplementationUnits: null,
    localOrdinance: { number: 'BMC 12.14.030(A) + 12.14.134', effective: '2025-06-30' },
    transitProximityBonus: {
      criteria: 'within 0.25mi walking distance of a major transit stop',
      majorTransitDefinition: 'Sound Transit Stride S2 BRT (planned) + ST Express',
    },
    affordabilityBonus: { criteria: 'BMC 12.07 affordable-housing density bonus parameters not confirmed' },
    transitStations: ['UW Bothell / Cascadia ST Express stop', 'Canyon Park P&R (future Stride S2)'],
    dimensionalOverrides: null,
    overridesBaseZoning: true,
    exceptions: [
      'critical areas',
      'historic districts',
      'Canyon Park Subarea (BMC 12.46)',
      'Downtown Subarea Plan (BMC Ch. 12.64)',
      'Shoreline Master Program (BMC 13.07.030, within 200ft of state-significance shorelines)',
    ],
    codeURL: 'https://app.leg.wa.gov/RCW/default.aspx?cite=36.70A.635',
    cityImplementationURL: 'https://bothell.municipal.codes/BMC/12.14.030',
    verifiedDate: '2026-04-25',
    _sourceMethod: 'manual',
    _sourceSnapshot: '2026-04-25',
    _unverified: [],
    notes: 'BOTHELL TIER 2 — RESOLVED 2026-04-25 via owner-uploaded BMC 12.14.030 chart. Pop. 48,161 (2020 Census). Chart middle-housing row for R-L1 / R-L2 columns: Base 2 / Transit-or-affordable 4 — matches the Tier 2 statutory floor exactly. Earlier P0-3 claim of "4 citywide / 6 transit" was misreading the R-M1 multifamily column (which IS 4/6 — but R-M1 is multifamily, not the R-L SF tier). cityImplementationUnits cleared (city does not exceed statute).',
  },

  'renton,wa': {
    statuteName: 'WA HB 1110',
    statuteCite: 'RCW 36.70A.635',
    populationTier: 'tier1',
    statutoryFloor: { baseUnits: 4, transitUnits: 6, affordableUnits: 6 },
    cityImplementationUnits: null,
    localOrdinance: { number: 'Renton 2025 middle-housing ordinance', adopted: '2025-06-24', effective: '2025-07-24' },
    transitProximityBonus: {
      criteria: 'within 0.25mi of major transit',
      majorTransitDefinition: 'Sound Transit Stride BRT (Renton Landing terminal qualifies)',
    },
    affordabilityBonus: { criteria: 'HB 1110 default; RMC 4-9-065 density bonus review available' },
    transitStations: ['Renton Landing Stride BRT terminal', 'Renton Transit Center'],
    dimensionalOverrides: null,
    overridesBaseZoning: true,
    exceptions: [
      'critical areas',
      'historic districts',
      'The Landing commercial overlay',
      'Sunset Area Master Plan',
      'Cedar River Shoreline Master Program (RMC 4-3-090)',
      'Aquifer Protection Wellfield Tiers I/II (RMC 4-3-050)',
    ],
    codeURL: 'https://app.leg.wa.gov/RCW/default.aspx?cite=36.70A.635',
    cityImplementationURL: 'https://www.codepublishing.com/WA/Renton/',
    verifiedDate: '2026-04-25',
    _sourceMethod: 'zoning-matrix-notes',
    _sourceSnapshot: '2026-04-24',
    _unverified: [],
    notes: 'Renton pop. ~108k. R-4 and R-8 zone names RETAINED through HB 1110 compliance. Cottage-cluster standards in RMC 4-2-110G may stack with HB 1110.',
  },

  'kent,wa': {
    statuteName: 'WA HB 1110',
    statuteCite: 'RCW 36.70A.635',
    populationTier: 'tier1',
    statutoryFloor: { baseUnits: 4, transitUnits: 6, affordableUnits: 6 },
    cityImplementationUnits: null,
    localOrdinance: { number: 'Ord 4517 (ReCode Kent Phase 1)', effective: '2025-07-30' },
    transitProximityBonus: {
      criteria: 'within 0.25mi of major transit',
      majorTransitDefinition: 'Sound Transit Sounder + planned ST2 Link extension',
    },
    affordabilityBonus: { criteria: 'HB 1110 default' },
    transitStations: ['Kent Sounder Station', 'planned ST2 Link extension stations'],
    dimensionalOverrides: null,
    overridesBaseZoning: true,
    exceptions: [
      'critical areas',
      'historic districts',
      'Downtown Subarea Action Plan',
      'Midway Subarea Plan',
      'Kent Valley industrial overlays (M-1/M-2)',
      'Shoreline Master Program (within 200ft of Green River / Lake Fenwick)',
    ],
    codeURL: 'https://app.leg.wa.gov/RCW/default.aspx?cite=36.70A.635',
    cityImplementationURL: 'https://www.codepublishing.com/WA/Kent/',
    verifiedDate: '2026-04-25',
    _sourceMethod: 'zoning-matrix-notes',
    _sourceSnapshot: '2026-04-24',
    _unverified: [],
    notes: 'Kent pop. ~136k. SR-6 and SR-8 zone names RETAINED. ADU rules pre-dated HB 1337 via Ord 4325 (eff. 2023-06-15): 2 ADUs/lot, 1,000 sf max, no owner-occupancy, first ADU impact-fee waived.',
  },

  'federal way,wa': {
    statuteName: 'WA HB 1110',
    statuteCite: 'RCW 36.70A.635',
    populationTier: 'tier1',
    statutoryFloor: { baseUnits: 4, transitUnits: 6, affordableUnits: 6 },
    cityImplementationUnits: null,
    localOrdinance: { number: 'Federal Way 2025 middle-housing ordinance', adopted: '2025-06-03', effective: '2025-07-03' },
    transitProximityBonus: {
      criteria: 'within 0.25mi walking distance of Federal Way Link Downtown station (opened 2025-12-06)',
      majorTransitDefinition: 'Sound Transit 1 Line Federal Way extension',
    },
    affordabilityBonus: { criteria: 'HB 1110 default' },
    transitStations: ['Federal Way Link Downtown Station (opened 2025-12-06)'],
    dimensionalOverrides: null,
    overridesBaseZoning: true,
    exceptions: [
      'critical areas',
      'historic districts',
      'City Center Core (CC-C, FWRC 19.225)',
      'City Center Frame (CC-F, FWRC 19.230)',
      'Shoreline Master Program (FWRC Ch. 15.05) — 200ft setback from OHWM of Puget Sound + named lakes',
    ],
    codeURL: 'https://app.leg.wa.gov/RCW/default.aspx?cite=36.70A.635',
    cityImplementationURL: 'https://www.codepublishing.com/WA/FederalWay/',
    verifiedDate: '2026-04-25',
    _sourceMethod: 'zoning-matrix-notes',
    _sourceSnapshot: '2026-04-24',
    _unverified: [],
    notes: 'Federal Way pop. ~102k. RS 7.2 and RS 9.6 zone names RETAINED. Federal Way Link Downtown station opened 2025-12-06 — HB 1110 transit bonus applies as of that date.',
  },

};

// ─────────────────────────────────────────────────────────────────────────────
// effectiveZoning(jurisdiction, district, opts)
//
// Merges base zoning (window.ZONING_MATRIX_DB) with the middle-housing overlay
// (window.MIDDLE_HOUSING_DB) and returns a single envelope object the rest of
// the pipeline can consume.
//
// opts:
//   enableMiddleHousing  : boolean  default true
//   nearMajorTransit     : boolean  default false
//   includesAffordableUnit: boolean default false
//   inException          : boolean  default false  (caller already determined
//                                                   parcel falls inside an
//                                                   excepted overlay/critical
//                                                   area; HB 1110 not applied)
//
// Returns:
//   {
//     jurisdiction, district,
//     baseZoning      : the original matrix entry (or null if not found),
//     middleHousing   : the overlay entry (or null if no overlay),
//     effective       : { maxUnits, frontSetback, ..., sourceOfUnits, appliedRules },
//     warnings        : string[]
//   }
// ─────────────────────────────────────────────────────────────────────────────

window.effectiveZoning = function effectiveZoning(jurisdiction, district, opts) {
  opts = opts || {};
  var enableMH = opts.enableMiddleHousing !== false;
  var nearTransit = !!opts.nearMajorTransit;
  var hasAffordable = !!opts.includesAffordableUnit;
  var inException = !!opts.inException;

  var rawJ = String(jurisdiction || '').toLowerCase().trim().replace(/,\s+/g, ',');
  var d = String(district || '').trim();
  var matrix = window.ZONING_MATRIX_DB || {};
  var overlays = window.MIDDLE_HOUSING_DB || {};

  // Matrix keys embed state (e.g. "bellevue,wa:R-5"). Tolerate inputs without
  // the state suffix by trying common forms, defaulting to WA last.
  var candidates = [rawJ + ':' + d];
  if (!rawJ.includes(',')) candidates.push(rawJ + ',wa:' + d);
  var matrixKey = candidates.find(function (k) { return matrix[k]; }) || candidates[0];
  var jKey = matrixKey.split(':')[0];

  var base = matrix[matrixKey] || null;
  var overlay = overlays[jKey] || null;
  var warnings = [];

  // Base envelope — most SF zones are 1 du / lot unless explicitly higher.
  var effective = {
    maxUnits: 1,
    frontSetback: base ? base.frontSetback : null,
    rearSetback: base ? base.rearSetback : null,
    leftSetback: base ? base.leftSetback : null,
    rightSetback: base ? base.rightSetback : null,
    maxHeightFt: base ? base.maxHeightFt : null,
    maxStories: base ? base.maxStories : null,
    maxFAR: base ? base.maxFAR : null,
    maxLotCoverage: base ? base.maxLotCoverage : null,
    parkingPerUnit: base ? base.parkingPerUnit : null,
    aduAllowed: base ? base.aduAllowed : null,
    aduMaxSqFt: base ? base.aduMaxSqFt : null,
    sourceOfUnits: 'base',
    appliedRules: [],
  };

  if (!base) {
    return {
      jurisdiction: jurisdiction, district: district,
      baseZoning: null, middleHousing: overlay, effective: effective,
      warnings: ['No matrix entry for ' + matrixKey],
    };
  }

  // Honour _repealed redirects (preserve the redirect warning across recursion).
  if (base._repealed && base._replacedBy && matrix[base._replacedBy]) {
    var redirectMsg = matrixKey + ' is repealed; redirecting to ' + base._replacedBy;
    var rep = matrix[base._replacedBy];
    var redirected = effectiveZoning(
      rep.jurisdiction || jurisdiction,
      rep.district || district,
      opts
    );
    redirected.warnings = [redirectMsg].concat(redirected.warnings || []);
    return redirected;
  }

  if (!enableMH || !overlay) {
    if (!overlay && /,wa$/.test(jKey)) {
      warnings.push('No HB 1110 middle-housing overlay registered for ' + jKey);
    }
    return {
      jurisdiction: jurisdiction, district: district,
      baseZoning: base, middleHousing: overlay, effective: effective, warnings: warnings,
    };
  }

  if (inException) {
    warnings.push('Parcel falls inside an HB 1110 exception (overlay/critical area); base zoning applied without middle-housing override.');
    return {
      jurisdiction: jurisdiction, district: district,
      baseZoning: base, middleHousing: overlay, effective: effective, warnings: warnings,
    };
  }

  // Pick the units source. Prefer cityImplementationUnits if present and
  // not flagged _unverified; otherwise fall back to statutoryFloor.
  var units = overlay.statutoryFloor;
  var unitsSource = 'statute';
  var ci = overlay.cityImplementationUnits;
  if (ci && !ci._unverified) {
    units = ci;
    unitsSource = 'city';
  } else if (ci && ci._unverified) {
    warnings.push(
      'City implementation reportedly exceeds statutory floor but is unverified: ' +
      (ci._claim || 'see middleHousing.cityImplementationUnits._claim') +
      ' — falling back to statutory floor.'
    );
  }

  var picked = units.baseUnits;
  var pickedRule = 'HB1110:' + overlay.populationTier + ':citywide:' + unitsSource;

  if (hasAffordable && units.affordableUnits != null && units.affordableUnits > picked) {
    picked = units.affordableUnits;
    pickedRule = 'HB1110:' + overlay.populationTier + ':affordable:' + unitsSource;
  }
  if (nearTransit && units.transitUnits != null && units.transitUnits > picked) {
    picked = units.transitUnits;
    pickedRule = 'HB1110:' + overlay.populationTier + ':transit:' + unitsSource;
  }

  effective.maxUnits = picked;
  effective.sourceOfUnits = pickedRule;
  effective.appliedRules.push(pickedRule);

  // Apply overlay's dimensional overrides (e.g., Bellevue middle-housing height cap).
  if (overlay.dimensionalOverrides) {
    var d = overlay.dimensionalOverrides;
    if (d.maxHeightFt != null) {
      effective.maxHeightFt = d.maxHeightFt;
      effective.appliedRules.push('dimensionalOverride:maxHeightFt');
    }
    if (d.maxLotCoverage != null) {
      effective.maxLotCoverage = d.maxLotCoverage;
      effective.appliedRules.push('dimensionalOverride:maxLotCoverage');
    }
  }

  if (overlay._unverified && overlay._unverified.length) {
    warnings.push('Middle-housing fields _unverified: ' + overlay._unverified.join(', '));
  }

  if (base._unverified && base._unverified.length) {
    warnings.push('Base zoning fields _unverified: ' + base._unverified.join(', '));
  }

  return {
    jurisdiction: jurisdiction, district: district,
    baseZoning: base, middleHousing: overlay, effective: effective, warnings: warnings,
  };
};
