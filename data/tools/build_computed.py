#!/usr/bin/env python3
"""Fetch and work out everything that comes from open map data.

Stages, each cached under ../computed/ so a re-run only fetches what is missing:

  geocode    place name -> position          (Nominatim, OpenStreetMap; Wikipedia as a fallback)
  route      positions  -> road line, legs   (OSRM demo server, OpenStreetMap data)
  elevation  positions  -> height            (Open Topo Data, SRTM 90 m, NASA)
  fuel       road line  -> pumps near it     (Overpass, OpenStreetMap)
  tunnels    road line  -> tunnels on it     (Overpass, OpenStreetMap)

Usage:  python3 build_computed.py geocode|route|elevation|fuel|tunnels|all [slug ...]

Every service here is free and asks for light use. The script waits between calls.
"""
import json
import math
import os
import sys
import time
import urllib.parse
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "computed")
sys.path.insert(0, HERE)
from routes_def import ROUTES  # noqa: E402

UA = "meel-rideplanner/0.1 (hobby route notebook; https://rideplanner.in)"
TODAY = time.strftime("%Y-%m-%d")

# Positions fixed by hand, where the geocoder finds nothing or finds the wrong place.
# Each one says where the position came from.
OVERRIDES_FILE = os.path.join(HERE, "position_overrides.json")


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


def get(url, data=None, timeout=60, tries=4, wait=2.0):
    last = None
    for i in range(tries):
        try:
            req = urllib.request.Request(url, data=data, headers={"User-Agent": UA, "Accept": "application/json"})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return json.loads(r.read().decode("utf-8"))
        except Exception as e:  # noqa: BLE001
            last = e
            time.sleep(wait * (i + 1) * 2)
    raise RuntimeError(f"failed after {tries} tries: {url[:120]} :: {last}")


def hav(a, b):
    """Distance in km between two (lat, lon) points."""
    la1, lo1, la2, lo2 = map(math.radians, (a[0], a[1], b[0], b[1]))
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 2 * 6371.0088 * math.asin(math.sqrt(h))


PASS_QUERIES = set()
for _r in ROUTES:
    for _p in _r["places"]:
        _n, _q = (_p, _p) if isinstance(_p, str) else _p
        if _n in _r.get("passes", []):
            PASS_QUERIES.add(_q)


def selected(args):
    return [r for r in ROUTES if not args or r["slug"] in args]


def place_pairs(route):
    return [(p, p) if isinstance(p, str) else p for p in route["places"]]


