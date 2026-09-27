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
    waypoints, stretches, profile, line = [], [], [], []
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
    if fu:
        pumps = []
        for p in fu.get("pumps", []):
            label = p.get("name") or p.get("brand") or "Petrol pump"
            if re.search(r"restaurant|garden|hotel|dhaba|[가-힣]", label, re.I):
                continue
            near = min(waypoints, key=lambda w: abs(w["km_from_start"] - p["km_from_start"])) if waypoints else None
            pumps.append({"id": "fuel:" + p["osm"].replace("/", "-"), "name": label, "brand": p.get("brand"),
                          "near": near["name"] if near else None, "km_from_start": p["km_from_start"],
                          "lat": p["lat"], "lon": p["lon"], "opening_hours": p.get("opening_hours"),
                          "osm_url": "https://www.openstreetmap.org/" + p["osm"]})
        fuel = {"listed": bool(pumps), "pumps": pumps, "pump_count": fu.get("pump_count", len(pumps)),
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
        "header": header, "waypoints": waypoints, "stretches": stretches, "profile": profile, "line": line,
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
