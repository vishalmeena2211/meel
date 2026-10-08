#!/usr/bin/env python3
"""How far each route's start is from the cities riders set out from, by road, and how far it is back from its end.

Routes begin at Manali, Shimla or Rishikesh; riders leave from Delhi or Chandigarh. For each city in CITIES and each
route, this asks the OSRM road router (on OpenStreetMap data, as the route lines are made) for the road from the
city's centre to the route's first place, and, when the route ends somewhere else, from its last place back to the
city. For a leg of 1,500 km or less it also names three towns the road passes, at a quarter, half and three quarters of
the way, from the open map's geocoder (Nominatim). Each service is asked about once a second, and every answer is
cached under ../computed/approaches/, so a re-run asks nothing twice.

It also notes which routes end where another starts (within 5 km): Nubra starts in Leh, where Manali to Leh ends.

Writes ../site/route-approaches.json. It never says where to stop, how many days a leg takes, or which way is better.

The two services can be asked side by side, each at its own pace, as two runs sharing nothing but the files:
    python3 approaches.py --roads     the router's answers, into legs.json; ends by writing roads.done
    python3 approaches.py --towns     the geocoder's names for those roads, into places.json, until roads.done
    python3 approaches.py --write     the site's file, from the two caches alone, asking nothing
With no flag it does all three in turn. Slugs after the flags limit it to those routes.
"""
import glob
import json
import math
import os
import re
import socket
import sys
import time
import unicodedata
import urllib.parse
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
ROUTES = os.path.join(HERE, "..", "routes")
LEGS = os.path.join(HERE, "..", "computed", "approaches", "legs.json")
PLACES = os.path.join(HERE, "..", "computed", "approaches", "places.json")
DONE = os.path.join(HERE, "..", "computed", "approaches", "roads.done")
# Outlines of the neighbours a shortest road can cut through, from the open map (Nominatim, simplified to ~1 km).
BORDERS = os.path.join(HERE, "..", "computed", "approaches", "borders.json")
OUT = os.path.join(HERE, "..", "site", "route-approaches.json")

UA = "meel-rideplanner/0.1 (hobby route notebook; https://rideplanner.in)"
# Every connection gives up after this long, so a laptop that slept mid-request does not leave a run hanging.
socket.setdefaulttimeout(90)
# IPv4 only: on 8 October 2026 this laptop's IPv6 route to the router hung, mid-connection, for half an hour at a
# time, while IPv4 answered in under a second.
_getaddrinfo = socket.getaddrinfo
socket.getaddrinfo = lambda host, port, family=0, *a, **k: _getaddrinfo(host, port, socket.AF_INET, *a, **k)
TODAY = time.strftime("%Y-%m-%d")

# Where riders set out from. The centre is the point the open map gives for the city.
# A city is added by adding a line here and running this again.
CITIES = [
    ("delhi", "Delhi", "North", 28.6315, 77.2167),
    ("chandigarh", "Chandigarh", "North", 30.7333, 76.7794),
    ("jaipur", "Jaipur", "North", 26.9124, 75.7873),
    ("lucknow", "Lucknow", "North", 26.8467, 80.9462),
    ("ahmedabad", "Ahmedabad", "West", 23.0225, 72.5714),
    ("mumbai", "Mumbai", "West", 19.0760, 72.8777),
    ("pune", "Pune", "West", 18.5204, 73.8567),
    ("bengaluru", "Bengaluru", "South", 12.9716, 77.5946),
    ("hyderabad", "Hyderabad", "South", 17.3850, 78.4867),
    ("chennai", "Chennai", "South", 13.0827, 80.2707),
    ("kolkata", "Kolkata", "East", 22.5726, 88.3639),
    ("guwahati", "Guwahati", "East", 26.1445, 91.7362),
]

NAMED_UP_TO_KM = 1500  # towns are named on legs up to this long
ROUND_TRIP_KM = 30  # a route ending this close to its start needs no way back of its own
MEETS_KM = 5  # a route ending this close to another's start leads into it

# Words the geocoder adds to an area's name that a rider does not say: "Ajjampura taluku", "Dirang ADC",
# "Jaipur Municipal Corporation", "Alipurduar - II", "Barnagar (Pt)".
TAIL = re.compile(
    r"(\s*\((pt|part)\)|\s*-\s*[IVX]+|\s+(tahsil|tehsil|district|taluka|taluku|taluk|sub-?district|subdivision|block|"
    r"mandal|upazila|union|circle|adc|municipal corporation|township|rural|sadar|cd block))+$",
    re.IGNORECASE,
)


