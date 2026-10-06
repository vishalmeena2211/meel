#!/usr/bin/env python3
"""Put the computed map data, the research and the picture credits together.

Writes one file per route to ../routes/, and ../routes/index.json for the front page.
Safe to run again at any time: it only reads the other folders.

Usage:  python3 assemble.py
"""
import json
import os
import re
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "..")
sys.path.insert(0, HERE)
from routes_def import REGIONS, ROUTES  # noqa: E402

TODAY = time.strftime("%Y-%m-%d")
REGION_NAME = dict(REGIONS)
SOURCE_KINDS = {"official", "news", "encyclopedia", "blog", "forum", "operator", "map"}


def load(path, default=None):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError) as e:
        if isinstance(e, json.JSONDecodeError):
            print("  ! cannot read", os.path.relpath(path, DATA), e)
        return default


def clean_source(s):
    """Keep only a source that has a real link."""
    if not isinstance(s, dict):
        return None
    url = s.get("url")
    if not isinstance(url, str) or not re.match(r"^https?://", url):
        return None
    kind = s.get("kind") if s.get("kind") in SOURCE_KINDS else "blog"
    return {"url": url, "title": str(s.get("title") or url)[:160], "kind": kind,
            "opened": bool(s.get("opened")), "source_date": s.get("source_date") or None,
            "accessed": s.get("accessed") or TODAY}


def sourced(v):
    if not isinstance(v, dict) or v.get("value") in (None, ""):
        return None
    src = clean_source(v.get("source"))
    if not src:
        return None
    return {"value": str(v["value"]), "source": src}


def slugify(t):
    return re.sub(r"[^a-z0-9]+", "-", str(t).lower()).strip("-")[:60]


# One spelling for each fuel company, as the open map spells them several ways. Hindustan Petroleum is HP, as its
# pumps' signboards say, the way IndianOil is Indian Oil.
COMPANIES = {
    "indian oil": "Indian Oil", "indianoil": "Indian Oil", "iocl": "Indian Oil", "indian oil corporation": "Indian Oil",
    "hp": "HP", "hpcl": "HP", "hp petrol pump": "HP", "hindustan petroleum": "HP", "hindustan petrolium": "HP",
    "bharat petroleum": "Bharat Petroleum", "bpcl": "Bharat Petroleum", "bp": "Bharat Petroleum",
    "nayara": "Nayara", "nayara energy": "Nayara", "essar": "Nayara", "reliance": "Jio-bp", "jio-bp": "Jio-bp", "jio bp": "Jio-bp",
    "shell": "Shell", "petrol pump": "Petrol pump", "petrol bunk": "Petrol pump", "fuel station": "Fuel station",
    "filling station": "Filling station", "gas station": "Petrol pump", "ioc": "Indian Oil",
    "indian oil corporation limited": "Indian Oil", "bharath petroleum": "Bharat Petroleum",
    "hindustan petroleum corporation limited": "HP", "hindustan petroleum corporation ltd": "HP", "hindustan petrol": "HP",
}


def through_tunnels(profile, tunnels):
    """The height grid gives the mountain above a tunnel, not the road inside it: on Manali to Leh it read 4,687 m
    above the Atal Tunnel, which runs at about 3,000 m. Heights inside a tunnel are drawn on a straight line between
    the nearest heights outside it, and say which tunnel they are in."""
    if not tunnels:
        return profile, []

    def inside(km):
        return next((t for t in tunnels if t["from_km"] < km < t["to_km"]), None)

    out = [dict(p) for p in profile]
    for i, p in enumerate(out):
        t = inside(p["km"])
        if not t:
            continue
        before = next((q for q in reversed(out[:i]) if not inside(q["km"])), None)
        after = next((q for q in out[i + 1:] if not inside(q["km"])), None)
        if before and after:
            f = (p["km"] - before["km"]) / (after["km"] - before["km"])
            p["m"] = round(before["m"] + f * (after["m"] - before["m"]))
        elif before or after:
            p["m"] = (before or after)["m"]
        p["tunnel"] = t["name"]
    used = [{"name": t["name"], "from_km": t["from_km"], "to_km": t["to_km"], "length_km": t["length_km"]}
            for t in tunnels if any(p.get("tunnel") == t["name"] and t["from_km"] < p["km"] < t["to_km"] for p in out)]
    return out, used


