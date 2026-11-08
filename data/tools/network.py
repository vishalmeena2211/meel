#!/usr/bin/env python3
"""Which mobile operators have towers at each halt, from OpenCelliD.

OpenCelliD (opencellid.org) is an open database of cell towers, recorded by people's phones. Each tower carries the
country and network codes of its operator, and its radio (2G, 3G, 4G, 5G). A tower near a halt is a strong hint
that the operator works there; it is not a promise of signal, so the site says "towers on the map", and riders'
own reports sit beside it.

For each place to stop on a route, towers within about HALF_SIDE_M of it (OpenCelliD answers for squares of up to
2 km a side). Writes ../computed/network/<slug>.json, which assemble.py reads.

Usage:  python3 network.py [slug ...] [--force]

Needs a free OpenCelliD token: OPENCELLID_TOKEN, or the file ~/.config/meel/opencellid-token. The free plan allows
5,000 requests a day; every route together needs about 600.
"""
import json
import math
import os
import sys
import time
import urllib.parse
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "..")
OUT = os.path.join(DATA, "computed", "network")
sys.path.insert(0, HERE)
from build_computed import UA, load, save, selected  # noqa: E402

TODAY = time.strftime("%Y-%m-%d")
HALF_SIDE_M = 1000
RADIO_WORDS = {"GSM": "2G", "CDMA": "2G", "UMTS": "3G", "LTE": "4G", "NR": "5G", "NBIOT": "4G"}

# Mobile network codes by operator. India's 404 and 405 are split by telecom circle, so each operator has many.
_IN = {
    "Jio": {("405", f"{n:03d}") for n in [*range(840, 841), *range(854, 875)]},
    "Airtel": {("404", f"{n:02d}") for n in (2, 3, 10, 16, 31, 40, 45, 49, 70, 90, 92, 93, 94, 95, 96, 97, 98)}
    | {("405", f"{n:02d}") for n in (51, 52, 53, 54, 55, 56)},
    "Vi": {("404", f"{n:02d}") for n in (1, 4, 5, 7, 11, 12, 13, 14, 15, 19, 20, 22, 24, 27, 30, 43, 44, 46, 56, 60,
                                         78, 82, 84, 86, 87, 88, 89)}
    | {("405", f"{n:03d}") for n in (66, 67, 750, 751, 752, 753, 754, 755, 756, 799, 845, 846, 848, 849, 850, 851,
                                     852, 853)},
    "BSNL": {("404", f"{n:02d}") for n in (34, 38, 51, 53, 54, 55, 57, 58, 59, 62, 64, 66, 71, 72, 73, 74, 75, 76,
                                           77, 79, 80, 81)},
    "MTNL": {("404", "68"), ("404", "69")},
}
OPERATORS = {code: name for name, codes in _IN.items() for code in codes} | {
    ("429", "01"): "Nepal Telecom", ("429", "02"): "Ncell",
    ("402", "11"): "B-Mobile", ("402", "77"): "TashiCell",
}


def token():
    t = os.environ.get("OPENCELLID_TOKEN")
    if t:
        return t.strip()
    path = os.path.expanduser("~/.config/meel/opencellid-token")
    if os.path.exists(path):
        return open(path, encoding="utf-8").read().strip()
    sys.exit("No OpenCelliD token: set OPENCELLID_TOKEN or put it in ~/.config/meel/opencellid-token")


def operator(mcc, mnc):
    mcc, mnc = str(mcc), str(mnc)
    for width in (3, 2):
        name = OPERATORS.get((mcc, mnc.zfill(width)))
        if name:
            return name
    return None


def towers_at(lat, lon, key):
    dlat = HALF_SIDE_M / 111_320
    dlon = HALF_SIDE_M / (111_320 * math.cos(math.radians(lat)))
    q = urllib.parse.urlencode({"key": key, "BBOX": f"{lat - dlat:.6f},{lon - dlon:.6f},{lat + dlat:.6f},{lon + dlon:.6f}",
                                "format": "json", "limit": 50})
    req = urllib.request.Request(f"https://opencellid.org/cell/getInArea?{q}", headers={"User-Agent": UA})
    for i in range(3):
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.load(r).get("cells", [])
        except Exception:  # noqa: BLE001
            time.sleep(3 * (i + 1))
    return None


def network(args):
    key = token()
    for r in selected(args):
        path = os.path.join(OUT, r["slug"] + ".json")
        route = load(os.path.join(DATA, "routes", r["slug"] + ".json"), None)
        if not route or (os.path.exists(path) and "--force" not in sys.argv):
            continue
        halts, seen = [], set()
        for w in route["waypoints"]:
            if w.get("kind") == "place" and w["name"] not in seen:
                seen.add(w["name"])
                cells = towers_at(w["lat"], w["lon"], key)
                time.sleep(0.4)
                if cells is None:
                    print(f"network {r['slug']}: {w['name']} not read")
                    continue
                ops = {}
                for c in cells:
                    name = operator(c.get("mcc"), c.get("mnc", c.get("net")))
                    if name:
                        ops.setdefault(name, set()).add(RADIO_WORDS.get(str(c.get("radio", "")).upper(), "2G"))
                halts.append({"halt": w["name"], "km_from_start": w["km_from_start"], "towers": len(cells),
                              "operators": {k: sorted(v) for k, v in sorted(ops.items())}})
        save(path, {"slug": r["slug"], "fetched": TODAY, "half_side_m": HALF_SIDE_M, "halts": halts,
                    "source": {"data": "OpenCelliD", "url": "https://opencellid.org/",
                               "licence": "Creative Commons Attribution-ShareAlike 4.0"}})
        print(f"network {r['slug']}: {sum(1 for h in halts if h['operators'])} of {len(halts)} halts with towers")


if __name__ == "__main__":
    network([a for a in sys.argv[1:] if not a.startswith("--")])
