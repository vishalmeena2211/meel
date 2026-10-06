#!/usr/bin/env python3
"""Hospitals and police stations near each route's road, for the route's emergency card.

Read from the open map (Overpass, OpenStreetMap), within 2 km of the road line, each with its kilometre from
the start. Nobody has checked them: the card says so. Cached under ../computed/help/ so a re-run only asks for
what is missing; --force asks again.

Writes ../site/route-help.json.

Usage:  python3 help_places.py [slug ...] [--force]

The Overpass address can be changed with OVERPASS_URL, as the main server is often busy.
"""
import glob
import json
import math
import os
import re
import sys
import time
import urllib.parse

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from build_computed import get, hav, load, project, rdp, save  # noqa: E402

ROUTES = os.path.join(HERE, "..", "routes")
CACHE = os.path.join(HERE, "..", "computed", "help")
OUT = os.path.join(HERE, "..", "site", "route-help.json")
OVERPASS = os.environ.get("OVERPASS_URL", "https://overpass-api.de/api/interpreter")
TODAY = time.strftime("%Y-%m-%d")
RADIUS = 2000
NOT_HELP = re.compile(r"optic|optical|dental|dentist|eye care|veterinar|animal|jail|prison|diagnostic centre$", re.I)


def fetch(route):
    line = route["line"]
    total = route["header"]["distance_km"] or 0
    cum = [0.0]
    for a, b in zip(line, line[1:]):
        cum.append(cum[-1] + hav((a[1], a[0]), (b[1], b[0])))
    scale = total / cum[-1] if cum[-1] else 1.0
    q_line = rdp(line, 0.004 if total < 800 else 0.02)
    if len(q_line) > 320:
        q_line = q_line[:: math.ceil(len(q_line) / 320)] + [q_line[-1]]
    pts = ",".join(f"{y:.4f},{x:.4f}" for x, y in q_line)
    q = (f'[out:json][timeout:150];('
         f'nwr["amenity"="hospital"](around:{RADIUS},{pts});'
         f'nwr["healthcare"="hospital"](around:{RADIUS},{pts});'
         f'nwr["amenity"="police"](around:{RADIUS},{pts});'
         f');out center tags;')
    d = get(OVERPASS, data=urllib.parse.urlencode({"data": q}).encode(), timeout=180, tries=4, wait=8)
    # Overpass answers a query it gave up on with no places and a remark. That is not "no hospitals".
    if "remark" in d and not d.get("elements"):
        raise RuntimeError(f"Overpass gave up: {d['remark'][:120]}")
    out = {"hospitals": [], "police": []}
    seen = set()
    for e in d.get("elements", []):
        la = e.get("lat") or (e.get("center") or {}).get("lat")
        lo = e.get("lon") or (e.get("center") or {}).get("lon")
        if la is None:
            continue
        km, off = project(line, cum, (la, lo))
        if off > RADIUS * 1.3:
            continue
        t = e.get("tags", {})
        kind = "police" if t.get("amenity") == "police" else "hospitals"
        name = (t.get("name:en") or t.get("name") or "").strip()
        # Places that will not help a hurt rider, though the map files them here.
        if NOT_HELP.search(name) or t.get("healthcare") in ("optometrist", "dentist", "laboratory"):
            continue
        key = (kind, name.lower(), round(la, 3), round(lo, 3))
        if key in seen:
            continue
        seen.add(key)
        out[kind].append({"name": name or None, "km_from_start": round(km * scale, 1), "off_road_m": round(off),
                          "lat": round(la, 5), "lon": round(lo, 5),
                          "osm_url": f'https://www.openstreetmap.org/{e["type"]}/{e["id"]}'})
    for kind in out:
        out[kind].sort(key=lambda p: p["km_from_start"])
    return out


def thin(places, per=2, every_km=10):
    """At most two places in each 10 km of road, named ones first, then nearest the road.
    A city can have hundreds of hospitals on the map; a rider needs to know there are some, and where."""
    bins = {}
    for p in places:
        bins.setdefault(int(p["km_from_start"] // every_km), []).append(p)
    out = []
    for _, group in sorted(bins.items()):
        group.sort(key=lambda p: (p["name"] is None, p["off_road_m"]))
        out += group[:per]
    return sorted(out, key=lambda p: p["km_from_start"])


def longest_gap(places, total):
    """The longest stretch of the road with none of these places, from start to end."""
    kms = [0.0] + [p["km_from_start"] for p in places] + [total]
    best = None
    for a, b in zip(kms, kms[1:]):
        if best is None or b - a > best["gap_km"]:
            best = {"from_km": round(a, 1), "to_km": round(b, 1), "gap_km": round(b - a, 1)}
    return best


def main(args):
    force = "--force" in args
    slugs = [a for a in args if not a.startswith("--")]
    result = load(OUT, {}).get("routes", {})
    for path in sorted(glob.glob(os.path.join(ROUTES, "*.json"))):
        if path.endswith("index.json"):
            continue
        route = load(path, None)
        if slugs and route["slug"] not in slugs:
            continue
        if not route["line"]:
            continue
        cpath = os.path.join(CACHE, route["slug"] + ".json")
        found = None if force else load(cpath, None)
        if found is None:
            try:
                found = fetch(route)
            except Exception as e:  # noqa: BLE001
                print(f"help {route['slug']}: FAILED {e}")
                # Nothing is better than an old or empty answer: the card then says it has not looked.
                result.pop(route["slug"], None)
                time.sleep(10)
                continue
            save(cpath, {"fetched": TODAY, **found})
            time.sleep(5)
        else:
            found = {"hospitals": found["hospitals"], "police": found["police"]}
        total = route["header"]["distance_km"] or 0
        result[route["slug"]] = {
            "hospitals": thin(found["hospitals"]),
            "police": thin(found["police"]),
            "hospital_gap": longest_gap(found["hospitals"], total) if total else None,
        }
        print(f"help {route['slug']}: {len(found['hospitals'])} hospitals, {len(found['police'])} police")
    save(OUT, {
        "note": ("Hospitals and police stations drawn on the open map within 2 km of the road line, at most two in "
                 "each 10 km of road. Nobody has checked them. A place missing from the map is missing here."),
        "fetched": TODAY,
        "source": {"service": "Overpass API", "data": "OpenStreetMap contributors", "licence": "Open Database Licence",
                   "url": "https://www.openstreetmap.org/copyright"},
        "routes": result,
    })


if __name__ == "__main__":
    main(sys.argv[1:])
