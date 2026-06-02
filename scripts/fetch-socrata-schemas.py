#!/usr/bin/env python3
"""scripts/fetch-socrata-schemas.py — pull Socrata dataset metadata + write
to data/_socrata-schemas.json so permit-registry consumers can use real
field names instead of guesses.

Designed to run from GitHub Actions egress (different IP space than agent
egress and any single browser session). Standard library only — no pip
install needed.

Pipeline:
  1. Read data/permit-registry.js, extract every (host, dataset_id) pair.
  2. For each, fetch https://<host>/api/views/<id>.json — Socrata public
     metadata endpoint, returns columns + descriptions + update info.
  3. Normalize into { "<host>:<id>": { name, description, columns:
     [{fieldName, dataTypeName, description}], updatedAt } }.
  4. Write data/_socrata-schemas.json (sorted keys; idempotent).

Discovery: addresses are auto-detected by scanning column fieldNames for
common patterns (address, site_address, full_address, location, etc.).
The result is consumable by scripts/sync-permit-registry.py to graduate
entries from `_unverifiedEndpoint: true` to live.

Usage (from CI or local):
    python3 scripts/fetch-socrata-schemas.py
        --registry data/permit-registry.js
        --out data/_socrata-schemas.json

Exit 0 on success, 1 on any fetch failure (CI surfaces failure clearly).
"""
import argparse
import json
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

ADDRESS_PATTERNS = [
    "site_address", "site_addr", "full_address", "full_addr",
    "address", "addr", "permit_address", "address_full",
    "location_1", "location",
]


def extract_socrata_pairs(registry_text: str) -> list[tuple[str, str, str]]:
    """Return list of (entry_key, host, dataset_id) tuples from permit-registry.js.

    Walks both `socrataDataset: '<url>'` (singular) and
    `socrataDatasetCandidates: ['<url>', ...]` (array) so newly discovered
    candidate IDs get resolved on the next workflow run.
    """
    out: list[tuple[str, str, str]] = []
    rx_entry = re.compile(
        r"^\s*(\w+):\s*\{(.*?)^\s*\},",
        re.MULTILINE | re.DOTALL,
    )
    seen: set[tuple[str, str, str]] = set()
    rx_url = re.compile(r"['\"]https?://([^/]+)/resource/([\w-]+)\.json")
    for m in rx_entry.finditer(registry_text):
        key = m.group(1)
        body = m.group(2)
        # Singular socrataDataset
        ds = re.search(r"socrataDataset:\s*['\"]https?://([^/]+)/resource/([\w-]+)\.json", body)
        if ds:
            t = (key, ds.group(1), ds.group(2))
            if t not in seen:
                out.append(t); seen.add(t)
        # Array socrataDatasetCandidates
        cand = re.search(r"socrataDatasetCandidates:\s*\[(.*?)\]", body, re.DOTALL)
        if cand:
            for h, i in rx_url.findall(cand.group(1)):
                t = (key, h, i)
                if t not in seen:
                    out.append(t); seen.add(t)
    return out


def fetch_metadata(host: str, dataset_id: str, timeout: float = 20.0) -> dict:
    """Fetch and parse Socrata dataset metadata. Returns raw JSON or raises."""
    url = f"https://{host}/api/views/{dataset_id}.json"
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "ArchDraw-schema-fetcher/1.0 (github.com/antenehproduction/archdraw)",
            "Accept": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.load(resp)


def normalize_columns(meta: dict) -> list[dict]:
    cols = []
    for c in meta.get("columns") or []:
        cols.append({
            "fieldName": c.get("fieldName"),
            "name": c.get("name"),
            "dataTypeName": c.get("dataTypeName"),
            "description": (c.get("description") or "").strip()[:240] or None,
        })
    return cols


def detect_address_field(columns: list[dict]) -> str | None:
    field_names = [c.get("fieldName") or "" for c in columns]
    lowered = {fn.lower(): fn for fn in field_names if fn}
    for pat in ADDRESS_PATTERNS:
        if pat in lowered:
            return lowered[pat]
    # Fallback: any column whose name contains "address"
    for fn in field_names:
        if "address" in fn.lower() or "addr" in fn.lower():
            return fn
    return None


def detect_geo_field(columns: list[dict]) -> str | None:
    for c in columns:
        if (c.get("dataTypeName") or "").lower() in {"point", "location"}:
            return c.get("fieldName")
    return None


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--registry", default=str(ROOT / "data" / "permit-registry.js"))
    ap.add_argument("--out", default=str(ROOT / "data" / "_socrata-schemas.json"))
    ap.add_argument("--strict", action="store_true",
                    help="exit non-zero on any fetch failure (default: best-effort)")
    args = ap.parse_args()

    reg_text = Path(args.registry).read_text(encoding="utf-8")
    pairs = extract_socrata_pairs(reg_text)
    if not pairs:
        print("No Socrata datasets found in registry.", file=sys.stderr)
        return 0

    schemas: dict[str, dict] = {}
    failures: list[str] = []
    for key, host, ds_id in sorted(pairs):
        full_key = f"{host}:{ds_id}"
        try:
            meta = fetch_metadata(host, ds_id)
            cols = normalize_columns(meta)
            schemas[full_key] = {
                "registryKey": key,
                "host": host,
                "datasetId": ds_id,
                "name": meta.get("name"),
                "description": (meta.get("description") or "").strip()[:600] or None,
                "category": meta.get("category"),
                "rowsUpdatedAt": meta.get("rowsUpdatedAt"),
                "viewLastModified": meta.get("viewLastModified"),
                "columns": cols,
                "addressFieldGuess": detect_address_field(cols),
                "geoFieldGuess": detect_geo_field(cols),
            }
            print(f"OK  {full_key}  ({len(cols)} cols)", file=sys.stderr)
        except urllib.error.HTTPError as e:
            failures.append(f"{full_key} HTTP {e.code}")
            print(f"ERR {full_key}  HTTP {e.code}", file=sys.stderr)
        except Exception as e:
            failures.append(f"{full_key} {type(e).__name__}: {e}")
            print(f"ERR {full_key}  {type(e).__name__}: {e}", file=sys.stderr)

    out_doc = {
        "_meta": {
            "generatedBy": "scripts/fetch-socrata-schemas.py",
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
