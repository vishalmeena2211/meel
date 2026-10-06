#!/usr/bin/env python3
"""Pumps from the oil companies' own locators, for routes where the open map is missing pumps.

IndianOil (locator.iocl.com) and HP (petrolpump.hpretail.in) both keep a public page for each outlet, on the same
platform. Each site has a sitemap of districts, each district a list of outlet pages, and each outlet page carries
the pump's name, town and position. This reads only the districts a route passes through (DISTRICTS below), keeps
the pumps that lie within 2.5 km of the route's line, and prints them, each marked "add" when the open map has no
pump near it. With --write it puts those in the route's research file, under pumps_from_companies, where the fuel
stage of build_computed.py picks them up. The "why" sentence there is written by hand.

Usage:  python3 company_pumps.py <slug> [...] [--write]

Every page is kept under ../computed/locators/, so a re-run fetches nothing it already has. One request a second.
Both sites' robots files allow the sitemaps and the outlet pages. Nothing here fills in a form on either site.
"""
import gzip
import html
import json
import os
import re
import sys
import time
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from build_computed import UA, hav, project  # noqa: E402

CACHE = os.path.join(HERE, "..", "computed", "locators")
RESEARCH = os.path.join(HERE, "..", "research")
TODAY = time.strftime("%Y-%m-%d")

COMPANIES = {
    "iocl": {"site": "https://locator.iocl.com", "brand": "Indian Oil", "title": "IndianOil locator"},
    "hp": {"site": "https://petrolpump.hpretail.in", "brand": "HP", "title": "HP locator"},
}

