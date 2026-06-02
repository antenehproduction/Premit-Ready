#!/usr/bin/env python3
"""scripts/fetch-arcgis-schemas.py — parallel to fetch-socrata-schemas.py
for ArcGIS Online Hub items + ArcGIS REST FeatureServer/MapServer endpoints.

Walks data/permit-registry.js for entries that declare:
  - `arcgisItemId: '<32-char-id>'`  (ArcGIS Online Hub item — resolves to
                                    a hosted FeatureServer URL via the
                                    AGO sharing/rest/content/items API)
  - `arcgisServiceURL: '<url>'`    (direct service URL — fetched as-is)
  - `arcgisOrgHost: '<host>'`      (ArcGIS Online org host — enumerates
                                    services at <host>/arcgis/rest/services)

Pure stdlib. Designed to run from GitHub Actions egress (same bypass
rationale as fetch-socrata-schemas.py — agent egress + several browser
sessions are blocked from these hosts; GitHub-runner IP space resolves).

Output: data/_arcgis-schemas.json with `{ "<key>": { itemName,
serviceURL, layerName, fields[], addressFieldGuess, geoFieldGuess, ... } }`.
Consumed by scripts/sync-permit-registry.py to graduate ArcGIS-backed
permit-registry entries from `_unverifiedEndpoint: true` to live.
"""
import argparse
import json
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

UA = "ArchDraw-arcgis-schema-fetcher/1.0 (github.com/antenehproduction/archdraw)"

ADDRESS_PATTERNS = [
    "site_address", "siteaddress", "site_addr",
    "full_address", "fulladdress",
    "address", "addr",
    "permit_address", "address_full",
    "location_1", "location",
]


def http_get_json(url: str, timeout: float = 25.0) -> dict:
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.load(r)


def resolve_hub_item(item_id: str) -> dict:
    """Resolve an AGO Hub item id to its FeatureServer URL + metadata."""
    return http_get_json(
        f"https://www.arcgis.com/sharing/rest/content/items/{item_id}?f=json"
    )


def fetch_layer_metadata(service_url: str) -> list[dict]:
    """Fetch layer metadata from a FeatureServer/MapServer URL.

    If the URL ends in `/<index>` (single-layer), fetch that layer directly.
    If it ends in `/FeatureServer` or `/MapServer` (service root), fetch
    the service definition and enumerate every layer.
    """
    base = service_url.rstrip("/")
    j_url = base + "?f=json"
    meta = http_get_json(j_url)
    layers: list[dict] = []
    if "layers" in meta:
        # Service root — enumerate
        for layer_def in meta.get("layers", []):
            try:
                idx = layer_def.get("id")
                lj = http_get_json(f"{base}/{idx}?f=json")
                lj["_layerIndex"] = idx
                lj["_serviceURL"] = base
                layers.append(lj)
            except Exception as e:
                layers.append({"_layerIndex": idx, "_error": str(e), "_serviceURL": base})
    else:
        # Single layer URL
        meta["_layerIndex"] = meta.get("id")
        meta["_serviceURL"] = base.rsplit("/", 1)[0] if base.rsplit("/", 1)[-1].isdigit() else base
        layers = [meta]
    return layers


def normalize_fields(layer: dict) -> list[dict]:
    out = []
    for f in layer.get("fields", []) or []:
        out.append({
            "name": f.get("name"),
            "alias": f.get("alias"),
            "type": f.get("type"),
            "length": f.get("length"),
        })
    return out


def detect_address_field(fields: list[dict]) -> str | None:
    field_names = [(f.get("name") or "").lower() for f in fields if f.get("name")]
    name_map = {n: f.get("name") for n, f in zip(field_names, fields)}
    for pat in ADDRESS_PATTERNS:
        if pat in name_map:
            return name_map[pat]
    for n, real in name_map.items():
        if "address" in n or "addr" in n:
            return real
    return None


def detect_geo_field(layer: dict) -> str | None:
    geom_type = layer.get("geometryType")
    if geom_type:
        # ArcGIS layers don't expose a "geo column" the way Socrata does — the
        # geometry is implicit in the response. Surface the geometry type so
        # the consumer knows which spatial-relation builder to construct.
        return geom_type
    return None


