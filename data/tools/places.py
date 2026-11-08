#!/usr/bin/env python3
"""Stays and mechanics near each route, from Overture Maps' list of places.

Overture Maps (overturemaps.org) is an open map dataset made by Meta, Microsoft, Amazon and others, partly from
OpenStreetMap. Google keeps a copy in BigQuery (bigquery-public-data.overture_maps.place) and updates it each month.
This asks it, once per route, for places within a corridor around the road, and keeps:

  stays      hotels, guest houses, homestays, hostels, campsites, near a halt that has only a few of them.
             A town with more than TOWN_LIMIT is left out and named instead: a rider needs no list of Manali's hotels.
  mechanics  motorcycle repair, tyre shops, and the bike makers' own service centres. Not rentals, car dealers or
             car washes.

Places below MIN_CONFIDENCE, or marked as closed, are dropped, and so is a second listing of the same place: the same
name within 3 km, or one name starting like the other within 1 km. Phone numbers are not kept: Meel shows a phone
only when its owner agreed to it.

Writes ../computed/places/<slug>.json, which assemble.py reads.

Usage:  python3 places.py [slug ...] [--force]

Needs a Google Cloud login (`gcloud auth login`) and a project to bill the queries to (BQ_PROJECT, default
meel-rideplanner). Each route reads a few megabytes, well inside BigQuery's free terabyte a month.
"""
import json
import math
import os
import re
import subprocess
import sys
import time
import unicodedata
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "computed")
sys.path.insert(0, HERE)
from build_computed import hav, load, project, rdp, save, selected  # noqa: E402

PROJECT = os.environ.get("BQ_PROJECT") or "meel-rideplanner"
TABLE = "bigquery-public-data.overture_maps.place"
TODAY = time.strftime("%Y-%m-%d")

STAY_RADIUS_M = 3000
MECHANIC_RADIUS_M = 2000
MIN_CONFIDENCE = 0.5
TOWN_LIMIT = 40
SAME_PLACE_M = 1000

STAY_CATEGORIES = ("hotel", "resort", "lodging", "private_lodging", "campground", "bed_and_breakfast")
# What a rider would call each kind of stay, by Overture's own category name.
STAY_WORDS = {
    "guest_house": "Guest house", "homestay": "Homestay", "hostel": "Hostel", "campground": "Campsite",
    "campsite": "Campsite", "glamping_service": "Campsite", "resort": "Resort", "bed_and_breakfast": "Bed and breakfast",
    "private_lodging": "Homestay", "motel": "Motel", "inn": "Inn", "cottage": "Cottage", "hotel": "Hotel",
    "lodging": "Lodging",
}
BIKE_MAKERS = r"enfield|ktm|husqvarna|bajaj|hero|honda|tvs|yamaha|suzuki|kawasaki|triumph|harley|jawa|yezdi|benelli|bmw motorrad"
BIKE_WORDS = r"bike|motor ?cycle|two.?wheel|2.?wheel|puncture|tyre|tire|" + BIKE_MAKERS
NOT_A_MECHANIC = r"rent|rental|hire|tour|travels|car wash|maruti|hyundai|toyota|ford|mahindra|tata motors|kia|skoda"
# A stay's own name says what it is more often than its category does: "Snowtown Homestay" is listed as a hotel.
NAME_WORDS = [(r"home ?stay", "Homestay"), (r"guest ?house", "Guest house"), (r"hostel", "Hostel"),
              (r"\bcamps?\b|camping|\btents?\b", "Campsite"), (r"cottage", "Cottage"), (r"resort", "Resort")]
SAME_NAME_M = 3000


def token():
    t = os.environ.get("BQ_TOKEN")
    if t:
        return t
    return subprocess.run(["gcloud", "auth", "print-access-token"], capture_output=True, text=True, check=True).stdout.strip()


def call(url, body=None):
    req = urllib.request.Request(
        url, data=json.dumps(body).encode() if body is not None else None,
        headers={"Authorization": "Bearer " + token(), "Content-Type": "application/json", "x-goog-user-project": PROJECT},
        method="POST" if body is not None else "GET")
    with urllib.request.urlopen(req, timeout=180) as r:
        return json.loads(r.read().decode("utf-8"))