# The districts each route passes through, as each site's sitemap names them (state/district). The two sites do not
# always cut a state the same way: HP lists no Lahaul and Spiti, IndianOil lists Rishikesh apart from Dehradun.
DISTRICTS = {
    # Uttarakhand
    "char-dham": {"iocl": ["uttarakhand/uttarkashi", "uttarakhand/tehri_garhwal", "uttarakhand/new_tehri", "uttarakhand/rudraprayag",
                           "uttarakhand/srinagar_uk", "uttarakhand/pauri_garhwal", "uttarakhand/chamoli"],
                  "hp": ["uttarakhand/uttarkashi", "uttarakhand/tehri_garhwal", "uttarakhand/rudraprayag", "uttarakhand/srinagar_uk",
                         "uttarakhand/pauri_garhwal", "uttarakhand/chamoli", "uttarakhand/karanprayag"]},
    "chopta-tungnath": {"iocl": ["uttarakhand/tehri_garhwal", "uttarakhand/srinagar_uk", "uttarakhand/pauri_garhwal",
                                 "uttarakhand/rudraprayag", "uttarakhand/chamoli"],
                        "hp": ["uttarakhand/tehri_garhwal", "uttarakhand/srinagar_uk", "uttarakhand/pauri_garhwal",
                               "uttarakhand/rudraprayag", "uttarakhand/chamoli", "uttarakhand/karanprayag"]},
    "munsiyari-kumaon": {"iocl": ["uttarakhand/nainital", "uttarakhand/almora", "uttarakhand/bageshwar", "uttarakhand/pithoragarh"],
                         "hp": ["uttarakhand/nainital", "uttarakhand/almora", "uttarakhand/bageshwar", "uttarakhand/pithoragarh"]},
    "adi-kailash-om-parvat": {"iocl": ["uttarakhand/pithoragarh"], "hp": ["uttarakhand/pithoragarh"]},
    "mussoorie-dhanaulti-chakrata": {"iocl": ["uttarakhand/dehradun", "uttarakhand/tehri_garhwal", "uttarakhand/new_tehri", "uttarakhand/vikasnagar"],
                                     "hp": ["uttarakhand/dehradun", "uttarakhand/tehri_garhwal", "uttarakhand/vikasnagar"]},
    # Ladakh and Zanskar. IndianOil lists Leh and Kargil under both Ladakh and Jammu and Kashmir.
    "manali-leh": {"iocl": ["himachal_pradesh/manali", "himachal_pradesh/lahul_spiti", "ladakh/leh", "jammu_and_kashmir/leh"],
                   "hp": ["himachal_pradesh/manali", "ladakh/leh"]},
    "srinagar-leh": {"iocl": ["jammu_and_kashmir/srinagar", "jammu_and_kashmir/kargil", "ladakh/kargil", "ladakh/leh", "jammu_and_kashmir/leh"],
                     "hp": ["jammu_and_kashmir/srinagar", "ladakh/kargil", "ladakh/leh"]},
    "nubra-turtuk": {"iocl": ["ladakh/leh", "jammu_and_kashmir/leh"], "hp": ["ladakh/leh"]},
    "pangong-hanle-tso-moriri": {"iocl": ["ladakh/leh", "jammu_and_kashmir/leh"], "hp": ["ladakh/leh"]},
    "kargil-padum": {"iocl": ["ladakh/kargil", "jammu_and_kashmir/kargil"], "hp": ["ladakh/kargil"]},
    "darcha-shinku-la-padum": {"iocl": ["himachal_pradesh/lahul_spiti", "ladakh/kargil", "jammu_and_kashmir/kargil"], "hp": ["ladakh/kargil"]},
    # Kashmir
    "mughal-road": {"iocl": ["jammu_and_kashmir/srinagar", "jammu_and_kashmir/pulwama", "jammu_and_kashmir/poonch", "jammu_and_kashmir/rajauri"],
                    "hp": ["jammu_and_kashmir/srinagar", "jammu_and_kashmir/pulwama", "jammu_and_kashmir/poonch", "jammu_and_kashmir/rajauri"]},
    "gurez-valley": {"iocl": ["jammu_and_kashmir/baramulla"], "hp": ["jammu_and_kashmir/baramulla"]},
    # Himachal
    "spiti-circuit": {"iocl": ["himachal_pradesh/shimla", "himachal_pradesh/rampur", "himachal_pradesh/kinnaur", "himachal_pradesh/lahul_spiti",
                               "himachal_pradesh/manali", "himachal_pradesh/kullu"],
                      "hp": ["himachal_pradesh/shimla", "himachal_pradesh/rampur", "himachal_pradesh/kinnaur", "himachal_pradesh/manali",
                             "himachal_pradesh/kullu"]},
    "kinnaur": {"iocl": ["himachal_pradesh/rampur", "himachal_pradesh/kinnaur"], "hp": ["himachal_pradesh/rampur", "himachal_pradesh/kinnaur"]},
    "sach-pass-pangi": {"iocl": ["himachal_pradesh/chamba", "jammu_and_kashmir/doda"], "hp": ["himachal_pradesh/chamba", "jammu_and_kashmir/doda"]},
    # Sikkim and North Bengal. HP lists no North Sikkim.
    "north-sikkim": {"iocl": ["sikkim/gangtok", "sikkim/east_sikkim", "sikkim/north_sikkim"], "hp": ["sikkim/east_sikkim"]},
    "east-sikkim-silk-route": {"iocl": ["sikkim/gangtok", "sikkim/east_sikkim"], "hp": ["sikkim/east_sikkim"]},
    "darjeeling-kalimpong-sandakphu": {"iocl": ["west_bengal/darjeeling", "west_bengal/kalimpong"], "hp": ["west_bengal/darjeeling", "west_bengal/kalimpong"]},
    # North-East
    "arunachal-centre-east": {"iocl": ["arunachal_pradesh/lower_subansiri", "arunachal_pradesh/upper_subansiri", "arunachal_pradesh/west_siang",
                                       "arunachal_pradesh/upper_siang", "arunachal_pradesh/east_siang", "arunachal_pradesh/lower_dibang_valley",
                                       "arunachal_pradesh/dibang_valley", "arunachal_pradesh/lohit", "arunachal_pradesh/namsai"],
                              "hp": ["arunachal_pradesh/lower_subansiri", "arunachal_pradesh/upper_subansiri", "arunachal_pradesh/west_siang",
                                     "arunachal_pradesh/east_siang", "arunachal_pradesh/lower_dibang_valley", "arunachal_pradesh/lohit"]},
    "nagaland": {"iocl": ["nagaland/kohima", "nagaland/wokha", "nagaland/zunhebotto", "nagaland/mokokchung", "nagaland/longleng",
                          "nagaland/tuensang", "nagaland/mon", "assam/sibsagar"],
                 "hp": ["nagaland/kohima", "nagaland/zunhebotto", "nagaland/mokokchung", "nagaland/mon", "assam/sibsagar"]},
    "manipur-mizoram": {"iocl": ["manipur/bishnupur", "manipur/churachandpur", "mizoram/aizawl", "mizoram/champhai", "mizoram/serchhip"],
                        "hp": ["manipur/bishnupur", "mizoram/aizawl", "mizoram/champhai", "mizoram/serchhip"]},
    "assam-kaziranga-majuli": {"iocl": ["assam/kamrup", "assam/marigaon", "assam/nagaon", "assam/golaghat", "assam/bokakhat"],
                               "hp": ["assam/kamrup", "assam/marigaon", "assam/nagaon", "assam/golaghat", "assam/bokakhat"]},
    # Plains, coast and south: only the districts the long gaps run through, as these districts have many pumps
    "rann-of-kutch": {"iocl": ["gujarat/bhuj", "gujarat/kachchh", "gujarat/kutch"], "hp": ["gujarat/bhuj", "gujarat/kachchh"]},
    "chhattisgarh-bastar": {"iocl": ["chhattisgarh/dhamtari", "chhattisgarh/kanker", "chhattisgarh/kondagaon", "chhattisgarh/bastar",
                                     "chhattisgarh/jagdalpur"],
                            "hp": ["chhattisgarh/dhamtari", "chhattisgarh/kanker", "chhattisgarh/kondagaon", "chhattisgarh/bastar",
                                   "chhattisgarh/jagdalpur"]},
    "rajasthan-desert": {"iocl": ["rajasthan/beawar", "rajasthan/sojat", "rajasthan/jaisalmer"],
                         "hp": ["rajasthan/beawar", "rajasthan/sojat", "rajasthan/jaisalmer"]},
    "tamil-nadu-hill-roads": {"iocl": ["tamil_nadu/pollachi", "tamil_nadu/udumalpet", "tamil_nadu/palani",
                                       "tamil_nadu/coimbatore:valparai|aliyar|attakatti"],
                              "hp": ["tamil_nadu/pollachi", "tamil_nadu/palani", "tamil_nadu/coimbatore:valparai|aliyar|attakatti"]},
    "konkan-coast": {"iocl": ["maharashtra/alibag", "maharashtra/raigad", "maharashtra/raigarh_mh", "maharashtra/khed", "maharashtra/chiplun",
                              "maharashtra/ratnagiri", "maharashtra/kudal", "maharashtra/sindhudurg"],
                     "hp": ["maharashtra/alibag", "maharashtra/raigad", "maharashtra/raigarh_mh", "maharashtra/chiplun",
                            "maharashtra/ratnagiri", "maharashtra/kudal", "maharashtra/sindhudurg"]},
    "madhya-pradesh": {"iocl": ["madhya_pradesh/narmadapuram", "madhya_pradesh/hoshangabad", "madhya_pradesh/narsinghpur", "madhya_pradesh/sagar"],
                       "hp": ["madhya_pradesh/narmadapuram", "madhya_pradesh/hoshangabad", "madhya_pradesh/narsinghpur", "madhya_pradesh/sagar"]},
}

