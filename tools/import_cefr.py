#!/usr/bin/env python3
"""python3 tools/import_cefr.py a1   — читает tools/source/a1.txt (строки 'pos: слово=перевод;…')
и делает public/data/a1.json: 3 неверных варианта берутся из переводов слов той же части речи."""
import json, random, re, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public/data"
level = sys.argv[1] if len(sys.argv) > 1 else "a1"
items = []
for line in (ROOT / f"tools/source/{level}.txt").read_text(encoding="utf-8").splitlines():
    m = re.match(r"^(\w+):\s*(.*)$", line.strip())
    if not m: continue
    for part in m[2].split(";"):
        if "=" in part:
            w, t = part.split("=", 1); items.append((w.strip(), m[1], t.strip()))
f = OUT / f"{level}.json"
old = {(w["word"], w["pos"]): w["id"] for w in json.loads(f.read_text())} if f.exists() else {}
nxt = max([int(i.split("_")[1]) for i in old.values()] + [0]) + 1
res = []
for w, pos, tr in items:
    wid = old.get((w, pos))
    if not wid: wid, nxt = f"{level}_{nxt:04d}", nxt + 1
    rng = random.Random(wid)
    pool = sorted({t for _, p, t in items if p == pos and t != tr})
    if len(pool) < 6: pool = sorted({t for _, _, t in items if t != tr})
    opts = rng.sample(pool, 3) + [tr]; rng.shuffle(opts)
    res.append({"id": wid, "word": w, "pos": pos, "options": opts, "correct": opts.index(tr)})
OUT.mkdir(parents=True, exist_ok=True)
f.write_text(json.dumps(res, ensure_ascii=False, indent=1), encoding="utf-8")
ip = OUT / "index.json"
idx = [e for e in (json.loads(ip.read_text()) if ip.exists() else []) if e["id"] != level]
idx.append({"id": level, "title": f"{level.upper()} · CEFR", "level": level.upper(), "file": f"{level}.json"})
idx.sort(key=lambda e: (e["id"].startswith("unit"), e["id"]))
ip.write_text(json.dumps(idx, ensure_ascii=False, indent=1), encoding="utf-8")
print(level, len(res), "слов")
