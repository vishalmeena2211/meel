#!/usr/bin/env python3
"""Which districts each route passes through, and between which kilometres.

The government's alert feed (NDMA SACHET) files every warning under a district, so the site matches
alerts to a route by these names. Positions along each road line are looked up on the open map's
geocoder (Nominatim), one a second, and cached under ../computed/districts/ so a re-run asks nothing twice.

Each district also gets the government's own code for it (the Local Government Directory's district code), read
from Wikidata, where the alert feed gives codes. A district Wikidata has no code for keeps its name only.

Writes ../site/route-districts.json. Routes outside India are left out: SACHET covers India only.

Usage:  python3 districts.py [slug ...]
"""
import glob
import json
import math
import os
import sys
import time
import unicodedata
import urllib.parse
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
ROUTES = os.path.join(HERE, "..", "routes")
CACHE = os.path.join(HERE, "..", "computed", "districts", "cache.json")
CODES = os.path.join(HERE, "..", "computed", "districts", "lgd.json")
OUT = os.path.join(HERE, "..", "site", "route-districts.json")

UA = "meel-rideplanner/0.1 (hobby route notebook; https://rideplanner.in)"
TODAY = time.strftime("%Y-%m-%d")


def load(path, default):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return default


def save(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
    os.replace(tmp, path)


def hav(a, b):
    """Distance in km between two (lat, lon) points."""
    la1, lo1, la2, lo2 = map(math.radians, (a[0], a[1], b[0], b[1]))
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 2 * 6371.0088 * math.asin(math.sqrt(h))


def where(lat, lon, cache):
    """The district and state at a position, as the open map names them."""
    key = f"{lat:.3f},{lon:.3f}"
    if key in cache:
        return cache[key]
    q = urllib.parse.urlencode({"format": "jsonv2", "zoom": 8, "lat": f"{lat:.5f}", "lon": f"{lon:.5f}",
                                "accept-language": "en"})
    found = None
    for i in range(4):
        try:
            req = urllib.request.Request(f"https://nominatim.openstreetmap.org/reverse?{q}", headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=60) as r:
                a = json.loads(r.read().decode("utf-8")).get("address", {})
            found = {"district": a.get("state_district") or a.get("county"), "state": a.get("state"),
                     "country": a.get("country_code")}
            break
        except Exception as e:  # noqa: BLE001
            print(f"  retry {key}: {e}")
            time.sleep(5 * (i + 1))
    time.sleep(1.1)
    if found is not None:
        cache[key] = found
    return found


# Districts that go by two names. The same list is in web/src/server/live.ts.
OTHER_NAMES = {
    "coorg": "kodagu", "shimoga": "shivamogga", "mysore": "mysuru", "tumkur": "tumakuru",
    "chikmagalur": "chikkamagaluru", "belgaum": "belagavi", "bellary": "ballari", "gulbarga": "kalaburagi",
    "bijapur": "vijayapura", "balasore": "baleshwar", "keonjhar": "kendujhar", "angul": "anugul", "jajpur": "jajapur",
    "deogarh": "debagarh", "nabarangapur": "nabarangpur", "sonepur": "subarnapur", "boudh": "baudh",
    "trichy": "tiruchirappalli", "tuticorin": "thoothukudi", "kanyakumari": "kanniyakumari", "villupuram": "viluppuram",
    "tiruvarur": "thiruvarur", "trivandrum": "thiruvananthapuram", "morigaon": "marigaon", "sibsagar": "sivasagar",
    "kamrupmetro": "kamrupmetropolitan", "eastsikkim": "gangtok", "northsikkim": "mangan", "southsikkim": "namchi",
    "westsikkim": "gyalshing", "gurgaon": "gurugram", "allahabad": "prayagraj",
    "anantapuram": "anantapur",
    "bagalkote": "bagalkot",
    "dhaulpur": "dholpur",
    "kachchh": "kutch",
    "thiruvallur": "tiruvallur",
    "uttarbastarkanker": "kanker",
    "santravidasnagar": "bhadohi",
}
SPELLINGS = {"lahul": "lahaul", "nanital": "nainital", "bangalore": "bengaluru"}


def key(name):
    """"Lahaul & Spiti district" and "Lahul and Spiti" both become "lahaulspiti"."""
    plain = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    words = "".join(c if c.isalpha() else " " for c in plain.lower().replace("&", " and ")).split()
    k = "".join(SPELLINGS.get(w, w) for w in words if w not in ("district", "dist", "and", "the", "of"))
    return OTHER_NAMES.get(k, k)


def codes():
    """Every district's code in the Local Government Directory, with its state, from Wikidata (public domain)."""
    found = load(CODES, None)
    if found is None:
        q = ("SELECT ?dLabel ?code ?stateLabel WHERE { ?d wdt:P12746 ?code . OPTIONAL { ?d wdt:P131+ ?state . "
             "?state wdt:P12747 ?sc . } SERVICE wikibase:label { bd:serviceParam wikibase:language \"en\". } }")
        req = urllib.request.Request("https://query.wikidata.org/sparql?" + urllib.parse.urlencode({"query": q}),
                                     headers={"User-Agent": UA, "Accept": "application/sparql-results+json"})
        with urllib.request.urlopen(req, timeout=170) as r:
            rows = json.loads(r.read().decode("utf-8"))["results"]["bindings"]
        found = sorted({(b["code"]["value"], b["dLabel"]["value"], b.get("stateLabel", {}).get("value", ""))
                        for b in rows})
        found = [{"code": c, "name": n, "state": s} for c, n, s in found]
        save(CODES, found)
    return found


def code_for(district, state, table):
    """The district's code, if exactly one district of that name is listed in that state."""
    k, s = key(district), key(state)
    hits = {d["code"] for d in table if key(d["state"]) == s and key(d["name"]) == k}
    return hits.pop() if len(hits) == 1 else None


def samples(route):
    """Points along the road line, every 20 km on a short route and every 40 km on a very long one,
    plus every named place. Each with its distance from the start."""
    line = route["line"]
    total = route["header"]["distance_km"] or 0
    cum = [0.0]
    for a, b in zip(line, line[1:]):
        cum.append(cum[-1] + hav((a[1], a[0]), (b[1], b[0])))
    scale = total / cum[-1] if cum[-1] else 1.0
    step = 20 if total < 1000 else 40
    out, next_at = [], 0.0
    for (lon, lat), c in zip(line, cum):
        if c * scale >= next_at:
            out.append((lat, lon, round(c * scale, 1)))
            next_at += step
    lon, lat = line[-1]
    out.append((lat, lon, round(total, 1)))
    out += [(w["lat"], w["lon"], w["km_from_start"]) for w in route["waypoints"]]
    return sorted(out, key=lambda p: p[2])


def main(args):
    cache = load(CACHE, {})
    table = codes()
    result = load(OUT, {}).get("routes", {})
    for path in sorted(glob.glob(os.path.join(ROUTES, "*.json"))):
        if path.endswith("index.json"):
            continue
        route = load(path, None)
        if args and route["slug"] not in args:
            continue
        if route["country"] != "in" or not route["line"]:
            continue
        seen = {}
        for lat, lon, km in samples(route):
            w = where(lat, lon, cache)
            if not w or w["country"] != "in" or not w["district"] or not w["state"]:
                continue
            k = (w["district"], w["state"])
            if k not in seen:
                seen[k] = {"district": w["district"], "state": w["state"], "km_from": km, "km_to": km}
            else:
                seen[k]["km_to"] = km
        result[route["slug"]] = sorted(seen.values(), key=lambda d: d["km_from"])
        save(CACHE, cache)
        for d in result[route["slug"]]:
            d["lgd"] = code_for(d["district"], d["state"], table)
        print(f"districts {route['slug']}: {len(seen)} — " + ", ".join(d["district"] for d in result[route["slug"]]))
    save(OUT, {
        "codes": {"source": "Wikidata, property P12746 (LGD District Code)", "licence": "CC0",
                  "url": "https://www.wikidata.org/wiki/Property:P12746"},
        "note": ("The districts each road line passes through, between which kilometres, as the open map names them. "
                 "Positions every 20 km (40 km on a very long route) and at every named place, so a district the "
                 "road crosses for only a few kilometres can be missed."),
        "fetched": TODAY,
        "source": {"service": "Nominatim", "data": "OpenStreetMap contributors", "licence": "Open Database Licence",
                   "url": "https://www.openstreetmap.org/copyright"},
        "routes": result,
    })


if __name__ == "__main__":
    main(sys.argv[1:])