OFF_ROAD_M = 2500   # the fuel stage drops a pump further than this from the line
SAME_PUMP_M = 300   # and one this close to a pump already on the map
# Only the holes are filled: a pump within this many km along the road of one already on the map changes no gap,
# so it is left out, and a town the map serves well does not fill up with every pump in it.
NEAR_MAPPED_KM = 5

_last = [0.0]


def fetch(url, path):
    """The page at url, from the cache when it is there. Pages are kept gzipped."""
    if os.path.exists(path):
        with open(path, "rb") as f:
            raw = f.read()
    else:
        wait = 1.1 - (time.time() - _last[0])
        if wait > 0:
            time.sleep(wait)
        raw = None
        for i in range(3):
            try:
                req = urllib.request.Request(url, headers={"User-Agent": UA})
                with urllib.request.urlopen(req, timeout=60) as r:
                    raw = r.read()
                break
            except Exception as e:  # noqa: BLE001
                print(f"  ! {url[:100]} :: {e}")
                time.sleep(5 * (i + 1))
        _last[0] = time.time()
        if raw is None:
            return None
        if raw[:2] != b"\x1f\x8b":
            raw = gzip.compress(raw)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "wb") as f:
            f.write(raw)
    return gzip.decompress(raw).decode("utf-8", "replace")


