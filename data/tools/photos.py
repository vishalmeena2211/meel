#!/usr/bin/env python3
"""Recent photos near each pass and high halt, with the day each was taken, from Wikimedia Commons.

A photo of Baralacha La from last August says more about the road than one from 2009, so each photo keeps the day
its camera recorded, and the newest are chosen. Only passes, and halts at ALTITUDE_M or more, are looked at: a
photo of a city is no use to a rider.

For each place: photos within RADIUS_M, taken on or after OLDEST_YEAR, PER_PLACE of the newest; PER_ROUTE at most.
Each keeps its author and licence, which Commons requires to be shown beside it.

Writes ../computed/photos/<slug>.json, which assemble.py reads.

Usage:  python3 photos.py [slug ...] [--force]

No key is needed. Commons asks for a named user agent and light use; the script waits between calls.
"""
import html
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "..")
OUT = os.path.join(DATA, "computed", "photos")
sys.path.insert(0, HERE)
from build_computed import UA, load, save, selected  # noqa: E402

API = "https://commons.wikimedia.org/w/api.php"
TODAY = time.strftime("%Y-%m-%d")
RADIUS_M = 3000
ALTITUDE_M = 2000
OLDEST_YEAR = 2016
PER_PLACE = 2
PER_ROUTE = 16
NOT_THE_ROAD = r"\bmap\b|diagram|logo|portrait|selfie|signboard|poster|stamp|coin|\bflag\b|plaque|\bpot\b|animal|interior"
# A photo is kept only when its title names the place, or speaks of the road or how it looks to a rider.
ROAD_WORDS = (r"road|highway|\bpass\b|\bla\b|bridge|approach|route|ghat|plains|nala|tunnel|bike|motorcycle|enfield|"
              r"snow|traverse|hairpin|camp|checkpost|check post|dhaba|valley")


def ask(params):
    q = urllib.parse.urlencode(params | {"format": "json", "formatversion": "2"})
    req = urllib.request.Request(f"{API}?{q}", headers={"User-Agent": UA})
    for i in range(4):
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.load(r)
        except Exception:  # noqa: BLE001
            time.sleep(3 * (i + 1))
    return {}


def plain(value):
    """Text from Commons' metadata, which is often HTML."""
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", value or ""))).strip()


def author(meta):
    """The author's name, short: Commons often holds a sentence or a signature block here."""
    a = plain((meta.get("Artist") or {}).get("value"))
    a = re.sub(r"^(this )?photo (was )?taken by\s*", "", a, flags=re.I)
    a = re.split(r"\s[\(\[|]|(?<![A-Z])\.\s|,\s", a)[0]
    return a[:40].strip() or "Unknown"


def about_the_road(title, place):
    words = place.lower().split()
    return bool(re.search(ROAD_WORDS, title, re.I)) or (bool(words) and words[0] in title.lower())


def taken_day(meta):
    """The day the camera recorded, "YYYY-MM-DD", or None."""
    raw = plain((meta.get("DateTimeOriginal") or {}).get("value"))
    m = re.search(r"(\d{4})[-:](\d{2})[-:](\d{2})", raw)
    return f"{m.group(1)}-{m.group(2)}-{m.group(3)}" if m else None


def near(lat, lon):
    got = ask({"action": "query", "list": "geosearch", "gscoord": f"{lat}|{lon}", "gsradius": RADIUS_M,
               "gsnamespace": 6, "gslimit": 50})
    return [g["title"] for g in got.get("query", {}).get("geosearch", [])]


def details(titles):
    out = {}
    for i in range(0, len(titles), 50):
        got = ask({"action": "query", "prop": "imageinfo", "titles": "|".join(titles[i:i + 50]),
                   "iiprop": "url|extmetadata|mime|size", "iiurlwidth": 480,
                   "iiextmetadatafilter": "DateTimeOriginal|Artist|LicenseShortName|LicenseUrl"})
        for page in got.get("query", {}).get("pages", []):
            info = (page.get("imageinfo") or [{}])[0]
            out[page["title"]] = info
        time.sleep(0.5)
    return out


def photos(args):
    for r in selected(args):
        path = os.path.join(OUT, r["slug"] + ".json")
        route = load(os.path.join(DATA, "routes", r["slug"] + ".json"), None)
        if not route or (os.path.exists(path) and "--force" not in sys.argv):
            continue
        places, seen_names = [], set()
        for w in route["waypoints"]:
            high = w.get("kind") == "pass" or (w.get("altitude_m") or 0) >= ALTITUDE_M
            if high and w["name"] not in seen_names:
                seen_names.add(w["name"])
                places.append(w)
        chosen, used = [], set()
        for w in places:
            titles = [t for t in near(w["lat"], w["lon"])
                      if t not in used and not re.search(NOT_THE_ROAD, t, re.I) and about_the_road(t, w["name"])]
            time.sleep(0.5)
            found = []
            for title, info in details(titles).items():
                meta = info.get("extmetadata") or {}
                day = taken_day(meta)
                if (info.get("mime") != "image/jpeg" or not day or int(day[:4]) < OLDEST_YEAR or day > TODAY
                        or (info.get("width") or 0) < 800 or not info.get("thumburl")):
                    continue
                found.append({"near": w["name"], "kind": w.get("kind", "place"), "km_from_start": w["km_from_start"],
                              "title": title.removeprefix("File:").rsplit(".", 1)[0], "page": info.get("descriptionurl"),
                              "thumb": info["thumburl"], "taken": day,
                              "author": author(meta),
                              "licence": plain((meta.get("LicenseShortName") or {}).get("value")) or "See the photo's page",
                              "licence_url": plain((meta.get("LicenseUrl") or {}).get("value")) or None})
            kept = []
            for p in sorted(found, key=lambda p: p["taken"], reverse=True):
                same = re.sub(r"[\s_-]*crop(ped)?$", "", p["title"], flags=re.I)
                # A crop or panorama of the same shot, or a second photo by the same person on the same day, adds little.
                if any(re.sub(r"[\s_-]*crop(ped)?$", "", k["title"], flags=re.I) == same
                       or (k["taken"] == p["taken"] and k["author"] == p["author"]) for k in kept):
                    continue
                kept.append(p)
            for p in kept[:PER_PLACE]:
                chosen.append(p)
                used.add("File:" + p["title"])
        newest = sorted(chosen, key=lambda p: p["taken"], reverse=True)[:PER_ROUTE]
        save(path, {"slug": r["slug"], "fetched": TODAY, "radius_m": RADIUS_M, "oldest_year": OLDEST_YEAR,
                    "photos": sorted(newest, key=lambda p: p["km_from_start"]),
                    "source": {"data": "Wikimedia Commons", "url": "https://commons.wikimedia.org/",
                               "licence": "Each photo's own, shown beside it"}})
        print(f"photos {r['slug']}: {len(newest)} from {len(places)} places")


if __name__ == "__main__":
    photos([a for a in sys.argv[1:] if not a.startswith("--")])