# ── geocode ────────────────────────────────────────────────────────────────
def geocode(args):
    path = os.path.join(OUT, "geocode.json")
    cache = load(path, {})
    overrides = load(OVERRIDES_FILE, {})
    wanted = []
    for r in selected(args):
        cc = "in," + r.get("country", "") if r.get("country") else "in"
        for name, q in place_pairs(r):
            if q not in cache and q not in overrides and (q, cc) not in wanted:
                wanted.append((q, cc))
    print(f"geocode: {len(wanted)} places to look up, {len(cache)} cached")
    for i, (q, cc) in enumerate(wanted):
        hit = None
        try:
            url = "https://nominatim.openstreetmap.org/search?" + urllib.parse.urlencode(
                {"q": q, "format": "jsonv2", "limit": 5, "countrycodes": cc, "accept-language": "en"})
            res = get(url, timeout=30)
            if res:
                # a village or town beats a peak of the same name; a pass beats both when we asked for a pass
                want_pass = q in PASS_QUERIES
                def rank(x):
                    cat, typ = x.get("category", ""), x.get("type", "")
                    if want_pass:
                        return 0 if (cat == "mountain_pass" or typ in ("saddle", "mountain_pass")) else 1
                    if cat == "place" or typ in ("locality", "village", "town", "city", "hamlet", "suburb"):
                        return 0
                    if cat in ("natural",) and typ in ("peak",):
                        return 2
                    return 1
                x = sorted(res, key=rank)[0]
                hit = {"lat": float(x["lat"]), "lon": float(x["lon"]), "found_as": x["display_name"],
                       "type": f'{x.get("category", "")}/{x.get("type", "")}', "by": "nominatim"}
        except Exception as e:  # noqa: BLE001
            print("  ! nominatim error", q, e)
        time.sleep(1.1)
        if hit is None:
            title = q.split(",")[0].strip()
            try:
                url = "https://en.wikipedia.org/w/api.php?" + urllib.parse.urlencode(
                    {"action": "query", "prop": "coordinates", "titles": title, "redirects": 1, "format": "json"})
                res = get(url, timeout=30)
                for page in res.get("query", {}).get("pages", {}).values():
                    c = page.get("coordinates")
                    if c:
                        hit = {"lat": c[0]["lat"], "lon": c[0]["lon"], "found_as": page.get("title"),
                               "type": "wikipedia", "by": "wikipedia"}
            except Exception as e:  # noqa: BLE001
                print("  ! wikipedia error", q, e)
            time.sleep(0.5)
        cache[q] = hit or {"lat": None, "lon": None, "found_as": None, "type": None, "by": None}
        print(f"  [{i + 1}/{len(wanted)}] {q!r:50} -> {cache[q]['found_as']!r} ({cache[q]['type']})")
        if i % 10 == 9:
            save(path, cache)
    save(path, cache)
    missing = [q for q, v in cache.items() if v["lat"] is None and q not in overrides]
    print("geocode: not found:", missing)


def position(q, cache, overrides):
    if q in overrides:
        o = overrides[q]
        return o["lat"], o["lon"]
    v = cache.get(q)
    if not v or v["lat"] is None:
        return None
    return v["lat"], v["lon"]


# ── route ──────────────────────────────────────────────────────────────────
def rdp(points, eps):
    """Thin a line. points are [lon, lat]. eps is in degrees."""
    if len(points) < 3:
        return points
    keep = [False] * len(points)
    keep[0] = keep[-1] = True
    stack = [(0, len(points) - 1)]
    while stack:
        a, b = stack.pop()
        ax, ay = points[a]
        bx, by = points[b]
        dx, dy = bx - ax, by - ay
        den = dx * dx + dy * dy
        best, idx = 0.0, None
        for i in range(a + 1, b):
            px, py = points[i]
            if den == 0:
                d = math.hypot(px - ax, py - ay)
            else:
                t = max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / den))
                d = math.hypot(px - (ax + t * dx), py - (ay + t * dy))
            if d > best:
                best, idx = d, i
        if idx is not None and best > eps:
            keep[idx] = True
            stack.append((a, idx))
            stack.append((idx, b))
    return [p for p, k in zip(points, keep) if k]