def clean(name):
    """A place's name as a rider would say it: "Maldah (Old)" is Old Maldah, "Bindranavagarh(Gariyaband)" is
    Gariyaband, the town riders know, and "Khatīma" loses its accent."""
    if not name:
        return None
    name = TAIL.sub("", name).strip()
    old = re.fullmatch(r"(.+?)\s*\(old\)", name, re.IGNORECASE)
    if old:
        name = f"Old {old.group(1)}"
    town = re.fullmatch(r"[^()]+\(([^()]+)\)", name)
    if town:
        name = town.group(1).strip()
    name = "".join(c for c in unicodedata.normalize("NFKD", name) if not unicodedata.combining(c))
    return name or None


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


def ask(url):
    for i in range(5):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=90) as r:
                return json.loads(r.read().decode("utf-8"))
        except Exception as e:  # noqa: BLE001
            print(f"  retry ({e})")
            time.sleep(5 * (i + 1))
    return None


def leg_key(a, b):
    return f"{a[0]:.5f},{a[1]:.5f}>{b[0]:.5f},{b[1]:.5f}"


def route(points):
    """The router's road through (lat, lon) points: km, hours, and the line as (lat, lon) pairs."""
    coords = ";".join(f"{p[1]:.5f},{p[0]:.5f}" for p in points)
    # The simplified line keeps to the road within tens of metres: plenty for marks and the 3 km border test.
    got = ask(f"https://router.project-osrm.org/route/v1/driving/{coords}?overview=simplified&geometries=geojson")
    time.sleep(1.1)
    if not got or got.get("code") != "Ok" or not got.get("routes"):
        print(f"  no road {coords}: {got and got.get('code')}")
        return None
    rt = got["routes"][0]
    return rt["distance"] / 1000, rt["duration"] / 3600, [(p[1], p[0]) for p in rt["geometry"]["coordinates"]]


def marks_on(line):
    """Positions at a quarter, half and three quarters of the way along a line."""
    run = [0.0]
    for i in range(1, len(line)):
        run.append(run[-1] + hav(line[i - 1], line[i]))
    total = run[-1] or 1.0
    marks = []
    for frac in (0.25, 0.5, 0.75):
        i = min(range(len(run)), key=lambda j: abs(run[j] - total * frac))
        marks.append([round(line[i][0], 5), round(line[i][1], 5)])
    return marks


def leg(a, b, legs):
    """The road from a to b: km, a map app's hours, and positions at a quarter, half and three quarters of the way.
    A road that leaves India is sent by an Indian town instead (keep_in_india), and says which."""
    key = leg_key(a, b)
    if key in legs:
        return legs[key]
    got = route([a, b])
    if not got:
        return None
    km, hrs, line = got
    found = {"km": round(km), "hours": round(hrs, 2), "marks": marks_on(line), "abroad": []}
    crossed = abroad(line, a, b)
    if crossed:
        found = keep_in_india(a, b, line) or {**found, "abroad": crossed}
    legs[key] = found
    return found


# ── Keeping a road in India ──────────────────────────────────────────────
# The router takes the shortest road, whichever country it runs through. Kolkata to Shillong is shortest through
# Bangladesh; a rider needs a visa and a carnet for that. Such a road is sent instead by an Indian town on the way
# riders take, and the leg says so ("by way of Siliguri"). A road to a route that is itself abroad is left alone.

_outlines = None


def outlines():
    global _outlines
    if _outlines is None:
        raw = load(BORDERS, {})
        _outlines = []
        for cc, v in raw.items():
            g = v["geometry"]
            polys = g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
            rings = [[[(p[1], p[0]) for p in ring] for ring in poly] for poly in polys]
            pts = [p for poly in rings for p in poly[0]]
            box = (min(p[0] for p in pts), max(p[0] for p in pts), min(p[1] for p in pts), max(p[1] for p in pts))
            _outlines.append((cc, rings, box))
    return _outlines


def _in_ring(pt, ring):
    lat, lon = pt
    inside = False
    j = len(ring) - 1
    for i in range(len(ring)):
        (ya, xa), (yb, xb) = ring[i], ring[j]
        if (ya > lat) != (yb > lat) and lon < (xb - xa) * (lat - ya) / ((yb - ya) or 1e-12) + xa:
            inside = not inside
        j = i
    return inside


# The outlines are simplified to about 1 km, and roads such as Kumaon's along the Kali river run within a kilometre
# of the border: Budhi and Tawaghat, both in India, fall just inside the simplified Nepal. So a road counts as
# abroad only where it is at least this far inside a neighbour. The roads that matter run tens of km inside.
DEEP_KM = 3
CHECKED = "deep3"  # marks a road checked with the test above, so a rerun does not ask again


