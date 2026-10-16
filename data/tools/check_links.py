#!/usr/bin/env python3
"""Check that every source link on Meel still opens.

Reads every `url` and `official_url` in ../routes/*.json: the page a fact came from, an office's own page, an
official order, a rider's video. Two kinds are left out: open-map links to single pumps (`osm_url`), two thousand
of them on one volunteer-run site, and licence links, which never move.

Each address is asked once, with a time limit, and no site more than once a second. A YouTube video is asked of
YouTube's own embed service, because a removed video's page still answers as if all were well.

Nothing in the route files changes. Deciding what replaces a dead link is a person's job.

Prints a report route by route and saves it to ../computed/link-report.json.

    python3 check_links.py                 check every link
    python3 check_links.py --markdown F    also write the report to F as Markdown, for the weekly issue
"""
import glob
import json
import os
import socket
import ssl
import sys
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor

HERE = os.path.dirname(os.path.abspath(__file__))
ROUTES = os.path.join(HERE, "..", "routes")
OUT = os.path.join(HERE, "..", "computed", "link-report.json")
UA = "Mozilla/5.0 (compatible; MeelLinkCheck/1.0; +https://github.com/vishalmeena2211/meel)"
TIMEOUT = 25
KEYS = ("url", "official_url")
# Labels for the parts of a route file, for the report.
PARTS = {"rules": "Rule", "authorities": "Office", "hazards": "On the road", "season": "Season",
         "header": "Route details", "fuel": "Fuel", "videos": "Video", "image": "Picture",
         "mechanics": "Mechanic", "stays": "Stay", "tunnels": "Tunnel"}

# What each kind of answer means, in the words the report uses.
KINDS = {
    "gone": "Gone: the site says the page is not there, or the site itself no longer exists",
    "error": "Did not answer properly: a server error, a time-out or a certificate problem. Often passes next week",
    "refused": "Refused: the site turned away a program, or a request from outside India. The page may well be there",
}


def uses_in(route):
    """Every link in one route file, with the fact or part it belongs to."""
    found = []

    def walk(node, part, label, parent):
        if isinstance(node, dict):
            # A source names the page it came from, not the fact, so it keeps the fact's name.
            if parent not in ("source", "sources"):
                name = str(node["year"]) if part == "season" and isinstance(node.get("year"), int) else (
                    node.get("office") or node.get("title") or node.get("name"))
                if isinstance(name, str):
                    label = name
            for key, value in node.items():
                if key in KEYS and isinstance(value, str) and value.startswith("http"):
                    found.append((value, f"{PARTS[part]}: {label}" if label else PARTS[part]))
                else:
                    walk(value, part, label, key)
        elif isinstance(node, list):
            for item in node:
                walk(item, part, label, parent)

    for part, value in route.items():
        if part in PARTS:
            walk(value, part, "", part)
    return found


def youtube_id(url):
    p = urllib.parse.urlsplit(url)
    if p.hostname in ("youtu.be",):
        return p.path.strip("/") or None
    if p.hostname and p.hostname.endswith("youtube.com"):
        q = urllib.parse.parse_qs(p.query).get("v")
        return q[0] if q else None
    return None


# Many Indian government sites send an incomplete or old-style certificate. A browser fills the gap and opens the
# page; a strict program refuses. Such a site is asked again, leniently, only to learn whether the page is there.
LENIENT = ssl.create_default_context()
LENIENT.check_hostname = False
LENIENT.verify_mode = ssl.CERT_NONE
LENIENT.options |= getattr(ssl, "OP_LEGACY_SERVER_CONNECT", 0x4)


def ask(url, context=None):
    """One answer for one address: (kind, code, reason). kind is ok, gone, refused or error."""
    target = url
    vid = youtube_id(url)
    if vid:
        target = "https://www.youtube.com/oembed?format=json&url=" + urllib.parse.quote(f"https://www.youtube.com/watch?v={vid}", safe="")
    req = urllib.request.Request(target, headers={"User-Agent": UA, "Accept": "text/html,application/json;q=0.9,*/*;q=0.8"})
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT, context=context) as r:
            r.read(65536)
            return "ok", r.status, "opens in a browser; the site's certificate is old or incomplete" if context else ""
    except urllib.error.HTTPError as e:
        code = e.code
        if vid and code in (400, 404):
            return "gone", code, "the video is not on YouTube any more"
        if vid and code in (401, 403):
            return "gone", code, "the video is private or can no longer be shown"
        if code in (404, 410):
            return "gone", code, "not found"
        if code in (401, 403, 406, 429, 451):
            return "refused", code, "refused"
        return "error", code, "server error" if code >= 500 else "unexpected answer"
    except urllib.error.URLError as e:
        reason = e.reason
        if isinstance(reason, socket.gaierror):
            return "gone", None, "the site's name no longer resolves"
        if isinstance(reason, ssl.SSLError) and context is None:
            return ask(url, LENIENT)
        if isinstance(reason, ssl.SSLError):
            return "error", None, "the site's secure connection failed"
        if isinstance(reason, (ConnectionResetError, ConnectionRefusedError)):
            return "refused", None, "the connection was refused"
        if isinstance(reason, (socket.timeout, TimeoutError)):
            return "error", None, "no answer in time"
        return "error", None, str(reason)[:80]
    except (socket.timeout, TimeoutError):
        return "error", None, "no answer in time"
    except (ConnectionResetError, ConnectionRefusedError):
        return "refused", None, "the connection was refused"
    except Exception as e:  # noqa: BLE001 - one odd site must not stop the rest
        return "error", None, str(e)[:80]