def route(args):
    cache = load(os.path.join(OUT, "geocode.json"), {})
    overrides = load(OVERRIDES_FILE, {})
    for r in selected(args):
        path = os.path.join(OUT, "route", r["slug"] + ".json")
        if os.path.exists(path) and "--force" not in sys.argv:
            continue
        pairs = place_pairs(r)
        pts = [position(q, cache, overrides) for _, q in pairs]
        if any(p is None for p in pts):
            print(f"route {r['slug']}: SKIPPED, no position for",
                  [n for (n, q), p in zip(pairs, pts) if p is None])
            continue
        line, legs, wps, km, hours, failed = [], [], [], 0.0, 0.0, None
        for i in range(len(pts) - 1):
            (la1, lo1), (la2, lo2) = pts[i], pts[i + 1]
            url = (f"https://router.project-osrm.org/route/v1/driving/{lo1:.6f},{la1:.6f};{lo2:.6f},{la2:.6f}"
                   "?overview=full&geometries=geojson&steps=false")
            try:
                res = get(url, timeout=90)
            except Exception as e:  # noqa: BLE001
                failed = f"{pairs[i][0]} -> {pairs[i + 1][0]}: {e}"
                break
            if res.get("code") != "Ok":
                failed = f"{pairs[i][0]} -> {pairs[i + 1][0]}: {res.get('code')} {res.get('message')}"
                break
            rt, w = res["routes"][0], res["waypoints"]
            if i == 0:
                wps.append({"name": pairs[0][0], "lat": round(w[0]["location"][1], 5), "lon": round(w[0]["location"][0], 5),
                            "asked_lat": round(la1, 5), "asked_lon": round(lo1, 5),
                            "moved_to_road_m": round(w[0].get("distance", 0)), "km_from_start": 0.0,
                            "kind": "pass" if pairs[0][0] in r.get("passes", []) else "place"})
            d_km = rt["distance"] / 1000
            legs.append({"from": pairs[i][0], "to": pairs[i + 1][0], "distance_km": round(d_km, 1),
                         "map_app_hours": round(rt["duration"] / 3600, 2),
                         "straight_km": round(hav(pts[i], pts[i + 1]), 1)})
            km += d_km
            hours += rt["duration"] / 3600
            wps.append({"name": pairs[i + 1][0], "lat": round(w[1]["location"][1], 5), "lon": round(w[1]["location"][0], 5),
                        "asked_lat": round(la2, 5), "asked_lon": round(lo2, 5),
                        "moved_to_road_m": round(w[1].get("distance", 0)), "km_from_start": round(km, 1),
                        "kind": "pass" if pairs[i + 1][0] in r.get("passes", []) else "place"})
            seg = rt["geometry"]["coordinates"]
            line += seg if not line else seg[1:]
            time.sleep(1.1)
        if failed:
            print(f"route {r['slug']}: FAILED {failed}")
            continue
        total = km
        eps = 0.0003 if total < 800 else 0.002
        thin = rdp(line, eps)
        save(path, {"slug": r["slug"], "fetched": TODAY, "distance_km": round(total, 1),
                    "map_app_hours": round(hours, 2),
                    "waypoints": wps, "legs": legs,
                    "line": [[round(x, 5), round(y, 5)] for x, y in thin],
                    "line_points_before_thinning": len(line),
                    "unplaced": r.get("unplaced", []),
                    "source": {"service": "OSRM demo server", "data": "OpenStreetMap",
                               "licence": "Open Database Licence", "url": "https://project-osrm.org/"}})
        flags = [f"{w['name']} moved {w['moved_to_road_m']} m" for w in wps if w["moved_to_road_m"] > 2500]
        flags += [f"{l['from']}->{l['to']} {l['distance_km']} km vs {l['straight_km']} straight"
                  for l in legs if l["straight_km"] > 3 and l["distance_km"] > 3.2 * l["straight_km"]]
        print(f"route {r['slug']}: {total:.0f} km, {len(thin)} points" + (("  FLAGS: " + "; ".join(flags)) if flags else ""))
        time.sleep(1.5)


# ── elevation ──────────────────────────────────────────────────────────────
def along(line, step_km):
    """Points every step_km along a [lon, lat] line, as (km, lat, lon)."""
    out = [(0.0, line[0][1], line[0][0])]
    done, nxt = 0.0, step_km
    for (x1, y1), (x2, y2) in zip(line, line[1:]):
        seg = hav((y1, x1), (y2, x2))
        while seg > 0 and done + seg >= nxt:
            t = (nxt - done) / seg
            out.append((round(nxt, 1), y1 + t * (y2 - y1), x1 + t * (x2 - x1)))
            nxt += step_km
        done += seg
    out.append((round(done, 1), line[-1][1], line[-1][0]))
    return out, done