def _edge_km(pt, ring):
    """How far a point is from the nearest edge of a ring, in km, on a flat map around the point."""
    kx, ky = 111.32 * math.cos(math.radians(pt[0])), 110.57
    px, py = pt[1] * kx, pt[0] * ky
    best = float("inf")
    for i in range(len(ring) - 1):
        ax, ay = ring[i][1] * kx, ring[i][0] * ky
        bx, by = ring[i + 1][1] * kx, ring[i + 1][0] * ky
        dx, dy = bx - ax, by - ay
        f = max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / ((dx * dx + dy * dy) or 1e-12)))
        best = min(best, math.hypot(px - (ax + f * dx), py - (ay + f * dy)))
    return best


def country_at(pt, deep=0):
    """The neighbour a point lies in, or None for India (and anywhere else). With deep, only if that far inside."""
    for cc, rings, (la0, la1, lo0, lo1) in outlines():
        if la0 <= pt[0] <= la1 and lo0 <= pt[1] <= lo1:
            for poly in rings:
                if _in_ring(pt, poly[0]) and not any(_in_ring(pt, hole) for hole in poly[1:]):
                    if deep and min(_edge_km(pt, ring) for ring in poly) < deep:
                        return None
                    return cc
    return None


def abroad(line, a, b):
    """The neighbours a road runs through, leaving out any its own two ends are in. Checked every 2 km or so."""
    own = {country_at(a), country_at(b)}
    found, last = set(), None
    for p in line:
        if last is not None and hav(last, p) < 2:
            continue
        last = p
        cc = country_at(p, DEEP_KM)
        if cc and cc not in own:
            found.add(cc)
    return sorted(found)


# Indian towns that keep a road in India, and the side of the border each serves.
SILIGURI = ("Siliguri", 26.7271, 88.3953)  # the corridor between the mainland and the North-East
# India's own east-west road south of Nepal (NH 27), for a road the router would take along Nepal's.
SOUTH_OF_NEPAL = [("Purnia", 25.7771, 87.4753), ("Muzaffarpur", 26.1209, 85.3647), ("Gorakhpur", 26.7606, 83.3732),
                  ("Bahraich", 27.5743, 81.5940), ("Lakhimpur", 27.9479, 80.7782), ("Pilibhit", 28.6315, 79.8044)]
# Kumaon's own road along the Kali river, for a road the router would take across it into Nepal near Dharchula.
KUMAON = [("Pithoragarh", 29.5829, 80.2182), ("Champawat", 29.3364, 80.0910)]


def north_east(p):
    """East of the Siliguri corridor: the North-East, and North Bengal beyond Siliguri."""
    return p[1] >= 89.7 or (p[1] >= 88.5 and p[0] >= 26.3)


def entry(line, a, b):
    """The first point where a road enters a neighbour its ends are not in, with that neighbour, or None."""
    own = {country_at(a), country_at(b)}
    last = None
    for p in line:
        if last is not None and hav(last, p) < 2:
            continue
        last = p
        cc = country_at(p, DEEP_KM)
        if cc and cc not in own:
            return cc, p
    return None


def hold_for(cc, at, a, b, used):
    """The Indian town, not yet used, that keeps a road out of a neighbour it enters at `at`, or None if none fits."""
    if cc == "bd":
        return SILIGURI if north_east(a) != north_east(b) and SILIGURI not in used else None
    if cc == "np":
        free = [v for v in SOUTH_OF_NEPAL + KUMAON if v not in used]
        return min(free, key=lambda v: hav(at, (v[1], v[2]))) if free else None
    return None


def keep_in_india(a, b, line):
    """The same road sent by Indian towns, one more each time it still enters a neighbour, or None if no town fits.
    Says which towns, and which neighbour the shortest road ran through."""
    vias, crossed = [], []
    for _ in range(7):
        found = entry(line, a, b)
        if not found:
            break
        cc, at = found
        crossed.append(cc)
        hold = hold_for(cc, at, a, b, vias)
        if hold is None:
            print(f"  leaves India ({cc}) and no town fits: {leg_key(a, b)}")
            return None
        vias.append(hold)
        vias.sort(key=lambda v: hav(a, (v[1], v[2])))
        got = route([a, *[(la, lo) for _n, la, lo in vias], b])
        if not got:
            return None
        km, hrs, line = got
    else:
        print(f"  still leaves India after seven towns: {leg_key(a, b)}")
        return None
    if not vias:
        return None
    return {"km": round(km), "hours": round(hrs, 2), "marks": marks_on(line), "abroad": [],
            "via": [v[0] for v in vias], "shorter_abroad": sorted(set(crossed))}


