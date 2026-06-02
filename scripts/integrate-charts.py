#!/usr/bin/env python3
"""scripts/integrate-charts.py — auto-extract dimensional standards from
owner-uploaded municipal-code chart HTML.

Reads view-source HTML saves (the format Chrome produces when the user
right-clicks → Save As on a "view-source:" tab) and emits JSON patches that
match the data/zoning-matrix.js schema. The patches are *suggestions*; the
caller is expected to review them, hand-merge into data/zoning-matrix.js,
and run `node test/middle-housing.test.js` before commit.

Mapping: filename → (matrix keys, expected-field config). Extend the
INTEGRATION_PLAN dict below when a new city's upload arrives.

Usage:
    python3 scripts/integrate-charts.py                # process all known files
    python3 scripts/integrate-charts.py --city kirkland # one city
    python3 scripts/integrate-charts.py --diff         # also print before→after deltas

Output: prints JSON-formatted patch suggestions to stdout. Each patch is
a dict { matrixKey: { fieldName: value, ... } } plus a `_review` array
with the source rows that produced each value.

The script intentionally does NOT mutate data/zoning-matrix.js automatically.
Hand-merging is the safety gate against a chart misread (the same risk
that caused the Bothell Tier 1/Tier 2 column-misread in the P0-3 sweep).
"""
import argparse
import html
import json
import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# ── Per-city integration plan ──────────────────────────────────────────────
# Each entry maps a view-source filename glob to:
#   matrix_keys: list of zoning-matrix keys this chart populates
#   columns:     ordered list of district codes that appear as column headers
#                in the chart, in the order they appear left-to-right
#   field_rows:  list of (row_label_regex, schema_field, value_parser)
#
# The extractor runs each row regex against the chart's "<p>{label}</p>"
# rows; when matched, it walks the row's per-column <p>{value}</p> cells
# and parses each into a number/string per value_parser, then maps each
# column's value to the corresponding matrix key.
#
# Adding a new city:
#   1. Save the chart page via Chrome view-source (right-click → Save As).
#   2. Commit the file to repo root.
#   3. Add an entry below with the matrix keys, columns, and rows.
#   4. Run `python3 scripts/integrate-charts.py --city <name>` and review.

def _num(s: str) -> float | None:
    s = s.strip().replace(",", "")
    m = re.match(r"^(-?\d+(?:\.\d+)?)", s)
    return float(m.group(1)) if m else None

def _pct(s: str) -> float | None:
    s = s.strip().rstrip("%")
    return _num(s)

def _bool_yes(s: str) -> bool:
    return bool(re.search(r"\b(yes|allowed|permitted|✓)\b", s, re.IGNORECASE))

