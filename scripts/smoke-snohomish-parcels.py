#!/usr/bin/env python3
"""scripts/smoke-snohomish-parcels.py — P0-2 acceptance smoke test.

Picks 3 representative Snohomish County addresses (one incorporated city,
one near-water, one unincorporated/rural), geocodes each via Nominatim,
queries the WA:Snohomish parcel ArcGIS endpoint registered in
data/county-registry.js, and reports whether each returns a parcel polygon
with a valid PARCEL_ID.

Pass criterion: 3/3 addresses return a feature with PARCEL_ID + non-empty
ring geometry. Manual SUCCESS criterion from PROJECT_COORDINATOR.md §P0-2.

Run locally:    python3 scripts/smoke-snohomish-parcels.py
Run in CI:      same — see .github/workflows/smoke-county-parcels.yml

Stdlib only — no pip install. Honors the same User-Agent + timeout
discipline as the schema-fetch script.
"""
import json
import sys
import urllib.error
import urllib.parse
import urllib.request

UA = "ArchDraw-smoke-test/1.0 (github.com/antenehproduction/archdraw)"

# 3 representative Snohomish addresses per the §P0-2 acceptance criterion
# ("one each in: incorporated city, unincorporated, near-water"):
#   1) Incorporated county seat
#   2) Unincorporated rural / CDP (Maltby — Yew Way corridor, definitively
#      unincorporated Snohomish per the county's incorporated-areas map)
#   3) Near-water (Puget Sound waterfront, tests SMP-overlay parcels)
ADDRESSES = [
    ("Everett — county seat (incorporated)",      "3322 Wetmore Ave, Everett, WA 98201"),
    ("Maltby — unincorporated (Maltby Library)",  "21008 Yew Way, Snohomish, WA 98296"),
    ("Mukilteo — near-water (Puget Sound)",       "624 5th St, Mukilteo, WA 98275"),
]

ENDPOINT = "https://gis.snoco.org/sis/rest/services/Cadastral/Tax_Parcels/MapServer/0/query"
NOMINATIM = "https://nominatim.openstreetmap.org/search"


def geocode(addr: str) -> tuple[float, float]:
    q = urllib.parse.urlencode({"q": addr, "format": "json", "limit": 1, "countrycodes": "us"})
    req = urllib.request.Request(f"{NOMINATIM}?{q}", headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=20) as r:
        results = json.load(r)
    if not results:
        raise ValueError("no geocode result")
    return float(results[0]["lat"]), float(results[0]["lon"])


def query_parcel(lat: float, lon: float) -> dict:
    # 20-meter buffer: Nominatim often returns street-centerline points
    # (right-of-way, not parcel interior). Buffering the spatial query
    # snaps to the adjacent parcel polygon. Standard Esri REST pattern;
    # 20m is the minimum safe distance for typical urban/suburban
    # parcels (avoids false positives spanning two adjacent parcels at
    # narrower buffers; tighter than residential lot widths).
    params = {
        "geometry": f"{lon},{lat}",
        "geometryType": "esriGeometryPoint",
        "spatialRel": "esriSpatialRelIntersects",
        "distance": "20",
        "units": "esriSRUnit_Meter",
        "outFields": "PARCEL_ID,TAB_ACRES,USECODE",
        "returnGeometry": "true",
        "f": "json",
        "inSR": "4326",
        "outSR": "4326",
    }
    req = urllib.request.Request(
        f"{ENDPOINT}?{urllib.parse.urlencode(params)}",
        headers={"User-Agent": UA, "Accept": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=25) as r:
        return json.load(r)


def main() -> int:
    ok = fail = 0
    print(f"WA:Snohomish parcel endpoint smoke test ({len(ADDRESSES)} addresses)")
    print(f"endpoint: {ENDPOINT}\n")

    for label, addr in ADDRESSES:
        print(f"→ {label}")
        print(f"  addr: {addr}")
        try:
            lat, lon = geocode(addr)
            print(f"  geocoded: ({lat:.6f}, {lon:.6f})")
        except Exception as e:
            print(f"  GEOCODE FAIL: {type(e).__name__}: {e}\n")
            fail += 1
            continue

        try:
            data = query_parcel(lat, lon)
        except urllib.error.HTTPError as e:
            print(f"  PARCEL FAIL: HTTP {e.code}\n")
            fail += 1
            continue
        except Exception as e:
            print(f"  PARCEL FAIL: {type(e).__name__}: {e}\n")
            fail += 1
            continue

        feats = data.get("features") or []
        if not feats:
            print(f"  FAIL: no features at this point\n")
            fail += 1
            continue

        attrs = feats[0].get("attributes", {})
        geom = feats[0].get("geometry", {}) or {}
        pid = attrs.get("PARCEL_ID")
        acres = attrs.get("TAB_ACRES")
        useclass = attrs.get("USECODE")
        rings = geom.get("rings") or []
        ring_pts = sum(len(r) for r in rings)

        print(f"  PARCEL_ID: {pid}")
        print(f"  TAB_ACRES: {acres}  (sq ft = {acres * 43560:.0f})" if isinstance(acres, (int, float)) else f"  TAB_ACRES: {acres}")
        print(f"  USECODE:   {useclass}")
        print(f"  geometry:  {len(rings)} ring(s), {ring_pts} vertex(es)")
        if pid and rings:
            print(f"  PASS\n")
            ok += 1
        else:
            print(f"  FAIL: missing PARCEL_ID or polygon\n")
            fail += 1

    print(f"\nResult: {ok} of {len(ADDRESSES)} addresses returned a parcel polygon")
    return 0 if fail == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