def release_date():
    """The day Google last updated its copy of Overture's places."""
    t = call("https://bigquery.googleapis.com/bigquery/v2/projects/bigquery-public-data/datasets/overture_maps/tables/place")
    return time.strftime("%Y-%m-%d", time.gmtime(int(t["lastModifiedTime"]) / 1000))


def query(sql):
    """Rows as dicts, and the bytes BigQuery billed for the query."""
    r = call(f"https://bigquery.googleapis.com/bigquery/v2/projects/{PROJECT}/queries",
             {"query": sql, "useLegacySql": False, "timeoutMs": 120000, "maxResults": 20000})
    while not r.get("jobComplete"):
        time.sleep(2)
        job = r["jobReference"]
        r = call(f"https://bigquery.googleapis.com/bigquery/v2/projects/{PROJECT}/queries/{job['jobId']}"
                 f"?location={job.get('location', 'US')}&maxResults=20000&timeoutMs=60000")
    names = [f["name"] for f in r["schema"]["fields"]]
    rows = [dict(zip(names, (c["v"] for c in row["f"]))) for row in r.get("rows", [])]
    return rows, int(r.get("totalBytesBilled") or 0)


def sql_for(q_line):
    wkt = "LINESTRING(" + ",".join(f"{x:.5f} {y:.5f}" for x, y in q_line) + ")"
    cats = ",".join(f"'{c}'" for c in STAY_CATEGORIES)
    return f"""
WITH road AS (SELECT ST_GEOGFROMTEXT('{wkt}') g)
SELECT p.id, p.names.primary AS name, p.basic_category AS category, p.taxonomy.primary AS kind, p.confidence,
       ST_Y(p.geometry) AS lat, ST_X(p.geometry) AS lon
FROM `{TABLE}` p, road
WHERE ST_DWITHIN(p.geometry, road.g, {STAY_RADIUS_M})
  AND p.confidence >= {MIN_CONFIDENCE}
  AND IFNULL(p.operating_status, 'open') = 'open'
  AND p.names.primary IS NOT NULL
  AND (p.basic_category IN ({cats})
       OR REGEXP_CONTAINS(IFNULL(p.taxonomy.primary, ''),
                          r'guest_house|homestay|hostel|campground|campsite|motorcycle_repair|motorcycle_dealer|tire|automotive_repair|automotive_service')
       OR p.basic_category IN ('automotive_service', 'vehicle_service'))"""


def tidy(name):
    """A listing's name as it would be written: ordinary letters, no booking-site number in front."""
    name = unicodedata.normalize("NFKC", name)
    name = re.sub(r"^(OYO|FabHotel|Treebo)\s+\d+\s+", "", name, flags=re.I)
    return re.sub(r"\s+", " ", name).strip(" .,-")


def mechanic_words(p):
    """What the shop fixes, in a rider's words, or None when it is not a place that fixes motorcycles."""
    kind = (p["kind"] or "").lower()
    name = p["name"].lower()
    if re.search(NOT_A_MECHANIC, name):
        return None
    if kind == "motorcycle_repair":
        return "Motorcycle repair"
    if "tire" in kind:
        return "Tyres and punctures"
    if kind == "motorcycle_dealer" and re.search(BIKE_MAKERS, name):
        return "Showroom and service centre"
    if kind in ("automotive_repair", "automotive_service") or p["category"] in ("automotive_service", "vehicle_service"):
        return "Vehicle repair" if re.search(BIKE_WORDS, name) else None
    return None


def stay_words(p):
    for pattern, words in NAME_WORDS:
        if re.search(pattern, p["name"], re.I):
            return words
    kind = (p["kind"] or "").lower()
    for k, w in STAY_WORDS.items():
        if k in kind:
            return w
    if p["category"] in STAY_CATEGORIES:
        return STAY_WORDS.get(p["category"], "Stay")
    return None


def name_key(x):
    """A name without the halt's name, punctuation or filler, so "Yak Hotel - Jispa" and "Yak Hotel Jispa" match."""
    words = re.findall(r"[a-z0-9]+", x["name"].lower())
    halt = set(re.findall(r"[a-z0-9]+", x["near"].lower()))
    return " ".join(w for w in words if w not in halt and w not in ("the", "and", "n"))