def check_all(urls):
    """Ask every address, each site in turn at most once a second, several sites at a time."""
    by_host = {}
    for u in urls:
        host = urllib.parse.urlsplit(u).hostname or ""
        if youtube_id(u):
            host = "youtube-oembed"
        by_host.setdefault(host, []).append(u)
    answers, lock = {}, threading.Lock()

    def host_run(items):
        for i, u in enumerate(items):
            if i:
                time.sleep(1.0)
            kind, code, reason = ask(u)
            if kind == "error":  # one more try, a little later, before calling it broken
                time.sleep(5)
                kind, code, reason = ask(u)
            with lock:
                answers[u] = {"kind": kind, "code": code, "reason": reason}
                done = len(answers)
            if done % 100 == 0:
                print(f"  {done} of {len(urls)} asked", flush=True)

    with ThreadPoolExecutor(max_workers=8) as pool:
        list(pool.map(host_run, sorted(by_host.values(), key=len, reverse=True)))
    return answers


def markdown(report):
    """The report as the body of the weekly issue: a box to tick for each link that needs a person."""
    c = report["counts"]
    lines = [
        f"**Checked:** {report['checked']}, {report['links']} links on {report['routes']} routes.",
        f"**Gone:** {c.get('gone', 0)} · **Did not answer:** {c.get('error', 0)} · **Refused:** {c.get('refused', 0)} · **Opened:** {c.get('ok', 0)}",
        "",
        "Made by the weekly link check (`data/tools/check_links.py`). Tick a box once the fact has a working source, "
        "or is marked as gone. The list is written afresh every Monday, so a link that opens again drops off by itself.",
        "",
    ]
    for kind in ("gone", "error"):
        rows = [r for r in report["results"] if r["kind"] == kind]
        if not rows:
            continue
        lines += [f"## {KINDS[kind]}", ""]
        by_route = {}
        for r in rows:
            for use in r["uses"]:
                by_route.setdefault(use["route"], []).append((use["fact"], r))
        for route in sorted(by_route):
            lines.append(f"**{route}**")
            for fact, r in by_route[route]:
                code = f" ({r['code']})" if r["code"] else ""
                lines.append(f"- [ ] {fact}: {r['url']}{code}, {r['reason']}")
            lines.append("")
    refused = [r for r in report["results"] if r["kind"] == "refused"]
    if refused:
        lines += ["<details><summary>" + KINDS["refused"] + f" ({len(refused)})</summary>", ""]
        lines += [f"- {r['url']}{' (' + str(r['code']) + ')' if r['code'] else ''}" for r in refused]
        lines += ["", "</details>"]
    return "\n".join(lines) + "\n"


def main():
    md_path = None
    if "--markdown" in sys.argv:
        md_path = sys.argv[sys.argv.index("--markdown") + 1]
    uses, routes = {}, 0
    for path in sorted(glob.glob(os.path.join(ROUTES, "*.json"))):
        if path.endswith("index.json"):
            continue
        route = json.load(open(path, encoding="utf-8"))
        routes += 1
        for url, fact in uses_in(route):
            entry = {"route": route.get("name", route["slug"]), "slug": route["slug"], "fact": fact}
            if entry not in uses.setdefault(url, []):
                uses[url].append(entry)
    print(f"Checking {len(uses)} links on {routes} routes", flush=True)
    answers = check_all(sorted(uses))
    results = [{"url": u, **answers[u], "uses": uses[u]} for u in sorted(uses)]
    counts = {}
    for r in results:
        counts[r["kind"]] = counts.get(r["kind"], 0) + 1
    report = {"checked": time.strftime("%Y-%m-%d"), "links": len(results), "routes": routes, "counts": counts,
              "results": results}
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=1)

    print(f"\nOpened {counts.get('ok', 0)}, gone {counts.get('gone', 0)}, did not answer {counts.get('error', 0)}, "
          f"refused {counts.get('refused', 0)}")
    by_route = {}
    for r in results:
        if r["kind"] in ("gone", "error"):
            for use in r["uses"]:
                by_route.setdefault(use["route"], []).append((r["kind"], use["fact"], r))
    for route in sorted(by_route):
        print(f"\n{route}")
        for kind, fact, r in by_route[route]:
            print(f"  {kind:7} {fact}\n          {r['url']} ({r['code'] or r['reason']})")
    print(f"\nSaved {os.path.relpath(OUT)}")
    if md_path:
        with open(md_path, "w", encoding="utf-8") as f:
            f.write(markdown(report))
    # For the workflow: how many links need a person.
    print(f"NEEDS_A_PERSON={counts.get('gone', 0) + counts.get('error', 0)}")


if __name__ == "__main__":
    main()
