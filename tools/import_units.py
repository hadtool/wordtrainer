#!/usr/bin/env python3
"""python3 tools/import_units.py tools/source/words.md [--out public/data]
Разбирает документ со словами (## Unit N: ..., ### N. Текст, строки '1. word — [A.] pos, определение'),
делает по файлу на unit: правильный ответ — определение, 3 неверных берутся из этого же unit
(та же часть речи). Перевод слова берётся из tools/source/translations.txt (слово=перевод;...)."""
import json, random, re, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
args = [a for a in sys.argv[1:] if not a.startswith("--")]
OUT = Path(sys.argv[sys.argv.index("--out") + 1]) if "--out" in sys.argv else ROOT / "public/data"
if "--out" in sys.argv: args.remove(sys.argv[sys.argv.index("--out") + 1])
src = Path(args[0] if args else ROOT / "tools/source/words.md")
TR = {}
tf = ROOT / "tools/source/translations.txt"
if tf.exists():
    for part in re.split(r"[;\n]", tf.read_text(encoding="utf-8")):
        if "=" in part:
            k, v = part.split("=", 1); TR[k.strip()] = v.strip()
POS = r"(?:n|v|adj|adv)\."
units, cur, group = [], None, ""
for line in src.read_text(encoding="utf-8").splitlines():
    line = line.strip()
    m = re.match(r"^##\s+Unit\s+(\d+):\s*(.+)$", line)
    if m: cur = {"n": int(m[1]), "title": m[2].strip(), "words": []}; units.append(cur); continue
    m = re.match(r"^###\s+\d+\.\s*(.+)$", line)
    if m: group = m[1].strip(); continue
    m = re.match(r"^\d+\.\s+(.+?)\s+—\s+(.*)$", line)
    if not (m and cur): continue
    rest = re.sub(r"^[A-T]\.\s+", "", m[2])
    p = re.match(rf"^({POS}(?:\s*/\s*{POS})?)\s*,\s*(.*)$", rest)
    if not p: print("Не разобрано:", line); continue
    cur["words"].append({"word": m[1].strip(), "pos": p[1], "def": p[2].strip(), "group": group})
OUT.mkdir(parents=True, exist_ok=True)
index, missing = [], []
for u in units:
    name = f"unit{u['n']:02d}"; f = OUT / f"{name}.json"
    old = {w["word"]: w["id"] for w in json.loads(f.read_text())} if f.exists() else {}
    nxt = max([int(i.split("_")[1]) for i in old.values()] + [0]) + 1
    res = []
    for w in u["words"]:
        wid = old.get(w["word"])
        if not wid: wid, nxt = f"{name}_{nxt:04d}", nxt + 1
        rng = random.Random(wid); first = w["pos"].split("/")[0].strip()
        ok = lambda x: x["def"] != w["def"] and w["word"].lower() not in x["def"].lower()
        same = [x["def"] for x in u["words"] if ok(x) and x["pos"].split("/")[0].strip() == first]
        other = [x["def"] for x in u["words"] if ok(x) and x["def"] not in same]
        rng.shuffle(same); rng.shuffle(other)
        wrong = list(dict.fromkeys(same + other))[:3]
        opts = wrong + [w["def"]]; rng.shuffle(opts)
        tr = TR.get(w["word"], "")
        if not tr: missing.append(w["word"])
        res.append({"id": wid, "word": w["word"], "pos": w["pos"], "tr": tr, "options": opts, "correct": opts.index(w["def"]), "group": w["group"]})
    f.write_text(json.dumps(res, ensure_ascii=False, indent=1), encoding="utf-8")
    index.append({"id": name, "title": f"Unit {u['n']} · {u['title']}", "level": f"U{u['n']}", "file": f"{name}.json"})
    print(name, len(res), "слов")
ip = OUT / "index.json"
keep = [e for e in (json.loads(ip.read_text()) if ip.exists() else []) if not e["id"].startswith("unit")]
ip.write_text(json.dumps(sorted(keep + index, key=lambda e: (e["id"].startswith("unit"), e["id"])), ensure_ascii=False, indent=1), encoding="utf-8")
if missing: print("Нет перевода:", ", ".join(missing))