def without_repeats(items):
    """One listing per place, and the surer listing stays. The same name within SAME_NAME_M is the same place, and so
    is a name that starts like another within SAME_PLACE_M ("Hotel Ibex" and "Hotel Ibex Jispa")."""
    kept = []
    for x in sorted(items, key=lambda x: -x["confidence"]):
        kx = name_key(x)
        same = False
        for k in kept:
            kk = name_key(k)
            far = hav((x["lat"], x["lon"]), (k["lat"], k["lon"])) * 1000
            if (kx == kk and far < SAME_NAME_M) or ((kx.startswith(kk) or kk.startswith(kx)) and min(len(kx), len(kk)) >= 6 and far < SAME_PLACE_M):
                same = True
                break
        if not same:
            kept.append(x)
    return sorted(kept, key=lambda x: (x["km_from_start"], x["name"]))


def places(args):
    release = None
    for r in selected(args):
        rpath = os.path.join(OUT, "route", r["slug"] + ".json")
        path = os.path.join(OUT, "places", r["slug"] + ".json")
        if not os.path.exists(rpath) or (os.path.exists(path) and "--force" not in sys.argv):
            continue
        release = release or release_date()
        rt = load(rpath, None)
        line, total = rt["line"], rt["distance_km"]
        cum = [0.0]
        for a, b in zip(line, line[1:]):
            cum.append(cum[-1] + hav((a[1], a[0]), (b[1], b[0])))
        scale = total / cum[-1] if cum[-1] else 1.0
        q_line = rdp(line, 0.004 if total < 800 else 0.02)
        if len(q_line) > 400:
            q_line = q_line[:: math.ceil(len(q_line) / 400)] + [q_line[-1]]
        try:
            rows, billed = query(sql_for(q_line))
        except Exception as e:  # noqa: BLE001
            print(f"places {r['slug']}: FAILED {e}")
            continue

        halts = [w for w in rt["waypoints"] if w.get("kind") == "place"] or rt["waypoints"]
        stays, mechanics = [], []
        for row in rows:
            p = {"id": row["id"], "name": tidy(row["name"] or ""), "category": row["category"], "kind": row["kind"],
                 "confidence": round(float(row["confidence"] or 0), 2), "lat": round(float(row["lat"]), 5),
                 "lon": round(float(row["lon"]), 5)}
            if not p["name"]:
                continue
            km, off = project(line, cum, (p["lat"], p["lon"]))
            km = round(km * scale, 1)
            # The halt nearest along the road, as fuel pumps are placed, not the nearest as the crow flies.
            halt = min(halts, key=lambda w: abs(w["km_from_start"] - km))
            p |= {"km_from_start": km, "off_road_m": round(off), "near": halt["name"]}
            fixes = mechanic_words(p)
            if fixes and off <= MECHANIC_RADIUS_M:
                mechanics.append(p | {"what": fixes})
                continue
            what = stay_words(p)
            if what and off <= STAY_RADIUS_M:
                stays.append(p | {"what": what})

        stays, mechanics = without_repeats(stays), without_repeats(mechanics)
        by_halt = {}
        for s in stays:
            by_halt[s["near"]] = by_halt.get(s["near"], 0) + 1
        crowded = {h for h, n in by_halt.items() if n > TOWN_LIMIT}
        left_out = [{"near": h, "count": by_halt[h]} for h in sorted(crowded, key=lambda h: -by_halt[h])]
        stays = [s for s in stays if s["near"] not in crowded]

        save(path, {"slug": r["slug"], "fetched": TODAY, "overture_release": release,
                    "stay_radius_m": STAY_RADIUS_M, "mechanic_radius_m": MECHANIC_RADIUS_M,
                    "min_confidence": MIN_CONFIDENCE, "town_limit": TOWN_LIMIT,
                    "stays": stays, "stays_left_out": left_out, "mechanics": mechanics,
                    "bytes_billed": billed,
                    "source": {"service": "BigQuery public dataset", "data": "Overture Maps Foundation, places theme",
                               "licence": "Community Data License Agreement, Permissive 2.0",
                               "url": "https://docs.overturemaps.org/attribution/"}})
        print(f"places {r['slug']}: {len(stays)} stays, {len(mechanics)} mechanics, "
              f"{sum(x['count'] for x in left_out)} stays left out in {', '.join(x['near'] for x in left_out) or 'no town'}"
              f" · {billed / 1e6:.1f} MB")


if __name__ == "__main__":
    places([a for a in sys.argv[1:] if not a.startswith("--")])