def place_key(lat, lon):
    return f"{round(lat / 0.02) * 0.02:.2f},{round(lon / 0.02) * 0.02:.2f}"


def town(lat, lon, places, ask_now=True):
    """The town or area the open map names at a position. With ask_now False, only what is cached."""
    key = place_key(lat, lon)
    if key in places:
        return places[key]
    if not ask_now:
        return None
    q = urllib.parse.urlencode({"format": "jsonv2", "zoom": 10, "lat": f"{lat:.5f}", "lon": f"{lon:.5f}",
                                "accept-language": "en"})
    got = ask(f"https://nominatim.openstreetmap.org/reverse?{q}")
    time.sleep(1.1)
    if got is None:
        return None
    a = got.get("address", {})
    places[key] = a.get("city") or a.get("town") or a.get("county") or a.get("state_district") or None
    return places[key]


def named(found, skip, places):
    """The towns a leg passes and the one at halfway, leaving out its own two ends. From the cache alone.
    A road kept in India by a town on the way says which."""
    if found["km"] > NAMED_UP_TO_KM:
        return {"km": found["km"], "hours": found["hours"], **({"via": found["via"]} if found.get("via") else {})}
    names = [clean(town(m[0], m[1], places, ask_now=False)) for m in found["marks"]]
    through = []
    for n in names:
        if n and n.lower() not in skip and n not in through:
            through.append(n)
    out = {"km": found["km"], "hours": found["hours"], "through": through}
    if found.get("via"):
        out["via"] = found["via"]
    mid = names[1]
    if mid and mid.lower() not in skip:
        out["halfway"] = {"name": mid, "km": round(found["km"] / 2)}
    return out


def load_routes(slugs):
    routes = []
    for path in sorted(glob.glob(os.path.join(ROUTES, "*.json"))):
        if path.endswith("index.json"):
            continue
        with open(path, encoding="utf-8") as f:
            r = json.load(f)
        if len(r.get("waypoints") or []) >= 2 and (not slugs or r["slug"] in slugs):
            routes.append(r)
    return routes


def ends(r):
    first, last = r["waypoints"][0], r["waypoints"][-1]
    a, b = (first["lat"], first["lon"]), (last["lat"], last["lon"])
    return first, last, a, b, hav(a, b) <= ROUND_TRIP_KM


def roads(routes):
    """Ask the router for every leg not yet cached."""
    legs = load(LEGS, {})
    for r in routes:
        first, last, a, b, round_trip = ends(r)
        print(f"roads {r['slug']}: {first['name']} to {last['name']}", flush=True)
        for _cid, _cname, _g, la, lo in CITIES:
            leg((la, lo), a, legs)
            if not round_trip:
                leg(b, (la, lo), legs)
        save(LEGS, legs)


def towns(wait):
    """Name the positions on every leg short enough to name. With wait, keeps going until the roads run is done."""
    places = load(PLACES, {})
    while True:
        legs = load(LEGS, {})
        todo = [m for found in legs.values() if found["km"] <= NAMED_UP_TO_KM for m in found["marks"]
                if place_key(m[0], m[1]) not in places]
        for n, m in enumerate(todo):
            town(m[0], m[1], places)
            if n % 10 == 9:
                save(PLACES, places)
                print(f"towns {len(places)} named, {len(todo) - n - 1} left in this pass", flush=True)
        save(PLACES, places)
        if not wait or (not todo and os.path.exists(DONE)):
            return
        if not todo:
            time.sleep(15)


def near_a_neighbour(a, b):
    """Could the road between a and b pass through a neighbour? Points every 10 km on the straight line between them,
    widened by 1 degree, fall in a neighbour's box. Pakistan only for roads into Kashmir and Ladakh, north of 32."""
    steps = max(2, int(hav(a, b) / 10))
    for cc, _r, (la0, la1, lo0, lo1) in outlines():
        if cc == "pk" and max(a[0], b[0]) < 32:
            continue
        for i in range(steps + 1):
            f = i / steps
            la, lo = a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f
            if la0 - 1 <= la <= la1 + 1 and lo0 - 1 <= lo <= lo1 + 1:
                return True
    return False


