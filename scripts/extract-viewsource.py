#!/usr/bin/env python3
"""Extract the underlying page HTML from a Chrome 'view-source:' save.

Usage:  python3 scripts/extract-viewsource.py <viewsource.html> [grep-pattern]

Without a pattern: prints the decoded inner HTML to stdout.
With a pattern: prints the line ranges in the inner HTML that match (with
                ~3 lines of context on each side, plus the original line number
                from the view-source file).
"""
import html
import re
import sys

if len(sys.argv) < 2:
    print(__doc__, file=sys.stderr)
    sys.exit(2)

src = open(sys.argv[1], encoding="utf-8", errors="replace").read()
rows = re.findall(
    r'<td class="line-number" value="(\d+)"></td><td class="line-content">(.*?)</td></tr>',
    src,
    re.DOTALL,
)

# Decoded inner text per line
decoded = []
for ln, content in rows:
    # Strip Chrome's syntax-highlight spans (preserve the inner text only)
    inner = re.sub(r"<[^>]+>", "", content)
    inner = html.unescape(inner)
    if inner.strip() == "" and "<br>" in content:
        inner = ""
    decoded.append((int(ln), inner))

if len(sys.argv) == 2:
    for ln, inner in decoded:
        print(inner)
    sys.exit(0)

pattern = sys.argv[2]
rx = re.compile(pattern, re.IGNORECASE)
hits = [i for i, (_, txt) in enumerate(decoded) if rx.search(txt)]
ctx = 3
seen = set()
for h in hits:
    lo, hi = max(0, h - ctx), min(len(decoded), h + ctx + 1)
    for i in range(lo, hi):
        if i in seen:
            continue
        seen.add(i)
        ln, txt = decoded[i]
        marker = ">>>" if i == h else "   "
        if txt.strip():
            print(f"{marker} L{ln:5d}: {txt[:240]}")
    print("---")
