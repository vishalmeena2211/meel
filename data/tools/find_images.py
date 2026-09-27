#!/usr/bin/env python3
"""Find freely licensed pictures for each route on Wikimedia Commons.

  candidates   search, keep the best few per route, save small previews for a person to look at
  fetch        download the chosen pictures and write the credits file

Only pictures under a free licence are kept: Creative Commons Attribution, Attribution-ShareAlike,
CC0, or public domain. Each one's author and licence are recorded, because both must be shown
wherever the picture is shown.

Usage:  python3 find_images.py candidates [slug ...]
        python3 find_images.py fetch
"""
import html
import json
import os
import re
import socket
import sys
import time
import urllib.parse
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "..")
OUT = os.path.join(DATA, "computed", "images")
PREVIEWS = os.environ.get("MEEL_PREVIEWS", os.path.join(DATA, "computed", "_image_previews"))
UA = "meel-rideplanner/0.1 (hobby route notebook; https://rideplanner.in)"
TODAY = time.strftime("%Y-%m-%d")

# This network resets connections to Commons over IPv6, so use IPv4 only.
_orig = socket.getaddrinfo
socket.getaddrinfo = lambda *a, **k: [x for x in _orig(*a, **k) if x[0] == socket.AF_INET]

QUERIES = {
    "manali-leh": ["Gata Loops", "Baralacha La", "Leh Manali Highway", "More plains Ladakh"],
    "srinagar-leh": ["Zoji La", "Lamayuru", "Fotu La", "Srinagar Leh highway"],
    "nubra-turtuk": ["Nubra Valley", "Khardung La", "Hunder sand dunes", "Turtuk"],
    "pangong-hanle-tso-moriri": ["Pangong Tso", "Tso Moriri", "Hanle Ladakh", "Chang La"],
    "umling-la": ["Umling La", "Hanle Indian Astronomical Observatory", "Changthang Ladakh"],
    "darcha-shinku-la-padum": ["Shingo La", "Phugtal Monastery", "Zanskar valley", "Padum"],
    "kargil-padum": ["Drang Drung Glacier", "Pensi La", "Rangdum", "Suru valley"],
    "kashmir-valley": ["Gulmarg", "Pahalgam", "Sonamarg", "Dal Lake"],
    "gurez-valley": ["Gurez", "Habba Khatoon peak", "Razdan Pass"],
    "mughal-road": ["Mughal Road Kashmir", "Pir Ki Gali", "Peer Ki Gali"],
    "spiti-circuit": ["Key Monastery", "Spiti Valley", "Kunzum Pass", "Kaza Spiti"],
    "kinnaur": ["Chitkul", "Kalpa Kinnaur", "Sangla Valley", "Kinnaur Kailash"],
    "sach-pass-pangi": ["Sach Pass", "Pangi valley", "Killar Pangi"],
    "jalori-tirthan": ["Jalori Pass", "Tirthan Valley", "Serolsar Lake", "Jibhi"],
    "dharamshala-bir-billing": ["Bir Billing", "McLeod Ganj", "Dhauladhar", "Dharamshala"],
    "kasol-parvati": ["Parvati Valley", "Kasol", "Manikaran", "Tosh Himachal"],
    "char-dham": ["Badrinath", "Kedarnath", "Gangotri", "Mana Uttarakhand"],
    "chopta-tungnath": ["Chopta Uttarakhand", "Tungnath", "Chandrashila"],
    "munsiyari-kumaon": ["Munsiyari", "Panchachuli", "Kausani", "Nainital"],
    "adi-kailash-om-parvat": ["Om Parvat", "Adi Kailash", "Gunji Uttarakhand"],
    "mussoorie-dhanaulti-chakrata": ["Mussoorie", "Dhanaulti", "Chakrata", "Kempty Falls"],
    "north-sikkim": ["Gurudongmar Lake", "Yumthang Valley", "Lachung", "Lachen Sikkim"],
    "east-sikkim-silk-route": ["Zuluk", "Tsomgo Lake", "Nathu La", "Thambi View Point"],
    "darjeeling-kalimpong-sandakphu": ["Sandakphu", "Darjeeling", "Kangchenjunga Darjeeling", "Batasia Loop"],
    "guwahati-tawang": ["Sela Pass", "Tawang Monastery", "Tawang", "Dirang"],
    "arunachal-centre-east": ["Ziro valley", "Mechuka", "Dibang Valley", "Walong"],
    "meghalaya": ["Dawki", "Nohkalikai Falls", "Cherrapunji", "Living root bridge"],
    "nagaland": ["Dzukou Valley", "Kohima", "Hornbill Festival", "Mon Nagaland"],
    "assam-kaziranga-majuli": ["Kaziranga National Park", "Majuli", "Brahmaputra Assam"],
    "manipur-mizoram": ["Loktak Lake", "Aizawl", "Champhai", "Imphal"],
    "bhutan": ["Paro Taktsang", "Dochula Pass", "Punakha Dzong", "Thimphu"],
    "nepal-mustang": ["Muktinath", "Jomsom", "Kali Gandaki Mustang", "Pokhara Phewa"],
    "rajasthan-desert": ["Sam Sand Dunes", "Jaisalmer Fort", "Thar Desert", "Longewala"],
    "rajasthan-hills": ["Kumbhalgarh", "Mount Abu", "Udaipur Lake Pichola", "Ranakpur"],
    "rann-of-kutch": ["Rann of Kutch", "White Rann", "Dholavira", "Kalo Dungar"],
    "konkan-coast": ["Konkan coast", "Ganpatipule", "Harihareshwar", "Murud Janjira", "Malvan"],
    "sahyadri-ghats": ["Malshej Ghat", "Tamhini Ghat", "Mahabaleshwar", "Lonavala"],
    "goa-gokarna-karnataka-coast": ["Maravanthe", "Gokarna Karnataka", "Murudeshwar", "Palolem"],
    "madhya-pradesh": ["Pachmarhi", "Khajuraho", "Orchha", "Satpura"],
    "chhattisgarh-bastar": ["Chitrakote Falls", "Tirathgarh Falls", "Bastar Chhattisgarh"],
    "odisha": ["Konark Sun Temple", "Chilika Lake", "Deomali", "Koraput", "Puri beach"],
    "andhra-araku-gandikota": ["Gandikota", "Araku Valley", "Lambasingi", "Borra Caves"],
    "nilgiris": ["Ooty", "Nilgiri mountains", "Bandipur National Park", "Masinagudi", "Coonoor"],
    "kerala-hills": ["Munnar", "Vagamon", "Periyar Thekkady", "Wayanad"],
    "karnataka-hills": ["Mullayanagiri", "Agumbe", "Coorg Kodagu", "Chikmagalur", "Kudremukh"],
    "hampi-badami": ["Hampi", "Badami cave temples", "Pattadakal", "Virupaksha Temple Hampi"],
    "tamil-nadu-hill-roads": ["Kolli Hills", "Valparai", "Kodaikanal", "Yercaud"],
    "east-coast": ["Dhanushkodi", "Pamban Bridge", "Shore Temple Mahabalipuram", "Puducherry promenade"],
    "kashmir-kanyakumari": ["Kanyakumari", "Vivekananda Rock Memorial", "National Highway 44 India"],
    "golden-quadrilateral": ["Golden Quadrilateral", "National Highway India", "Mumbai Pune Expressway"],
}

