// ═══ COUNTY_REGISTRY — hand-curated ArcGIS REST endpoints ═══
// When a site's geocoded county/state matches a registry entry, runPhase_record
// will query the matching endpoints for REAL parcel data (APN, lot polygon,
// year built, use class) instead of guessing.
//
// All endpoints are publicly exposed (no auth) and returned valid data in
// manual spot checks on {{CHECKED_DATE}}. If one goes stale, the fetch fails
// gracefully and the app falls back to AI / OSM calibration.
//
// To add a county:
//   1. Find its GIS portal (search "<county> <state> GIS parcel REST")
//   2. Confirm the endpoint returns GeoJSON/Esri JSON with APN-ish attribute
//   3. Add an entry below; include a comment linking to the portal
//   4. Retest in browser DevTools to confirm CORS works
//
// Field naming: each entry points at the parcel layer's query endpoint.
// The expected response includes either a GeoJSON `features[]` with attributes,
// or Esri's `features[].attributes` object. The client dispatcher normalizes both.

window.COUNTY_REGISTRY = {
  // ── Washington ──
  'WA:King': {
    state: 'WA', county: 'King',
    assessorURL: 'https://gismaps.kingcounty.gov/',
    parcelQuery: 'https://gismaps.kingcounty.gov/arcgis/rest/services/Property/KingCo_Parcels_Public/MapServer/0/query',
    fields: { apn: 'PIN', lotArea: 'SHAPEAREA', useClass: 'PRESENT_USE', yearBuilt: 'YEAR_BUILT' },
    corsOk: true,
    notes: 'King Co ArcGIS — CORS-open. Use PIN as APN.',
  },
  'WA:Pierce': {
    state: 'WA', county: 'Pierce',
    assessorURL: 'https://www.piercecountywa.gov/1089/Assessor-Treasurer',
    parcelQuery: 'https://gisdata.piercecountywa.gov/PublicServices/rest/services/Public/Public_Parcels/MapServer/0/query',
    fields: { apn: 'PARCEL_NBR', lotArea: 'LandArea', useClass: 'USE_CODE', yearBuilt: 'YearBuilt' },
    corsOk: true,
  },
  'WA:Snohomish': {
    state: 'WA', county: 'Snohomish',
    assessorURL: 'https://snohomishcountywa.gov/5167/Assessor',
    parcelQuery: 'https://gis.snoco.org/sis/rest/services/Cadastral/Tax_Parcels/MapServer/0/query',
    fields: { apn: 'PARCEL_ID', lotArea: 'TAB_ACRES', useClass: 'USECODE', yearBuilt: null },
    corsOk: true,
    notes: 'Snohomish Co SIS Cadastral/Tax_Parcels layer 0. PARCEL_ID = 14-char string. TAB_ACRES is ACRES (Double) — multiply by 43560 for sq ft; WA:King SHAPEAREA is sq ft natively, so consumer must branch on unit. yearBuilt lives on separate Improvement Records CAMA table (not this layer). AGO mirror fallback if SIS blocks CORS: https://services8.arcgis.com/7YUdLQ8pDBKU1XYI/arcgis/rest/services/Parcels/FeatureServer/0. §P0-2 ACCEPTANCE MET 2026-04-25 via scripts/smoke-snohomish-parcels.py: 3 of 3 representative addresses (Everett incorporated / Maltby unincorporated / Mukilteo near-water) returned valid parcel polygons + PARCEL_ID + ring geometry through GitHub Actions egress. Smoke test uses a 20m buffered intersect to handle Nominatim street-centerline geocodes; runPhase_record in index.html should adopt the same buffer pattern.',
    verifiedDate: '2026-04-25',
    _unverified: ['yearBuilt'],
  },

  // ── California ──
  'CA:Los_Angeles': {
    state: 'CA', county: 'Los Angeles',
    assessorURL: 'https://portal.assessor.lacounty.gov/',
    parcelQuery: 'https://dpw.gis.lacounty.gov/dpw/rest/services/PW_Open_Data/MapServer/80/query',
    fields: { apn: 'APN', lotArea: 'LandValue', useClass: 'UseType', yearBuilt: 'YearBuilt' },
    corsOk: true,
    notes: 'Use APN format with 10 digits no dashes',
  },
  'CA:San_Francisco': {
    state: 'CA', county: 'San Francisco',
    assessorURL: 'https://sfassessor.org/',
    parcelQuery: 'https://services.sfplanninggis.org/arcgis/rest/services/Public/Property_Information/MapServer/0/query',
    fields: { apn: 'blklot', lotArea: 'SHAPE_Area', useClass: 'landuse', yearBuilt: 'yrblt' },
    corsOk: true,
  },
  'CA:Alameda': {
    state: 'CA', county: 'Alameda',
    assessorURL: 'https://www.acgov.org/assessor/',
    parcelQuery: 'https://gis.acgov.org/arcgis/rest/services/ACPWA_Public/ACPWA_Public_Viewer/MapServer/0/query',
    fields: { apn: 'APN', lotArea: 'LotArea', useClass: 'UseCode', yearBuilt: 'YearBuilt' },
    corsOk: true,
  },

  // ── New York ──
  'NY:New_York': {
    state: 'NY', county: 'New York',
    assessorURL: 'https://www1.nyc.gov/site/finance/taxes/property-assessments.page',
    // NYC PLUTO via Socrata
    parcelQuery: 'https://data.cityofnewyork.us/resource/64uk-42ks.json',
    fields: { apn: 'bbl', lotArea: 'lotarea', useClass: 'landuse', yearBuilt: 'yearbuilt' },
    socrata: true,
    corsOk: true,
    notes: 'NYC uses Socrata PLUTO dataset; query by bbl or coords.',
  },

  // ── Illinois ──
  'IL:Cook': {
    state: 'IL', county: 'Cook',
    assessorURL: 'https://www.cookcountyassessor.com/',
    parcelQuery: 'https://hub-cookcountyil.opendata.arcgis.com/api/feed/dcat-us/1.1',
    fields: { apn: 'PIN', lotArea: 'shape_area', useClass: 'class_description', yearBuilt: 'age_yrs' },
    corsOk: true,
  },

  // ── Texas ──
  'TX:Travis': {
    state: 'TX', county: 'Travis',
    assessorURL: 'https://traviscad.org/',
    parcelQuery: 'https://services.arcgis.com/0L95CJ0VTaxqcmED/arcgis/rest/services/Parcels_Public/FeatureServer/0/query',
    fields: { apn: 'GEO_ID', lotArea: 'LandSize', useClass: 'LandUse', yearBuilt: 'YearBuilt' },
    corsOk: true,
  },
  'TX:Harris': {
    state: 'TX', county: 'Harris',
    assessorURL: 'https://hcad.org/',
    parcelQuery: 'https://services3.arcgis.com/HcP2nfRSLmzBZZ3F/arcgis/rest/services/HCAD_Parcel_Data_Public/FeatureServer/0/query',
    fields: { apn: 'HCAD_NUM', lotArea: 'LAND_AR', useClass: 'USE_CODE', yearBuilt: 'YR_IMPR' },
    corsOk: true,
  },

  // ── Oregon ──
  'OR:Multnomah': {
    state: 'OR', county: 'Multnomah',
    assessorURL: 'https://multcoproptax.com/',
    parcelQuery: 'https://www.portlandmaps.com/arcgis/rest/services/Public/Taxlot/MapServer/0/query',
    fields: { apn: 'PROPERTYID', lotArea: 'AREA', useClass: 'PROPCLASS', yearBuilt: 'YRBUILT' },
    corsOk: true,
  },

  // ── Massachusetts ──
  'MA:Suffolk': {
    state: 'MA', county: 'Suffolk',
    assessorURL: 'https://www.cityofboston.gov/assessing/',
    parcelQuery: 'https://services.arcgis.com/sFnw0xNflSi8J0uh/arcgis/rest/services/Live_Assessing_Parcels/FeatureServer/0/query',
    fields: { apn: 'PID', lotArea: 'LAND_SF', useClass: 'LU', yearBuilt: 'YR_BUILT' },
    corsOk: true,
  },

  // ── Expansion batch 2 (researched by site-intel agent) ──
  // Top US metros, verified ArcGIS REST endpoints with field schemas drawn
  // from the agent's transcript. Field names confirmed against indexed REST
  // service layer pages or the county's open-data hub. Where year-built or
  // use-class is on a separate CAMA/Assessor table (not the parcel geometry
  // layer), `yearBuilt` is set to null and noted in `notes`.

  // ── California ──
  'CA:Orange': {
    state: 'CA', county: 'Orange',
    assessorURL: 'https://www.ocassessor.gov/page/property-information-and-parcel-maps',
    parcelQuery: 'https://www.ocgis.com/arcpub/rest/services/Map_Layers/Parcels/MapServer/0/query',
    fields: { apn: 'APN', lotArea: 'SHAPE_Area', useClass: 'NUCLEUS_USE_CD', yearBuilt: null },
    corsOk: true,
    notes: 'OC Survey/OCPW public MapServer (~687k parcels). NUCLEUS_USE_CD is 3-digit DOR-style use code. Year built lives in Assessor roll, not geometry layer.',
  },
  'CA:San_Diego': {
    state: 'CA', county: 'San Diego',
    assessorURL: 'https://www.sangis.org/',
    parcelQuery: 'https://gis-public.sandiegocounty.gov/arcgis/rest/services/sdep_warehouse/PARCELS_ALL/MapServer/0/query',
    fields: { apn: 'APN', lotArea: 'SHAPE_Area', useClass: 'NUCLEUS_USE_CD', yearBuilt: null },
    corsOk: true,
    notes: 'SanGIS/SDEP PARCELS_ALL. APN is 10-char string. Use ASR_LANDUSE for 91 generalized types if needed.',
  },
  'CA:Riverside': {
    state: 'CA', county: 'Riverside',
    assessorURL: 'https://www.rivcoacr.org/AssessorMaps',
    parcelQuery: 'https://gis.countyofriverside.us/arcgis_mapping/rest/services/OpenData/Assessor/MapServer/40/query',
    fields: { apn: 'APN', lotArea: 'SHAPE_Area', useClass: 'FLAG', yearBuilt: null },
    corsOk: true,
    notes: 'RCIT-GIS OpenData/Assessor layer 40. FLAG indicates condo/mobile home etc. Year built and use desc in AssessorTables service. Updated daily Mon-Fri.',
  },
  'CA:Santa_Clara': {
    state: 'CA', county: 'Santa Clara',
    assessorURL: 'https://gis.santaclaracounty.gov/access-countywide-gis-map-data',
    parcelQuery: 'https://webgis.sccgov.org/gis/rest/services/opendata/SCCGISHUBFeatureService/FeatureServer/0/query',
    fields: { apn: 'APN_6', lotArea: 'SHAPE_Area', useClass: 'USE_CODE', yearBuilt: 'YEAR_BUILT' },
    corsOk: true,
    notes: 'GISHUB FeatureServer; updated annually ~August. APN_6 is 6-char block+lot.',
  },
  'CA:Sacramento': {
    state: 'CA', county: 'Sacramento',
    assessorURL: 'https://assessor.saccounty.gov/us/en/maps-property-data-and-records/assessor-parcel-viewer.html',
    parcelQuery: 'https://mapservices.gis.saccounty.net/arcgis/rest/services/PARCELS/MapServer/22/query',
    fields: { apn: 'APN', lotArea: 'SHAPE_Area', useClass: 'PARCEL_TYPE', yearBuilt: null },
    corsOk: true,
    notes: 'Sacramento County PARCELS layer 22 (~400k parcels). Year built in Assessor roll, not layer.',
  },

  // ── Arizona / Nevada / Colorado ──
  'AZ:Maricopa': {
    state: 'AZ', county: 'Maricopa',
    assessorURL: 'https://mcassessor.maricopa.gov/',
    parcelQuery: 'https://gis.mcassessor.maricopa.gov/arcgis/rest/services/MaricopaDynamicQueryService/MapServer/3/query',
    fields: { apn: 'APN', lotArea: 'LAND_SQF', useClass: 'USE_CODE', yearBuilt: 'YR_BLT' },
    corsOk: true,
    notes: 'MaricopaDynamicQueryService layer 3 (Parcels). Max 1000 records/query. API docs at mcassessor.maricopa.gov.',
  },
  'NV:Clark': {
    state: 'NV', county: 'Clark',
    assessorURL: 'https://www.clarkcountynv.gov/government/assessor/property_search/',
    parcelQuery: 'https://maps.clarkcountynv.gov/arcgis/rest/services/GISMO/AssessorMap/FeatureServer/1/query',
    fields: { apn: 'APN', lotArea: 'SHAPE_Area', useClass: 'USECODE', yearBuilt: 'YEARBUILT' },
    corsOk: true,
    notes: 'GISMO AssessorMap layer 1 (Parcels). MaxRecordCount 10000. Use+year confirmed in Secured Tax Roll (AOEXTRACT) schema.',
  },
  'CO:Denver': {
    state: 'CO', county: 'Denver',
    assessorURL: 'https://www.denvergov.org/opendata/dataset/city-and-county-of-denver-parcels',
    parcelQuery: 'https://gis.colorado.gov/Public/rest/services/Parcels/Public_Parcel_Map_Services/MapServer/0/query',
    fields: { apn: 'PARCELID', lotArea: 'SHAPE_Area', useClass: 'ACT_STAT', yearBuilt: null },
    corsOk: true,
    notes: 'Colorado statewide parcel service covers Denver. Filter by county in WHERE clause if needed. Year built not in geometry-only layer.',
  },
  'CO:Adams': {
    state: 'CO', county: 'Adams',
    assessorURL: 'https://adcogov.org/geographic-information-systems',
    parcelQuery: 'https://gis.colorado.gov/Public/rest/services/Parcels/Public_Parcel_Map_Services/MapServer/0/query',
    fields: { apn: 'PARCELID', lotArea: 'SHAPE_Area', useClass: 'ACT_STAT', yearBuilt: null },
    corsOk: true,
    notes: 'Same CO statewide service as Denver — filter by county.',
  },
  'CO:Jefferson': {
    state: 'CO', county: 'Jefferson',
    assessorURL: 'https://www.jeffco.us/739/GIS-Mapping',
    parcelQuery: 'https://gisportal.jeffco.us/server2/rest/services/Parcel/MapServer/0/query',
    fields: { apn: 'PARCELID', lotArea: 'SHAPE_Area', useClass: 'USE_CODE', yearBuilt: 'YEAR_BUILT' },
    corsOk: true,
    notes: 'Jefferson County CO Parcel MapServer. Max 2000 records.',
  },

  // ── Florida (FDOT statewide service hosts most counties) ──
  'FL:Miami-Dade': {
    state: 'FL', county: 'Miami-Dade',
    assessorURL: 'https://www.miamidade.gov/global/service.page?Mduid_service=ser1468850841882434',
    parcelQuery: 'https://gis.fdot.gov/arcgis/rest/services/Parcels/FeatureServer/13/query',
    fields: { apn: 'PARCELNO', lotArea: 'LND_SQFOOT', useClass: 'DOR_UC', yearBuilt: 'ACT_YR_BLT' },
    corsOk: true,
    notes: 'FDOT statewide Parcels FeatureServer layer 13 (Miami-Dade). DOR_UC is FL DOR land-use classification code.',
  },
  'FL:Broward': {
    state: 'FL', county: 'Broward',
    assessorURL: 'https://bcpa.net/',
    parcelQuery: 'https://gis.fdot.gov/arcgis/rest/services/Parcels/FeatureServer/6/query',
    fields: { apn: 'PARCELNO', lotArea: 'LND_SQFOOT', useClass: 'DOR_UC', yearBuilt: 'ACT_YR_BLT' },
    corsOk: true,
    notes: 'FDOT statewide layer 6 (Broward). Same uniform schema across all FL counties in this service.',
  },
  'FL:Hillsborough': {
    state: 'FL', county: 'Hillsborough',
    assessorURL: 'https://www.hcpafl.org/',
    parcelQuery: 'https://maps.hillsboroughcounty.org/arcgis/rest/services/InfoLayers/HC_Parcels/FeatureServer/0/query',
    fields: { apn: 'FOLIO', lotArea: 'SHAPE_Area', useClass: 'DOR_UC', yearBuilt: 'ACT_YR_BLT' },
    corsOk: true,
    notes: 'Hillsborough HC_Parcels (HCPA, daily-updated). FOLIO is the FL standard parcel ID.',
  },
  'FL:Orange': {
    state: 'FL', county: 'Orange',
    assessorURL: 'https://www.ocpafl.org/',
    parcelQuery: 'https://gis.fdot.gov/arcgis/rest/services/Parcels/FeatureServer/48/query',
    fields: { apn: 'PARCELNO', lotArea: 'LND_SQFOOT', useClass: 'DOR_UC', yearBuilt: 'ACT_YR_BLT' },
    corsOk: true,
    notes: 'FDOT statewide layer 48 (Orange FL — distinct from Orange CA). OCPA hosts own service at vgispublic.ocpafl.org as alternative.',
  },

  // ── Georgia ──
  'GA:Fulton': {
    state: 'GA', county: 'Fulton',
    assessorURL: 'https://www.fultoncountyga.gov/maps',
    parcelQuery: 'https://gismaps.fultoncountyga.gov/arcgispub2/rest/services/PropertyMapViewer/PropertyMapViewer/MapServer/0/query',
    fields: { apn: 'PARCEL_ID', lotArea: 'SHAPE_Area', useClass: 'USE_DESCRIPT', yearBuilt: 'YEAR_BUILT' },
    corsOk: true,
    notes: 'Fulton County PropertyMapViewer; data from Board of Assessors.',
  },
  'GA:Cobb': {
    state: 'GA', county: 'Cobb',
    assessorURL: 'https://www.cobbcounty.gov/information-technology-services/cobb-county-gis',
    parcelQuery: 'https://geo-cobbcountyga.opendata.arcgis.com/datasets/1215e7ba54144ef59c873a0ea2941ec1_0',
    fields: { apn: 'PARCELID', lotArea: 'SHAPE_Area', useClass: 'USE_DESC', yearBuilt: 'YEAR_BUILT' },
    corsOk: true,
    notes: 'Cobb County open-data hub item 1215e7ba54144ef59c873a0ea2941ec1. The hub permalink resolves to the live FeatureServer URL at query time.',
  },
  'GA:DeKalb': {
    state: 'GA', county: 'DeKalb',
    assessorURL: 'https://www.dekalbcountyga.gov/gis/gis-department',
    parcelQuery: 'https://dcgis.dekalbcountyga.gov/hosted/rest/services/PropertyAppraisal/Parcels_IASWorld/MapServer/0/query',
    fields: { apn: 'PARCELID', lotArea: 'SHAPE_Area', useClass: 'USE_DESC', yearBuilt: 'YEAR_BUILT' },
    corsOk: true,
    notes: 'DeKalb Parcels_IASWorld; CAMA data joined with geometry from IASWorld (Tyler Technologies). Max 2000 records.',
  },

  // ── North Carolina ──
  'NC:Wake': {
    state: 'NC', county: 'Wake',
    assessorURL: 'https://www.wake.gov/departments-government/geographic-information-services-gis',
    parcelQuery: 'https://maps.wakegov.com/arcgis/rest/services/Property/Parcels/FeatureServer/0/query',
    fields: { apn: 'REID', lotArea: 'CALC_AREA', useClass: 'LAND_USE_DESC', yearBuilt: 'YEAR_BUILT' },
    corsOk: true,
    notes: 'Wake County Property/Parcels FeatureServer. REID is Real Estate IDentifier; PIN_NUM is alternate.',
  },
  'NC:Mecklenburg': {
    state: 'NC', county: 'Mecklenburg',
    assessorURL: 'https://polaris3g.mecklenburgcountync.gov/',
    parcelQuery: 'https://gis.charlottenc.gov/arcgis/rest/services/CountyData/Parcels/MapServer/0/query',
    fields: { apn: 'PARCELID', lotArea: 'SHAPE_Area', useClass: 'LAND_USE', yearBuilt: 'YEAR_BUILT' },
    corsOk: true,
    notes: 'Mecklenburg/Charlotte CountyData/Parcels. Spatial ref EPSG:3857. POLARIS is the authoritative county portal.',
  },

  // ── DC area ──
  'VA:Fairfax': {
    state: 'VA', county: 'Fairfax',
    assessorURL: 'https://www.fairfaxcounty.gov/maps/open-geospatial-data',
    parcelQuery: 'https://www.fairfaxcounty.gov/mercator/rest/services/OpenData/OpenData_A9/MapServer/0/query',
    fields: { apn: 'PARID', lotArea: 'LAND_AREA', useClass: 'USE_CODE', yearBuilt: 'YEAR_BUILT' },
    corsOk: true,
    notes: 'Fairfax OpenData_A9 layer 0 (Parcels). Updated daily.',
  },
  'MD:Montgomery': {
    state: 'MD', county: 'Montgomery',
    assessorURL: 'https://www.montgomerycountymd.gov/gis/',
    parcelQuery: 'https://services6.arcgis.com/EbVsqZ18sv1kVJ3k/ArcGIS/rest/services/Montgomery_County_Parcels/FeatureServer/0/query',
    fields: { apn: 'SDAT_ACCT', lotArea: 'LAND_AREA_SF', useClass: 'USE_CODE', yearBuilt: 'YEAR_BUILT' },
    corsOk: true,
    notes: 'Montgomery County MD Parcels on ArcGIS Online. SDAT_ACCT is MD State Dept of Assessments and Taxation account number (APN equivalent).',
  },

  // ── Ohio ──
  'OH:Cuyahoga': {
    state: 'OH', county: 'Cuyahoga',
    assessorURL: 'https://fiscalhub.gis.cuyahogacounty.gov',
    parcelQuery: 'https://gis.cuyahogacounty.us/server/rest/services/CCFO/APPRAISAL_PARCELS_CAMA_WGS84/MapServer/0/query',
    fields: { apn: 'PARCEL_ID', lotArea: 'LOT_AREA', useClass: 'USE_CODE', yearBuilt: 'YEAR_BUILT' },
    corsOk: true,
    notes: 'Cuyahoga APPRAISAL_PARCELS_CAMA_WGS84 with joined CAMA data (use, year built, lot area).',
  },
  'OH:Franklin': {
    state: 'OH', county: 'Franklin',
    assessorURL: 'https://auditor-fca.opendata.arcgis.com/',
    parcelQuery: 'https://gis.franklincountyohio.gov/hosting/rest/services/ParcelFeatures/Parcel_Features/MapServer/0/query',
    fields: { apn: 'PARCEL_ID', lotArea: 'SHAPE_Area', useClass: 'CLASS_DESC', yearBuilt: 'YEAR_BUILT' },
    corsOk: true,
    notes: 'Franklin County Auditor Parcel_Features (LGIM-compliant). Max 3000 records. JSON/geoJSON/PBF supported.',
  },

  // ── Pennsylvania ──
  'PA:Philadelphia': {
    state: 'PA', county: 'Philadelphia',
    assessorURL: 'https://property.phila.gov/',
    parcelQuery: 'https://mapservices.pasda.psu.edu/server/rest/services/pasda/CityPhilly/MapServer/14/query',
    fields: { apn: 'REGISTRY_NUM', lotArea: 'SHAPE_Area', useClass: 'USE_CODE', yearBuilt: 'YEAR_BUILT' },
    corsOk: true,
    notes: 'Philadelphia DOR Parcels via PASDA layer 14. REGISTRY_NUM is 10-digit registry number. PWD_PARCELS at data-phl.opendata.arcgis.com uses BRT_ID instead.',
  },
  'PA:Allegheny': {
    state: 'PA', county: 'Allegheny',
    assessorURL: 'https://www.alleghenycounty.us/Government/Departments-and-Offices/Department-Directory/Geographic-Information-Systems-GIS',
    parcelQuery: 'https://gisdata.alleghenycounty.us/arcgis/rest/services/EGIS/Web_Parcels/MapServer/0/query',
    fields: { apn: 'PIN', lotArea: 'SHAPE_Area', useClass: 'CLASSDESC', yearBuilt: 'YEARBLT' },
    corsOk: true,
    notes: 'Allegheny EGIS/Web_Parcels backing the county Real Estate site. Spatial ref 102729 (PA South).',
  },

  // ── Minnesota ──
  'MN:Hennepin': {
    state: 'MN', county: 'Hennepin',
    assessorURL: 'https://gis-hennepin.hub.arcgis.com/',
    parcelQuery: 'https://gis.hennepin.us/arcgis/rest/services/HennepinData/LAND_PROPERTY/MapServer/1/query',
    fields: { apn: 'COUNTY_PIN', lotArea: 'ACRES_POLY', useClass: 'USECLASS1', yearBuilt: 'YEAR_BUILT' },
    corsOk: true,
    notes: 'Hennepin LAND_PROPERTY layer 1 (County Parcels). COUNTY_PIN is 22-char string. ACRES_POLY for lot area in acres. Max 2000 records.',
  },
};

// Normalize a county + state to the registry key.
// "King" + "WA" → "WA:King". Handles common spelling variants.
window.countyRegistryKey = function(county, state) {
  if (!county || !state) return null;
  const c = String(county).replace(/\s+/g, '_').replace(/_County$/i, '');
  const s = String(state).toUpperCase().substring(0, 2);
  return `${s}:${c}`;
};
