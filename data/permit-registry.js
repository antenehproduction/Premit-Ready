// ═══ PERMIT_PORTAL_REGISTRY — Socrata + ArcGIS permit data portals ═══
// Used by runPhase_comp to cross-check AI-researched comparables against real
// permit filings, and by checklist-auto to link the user to the correct portal.
//
// Each city has a `searchByAddress(addr)` builder that returns a URL the worker
// proxy (or corsproxy.io fallback) can hit. Response shapes vary; the consumer
// normalizes.

window.PERMIT_PORTAL_REGISTRY = {
  seattle: {
    city: 'Seattle', state: 'WA',
    portalURL: 'https://cosaccela.seattle.gov/portal/Default.aspx',
    socrataDataset: 'https://data.seattle.gov/resource/76t5-zqzr.json',
    // Address column is `originaladdress1` per data/_socrata-schemas.json
    // (verified by GitHub Actions schema-fetch 2026-04-25). Earlier builder
    // used `address` which silently zero-results on this dataset.
    searchByAddress: (addr) =>
      `https://data.seattle.gov/resource/76t5-zqzr.json?$where=upper(originaladdress1) like '%25${encodeURIComponent(addr.toUpperCase())}%25'&$limit=20`,
    radiusSearch: (lat, lon, miles = 2) =>
      `https://data.seattle.gov/resource/76t5-zqzr.json?$where=within_circle(location,${lat},${lon},${miles * 1609.34})&$limit=50`,
  },
  sf: {
    city: 'San Francisco', state: 'CA',
    portalURL: 'https://sfdbi.org/permit-services',
    socrataDataset: 'https://data.sfgov.org/resource/i98e-djp9.json',
    searchByAddress: (addr) =>
      `https://data.sfgov.org/resource/i98e-djp9.json?$where=upper(street_name) like '%25${encodeURIComponent(addr.toUpperCase())}%25'&$limit=20`,
    radiusSearch: (lat, lon, miles = 2) =>
      `https://data.sfgov.org/resource/i98e-djp9.json?$where=within_circle(location,${lat},${lon},${miles * 1609.34})&$limit=50`,
  },
  nyc: {
    city: 'New York', state: 'NY',
    portalURL: 'https://a810-dobnow.nyc.gov/publish/Index.html',
    socrataDataset: 'https://data.cityofnewyork.us/resource/ipu4-2q9a.json',
    searchByAddress: (addr) =>
      `https://data.cityofnewyork.us/resource/ipu4-2q9a.json?$where=upper(house__) like '%25${encodeURIComponent(addr.toUpperCase())}%25'&$limit=20`,
  },
  la: {
    city: 'Los Angeles', state: 'CA',
    portalURL: 'https://www.ladbs.org/services/core-services/plan-check-permit',
    socrataDataset: 'https://data.lacity.org/resource/yv23-pmwf.json',
    searchByAddress: (addr) =>
      `https://data.lacity.org/resource/yv23-pmwf.json?$where=upper(address_full) like '%25${encodeURIComponent(addr.toUpperCase())}%25'&$limit=20`,
  },
  austin: {
    city: 'Austin', state: 'TX',
    portalURL: 'https://abc.austintexas.gov/web/permit/index',
    socrataDataset: 'https://data.austintexas.gov/resource/3syk-w9eu.json',
    searchByAddress: (addr) =>
      `https://data.austintexas.gov/resource/3syk-w9eu.json?$where=upper(original_address1) like '%25${encodeURIComponent(addr.toUpperCase())}%25'&$limit=20`,
  },
  boston: {
    city: 'Boston', state: 'MA',
    portalURL: 'https://www.boston.gov/departments/inspectional-services/how-apply-building-permit',
    socrataDataset: 'https://data.boston.gov/dataset/approved-building-permits',
    searchByAddress: (addr) =>
      `https://data.boston.gov/api/3/action/datastore_search?resource_id=6ddcd912-32a0-43df-9908-63574f8c7e77&q=${encodeURIComponent(addr)}`,
  },
  chicago: {
    city: 'Chicago', state: 'IL',
    portalURL: 'https://www.chicago.gov/city/en/depts/bldgs.html',
    socrataDataset: 'https://data.cityofchicago.org/resource/ydr8-5enu.json',
    searchByAddress: (addr) =>
      `https://data.cityofchicago.org/resource/ydr8-5enu.json?$where=upper(street_name) like '%25${encodeURIComponent(addr.toUpperCase())}%25'&$limit=20`,
  },
  portland: {
    city: 'Portland', state: 'OR',
    portalURL: 'https://www.portland.gov/permitting',
    // Portland's permit search is web-only; no public Socrata dataset
    searchByAddress: null,
  },

  // ── Expansion batch 2 (researched by site-intel agent) ──
  // Most of these are ArcGIS FeatureServer endpoints rather than Socrata; the
  // radiusSearch builder uses ArcGIS spatial filter syntax. Field names
  // verified from indexed search results — confirm with outFields=* on first
  // live query if a city's response is empty.

  denver: {
    city: 'Denver', state: 'CO',
    portalURL: 'https://opendata-geospatialdenver.hub.arcgis.com/datasets/residential-construction-permits',
    socrataDataset: 'https://www.denvergov.org/arcgis/rest/services/NDCC/Navigate/MapServer/4',
    searchByAddress: (addr) =>
      `https://www.denvergov.org/arcgis/rest/services/NDCC/Navigate/MapServer/4/query?where=upper(ADDRESS)+like+upper('%25${encodeURIComponent(addr)}%25')&outFields=PERMIT_NUM,ADDRESS,ISSUE_DATE,PERMIT_TYPE,CONTRACTOR_NAME&f=json&resultRecordCount=20`,
    radiusSearch: (lat, lon, miles = 2) =>
      `https://www.denvergov.org/arcgis/rest/services/NDCC/Navigate/MapServer/4/query?geometry=${lon},${lat}&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&distance=${miles * 1609.34}&units=esriSRUnit_Meter&outFields=PERMIT_NUM,ADDRESS,ISSUE_DATE,PERMIT_TYPE&f=json&resultRecordCount=50`,
  },
  lasvegas: {
    city: 'Las Vegas', state: 'NV',
    portalURL: 'https://opendataportal-lasvegas.opendata.arcgis.com/datasets/building-permits/explore',
    socrataDataset: 'https://mapdata.lasvegasnevada.gov/clvgis/rest/services/DevelopmentServices/BuildingPermits/MapServer/0',
    searchByAddress: (addr) =>
      `https://mapdata.lasvegasnevada.gov/clvgis/rest/services/DevelopmentServices/BuildingPermits/MapServer/0/query?where=upper(ADDRESS)+like+upper('%25${encodeURIComponent(addr)}%25')&outFields=APNO,ADDRESS,PERMIT_TYPE,ISSUE_DATE,STATUS&f=json&resultRecordCount=20`,
    radiusSearch: (lat, lon, miles = 2) =>
      `https://mapdata.lasvegasnevada.gov/clvgis/rest/services/DevelopmentServices/BuildingPermits/MapServer/0/query?geometry=${lon},${lat}&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&distance=${miles * 1609.34}&units=esriSRUnit_Meter&outFields=APNO,ADDRESS,PERMIT_TYPE,ISSUE_DATE&f=json&resultRecordCount=50`,
  },
  sandiego: {
    city: 'San Diego', state: 'CA',
    portalURL: 'https://data.sandiegocounty.gov/Housing-and-Infrastructure/Building-Permits/dyzh-7eat',
    socrataDataset: 'https://data.sandiegocounty.gov/resource/dyzh-7eat.json',
    searchByAddress: (addr) =>
      `https://data.sandiegocounty.gov/resource/dyzh-7eat.json?$where=upper(OriginalAddress1) like '%25${encodeURIComponent(addr.toUpperCase())}%25'&$limit=20`,
    radiusSearch: (lat, lon, miles = 2) =>
      `https://data.sandiegocounty.gov/resource/dyzh-7eat.json?$where=within_circle(location,${lat},${lon},${miles * 1609.34})&$limit=50`,
  },
  atlanta: {
    city: 'Atlanta', state: 'GA',
    portalURL: 'https://dpcd-coaplangis.opendata.arcgis.com/datasets/655f985f43cc40b4bf2ab7bc73d2169b',
    socrataDataset: 'https://gis.atlantaga.gov/dpcd/rest/services/OpenDataService/FeatureServer/25',
    searchByAddress: (addr) =>
      `https://gis.atlantaga.gov/dpcd/rest/services/OpenDataService/FeatureServer/25/query?where=upper(ADDRESS)+like+upper('%25${encodeURIComponent(addr)}%25')&outFields=PERMIT_NUM,ADDRESS,PERMIT_TYPE,ISSUED_DATE,STATUS&f=json&resultRecordCount=20`,
    radiusSearch: (lat, lon, miles = 2) =>
      `https://gis.atlantaga.gov/dpcd/rest/services/OpenDataService/FeatureServer/25/query?geometry=${lon},${lat}&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&distance=${miles * 1609.34}&units=esriSRUnit_Meter&outFields=PERMIT_NUM,ADDRESS,PERMIT_TYPE,ISSUED_DATE&f=json&resultRecordCount=50`,
  },
  miamidade: {
    city: 'Miami-Dade', state: 'FL',
    portalURL: 'https://gis-mdc.opendata.arcgis.com/datasets/MDC::building-permit/about',
    socrataDataset: 'https://gis-mdc.opendata.arcgis.com/datasets/MDC::building-permit',
    searchByAddress: (addr) =>
      `https://gisweb.miamidade.gov/arcgis/rest/services/EnerGov/MD_LandMgtViewer/MapServer/46/query?where=upper(SITE_ADDR)+like+upper('%25${encodeURIComponent(addr)}%25')&outFields=PROCESS_NUMBER,SITE_ADDR,FOLIO,PERMIT_DATE,PERMIT_TYPE&f=json&resultRecordCount=20`,
    radiusSearch: (lat, lon, miles = 2) =>
      `https://gisweb.miamidade.gov/arcgis/rest/services/EnerGov/MD_LandMgtViewer/MapServer/46/query?geometry=${lon},${lat}&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&distance=${miles * 1609.34}&units=esriSRUnit_Meter&outFields=PROCESS_NUMBER,SITE_ADDR,FOLIO,PERMIT_DATE&f=json&resultRecordCount=50`,
  },
  minneapolis: {
    city: 'Minneapolis', state: 'MN',
    portalURL: 'https://opendata.minneapolismn.gov/datasets/cityoflakes::ccs-permits/about',
    socrataDataset: 'https://opendata.minneapolismn.gov/datasets/91d7cc54f31a45b0982fca5117f16a0f_0',
    searchByAddress: (addr) =>
      `https://services.arcgis.com/afSMGVsC7QlRK1kZ/arcgis/rest/services/CCS_Permits/FeatureServer/0/query?where=upper(SITE_ADDRESS)+like+upper('%25${encodeURIComponent(addr)}%25')&outFields=PERMIT_NUM,SITE_ADDRESS,PERMIT_TYPE,ISSUE_DATE,STATUS&f=json&resultRecordCount=20`,
    radiusSearch: (lat, lon, miles = 2) =>
      `https://services.arcgis.com/afSMGVsC7QlRK1kZ/arcgis/rest/services/CCS_Permits/FeatureServer/0/query?geometry=${lon},${lat}&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&distance=${miles * 1609.34}&units=esriSRUnit_Meter&outFields=PERMIT_NUM,SITE_ADDRESS,PERMIT_TYPE,ISSUE_DATE&f=json&resultRecordCount=50`,
  },
  dc: {
    city: 'Washington', state: 'DC',
    portalURL: 'https://opendata.dc.gov/datasets/DCGIS::building-permits-in-2025/about',
    socrataDataset: 'https://maps2.dcgis.dc.gov/dcgis/rest/services/FEEDS/DCRA/FeatureServer/4',
    searchByAddress: (addr) =>
      `https://maps2.dcgis.dc.gov/dcgis/rest/services/FEEDS/DCRA/FeatureServer/4/query?where=upper(FULL_ADDRESS)+like+upper('%25${encodeURIComponent(addr)}%25')&outFields=PERMIT_ID,FULL_ADDRESS,ISSUE_DATE,PERMIT_TYPE_NAME,STATUS_ID&f=json&resultRecordCount=20`,
    radiusSearch: (lat, lon, miles = 2) =>
      `https://maps2.dcgis.dc.gov/dcgis/rest/services/FEEDS/DCRA/FeatureServer/4/query?geometry=${lon},${lat}&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&distance=${miles * 1609.34}&units=esriSRUnit_Meter&outFields=PERMIT_ID,FULL_ADDRESS,ISSUE_DATE,PERMIT_TYPE_NAME&f=json&resultRecordCount=50`,
  },

  // ── P0-5: WA permit-portal expansion (2026-04-25) ──
  // All 5 entries below ship with _unverifiedEndpoint: true. Direct REST
  // probes from agent egress returned 403 (same Cloudflare/anti-scrape wall
  // that hit P0-3 municipal-codes). URL patterns are best-known from public
  // documentation + Esri Hub + Socrata canonical conventions; field names
  // require live verification via owner-browser before the searchByAddress
  // builder is removed from quarantine. Until verified, runPhase_comp should
  // surface portal links to the user without auto-querying the JSON endpoint.

  // MyBuildingPermit.com — single eCityGov Alliance / Accela tenant covering
  // ~17 King County cities. One integration unlocks all of them. Public web
  // search exists at permitsearch.mybuildingpermit.com but no public REST
  // API surface — same pattern as Portland (web-only).
  mybuildingpermit: {
    city: 'eCityGov Alliance', state: 'WA',
    portalURL: 'https://permitsearch.mybuildingpermit.com/',
    coversCities: [
      'Bellevue', 'Bothell', 'Carnation', 'Clyde Hill', 'Issaquah', 'Kenmore',
      'Kirkland', 'Mercer Island', 'Newcastle', 'North Bend', 'Redmond',
      'Sammamish', 'Snoqualmie', 'Woodinville', 'Yarrow Point',
    ],
    notes: 'Powered by eCityGov Alliance + Accela Citizen Access. Jurisdiction is a required search-form field; no JSON or REST endpoint surfaces from the citizen portal. checklist-auto should link the user here for any covered city; runPhase_comp should fall back to address-only AI research in covered jurisdictions until an authenticated Accela Construct API key is obtained.',
    searchByAddress: null,
    _verifiedDate: '2026-04-25',
    _sourceMethod: 'public-portal-only',
  },

  // Tacoma — VERIFIED via GitHub Actions ArcGIS schema-fetch (round 5l,
  // 2026-04-25). Hub item a12d6fbf58e4434b8ff5070c09646f19 resolves to
  // services3.arcgis.com/SCwJH1pD8WSn5T5y/arcgis/rest/services/accela_permit_data/FeatureServer/0
  // — single layer "Accela Permit Data", 25 cols, point geometry,
  // address field `address_line_1`. Updated daily.
  tacoma: {
    city: 'Tacoma', state: 'WA',
    portalURL: 'https://www.tacomapermits.org/',
    hubURL: 'https://tacomaopendata-tacoma.hub.arcgis.com/datasets/accela-permit-data-tacoma',
    arcgisItemId: 'a12d6fbf58e4434b8ff5070c09646f19',
    arcgisServiceURL: 'https://services3.arcgis.com/SCwJH1pD8WSn5T5y/arcgis/rest/services/accela_permit_data/FeatureServer/0',
    landUseHubURL: 'https://geohub.cityoftacoma.org/datasets/d3ec4be073384acbad77a9c51b519130',
    searchByAddress: (addr) =>
      `https://services3.arcgis.com/SCwJH1pD8WSn5T5y/arcgis/rest/services/accela_permit_data/FeatureServer/0/query?where=upper(address_line_1)+like+upper('%25${encodeURIComponent(addr)}%25')&outFields=*&f=json&resultRecordCount=20`,
    radiusSearch: (lat, lon, miles = 2) =>
      `https://services3.arcgis.com/SCwJH1pD8WSn5T5y/arcgis/rest/services/accela_permit_data/FeatureServer/0/query?geometry=${lon},${lat}&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&distance=${miles * 1609.34}&units=esriSRUnit_Meter&outFields=*&f=json&resultRecordCount=50`,
    notes: 'Tacoma "Accela Permit Data" via Tacoma Open Data Hub item a12d6fbf58e4434b8ff5070c09646f19. Schema verified via GitHub Actions workflow 2026-04-25 (round 5l): 25 columns including address_line_1 (address field), point geometry, daily updates. Esri-style address-LIKE query supported on the FeatureServer endpoint.',
    _verifiedDate: '2026-04-25',
    _sourceMethod: 'github-actions-schema-fetch',
  },

  // Pierce County — VERIFIED via GitHub Actions schema-fetch (round 5h,
  // 2026-04-25). Of 5 candidate Socrata IDs across both Pierce hosts, only
  // internal.open.piercecountywa.gov:nhnt-v7ka is the right "Permits -
  // Pierce County" dataset (33 cols, address field `siteaddress`, geo field
  // `the_geom`). Two other "Permits - Pierce County"-named feeds are
  // deprecated empties (bg5p-p534, 9yt4-rd9g — both 0 cols). hmbh-c3hw is
  // Boundary Lines (geometry only); eugc-5pca is project-level land use
  // (24 cols but no address column). The owner round-4 Foundry upload
  // identified the right HOST (internal.open.piercecountywa.gov); the
  // round-5c addition of nhnt-v7ka as an "alternate Permits feed" candidate
  // turned out to be exactly the right id.
  pierce_county_unincorp: {
    city: 'Pierce County (unincorporated)', state: 'WA',
    portalURL: 'https://open.piercecountywa.gov/dataset/Permits-Pierce-County/9yt4-rd9g',
    socrataDataset: 'https://internal.open.piercecountywa.gov/resource/nhnt-v7ka.json',
    socrataDatasetCandidates: [
      'https://internal.open.piercecountywa.gov/resource/nhnt-v7ka.json',
    ],
    searchByAddress: (addr) =>
      `https://internal.open.piercecountywa.gov/resource/nhnt-v7ka.json?$where=upper(siteaddress) like '%25${encodeURIComponent(addr.toUpperCase())}%25'&$limit=20`,
    radiusSearch: (lat, lon, miles = 2) =>
      `https://internal.open.piercecountywa.gov/resource/nhnt-v7ka.json?$where=within_circle(the_geom,${lat},${lon},${miles * 1609.34})&$limit=50`,
    notes: 'Pierce County "Permits - Pierce County" — Socrata dataset nhnt-v7ka on internal.open.piercecountywa.gov. Schema verified via GitHub Actions workflow 2026-04-25 (round 5h): 33 columns, address field is `siteaddress`, geo field is `the_geom`. Other Pierce dataset candidates checked but not permits: bg5p-p534 / 9yt4-rd9g (both 0 cols, deprecated empties at the public open portal); hmbh-c3hw (boundary lines); eugc-5pca (project-level land use). Note the data is on the *internal* subdomain — public portal at open.piercecountywa.gov is the citizen-facing landing.',
    _verifiedDate: '2026-04-25',
    _sourceMethod: 'github-actions-schema-fetch',
  },

  // Snohomish County — VERIFIED via ArcGIS schema-fetch round 5l (2026-04-25).
  // Org host services6.arcgis.com/z6WYi9VRHfgwgtyW enumerates 481 services;
  // 4 permit-relevant: Building_Applications_Under_Review, Building_Permits_
  // Under_Construction, Issued_Permits, D8_Permits. `Issued_Permits` is the
  // closest semantic match to the "Permits - <County>" pattern other counties
  // use; declared as arcgisServiceURL so the next schema-fetch run resolves
  // its field schema (round 5m). Field-level graduation (searchByAddress)
  // lands once that run returns column names.
  snohomish_county_unincorp: {
    city: 'Snohomish County (unincorporated)', state: 'WA',
    portalURL: 'https://snohomish-county-open-data-portal-snoco-gis.hub.arcgis.com/datasets/snoco-gis::active-permits-1',
    arcgisOrgHost: 'https://services6.arcgis.com/z6WYi9VRHfgwgtyW',
    arcgisServiceURL: 'https://services6.arcgis.com/z6WYi9VRHfgwgtyW/arcgis/rest/services/Issued_Permits/FeatureServer/0',
    pdsRecordsURL: 'https://snohomishcountywa.gov/3920/Online-Permitting',
    searchByAddress: null,
    notes: 'snoco-gis Issued_Permits service identified via org-catalog enumeration (481 services). Field schema awaits next fetch-schemas workflow run. Three sibling permit services also exist: Building_Applications_Under_Review, Building_Permits_Under_Construction, D8_Permits — could be added as fallback candidates if Issued_Permits proves wrong.',
    _verifiedDate: '2026-04-25',
    _sourceMethod: 'github-actions-schema-fetch',
    _unverifiedEndpoint: true,
  },

  // Everett — VERIFIED via GitHub Actions schema-fetch (round 5, 2026-04-25).
  // Of 3 candidate Socrata IDs, only 3w3u-656c "Trakit Permits" is the
  // right dataset (21 cols including permitno, permittype, applieddate,
  // issueddate, siteaddress, geocoded_column point). The P0-5 best-guess
  // 7fiu-4gra has 0 cols (deprecated/empty); ppic-abeb is "Prosecutor
  // Hearing notifications" (wrong domain).
  everett: {
    city: 'Everett', state: 'WA',
    portalURL: 'https://onlinepermits.everettwa.gov/etrakit/default.aspx',
    socrataDataset: 'https://data.everettwa.gov/resource/3w3u-656c.json',
    socrataDatasetCandidates: [
      'https://data.everettwa.gov/resource/3w3u-656c.json',
    ],
    openDataURL: 'https://data.everettwa.gov/d/3w3u-656c',
    searchByAddress: (addr) =>
      `https://data.everettwa.gov/resource/3w3u-656c.json?$where=upper(siteaddress) like '%25${encodeURIComponent(addr.toUpperCase())}%25'&$limit=20`,
    radiusSearch: (lat, lon, miles = 2) =>
      `https://data.everettwa.gov/resource/3w3u-656c.json?$where=within_circle(geocoded_column,${lat},${lon},${miles * 1609.34})&$limit=50`,
    notes: 'Everett Trakit Permits — Socrata dataset 3w3u-656c on data.everettwa.gov. Schema verified via GitHub Actions workflow 2026-04-25: 21 columns, address field is `siteaddress`, geo field is `geocoded_column` (point type). Other Everett dataset candidates (7fiu-4gra, ppic-abeb) checked but not permits. eTRAKiT online portal is the citizen-facing apply/inspect surface (separate from this read-only data feed).',
    _verifiedDate: '2026-04-25',
    _sourceMethod: 'github-actions-schema-fetch',
  },

};

window.permitRegistryKey = function(city) {
  if (!city) return null;
  return String(city).toLowerCase().replace(/\s+/g,'').replace(/city(of)?/,'');
};