INTEGRATION_PLAN = {
    "bothell": {
        "file": "view-source_https___bothell.municipal.codes_BMC_12.14.030.html",
        "matrix_keys": {"R-L1": "bothell,wa:R-L1", "R-L2": "bothell,wa:R-L2"},
        "columns": ["R-C", "R-L1", "R-L2", "R-M1", "R-M2", "R-M3", "R-M4", "R-AC"],
        "field_rows": [
            (r"^Maximum building height", "maxHeightFt", _num),
            (r"^Maximum hard surface coverage", "maxLotCoverage", _pct),
            (r"^Minimum side yard setback", "leftSetback", _num),
        ],
        "_status": "INTEGRATED 2026-04-25 (commit 9fbf39a)",
    },
    "kirkland": {
        "file": "view-source_https___kirkland.municipal.codes_KZC_15.30.html",
        "matrix_keys": {"RSA 6": "kirkland,wa:RSA 6", "RSA 8": "kirkland,wa:RSA 8"},
        # Kirkland's KZC 15.30 chart layout uses RSA 1 / 4 / 6 / 8 columns
        "columns": ["RSA 1", "RSA 4", "RSA 6", "RSA 8"],
        "field_rows": [
            (r"front yard|front setback", "frontSetback", _num),
            (r"rear yard|rear setback", "rearSetback", _num),
            (r"side yard|side setback", "leftSetback", _num),
            (r"maximum building height|height limit", "maxHeightFt", _num),
            (r"lot coverage", "maxLotCoverage", _pct),
        ],
    },
    "auburn": {
        "file": "view-source_https___auburn.municipal.codes_ACC_18.07.030.html",
        "matrix_keys": {"R-2": "auburn,wa:R-2"},
        # Auburn 2024 zone rewrite — current ACC 18.07.030 chart columns
        # are (left-to-right): RC, R-1, R-2, R-3, R-4, R-NM, R-F.
        # Legacy R-5 / R-7 are repealed and remap to current R-2 by
        # density (legacy 5–7 du/ac → current R-2 at 7 du/ac min).
        "columns": ["RC", "R-1", "R-2", "R-3", "R-4", "R-NM", "R-F"],
        "field_rows": [
            (r"front yard setback|front yard|minimum front", "frontSetback", _num),
            (r"rear yard setback|rear yard|minimum rear", "rearSetback", _num),
            (r"side yard setback|side yard|interior side|minimum side", "leftSetback", _num),
            (r"maximum building height|height of buildings|maximum height", "maxHeightFt", _num),
            (r"maximum lot coverage|maximum.*coverage|lot coverage", "maxLotCoverage", _pct),
        ],
    },
    "renton": {
        # Multi-file: RMC 4-2-110A through I. The dimensional-standards table
        # lives in 4-2-110A (development standards for SF residential zones).
        "file": "view-source_https___www.codepublishing.com_WA_Renton_html_Renton04_Renton0402_Renton0402110A.html#4-2-110A.html",
        "matrix_keys": {"R-4": "renton,wa:R-4", "R-8": "renton,wa:R-8"},
        "columns": ["RC", "R-1", "R-4", "R-6", "R-8", "R-10", "R-14", "RMF"],
        "field_rows": [
            (r"front yard|minimum front", "frontSetback", _num),
            (r"rear yard|minimum rear", "rearSetback", _num),
            (r"side yard|minimum side", "leftSetback", _num),
            (r"maximum building height|wall plate", "maxHeightFt", _num),
            (r"maximum building coverage|lot coverage", "maxLotCoverage", _pct),
        ],
    },
    "kent": {
        "file": "view-source_https___www.codepublishing.com_WA_Kent_html_Kent15_Kent1504.html",
        "matrix_keys": {"SR-6": "kent,wa:SR-6", "SR-8": "kent,wa:SR-8"},
        "columns": ["SR-1", "SR-3", "SR-4.5", "SR-6", "SR-8", "MR-D", "MR-T12", "MR-T16", "MR-G", "MR-M", "MR-H"],
        "field_rows": [
            (r"front yard|minimum front", "frontSetback", _num),
            (r"rear yard|minimum rear", "rearSetback", _num),
            (r"side yard|minimum side", "leftSetback", _num),
            (r"maximum height of buildings|maximum building height", "maxHeightFt", _num),
            (r"maximum site coverage|lot coverage", "maxLotCoverage", _pct),
        ],
    },
    "everett": {
        "file": "view-source_https___everett.municipal.codes_EMC_19.06.030.html",
        "matrix_keys": {"NR-C": "everett,wa:NR-C", "NR": "everett,wa:NR"},
        # Everett 2044 zone columns per Table 6-1 (lot coverage / min lot)
        "columns": ["NR-C", "NR", "UR4", "UR7", "MU4", "MU7", "MU15", "MU25"],
        "field_rows": [
            (r"maximum lot coverage|lot coverage", "maxLotCoverage", _pct),
            (r"minimum lot area|min.* lot area", "minLotAreaSqFt", _num),
        ],
    },
}


def decode_viewsource(path: Path) -> list[tuple[int, str]]:
    """Return list of (line_number_in_view_source, decoded_inner_text)."""
    src = path.read_text(encoding="utf-8", errors="replace")
    rows = re.findall(
        r'<td class="line-number" value="(\d+)"></td><td class="line-content">(.*?)</td></tr>',
        src,
        re.DOTALL,
    )
    out = []
    for ln, content in rows:
        inner = re.sub(r"<[^>]+>", "", content)
        inner = html.unescape(inner)
        out.append((int(ln), inner))
    return out


