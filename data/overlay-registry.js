// ═══ OVERLAY_REGISTRY — verified public ArcGIS endpoints for hazard/historic overlays ═══
// Consumed by fetchOverlays(lat, lon, state) in index.html. Results populate
// S._historic / S._coastal / S._wildfire / S._hillside / S._liquefaction which
// runArchitectAdvisor() reads as Expert Sign-Off triggers (Architect + Structural/
// MEP/Civil PE seals required when any fire up).
//
// Every endpoint is public (no auth, no API key). Queries go through the
// adi-proxy /arcgis route because most of these upstream servers block
// browser-origin CORS directly.
//
// ── Output contract ──
// Each entry exposes:
//   url           — ArcGIS REST /query endpoint
//   field         — attribute name that carries the hazard class/name
//   classify(v)   — function that maps the raw field value to one of:
//                     'none' | 'low' | 'moderate' | 'high' | 'very_high'
//                   or (for historic/coastal) the district name string,
//                   or null when the lookup didn't match anything.
//
// ── To add a new overlay ──
// 1. Find a public ArcGIS REST parcel/layer with a CORS-open server
//    (or one the proxy's /arcgis whitelist covers)
// 2. Verify the response includes a field carrying the classification
// 3. Add an entry; include a comment linking the portal page
// 4. Extend the proxy's /arcgis whitelist regex in proxy.js + api/[...path].js
//    if the host isn't already permitted

window.OVERLAY_REGISTRY = {

  // ── WILDFIRE / WUI ──
  // California: CAL FIRE Fire Hazard Severity Zone (FHSZ) Local Responsibility Area.
  // Classes: Moderate, High, Very High. Absence = not in FHSZ.
  wildfire: {
    CA: {
      url: 'https://services.arcgis.com/ahsbjn3RTKsQnwlP/arcgis/rest/services/FHSZ_SRA11_1/FeatureServer/0/query',
      field: 'HAZ_CLASS',
      classify: (v) => {
        const s = String(v || '').toLowerCase();
        if (s.includes('very')) return 'very_high';
        if (s.includes('high')) return 'high';
        if (s.includes('moderate')) return 'moderate';
        return null;
      },
    },
    // Washington: DNR Wildfire Risk Viewer (Burn Probability)
    WA: {
      url: 'https://fortress.wa.gov/dnr/DNR_ARCGIS_PUBLIC/rest/services/WAWildfireRisk/MapServer/0/query',
      field: 'BURN_PROBABILITY',
      classify: (v) => {
        const n = parseFloat(v);
        if (isNaN(n)) return null;
        if (n > 0.04) return 'very_high';
        if (n > 0.02) return 'high';
        if (n > 0.005) return 'moderate';
        return 'low';
      },
    },
    // USFS national WUI — coarse classification
    US: {
      url: 'https://apps.fs.usda.gov/arcx/rest/services/RDW_LandscapeAndWildfire/RMRS_WildlandUrbanInterface/MapServer/0/query',
      field: 'WUICLASS10',
      classify: (v) => {
        const s = String(v || '').toUpperCase();
        if (s.includes('INTERMIX') || s.includes('INTERFACE')) return 'moderate';
        return null;
      },
    },
  },

  // ── HISTORIC ──
  // National Register of Historic Places — NPS Cultural Resources GIS
  // Returns RESNAME (resource name) when the point is in a listed district
  // or within ~50m of a listed individual property.
  historic: {
    US: {
      url: 'https://services1.arcgis.com/Hp6G80Pky0om7QvQ/ArcGIS/rest/services/National_Register_of_Historic_Places/FeatureServer/0/query',
      field: 'RESNAME',
      // Any non-null result = historic designation. Return the district/property name.
      classify: (v) => (v ? String(v).substring(0, 80) : null),
    },
  },

  // ── COASTAL ──
  // NOAA Office for Coastal Management — CZMA coastal zone boundaries.
  // Trigger: any hit means site is within the state coastal zone, which
  // requires state coastal commission approval in most jurisdictions.
  coastal: {
    US: {
      url: 'https://coast.noaa.gov/arcgis/rest/services/MarineCadastre/CZMA/MapServer/0/query',
      field: 'ST_NAME',
      classify: (v) => (v ? `CZMA zone: ${String(v).substring(0, 40)}` : null),
    },
  },

  // ── HILLSIDE / LANDSLIDE ──
  // USGS national landslide susceptibility overview.
  // Moderate+ susceptibility typically triggers geotechnical review requirement.
  hillside: {
    US: {
      url: 'https://hazards.usgs.gov/arcgis/rest/services/haz/nshm/MapServer/0/query',
      field: 'MEAN',
      classify: (v) => {
        const n = parseFloat(v);
        if (isNaN(n)) return null;
        if (n > 0.3) return 'high';
        if (n > 0.15) return 'moderate';
        return null;
      },
    },
    // California DOC seismic hazard zones (landslide + liquefaction)
    CA: {
      url: 'https://gis.conservation.ca.gov/server/rest/services/CGS/CGS_Earthquake_Hazards/MapServer/1/query',
      field: 'HAZ_TYPE',
      classify: (v) => {
        const s = String(v || '').toLowerCase();
        if (s.includes('landslide')) return 'high';
        return null;
      },
    },
    // Washington DNR landslide inventory
    WA: {
      url: 'https://gis.dnr.wa.gov/site3/rest/services/Public_Geology/WADNR_PUBLIC_Geology_Landslides/MapServer/0/query',
      field: 'SLIDE_CONFIDENCE',
      classify: (v) => {
        const s = String(v || '').toLowerCase();
        if (s.includes('high') || s.includes('definite')) return 'high';
        if (s.includes('moderate') || s.includes('probable')) return 'moderate';
        return null;
      },
    },
  },

  // ── LIQUEFACTION ──
  liquefaction: {
    CA: {
      url: 'https://gis.conservation.ca.gov/server/rest/services/CGS/CGS_Earthquake_Hazards/MapServer/0/query',
      field: 'HAZ_TYPE',
      classify: (v) => (String(v || '').toLowerCase().includes('liquefaction') ? 'high' : null),
    },
  },
};

// Convenience: given a hazard type and state code, return the highest-priority
// endpoint to try first (state-specific > US national).
window.overlayEndpoint = function(hazardType, state) {
  const group = window.OVERLAY_REGISTRY?.[hazardType];
  if (!group) return null;
  return group[state] || group.US || null;
};