def extract_arcgis_targets(registry_text: str) -> list[dict]:
    """Walk permit-registry.js for ArcGIS-flavored fields. Return list of
    { entryKey, kind: 'hub' | 'service' | 'org', value }."""
    targets: list[dict] = []
    rx_entry = re.compile(
        r"^\s*(\w+):\s*\{(.*?)^\s*\},",
        re.MULTILINE | re.DOTALL,
    )
    for m in rx_entry.finditer(registry_text):
        key = m.group(1)
        body = m.group(2)
        for hub in re.findall(r"arcgisItemId:\s*['\"]([\w-]+)['\"]", body):
            targets.append({"entryKey": key, "kind": "hub", "value": hub})
        for svc in re.findall(r"arcgisServiceURL:\s*['\"]([^'\"]+)['\"]", body):
            targets.append({"entryKey": key, "kind": "service", "value": svc})
        for org in re.findall(r"arcgisOrgHost:\s*['\"]([^'\"]+)['\"]", body):
            targets.append({"entryKey": key, "kind": "org", "value": org})
    return targets


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--registry", default=str(ROOT / "data" / "permit-registry.js"))
    ap.add_argument("--out", default=str(ROOT / "data" / "_arcgis-schemas.json"))
    ap.add_argument("--strict", action="store_true",
                    help="exit non-zero on any fetch failure")
    args = ap.parse_args()

    reg_text = Path(args.registry).read_text(encoding="utf-8")
    targets = extract_arcgis_targets(reg_text)
    if not targets:
        print("No ArcGIS targets found in registry.", file=sys.stderr)
        Path(args.out).write_text(
            json.dumps({"_meta": {"datasetCount": 0, "failures": []}, "schemas": {}}, indent=2),
            encoding="utf-8",
        )
        return 0

    schemas: dict[str, dict] = {}
    failures: list[str] = []

    for t in targets:
        key = t["entryKey"]
        kind = t["kind"]
        val = t["value"]
        out_key = f"{key}:{kind}:{val}"

        try:
            if kind == "hub":
                item = resolve_hub_item(val)
                # AGO item.url is the hosted service root (FeatureServer or MapServer)
                svc_url = item.get("url") or ""
                layers = fetch_layer_metadata(svc_url) if svc_url else []
                schemas[out_key] = {
                    "registryKey": key,
                    "kind": kind,
                    "itemId": val,
                    "itemName": item.get("title"),
                    "itemDescription": (item.get("description") or "")[:600] or None,
                    "itemType": item.get("type"),
                    "serviceURL": svc_url,
                    "layers": [
                        {
                            "layerIndex": L.get("_layerIndex"),
                            "name": L.get("name"),
                            "type": L.get("type"),
                            "geometryType": L.get("geometryType"),
                            "fields": normalize_fields(L),
                            "addressFieldGuess": detect_address_field(L.get("fields") or []),
                        }
                        for L in layers
                    ],
                }
                print(f"OK  hub:{val}  ({item.get('title')!r}) → {len(layers)} layer(s)", file=sys.stderr)

            elif kind == "service":
                layers = fetch_layer_metadata(val)
                schemas[out_key] = {
                    "registryKey": key,
                    "kind": kind,
                    "serviceURL": val,
                    "layers": [
                        {
                            "layerIndex": L.get("_layerIndex"),
                            "name": L.get("name"),
                            "type": L.get("type"),
                            "geometryType": L.get("geometryType"),
                            "fields": normalize_fields(L),
                            "addressFieldGuess": detect_address_field(L.get("fields") or []),
                        }
                        for L in layers
                    ],
                }
                print(f"OK  service:{val}  → {len(layers)} layer(s)", file=sys.stderr)

            elif kind == "org":
                catalog = http_get_json(f"{val.rstrip('/')}/arcgis/rest/services?f=json")
                services = catalog.get("services") or []
                schemas[out_key] = {
                    "registryKey": key,
                    "kind": kind,
                    "orgHost": val,
                    "services": [
                        {"name": s.get("name"), "type": s.get("type")}
                        for s in services
                        if "permit" in (s.get("name") or "").lower()
                        or "land" in (s.get("name") or "").lower()
                        or "build" in (s.get("name") or "").lower()
                    ][:50],
                    "serviceCountTotal": len(services),
                }
                print(f"OK  org:{val}  → {len(services)} service(s) total", file=sys.stderr)

        except urllib.error.HTTPError as e:
            failures.append(f"{out_key} HTTP {e.code}")
            print(f"ERR {out_key}  HTTP {e.code}", file=sys.stderr)
        except Exception as e:
            failures.append(f"{out_key} {type(e).__name__}: {e}")
            print(f"ERR {out_key}  {type(e).__name__}: {e}", file=sys.stderr)

    out_doc = {
        "_meta": {
            "generatedBy": "scripts/fetch-arcgis-schemas.py",
            "schemaVersion": 1,
            "datasetCount": len(schemas),
            "failures": failures,
        },
        "schemas": schemas,
    }
    Path(args.out).write_text(
        json.dumps(out_doc, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    print(f"\nWrote {args.out}: {len(schemas)} ok, {len(failures)} failed", file=sys.stderr)
    if args.strict and failures:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