FREE = re.compile(r"^(CC BY(-SA)? [0-9.]+|CC0|Public domain|PDM|CC BY(-SA)?( [0-9.]+)? [a-z-]+)", re.I)
BAD_WORDS = re.compile(r"\b(map|logo|flag|locator|diagram|plan of|coat of arms|stamp|poster|painting|sketch|portrait)\b", re.I)


def get(url, binary=False, timeout=60, tries=4):
    last = None
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                b = r.read()
                return b if binary else json.loads(b.decode("utf-8"))
        except Exception as e:  # noqa: BLE001
            last = e
            time.sleep(3 * (i + 1))
    raise RuntimeError(f"failed: {url[:100]} :: {last}")


def text(v):
    v = re.sub(r"<[^>]+>", " ", v or "")
    return re.sub(r"\s+", " ", html.unescape(v)).strip()


def search(q):
    url = "https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode({
        "action": "query", "generator": "search", "gsrnamespace": 6, "gsrsearch": q + " filetype:bitmap",
        "gsrlimit": 30, "prop": "imageinfo", "iiprop": "url|size|mime|extmetadata", "iiurlwidth": 640, "format": "json"})
    d = get(url)
    out = []
    for p in d.get("query", {}).get("pages", {}).values():
        ii = (p.get("imageinfo") or [None])[0]
        if not ii:
            continue
        m = ii.get("extmetadata", {})
        g = lambda k: (m.get(k) or {}).get("value", "")  # noqa: E731
        out.append({
            "title": p["title"], "page": ii.get("descriptionurl"), "order": p.get("index", 99),
            "width": ii.get("width"), "height": ii.get("height"), "mime": ii.get("mime"),
            "thumb": ii.get("thumburl"), "original": ii.get("url"),
            "licence": text(g("LicenseShortName")), "licence_url": g("LicenseUrl"),
            "author": text(g("Artist"))[:120], "credit": text(g("Credit"))[:120],
            "description": text(g("ImageDescription"))[:300], "taken": text(g("DateTimeOriginal"))[:30],
            "assessments": g("Assessments"), "query": q,
        })
    return out


