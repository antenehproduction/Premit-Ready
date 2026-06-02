#!/usr/bin/env python3
"""scripts/sync-permit-registry.py — promote fetched Socrata schemas
(data/_socrata-schemas.json) back into data/permit-registry.js automatically.

Pipeline:
  1. Load data/_socrata-schemas.json (produced by fetch-socrata-schemas.py)
  2. For each registry entry that has socrataDatasetCandidates[], pick the
     candidate whose schema is the most permit-shaped (column names contain
     'permit', 'issue', 'address') and whose row count > 0.
  3. Print a JSON-formatted patch report:
       {
         "<registryKey>": {
           "chosenDataset": "<host>:<id>",
           "addressFieldGuess": "...",
           "geoFieldGuess": "...",
           "shouldClearUnverified": true | false,
           "newSearchByAddress": "...",
         }
       }

This script does NOT mutate data/permit-registry.js automatically — same
safety pattern as scripts/integrate-charts.py. The CI surfaces the report
in the workflow log and (future enhancement) opens a PR with the suggested
edits for owner review.

Why no auto-edit: misclassifying a non-permit dataset as the chosen one
silently breaks runPhase_comp; hand-merge keeps a human in the loop until
the heuristic is proven over several runs.
"""
import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

PERMIT_KEYWORDS = ["permit", "issue", "issued", "applied", "application", "construct", "site"]


def score_dataset(schema: dict) -> float:
    """Heuristic: 'how permit-shaped is this dataset?'"""
    cols = schema.get("columns") or []
    score = 0.0
    for c in cols:
        n = (c.get("fieldName") or "").lower() + " " + (c.get("name") or "").lower()
        for kw in PERMIT_KEYWORDS:
            if kw in n:
                score += 1.0
    if schema.get("addressFieldGuess"):
        score += 2.0
    if schema.get("geoFieldGuess"):
        score += 1.0
    return score


def extract_candidate_groups(reg_text: str) -> dict[str, list[tuple[str, str]]]:
    """For each entry that declares socrataDatasetCandidates, return its
    (host, id) list keyed by entry name."""
    out: dict[str, list[tuple[str, str]]] = {}
    rx = re.compile(
        r"^\s*(\w+):\s*\{(.*?)^\s*\},",
        re.MULTILINE | re.DOTALL,
    )
    for m in rx.finditer(reg_text):
        key = m.group(1)
        body = m.group(2)
        cand_block = re.search(
            r"socrataDatasetCandidates:\s*\[(.*?)\]",
            body,
            re.DOTALL,
        )
        if not cand_block:
            continue
        urls = re.findall(
            r"['\"]https?://([^/]+)/resource/([\w-]+)\.json['\"]",
            cand_block.group(1),
        )
        if urls:
            out[key] = [(h, i) for h, i in urls]
    return out


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--schemas", default=str(ROOT / "data" / "_socrata-schemas.json"))
    ap.add_argument("--registry", default=str(ROOT / "data" / "permit-registry.js"))
    args = ap.parse_args()

    if not Path(args.schemas).exists():
        print(f"No schemas file at {args.schemas}; run fetch-socrata-schemas.py first.",
              file=sys.stderr)
        return 1

    schemas_doc = json.loads(Path(args.schemas).read_text())
    schemas = schemas_doc.get("schemas") or {}
    reg_text = Path(args.registry).read_text(encoding="utf-8")
    candidate_groups = extract_candidate_groups(reg_text)

    report = {}
    for entry_key, candidates in sorted(candidate_groups.items()):
        ranked = []
        for host, ds_id in candidates:
            schema = schemas.get(f"{host}:{ds_id}")
            if not schema:
                continue
            ranked.append((score_dataset(schema), host, ds_id, schema))
        ranked.sort(key=lambda t: -t[0])
        if not ranked:
            report[entry_key] = {"chosenDataset": None, "_note": "no schemas resolved yet"}
            continue
        best_score, host, ds_id, schema = ranked[0]
        addr = schema.get("addressFieldGuess")
        geo = schema.get("geoFieldGuess")
        report[entry_key] = {
            "chosenDataset": f"{host}:{ds_id}",
            "datasetName": schema.get("name"),
            "score": best_score,
            "addressFieldGuess": addr,
            "geoFieldGuess": geo,
            "shouldClearUnverified": bool(addr) and best_score >= 4,
            "newSearchByAddress": (
                f"https://{host}/resource/{ds_id}.json?$where=upper({addr}) like "
                f"'%25${{encodeURIComponent(addr.toUpperCase())}}%25'&$limit=20"
                if addr else None
            ),
            "alternatives": [
                {"datasetId": f"{h}:{i}", "score": s, "name": s_obj.get("name")}
                for s, h, i, s_obj in ranked[1:]
            ],
        }

    print(json.dumps(report, indent=2, default=str))
    return 0


if __name__ == "__main__":
    sys.exit(main())