def heights(points):
    res = []
    for i in range(0, len(points), 100):
        chunk = points[i:i + 100]
        loc = "|".join(f"{la:.5f},{lo:.5f}" for la, lo in chunk)
        d = get("https://api.opentopodata.org/v1/srtm90m?locations=" + urllib.parse.quote(loc, safe=",|"), timeout=60)
        if d.get("status") != "OK":
            raise RuntimeError(str(d)[:200])
        res += [x["elevation"] for x in d["results"]]
        time.sleep(1.2)
    return res


def elevation(args):
    for r in selected(args):
        rpath = os.path.join(OUT, "route", r["slug"] + ".json")
        path = os.path.join(OUT, "elevation", r["slug"] + ".json")
        if not os.path.exists(rpath) or (os.path.exists(path) and "--force" not in sys.argv):
            continue
        rt = load(rpath, None)
        line_len = sum(hav((a[1], a[0]), (b[1], b[0])) for a, b in zip(rt["line"], rt["line"][1:]))
        step = max(2.0, line_len / 90)
        samples, _ = along(rt["line"], step)
        scale = rt["distance_km"] / line_len if line_len else 1.0
        try:
            hs = heights([(la, lo) for _, la, lo in samples])
            wh = heights([(w["lat"], w["lon"]) for w in rt["waypoints"]])
        except Exception as e:  # noqa: BLE001
            print(f"elevation {r['slug']}: FAILED {e}")
            continue
        prof = [{"km": round(k * scale, 1), "m": None if h is None else round(h)} for (k, _, _), h in zip(samples, hs)]
        save(path, {"slug": r["slug"], "fetched": TODAY, "step_km": round(step * scale, 1), "profile": prof,
                    "waypoints": [{"name": w["name"], "m": None if h is None else round(h)}
                                  for w, h in zip(rt["waypoints"], wh)],
                    "source": {"service": "Open Topo Data", "data": "SRTM 90 m, NASA",
                               "licence": "Public domain", "url": "https://www.opentopodata.org/datasets/srtm/"},
                    "note": "Heights are read from a 90 m grid. A pass or a bridge can differ from its signboard by some tens of metres."})
        good = [p["m"] for p in prof if p["m"] is not None]
        print(f"elevation {r['slug']}: {len(prof)} samples, {min(good)} to {max(good)} m")


# ── fuel ───────────────────────────────────────────────────────────────────
def project(line, cum, p):
    """Nearest point on the line to p=(lat, lon): (km along, metres off the line)."""
    best = (1e18, 0.0)
    coslat = math.cos(math.radians(p[0]))
    for i, ((x1, y1), (x2, y2)) in enumerate(zip(line, line[1:])):
        ax, ay = (x1 - p[1]) * coslat, y1 - p[0]
        bx, by = (x2 - p[1]) * coslat, y2 - p[0]
        dx, dy = bx - ax, by - ay
        den = dx * dx + dy * dy
        t = 0.0 if den == 0 else max(0.0, min(1.0, -(ax * dx + ay * dy) / den))
        d = math.hypot(ax + t * dx, ay + t * dy) * 111.195
        if d < best[0]:
            best = (d, cum[i] + t * (cum[i + 1] - cum[i]))
    return best[1], best[0] * 1000