def score(c):
    s = 0.0
    a = c["assessments"].lower()
    if "featured" in a:
        s += 60
    if "quality" in a:
        s += 40
    if "valued" in a:
        s += 15
    mp = (c["width"] * c["height"]) / 1e6
    s += min(mp, 24) * 1.2
    ratio = c["width"] / c["height"]
    s += 12 if 1.3 <= ratio <= 2.0 else 0
    s -= c["order"] * 0.6
    return round(s, 1)


def candidates(args):
    os.makedirs(OUT, exist_ok=True)
    for slug, qs in QUERIES.items():
        if args and slug not in args:
            continue
        path = os.path.join(OUT, slug + ".json")
        if os.path.exists(path) and "--force" not in sys.argv:
            continue
        seen, pool = set(), []
        for q in qs:
            try:
                res = search(q)
            except Exception as e:  # noqa: BLE001
                print("  !", slug, q, e)
                continue
            for c in res:
                if c["title"] in seen:
                    continue
                seen.add(c["title"])
                if c["mime"] != "image/jpeg" or not c["width"] or c["width"] < 1800:
                    continue
                if not FREE.match(c["licence"]):
                    continue
                ratio = c["width"] / c["height"]
                if ratio < 1.15 or ratio > 2.6:
                    continue
                if BAD_WORDS.search(c["title"]) or BAD_WORDS.search(c["description"][:80]):
                    continue
                if not c["author"]:
                    continue
                c["score"] = score(c)
                pool.append(c)
            time.sleep(0.8)
        pool.sort(key=lambda c: -c["score"])
        top = pool[:9]
        d = os.path.join(PREVIEWS, slug)
        os.makedirs(d, exist_ok=True)
        for i, c in enumerate(top):
            try:
                with open(os.path.join(d, f"{i + 1}.jpg"), "wb") as f:
                    f.write(get(c["thumb"], binary=True))
                c["preview"] = f"{i + 1}.jpg"
            except Exception as e:  # noqa: BLE001
                print("  ! preview", slug, i, e)
            time.sleep(0.3)
        with open(path, "w", encoding="utf-8") as f:
            json.dump({"slug": slug, "searched": TODAY, "queries": qs, "candidates": top}, f, ensure_ascii=False, indent=1)
        print(f"{slug}: {len(pool)} usable, kept {len(top)}; best {top[0]['title'][:50] if top else None}")


def fetch(args):
    """Download the chosen pictures. choices.json maps slug -> candidate number (1-based)."""
    choices = json.load(open(os.path.join(OUT, "choices.json"), encoding="utf-8"))
    img_dir = os.path.join(DATA, "images")
    os.makedirs(img_dir, exist_ok=True)
    credits_path = os.path.join(img_dir, "credits.json")
    credits = json.load(open(credits_path, encoding="utf-8")) if os.path.exists(credits_path) else {}
    for slug, n in choices.items():
        if args and slug not in args:
            continue
        if not n:
            continue
        c = json.load(open(os.path.join(OUT, slug + ".json"), encoding="utf-8"))["candidates"][n - 1]
        for width, name in ((1600, f"{slug}.jpg"), (640, f"{slug}-small.jpg")):
            dest = os.path.join(img_dir, name)
            if os.path.exists(dest) and "--force" not in sys.argv:
                continue
            url = c["thumb"].replace("/640px-", f"/{width}px-")
            with open(dest, "wb") as f:
                f.write(get(url, binary=True))
            time.sleep(0.5)
        credits[slug] = {
            "file": f"{slug}.jpg", "small": f"{slug}-small.jpg",
            "title": c["title"].replace("File:", ""), "shows": c["query"],
            "author": c["author"], "licence": c["licence"], "licence_url": c["licence_url"],
            "source_page": c["page"], "source": "Wikimedia Commons", "taken": c["taken"] or None,
            "changes": "Resized. Not otherwise changed.", "fetched": TODAY,
        }
        print("fetched", slug, "·", c["author"][:40], "·", c["licence"])
    with open(credits_path, "w", encoding="utf-8") as f:
        json.dump(credits, f, ensure_ascii=False, indent=1)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    rest = [a for a in sys.argv[2:] if not a.startswith("--")]
    {"candidates": candidates, "fetch": fetch}[sys.argv[1]](rest)