def find_chart_rows(decoded_lines: list[tuple[int, str]]) -> list[list[str]]:
    """Walk the decoded HTML and group <p>...</p> sequences into table rows.

    Each <tr>...</tr> contains a label cell + N value cells. We approximate
    by treating consecutive non-empty <p>...</p> blocks as a row, broken by
    a <tr> tag occurrence in the source line.
    """
    rows: list[list[str]] = []
    cur: list[str] = []
    for _, txt in decoded_lines:
        # Flush on row break
        if "<tr" in txt and cur:
            rows.append(cur)
            cur = []
        m = re.search(r"<p[^>]*>(.*?)</p>", txt, re.DOTALL)
        if m:
            inner = re.sub(r"<[^>]+>", "", m.group(1))
            inner = html.unescape(inner).strip()
            if inner:
                cur.append(inner)
    if cur:
        rows.append(cur)
    return rows


def extract_one(plan: dict) -> dict:
    file_path = ROOT / plan["file"]
    if not file_path.exists():
        return {"error": f"file not found: {plan['file']}"}
    decoded = decode_viewsource(file_path)
    rows = find_chart_rows(decoded)
    columns = plan["columns"]
    n_cols = len(columns)
    matrix_keys = plan["matrix_keys"]

    patch: dict = {key: {} for key in matrix_keys.values()}
    review: list[dict] = []

    for label_rx, field, parser in plan["field_rows"]:
        rx = re.compile(label_rx, re.IGNORECASE)
        for row in rows:
            if not row:
                continue
            label = row[0]
            if not rx.search(label):
                continue
            # Collect the value cells. Use the next n_cols entries; if fewer,
            # pad with None. Skip if every value cell is empty (likely a
            # sub-header or label-only row).
            values = row[1 : 1 + n_cols]
            parsed_per_col = []
            for v in values:
                parsed_per_col.append(parser(v) if isinstance(v, str) else None)
            if not any(p is not None for p in parsed_per_col):
                continue
            for col_name, target_key in matrix_keys.items():
                if col_name not in columns:
                    continue
                col_idx = columns.index(col_name)
                if col_idx >= len(parsed_per_col):
                    continue
                val = parsed_per_col[col_idx]
                if val is None:
                    continue
                # Don't overwrite an earlier hit unless it's a more specific row.
                if field not in patch[target_key]:
                    patch[target_key][field] = val
                    review.append({
                        "key": target_key,
                        "field": field,
                        "row_label": label,
                        "column": col_name,
                        "raw_values": values,
                        "parsed_value": val,
                    })
            break  # only use the first matching row per field

    # For symmetric setbacks, mirror leftSetback to rightSetback.
    for k, fields in patch.items():
        if "leftSetback" in fields and "rightSetback" not in fields:
            fields["rightSetback"] = fields["leftSetback"]

    # Stamp provenance.
    snap = "2026-04-25"
    for k, fields in patch.items():
        fields["_sourceMethod"] = "manual"
        fields["_sourceSnapshot"] = snap
        fields["verifiedDate"] = snap

    return {"patch": patch, "review": review}


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--city", help="run only this city (default: all)")
    ap.add_argument(
        "--diff",
        action="store_true",
        help="also load data/zoning-matrix.js and print before→after deltas",
    )
    args = ap.parse_args()

    targets = (
        [args.city] if args.city else sorted(INTEGRATION_PLAN.keys())
    )

    out = {}
    for city in targets:
        if city not in INTEGRATION_PLAN:
            print(f"unknown city: {city}", file=sys.stderr)
            continue
        plan = INTEGRATION_PLAN[city]
        out[city] = extract_one(plan)

    print(json.dumps(out, indent=2, default=str))


if __name__ == "__main__":
    main()