def district_maps(company):
    """{"state/district": sitemap url} from the site's sitemap index."""
    c = COMPANIES[company]
    text = fetch(c["site"] + "/sitemap.xml", os.path.join(CACHE, company, "sitemap.xml.gz"))
    out = {}
    for u in re.findall(r"<loc>([^<]+\.xml\.gz)</loc>", text or ""):
        m = re.search(r"/sitemap/google/\d+/([^/]+)/([^/]+)\.xml\.gz$", u)
        if m:
            out[m.group(1) + "/" + m.group(2)] = u
    return out


def outlet_urls(company, key, maps):
    """The outlet pages a district lists. "state/district:town|town" keeps only the outlets whose address, as the page's
    link spells it, names one of those towns, so a large district is not read whole for one valley."""
    key, _, towns = key.partition(":")
    text = fetch(maps[key], os.path.join(CACHE, company, "districts", key + ".xml.gz"))
    urls = sorted(set(u for u in re.findall(r"<loc>([^<]+/Home)</loc>", text or "") if "-petrol-pump-" in u))
    if towns:
        urls = [u for u in urls if any(re.search(r"-petrol-pump-.*\b" + t + r"\b", u) for t in towns.split("|"))]
    return urls


def name_case(s):
    """A name written all in capitals, in ordinary case; any other name as the company wrote it, less a leading
    "M/s" (messrs) or "MS HSD" (petrol and diesel) that some outlets put before their name."""
    s = re.sub(r"\s+", " ", html.unescape(s or "")).strip()
    s = re.sub(r"^(m/s\.?\s*)?(ms\s*/?\s*hsd\s+|hsd\s+)?", "", s, flags=re.I) or s
    return " ".join(w[:1].upper() + w[1:].lower() for w in s.split(" ")) if s.isupper() else s


def outlet(company, url):
    """Name, town and position as the outlet's own page gives them, or None."""
    m = re.search(r"-(\d+)/Home$", url)
    if not m:
        return None
    oid = m.group(1)
    text = fetch(url, os.path.join(CACHE, company, "pages", oid + ".html.gz"))
    if not text:
        return None
    own = None
    for block in re.findall(r'<script[^>]*application/ld\+json[^>]*>(.*?)</script>', text, re.S):
        try:
            d = json.loads(block)
        except ValueError:
            continue
        for it in d if isinstance(d, list) else [d]:
            if isinstance(it, dict) and it.get("@type") == "GasStation" and it.get("url") == url:
                own = it
    if not own:
        return None
    geo = own.get("geo") or {}
    try:
        lat, lon = float(geo["latitude"]), float(geo["longitude"])
    except (KeyError, TypeError, ValueError):
        return None
    if not (6 < lat < 37.5 and 68 < lon < 98):   # not a position in India
        return None
    addr = own.get("address") or {}
    closed = re.search(r"(temporarily|permanently) closed", text, re.I)
    name = name_case(own.get("alternateName")) or COMPANIES[company]["brand"]
    return {"id": f"{company}-{oid}", "name": name, "town": name_case(addr.get("addressLocality")) or None,
            "district": name_case(addr.get("addressRegion")) or None, "lat": round(lat, 5), "lon": round(lon, 5),
            "url": url, "closed": closed.group(0) if closed else None}


