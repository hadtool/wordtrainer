#!/usr/bin/env python3
"""build: tools/source/<level>.csv (word,translation,topic) -> public/data/<level>.json + index.json
check: проверка всех наборов. id существующих слов сохраняются (прогресс привязан к ним)."""
import csv, json, random, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
SRC, OUT = ROOT / "tools/source", ROOT / "public/data"

def build(level, rows):
    old = {}
    f = OUT / f"{level}.json"
    if f.exists(): old = {w["word"]: w["id"] for w in json.loads(f.read_text())}
    nxt = max([int(i.split("_")[1]) for i in old.values()] + [0]) + 1
    all_tr = sorted({r["translation"] for r in rows})
    result = []
    for r in rows:
        wid = old.get(r["word"])
        if not wid: wid, nxt = f"{level}_{nxt:04d}", nxt + 1
        rng = random.Random(wid)
        same = sorted({x["translation"] for x in rows if x["topic"] == r["topic"]} - {r["translation"]})
        rest = sorted(set(all_tr) - {r["translation"]} - set(same))
        rng.shuffle(same); rng.shuffle(rest)
        wrong = (same + rest)[:3]
        if len(wrong) < 3: sys.exit(f"{level}: слишком мало слов для вариантов ({r['word']})")
        opts = wrong + [r["translation"]]; rng.shuffle(opts)
        result.append({"id": wid, "word": r["word"], "options": opts, "correct": opts.index(r["translation"])})
    return result

def check(path):
    errs, ids = [], set()
    for w in json.loads(path.read_text()):
        i = w.get("id")
        if i in ids: errs.append(f"дубликат id {i}")
        ids.add(i)
        o = w.get("options", [])
        if len(o) != 4 or len(set(o)) != 4: errs.append(f"{i}: нужно ровно 4 разных варианта")
        if w.get("correct") not in (0, 1, 2, 3): errs.append(f"{i}: correct вне 0..3")
    return errs

def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else "build"
    OUT.mkdir(parents=True, exist_ok=True)
    if cmd == "build":
        idx = []
        for c in sorted(SRC.glob("*.csv")):
            level = c.stem
            rows = [r for r in csv.DictReader(c.open(encoding="utf-8")) if r["word"].strip()]
            (OUT / f"{level}.json").write_text(json.dumps(build(level, rows), ensure_ascii=False, indent=1), encoding="utf-8")
            idx.append({"id": level, "title": f"{level.upper()} · {len(rows)}", "level": level.upper(), "file": f"{level}.json"})
        (OUT / "index.json").write_text(json.dumps(idx, ensure_ascii=False, indent=1), encoding="utf-8")
    bad = [e for f in OUT.glob("*.json") if f.name != "index.json" for e in [f"{f.name}: {x}" for x in check(f)]]
    print("\n".join(bad) or "OK"); sys.exit(1 if bad else 0)
main()