# Steep stretches a person has looked at, with heights read every 200 m, and found to be the road itself.
# (route, from km, to km): what was found. The step on the page is then left as it is.
STEEP_CHECKED = {
    ("jalori-tirthan", 55, 73): "28 Sep 2026: a smooth climb of about 1,000 m in 8 km to Jalori Pass, then down; no spike. "
                                "The road is known for being very steep.",
    ("darjeeling-kalimpong-sandakphu", 506, 518): "28 Sep 2026: a smooth drop of about 1,200 m in 10 km to the Teesta; no spike.",
}


def steep(slug, profile):
    """A road rarely climbs more than one metre in eight for kilometres on end. A steeper jump between two heights is
    more likely a tunnel or a cliff the grid caught, so it is named for a person to look at, unless one already has."""
    for a, b in zip(profile, profile[1:]):
        run = (b["km"] - a["km"]) * 1000
        if run > 0 and abs(b["m"] - a["m"]) / run > 0.125:
            if any(s == slug and lo <= a["km"] and b["km"] <= hi for (s, lo, hi) in STEEP_CHECKED):
                continue
            print(f"  check {slug}: {a['m']} m at km {a['km']} to {b['m']} m at km {b['km']}")


def build(r):
    slug = r["slug"]
    rt = load(os.path.join(DATA, "computed", "route", slug + ".json"))
    el = load(os.path.join(DATA, "computed", "elevation", slug + ".json"))
    fu = load(os.path.join(DATA, "computed", "fuel", slug + ".json"))
    rs = load(os.path.join(DATA, "research", slug + ".json"), {}) or {}
    credits = load(os.path.join(DATA, "images", "credits.json"), {}) or {}
    gaps = [str(g) for g in rs.get("gaps", []) if g]

    names = []
    for p in r["places"]:
        n = p if isinstance(p, str) else p[0]
        if n not in names:
            names.append(n)

    # ── map data ─────────────────────────────────────────────────────────
    waypoints, stretches, profile, line, tunnels = [], [], [], [], []
    distance = hours = None
    if rt:
        heights = {w["name"]: w["m"] for w in (el or {}).get("waypoints", [])}
        by_index = (el or {}).get("waypoints", [])
        for i, w in enumerate(rt["waypoints"]):
            m = by_index[i]["m"] if i < len(by_index) else heights.get(w["name"])
            waypoints.append({"name": w["name"], "lat": w["lat"], "lon": w["lon"],
                              "km_from_start": w["km_from_start"], "altitude_m": m,
                              "kind": w["kind"], "moved_to_road_m": w["moved_to_road_m"]})
        moved = {w["name"]: w["moved_to_road_m"] for w in rt["waypoints"]}
        for leg in rt["legs"]:
            doubtful = (leg["straight_km"] > 3 and leg["distance_km"] > 3.2 * leg["straight_km"]) \
                or moved.get(leg["from"], 0) > 2500 or moved.get(leg["to"], 0) > 2500
            stretches.append({"from": leg["from"], "to": leg["to"], "distance_km": leg["distance_km"],
                              "map_app_hours": leg["map_app_hours"], "doubtful": bool(doubtful)})
        distance, hours, line = rt["distance_km"], rt["map_app_hours"], rt["line"]
        profile = [p for p in (el or {}).get("profile", []) if p.get("m") is not None]
        profile, tunnels = through_tunnels(profile, (load(os.path.join(DATA, "computed", "tunnels", slug + ".json")) or {}).get("tunnels", []))
        steep(slug, profile)
        for u in rt.get("unplaced", []):
            gaps.append("Not on the line: " + u)
        if any(s["doubtful"] for s in stretches):
            gaps.append("Some stretch distances are doubtful. The open map may not know the road riders use, "
                        "so the routing service went the long way round.")
    else:
        gaps.append("No line on the map yet: one or more places could not be found.")

    # ── header ───────────────────────────────────────────────────────────
    h = rs.get("header", {}) or {}
    hp = h.get("highest_point") if isinstance(h.get("highest_point"), dict) else None
    highest = None
    if hp and hp.get("name") and isinstance(hp.get("altitude_m"), (int, float)):
        highest = {"name": str(hp["name"]), "altitude_m": round(hp["altitude_m"]),
                   "source": clean_source(hp.get("source")), "computed": False}
    if highest is None and (profile or waypoints):
        pts = [(p["m"], p["km"]) for p in profile] + [(w["altitude_m"], w["km_from_start"]) for w in waypoints if w["altitude_m"] is not None]
        if pts:
            top_m, top_km = max(pts)
            near = min(waypoints, key=lambda w: abs(w["km_from_start"] - top_km)) if waypoints else None
            highest = {"name": ("near " + near["name"]) if near else "on the route", "altitude_m": round(top_m),
                       "source": None, "computed": True}
    header = {"highway": sourced(h.get("highway")), "distance_km": distance, "map_app_hours": hours,
              "usual_days": sourced(h.get("usual_days")), "highest_point": highest,
              "usual_season": sourced(h.get("usual_season"))}

    # ── rules, season, authorities, hazards, videos ──────────────────────
    rules = []
    for x in rs.get("rules", []) or []:
        src = clean_source(x.get("source"))
        if not src or not x.get("title"):
            continue
        hist = []
        for c in x.get("history", []) or []:
            cs = clean_source(c.get("source"))
            if c.get("change") and cs:
                hist.append({"date": c.get("date"), "change": str(c["change"]), "source": cs})
        rules.append({"id": "rule:" + slugify(x.get("id") or x["title"]), "kind": x.get("kind") or "motorcycle-rule",
                      "title": str(x["title"]), "detail": str(x.get("detail") or ""),
                      "applies_to": x.get("applies_to") or None, "set_by": x.get("set_by") or None,
                      "official_url": x.get("official_url") if re.match(r"^https?://", str(x.get("official_url") or "")) else None,
                      "has_official_order": bool(x.get("has_official_order", False)),
                      "source": src, "history": hist})

    se = rs.get("season", {}) or {}
    years = []
    for y in se.get("history", []) or []:
        srcs = [s for s in (clean_source(s) for s in (y.get("sources") or [])) if s]
        if isinstance(y.get("year"), int) and srcs:
            years.append({"year": y["year"], "connected": y.get("connected"),
                          "open_to_motorcycles": y.get("open_to_motorcycles"), "closed": y.get("closed"),
                          "note": str(y.get("note") or ""), "sources": srcs})
    years.sort(key=lambda y: -y["year"])

    authorities = []
    for i, a in enumerate(rs.get("authorities", []) or []):
        src = clean_source(a.get("source"))
        # Says what an office announces, never what it last said: "Snow clearance finished and road connected"
        # reads as if the road is open today, which Meel never says.
        said = str(a.get("announces") or "")
        if " or " not in said and re.match(r"^\S+( \S+)? (finished|connected|opened|reopened|closed|restored|declared)\b", said, re.I):
            print(f"  check {slug}: {a.get('office')} reads like news, not what it announces: {a.get('announces')}")
        if a.get("office") and src:
            authorities.append({"id": f"authority:{slugify(a['office'])}", "office": str(a["office"]),
                                "announces": str(a.get("announces") or ""), "stretch": a.get("stretch") or None,
                                "channel": a.get("channel") or None,
                                "url": a.get("url") if re.match(r"^https?://", str(a.get("url") or "")) else None,
                                "source": src})
    hazards = []
    for x in rs.get("hazards", []) or []:
        src = clean_source(x.get("source"))
        if x.get("title") and src:
            months = [m for m in (x.get("months") or []) if isinstance(m, int) and 1 <= m <= 12]
            hazards.append({"id": "hazard:" + slugify(x["title"]), "title": str(x["title"]),
                            "detail": str(x.get("detail") or ""), "months": months, "source": src})
    videos = []
    for v in rs.get("videos", []) or []:
        m = re.search(r"(?:v=|youtu\.be/|/shorts/|/embed/)([A-Za-z0-9_-]{11})", str(v.get("url") or ""))
        if m:
            videos.append({"id": m.group(1), "url": f"https://www.youtube.com/watch?v={m.group(1)}",
                           "title": str(v.get("title") or "Video"), "channel": v.get("channel") or None,
                           "stretch": v.get("stretch") or None, "filmed": v.get("filmed") or None,
                           "bike": v.get("bike") or None, "checked": bool(v.get("checked", False))})
    extra_videos = load(os.path.join(DATA, "computed", "videos", slug + ".json"), {}) or {}
    have = {v["id"] for v in videos}
    for v in extra_videos.get("videos", []):
        if v["id"] not in have:
            videos.append(v)
            have.add(v["id"])

    # ── fuel ─────────────────────────────────────────────────────────────
    fuel = {"listed": False, "pumps": [], "pump_count": 0, "stops": 0, "longest_gaps": [], "note": None, "fetched": None}

    def tidy(name):
        """A pump's name as a rider would say it: no stray full stop, and one spelling for each fuel company."""
        name = re.sub(r"[\s.,;:]+$", "", re.sub(r"\s+", " ", str(name))).strip()
        return COMPANIES.get(name.lower(), name)

    if fu:
        pumps = []
        for p in fu.get("pumps", []):
            label = tidy(p.get("name") or p.get("brand") or "Petrol pump")
            if re.search(r"restaurant|garden|hotel|dhaba|[가-힣]", label, re.I):
                continue
            near = min(waypoints, key=lambda w: abs(w["km_from_start"] - p["km_from_start"])) if waypoints else None
            # A pump from the open map, or one from an oil company's own locator, which carries its source.
            company = p.get("osm") is None
            pumps.append({"id": "fuel:" + (p["company_id"] if company else p["osm"].replace("/", "-")), "name": label,
                          "brand": tidy(p["brand"]) if p.get("brand") else None,
                          "near": (p.get("town") or (near["name"] if near else None)) if company else (near["name"] if near else None),
                          "km_from_start": p["km_from_start"], "off_road_m": p.get("off_road_m"),
                          "lat": p["lat"], "lon": p["lon"], "opening_hours": p.get("opening_hours"),
                          "osm_url": None if company else "https://www.openstreetmap.org/" + p["osm"],
                          "source": clean_source(p.get("source")) if company else None})
        # Listed pumps are counted after the ones that are not pumps are dropped, so the count matches the list.
        fuel = {"listed": bool(pumps), "pumps": pumps, "pump_count": len(pumps) if pumps else fu.get("pump_count", 0),
                "stops": fu.get("stops", 0), "longest_gaps": fu.get("longest_gaps", []),
                "note": fu.get("note"), "fetched": fu.get("fetched")}

    facts = len(rules) + len(years) + len(authorities) + len(hazards) + len(fuel["pumps"]) + len(videos) \
        + len(waypoints) + len(stretches) + sum(1 for k in ("highway", "usual_days", "usual_season", "highest_point") if header.get(k))
    written = bool(rt) and (len(rules) + len(authorities) + len(hazards) > 0 or fuel["listed"])
    one_line = h.get("one_line") if isinstance(h.get("one_line"), str) else None

    return {
        "slug": slug, "name": r["name"], "region": r["region"], "region_name": REGION_NAME[r["region"]],
        "batch": r["batch"], "terrain": r["terrain"], "country": r.get("country", "in"),
        "level": "basic" if written else "unwritten", "one_line": one_line, "places": names,
        "header": header, "waypoints": waypoints, "stretches": stretches, "profile": profile, "tunnels": tunnels, "line": line,
        "fuel": fuel, "rules": rules, "season": {"note": se.get("note") or None, "history": years},
        "authorities": authorities, "hazards": hazards, "videos": videos,
        "image": credits.get(slug), "gaps": gaps, "counts": {"facts": facts},
        "built": TODAY,
    }