def main(args, write):
    for slug in args:
        plan = DISTRICTS.get(slug)
        if not plan:
            print(f"{slug}: no districts listed")
            continue
        rt = json.load(open(os.path.join(HERE, "..", "computed", "route", slug + ".json"), encoding="utf-8"))
        line = rt["line"]
        cum = [0.0]
        for a, b in zip(line, line[1:]):
            cum.append(cum[-1] + hav((a[1], a[0]), (b[1], b[0])))
        scale = rt["distance_km"] / cum[-1] if cum[-1] else 1.0
        # pumps already on the open map, from the last fuel run
        fu = json.load(open(os.path.join(HERE, "..", "computed", "fuel", slug + ".json"), encoding="utf-8"))
        mapped = [p for p in fu.get("pumps", []) if p.get("osm")]
        found, seen = [], set()
        for company, keys in plan.items():
            maps = district_maps(company)
            for key in keys:
                if key.partition(":")[0] not in maps:
                    print(f"  ! {company} has no district {key}")
                    continue
                urls = outlet_urls(company, key, maps)
                print(f"  {company} {key}: {len(urls)} outlets")
                for u in urls:
                    o = outlet(company, u)
                    if not o or o["id"] in seen:
                        continue
                    seen.add(o["id"])
                    km, off = project(line, cum, (o["lat"], o["lon"]))
                    if off > OFF_ROAD_M:
                        continue
                    o["km"], o["off_m"] = round(km * scale, 1), round(off)
                    o["on_map"] = any(hav((o["lat"], o["lon"]), (p["lat"], p["lon"])) * 1000 < SAME_PUMP_M for p in mapped)
                    o["near_mapped"] = any(abs(o["km"] - p["km_from_start"]) < NEAR_MAPPED_KM for p in mapped)
                    found.append(o)
        found.sort(key=lambda o: o["km"])
        # Two outlets at one position are more likely a position the company never filled in than two pumps.
        spots = {}
        for o in found:
            spots.setdefault((o["lat"], o["lon"]), []).append(o["id"])
        for o in found:
            note = "closed" if o["closed"] else "same position as another" if len(spots[(o["lat"], o["lon"])]) > 1 \
                else "on the map already" if o["on_map"] else "a pump on the map is near" if o["near_mapped"] else "add"
            o["verdict"] = note
            print(f"    km {o['km']:7.1f}  {o['off_m']:5d} m  {o['id']:12s} {o['name'][:40]:40s} {str(o['town'])[:22]:22s} {note}")
        keep = [o for o in found if o["verdict"] == "add"]
        print(f"{slug}: {len(found)} on the road, {len(keep)} to add")
        if not write:
            continue
        path = os.path.join(RESEARCH, slug + ".json")
        rs = json.load(open(path, encoding="utf-8"))
        block = rs.get("pumps_from_companies") or {"why": "", "pumps": []}
        have = {p["id"]: p for p in block.get("pumps", [])}
        for o in keep:
            c = COMPANIES[o["id"].split("-")[0]]
            have[o["id"]] = {"id": o["id"], "name": o["name"], "brand": c["brand"], "town": o["town"],
                             "lat": o["lat"], "lon": o["lon"],
                             "source": {"url": o["url"], "title": f"{c['title']}: {o['name']}, {o['town'] or o['district']}",
                                        "kind": "official", "opened": True, "source_date": None, "accessed": TODAY}}
        block["pumps"] = list(have.values())
        rs["pumps_from_companies"] = block
        tmp = path + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(rs, f, ensure_ascii=False, indent=2)
            f.write("\n")
        os.replace(tmp, path)
        print(f"{slug}: research file now lists {len(block['pumps'])} pumps from the companies")


if __name__ == "__main__":
    rest = [a for a in sys.argv[1:] if not a.startswith("--")]
    if not rest:
        print(__doc__)
        sys.exit(1)
    main(rest, "--write" in sys.argv)