def fuel(args):
    for r in selected(args):
        rpath = os.path.join(OUT, "route", r["slug"] + ".json")
        path = os.path.join(OUT, "fuel", r["slug"] + ".json")
        if not os.path.exists(rpath) or (os.path.exists(path) and "--force" not in sys.argv):
            continue
        rt = load(rpath, None)
        line = rt["line"]
        total = rt["distance_km"]
        cum = [0.0]
        for a, b in zip(line, line[1:]):
            cum.append(cum[-1] + hav((a[1], a[0]), (b[1], b[0])))
        scale = total / cum[-1] if cum[-1] else 1.0
        # a coarser line for the query, so the request stays small
        q_line = rdp(line, 0.004 if total < 800 else 0.02)
        if len(q_line) > 320:
            q_line = q_line[:: math.ceil(len(q_line) / 320)] + [q_line[-1]]
        radius = 900 if total < 800 else 1500
        pts = ",".join(f"{y:.4f},{x:.4f}" for x, y in q_line)
        q = f'[out:json][timeout:120];nwr["amenity"="fuel"](around:{radius},{pts});out center tags;'
        try:
            d = get("https://overpass-api.de/api/interpreter",
                    data=urllib.parse.urlencode({"data": q}).encode(), timeout=150, tries=4, wait=8)
        except Exception as e:  # noqa: BLE001
            print(f"fuel {r['slug']}: FAILED {e}")
            time.sleep(10)
            continue
        pumps = []
        for e in d.get("elements", []):
            la = e.get("lat") or (e.get("center") or {}).get("lat")
            lo = e.get("lon") or (e.get("center") or {}).get("lon")
            if la is None:
                continue
            km, off = project(line, cum, (la, lo))
            if off > radius * 1.3:
                continue
            t = e.get("tags", {})
            pumps.append({"osm": f'{e["type"]}/{e["id"]}', "name": t.get("name"), "brand": t.get("brand") or t.get("operator"),
                          "lat": round(la, 5), "lon": round(lo, 5), "km_from_start": round(km * scale, 1),
                          "off_road_m": round(off), "opening_hours": t.get("opening_hours"),
                          "petrol": t.get("fuel:octane_91") or t.get("fuel:petrol"), "diesel": t.get("fuel:diesel")})
        pumps.sort(key=lambda p: p["km_from_start"])
        # stops: pumps within 2 km of each other count as one stop
        stops = []
        for p in pumps:
            if stops and p["km_from_start"] - stops[-1]["km_to"] <= 2.0:
                stops[-1]["km_to"] = p["km_from_start"]
                stops[-1]["pumps"] += 1
            else:
                stops.append({"km_from": p["km_from_start"], "km_to": p["km_from_start"], "pumps": 1})
        wps = rt["waypoints"]

        def near(km):
            w = min(wps, key=lambda w: abs(w["km_from_start"] - km))
            return w["name"], round(abs(w["km_from_start"] - km), 1)

        edges = [0.0] + [s["km_from"] for s in stops] + [total]
        ends = [0.0] + [s["km_to"] for s in stops] + [total]
        gaps = []
        for i in range(len(edges) - 1):
            a, b = ends[i], edges[i + 1]
            if b - a > 0.5:
                gaps.append({"from_km": round(a, 1), "to_km": round(b, 1), "gap_km": round(b - a, 1),
                             "from_is": "start of route" if i == 0 else "pump",
                             "to_is": "end of route" if i == len(edges) - 2 else "pump",
                             "near_from": near(a)[0], "near_to": near(b)[0]})
        gaps.sort(key=lambda g: -g["gap_km"])
        save(path, {"slug": r["slug"], "fetched": TODAY, "search_radius_m": radius,
                    "pumps": pumps if total < 1500 else [], "pump_count": len(pumps), "stops": len(stops),
                    "longest_gaps": gaps[:5],
                    "source": {"service": "Overpass API", "data": "OpenStreetMap contributors",
                               "licence": "Open Database Licence", "url": "https://www.openstreetmap.org/copyright"},
                    "note": "Pumps are those drawn on the open map within the search radius of the road. "
                            "A pump missing from the map is missing here, so each gap is a worst case."})
        g = gaps[0]["gap_km"] if gaps else 0
        print(f"fuel {r['slug']}: {len(pumps)} pumps, {len(stops)} stops, longest gap {g} km")
        time.sleep(6)