def main():
    out = os.path.join(DATA, "routes")
    os.makedirs(out, exist_ok=True)
    index = []
    totals = {"rules": 0, "years": 0, "authorities": 0, "hazards": 0, "pumps": 0, "videos": 0, "images": 0, "lines": 0}
    for r in ROUTES:
        d = build(r)
        with open(os.path.join(out, r["slug"] + ".json"), "w", encoding="utf-8") as f:
            json.dump(d, f, ensure_ascii=False, indent=1)
        index.append({k: d[k] for k in ("slug", "name", "region", "region_name", "batch", "terrain", "level", "one_line", "places")}
                     | {"distance_km": d["header"]["distance_km"], "facts": d["counts"]["facts"],
                        "highest_m": (d["header"]["highest_point"] or {}).get("altitude_m"),
                        "image": (d["image"] or {}).get("small"), "has_line": bool(d["line"])})
        totals["rules"] += len(d["rules"]); totals["years"] += len(d["season"]["history"])
        totals["authorities"] += len(d["authorities"]); totals["hazards"] += len(d["hazards"])
        totals["pumps"] += len(d["fuel"]["pumps"]); totals["videos"] += len(d["videos"])
        totals["images"] += 1 if d["image"] else 0; totals["lines"] += 1 if d["line"] else 0
    with open(os.path.join(out, "index.json"), "w", encoding="utf-8") as f:
        json.dump({"built": TODAY, "regions": [{"id": a, "name": b} for a, b in REGIONS], "routes": index}, f, ensure_ascii=False, indent=1)
    print("routes:", len(index), "| written:", sum(1 for i in index if i["level"] == "basic"), "|", totals)


if __name__ == "__main__":
    main()