def borders():
    """Check the cached roads not yet checked for leaving India, and those found abroad or sent by a town before
    (a newer rule or a stricter test may change them). Each is asked for its direct road again; a road that stays
    in India keeps it, and one that does not is sent by Indian towns."""
    legs = load(LEGS, {})
    todo = [k for k, v in legs.items()
            if v.get("abroad") or ("abroad" not in v or v.get("via")) and v.get("checked") != CHECKED]
    print(f"borders: {len(todo)} roads to check", flush=True)
    for n, key in enumerate(todo):
        s, e = key.split(">")
        a = tuple(float(x) for x in s.split(","))
        b = tuple(float(x) for x in e.split(","))
        was = legs[key]
        if "abroad" not in was and not near_a_neighbour(a, b):
            legs[key].update({"abroad": [], "checked": CHECKED})
            continue
        got = route([a, b])
        if not got:
            continue
        km, hrs, line = got
        direct = {"km": round(km), "hours": round(hrs, 2), "marks": marks_on(line), "abroad": []}
        crossed = abroad(line, a, b)
        if not crossed:
            if was.get("via") or was.get("abroad"):
                print(f"  {key}: stays in India after all, {direct['km']} km", flush=True)
            legs[key] = direct
        else:
            print(f"  {key} ({direct['km']} km) crosses {', '.join(crossed)}", flush=True)
            fixed = keep_in_india(a, b, line)
            legs[key] = fixed or {**direct, "abroad": crossed}
            if fixed:
                print(f"    by way of {', '.join(fixed['via'])}: {fixed['km']} km", flush=True)
        legs[key]["checked"] = CHECKED
        if n % 10 == 9:
            save(LEGS, legs)
            print(f"borders: {n + 1} of {len(todo)} looked at", flush=True)
    save(LEGS, legs)


def write(routes):
    """The site's file, from the two caches alone."""
    legs = load(LEGS, {})
    places = load(PLACES, {})
    out = load(OUT, {"routes": {}})
    out.update({
        "built": TODAY,
        "about": "By road from each city's centre to each route's first place, and from its last place back. "
                 "Hours are a map app's, a car's time on an empty road.",
        "sources": [
            {"name": "OSRM demo server", "data": "OpenStreetMap", "licence": "Open Database Licence",
             "url": "https://project-osrm.org/"},
            {"name": "Nominatim", "data": "OpenStreetMap", "licence": "Open Database Licence",
             "url": "https://nominatim.openstreetmap.org/"},
        ],
        "cities": [{"id": c, "name": n, "group": g, "lat": la, "lon": lo} for c, n, g, la, lo in CITIES],
    })
    out.setdefault("routes", {})
    def cached(a, b):
        """A checked road that stays in India. One still found abroad, or not yet checked, is left out."""
        found = legs.get(leg_key(a, b))
        return found if found is not None and found.get("abroad") == [] else None
    for r in routes:
        first, last, a, b, round_trip = ends(r)
        entry = {"start": first["name"], "end": last["name"], "round_trip": round_trip, "to": {}, "back": {}}
        for cid, cname, _g, la, lo in CITIES:
            skip = {cname.lower(), first["name"].lower(), last["name"].lower()}
            there = cached((la, lo), a)
            if there:
                entry["to"][cid] = named(there, skip, places)
            if not round_trip:
                home = cached(b, (la, lo))
                if home:
                    entry["back"][cid] = named(home, skip, places)
        if entry["to"]:
            out["routes"][r["slug"]] = entry

    # Which routes end where another starts, over every route.
    every = load_routes([])
    for r in every:
        first = r["waypoints"][0]
        a = (first["lat"], first["lon"])
        if r["slug"] in out["routes"]:
            # A loop that starts and ends in Leh is no way of getting to Leh, so round trips are left out.
            out["routes"][r["slug"]]["after"] = [
                o["slug"] for o in every
                if o["slug"] != r["slug"] and not ends(o)[4]
                and hav(a, (o["waypoints"][-1]["lat"], o["waypoints"][-1]["lon"])) <= MEETS_KM]
    save(OUT, out)
    named_legs = sum(1 for e in out["routes"].values() for l in [*e["to"].values(), *e["back"].values()] if "through" in l)
    print(f"wrote {OUT}: {len(out['routes'])} routes, {len(CITIES)} cities, {named_legs} legs with towns")


def main(args):
    flags = {a for a in args if a.startswith("--")}
    routes = load_routes([a for a in args if not a.startswith("--")])
    if "--roads" in flags:
        if os.path.exists(DONE):
            os.remove(DONE)
        roads(routes)
        with open(DONE, "w", encoding="utf-8") as f:
            f.write(TODAY + "\n")
    elif "--towns" in flags:
        towns(wait=True)
    elif "--borders" in flags:
        borders()
    elif "--write" in flags:
        write(routes)
    else:
        roads(routes)
        borders()
        towns(wait=False)
        write(routes)


if __name__ == "__main__":
    main(sys.argv[1:])