# ── tunnels ────────────────────────────────────────────────────────────────
def tunnels(args):
    """Tunnels the road goes through. The height grid gives the mountain above a tunnel, not the road inside it,
    so assemble.py draws the road straight through each one instead."""
    for r in selected(args):
        rpath = os.path.join(OUT, "route", r["slug"] + ".json")
        path = os.path.join(OUT, "tunnels", r["slug"] + ".json")
        if not os.path.exists(rpath) or (os.path.exists(path) and "--force" not in sys.argv):
            continue
        rt = load(rpath, None)
        line = rt["line"]
        total = rt["distance_km"]
        cum = [0.0]
        for a, b in zip(line, line[1:]):
            cum.append(cum[-1] + hav((a[1], a[0]), (b[1], b[0])))
        scale = total / cum[-1] if cum[-1] else 1.0
        # A box round the route is far cheaper for the server than a band along it. Tunnels on other roads in the box
        # are dropped below, as they do not lie on the route's line.
        lons, lats = [x for x, _ in line], [y for _, y in line]
        box = f"{min(lats) - 0.02:.4f},{min(lons) - 0.02:.4f},{max(lats) + 0.02:.4f},{max(lons) + 0.02:.4f}"
        roads = "motorway|trunk|primary|secondary|tertiary|unclassified|motorway_link|trunk_link|primary_link"
        q = f'[out:json][timeout:120];way["highway"~"^({roads})$"]["tunnel"="yes"]({box})(if:length()>250);out tags geom;'
        try:
            d = get("https://overpass-api.de/api/interpreter",
                    data=urllib.parse.urlencode({"data": q}).encode(), timeout=150, tries=4, wait=8)
        except Exception as e:  # noqa: BLE001
            print(f"tunnels {r['slug']}: FAILED {e}")
            time.sleep(10)
            continue
        found = []
        for e in d.get("elements", []):
            geom = e.get("geometry") or []
            if len(geom) < 2:
                continue
            length = sum(hav((a["lat"], a["lon"]), (b["lat"], b["lon"])) for a, b in zip(geom, geom[1:]))
            if length < 0.25:
                continue
            # Only a tunnel the road itself runs through: both ends and the middle lie on the road line.
            ends = [project(line, cum, (g["lat"], g["lon"])) for g in (geom[0], geom[len(geom) // 2], geom[-1])]
            if any(off > 150 for _, off in ends):
                continue
            kms = sorted(k * scale for k, _ in ends)
            t = e.get("tags", {})
            found.append({"name": t.get("tunnel:name") or t.get("name") or "A tunnel", "osm": [f"way/{e['id']}"],
                          "from_km": kms[0], "to_km": kms[-1]})
        # One tunnel can be drawn as several ways, or as one way for each direction.
        found.sort(key=lambda x: x["from_km"])
        merged = []
        for t in found:
            if merged and t["from_km"] <= merged[-1]["to_km"] + 0.2:
                m = merged[-1]
                m["to_km"] = max(m["to_km"], t["to_km"])
                m["osm"] += t["osm"]
                if m["name"] == "A tunnel":
                    m["name"] = t["name"]
            else:
                merged.append(dict(t))
        for m in merged:
            m["from_km"], m["to_km"] = round(m["from_km"], 1), round(m["to_km"], 1)
            m["length_km"] = round(m["to_km"] - m["from_km"], 1)
        save(path, {"slug": r["slug"], "fetched": TODAY, "tunnels": merged,
                    "source": {"service": "Overpass API", "data": "OpenStreetMap contributors",
                               "licence": "Open Database Licence", "url": "https://www.openstreetmap.org/copyright"},
                    "note": "Road tunnels of 250 m or more that the route runs through, as drawn on the open map."})
        print(f"tunnels {r['slug']}: " + (", ".join(f"{m['name']} {m['length_km']} km at km {m['from_km']}" for m in merged) or "none"), flush=True)
        time.sleep(3)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    stage = sys.argv[1]
    rest = [a for a in sys.argv[2:] if not a.startswith("--")]
    for name, fn in (("geocode", geocode), ("route", route), ("elevation", elevation), ("fuel", fuel), ("tunnels", tunnels)):
        if stage in (name, "all"):
            fn(rest)
