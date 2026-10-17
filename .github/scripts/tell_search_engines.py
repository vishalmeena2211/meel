#!/usr/bin/env python3
"""Tell Bing, and the other search engines that share IndexNow, which pages a deploy changed.

Google finds changed pages by itself, slowly. Bing, Yandex, Seznam and Naver take a list straight away through
IndexNow, a shared address that passes the list on to all of them. ChatGPT's search leans on Bing's index.

Run by .github/workflows/tell-search-engines.yml after each production deploy. It compares the route files of the
deploy before with this one, fact by fact, and sends:
  - each fact page whose fact changed, or that is new;
  - the section page and the route page around it, also for an item with no page of its own (a video) or one
    that was removed;
  - every page of a route that is new.
The live sitemap decides which addresses exist, so a fact that was removed is not sent.

The key below is not a secret. IndexNow checks it by reading https://rideplanner.in/<key>.txt, a public file in
web/public, which proves the list comes from the site's owner.

    python3 tell_search_engines.py BASE_SHA HEAD_SHA     send the pages changed between two commits
    python3 tell_search_engines.py --all                 send every page in the sitemap
    add --dry-run to print the list without sending it
"""
import json
import os
import re
import subprocess
import sys
import urllib.error
import urllib.request

SITE = "https://rideplanner.in"
HOST = "rideplanner.in"
KEY = "615ffc0f79dcaf15406d571a7915c763"
ENDPOINT = "https://api.indexnow.org/indexnow"
UA = "meel-tell-search-engines (github.com/vishalmeena2211/meel)"
# The parts of a route file whose items each have a page of their own, found by their "id".
LISTS = ("rules", "hazards", "authorities", "videos", "mechanics", "stays", "tunnels")
# The section page each part of a route file is shown on. Videos have no page of their own, only their section's.
SECTION = {"rules": "rules", "hazards": "road", "authorities": "open", "videos": "videos", "pumps": "fuel"}
# Parts that change on every build without changing what a rider reads.
IGNORED = ("built", "counts")


def sitemap():
    req = urllib.request.Request(f"{SITE}/sitemap.xml", headers={"User-Agent": UA, "Accept-Encoding": "identity"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return re.findall(r"<loc>([^<]+)</loc>", r.read().decode("utf-8"))


def route_at(sha, path):
    """A route file as it was at one commit, or None where it did not exist."""
    got = subprocess.run(["git", "show", f"{sha}:{path}"], capture_output=True, text=True)
    return json.loads(got.stdout) if got.returncode == 0 else None


def items(route):
    """Every item with an id, as (the part it belongs to, text that compares equal when nothing changed)."""
    found = {}
    lists = [(k, route.get(k)) for k in LISTS] + [("pumps", (route.get("fuel") or {}).get("pumps"))]
    for name, part in lists:
        for item in part or []:
            if isinstance(item, dict) and item.get("id"):
                found[str(item["id"])] = (name, json.dumps(item, sort_keys=True, ensure_ascii=False))
    return found


def slug_of(fact_id):
    """The last part of a fact's address, as web/src/lib/fact-view.ts makes it."""
    return re.sub(r"[^a-z0-9-]", "-", fact_id[fact_id.find(":") + 1:], flags=re.I).lower()


def rest(route):
    """What is left of a route file once the items with pages of their own are taken out."""
    out = {k: v for k, v in route.items() if k not in LISTS + IGNORED + ("fuel",)}
    out["fuel"] = {k: v for k, v in (route.get("fuel") or {}).items() if k not in ("pumps", "fetched")}
    return json.dumps(out, sort_keys=True, ensure_ascii=False)


def changed_pages(base, head, urls):
    names = subprocess.run(["git", "diff", "--name-only", base, head, "--", "data/routes/"],
                           capture_output=True, text=True, check=True).stdout.split()
    live = set(urls)
    pages = set()
    for path in names:
        slug = os.path.basename(path)[:-5]
        if not path.endswith(".json") or slug == "index":
            continue
        old, new = route_at(base, path), route_at(head, path)
        top = f"{SITE}/routes/{slug}"
        if new is None:
            continue
        if old is None:
            pages |= {u for u in urls if u == top or u.startswith(top + "/")}
            continue
        before, after = items(old), items(new)
        for fact_id in set(before) | set(after):
            if before.get(fact_id) == after.get(fact_id):
                continue
            end = "/" + slug_of(fact_id)
            own = [u for u in urls if fact_id in after and u.startswith(top + "/") and u.endswith(end)
                   and u.count("/") == top.count("/") + 2]
            for u in own:
                pages |= {u, u.rsplit("/", 1)[0], top}
            # A video, or an item that was removed, has no page of its own to send: its section page changed.
            if not own:
                part = (after.get(fact_id) or before.get(fact_id))[0]
                if part in SECTION:
                    pages |= {f"{top}/{SECTION[part]}", top}
        if rest(old) != rest(new):
            pages.add(top)
            if json.dumps(old.get("season"), sort_keys=True) != json.dumps(new.get("season"), sort_keys=True):
                pages.add(f"{top}/open")
    return sorted(p for p in pages if p in live)


def send(pages):
    """IndexNow takes up to 10,000 addresses at a time."""
    for start in range(0, len(pages), 10_000):
        body = json.dumps({"host": HOST, "key": KEY, "keyLocation": f"{SITE}/{KEY}.txt",
                           "urlList": pages[start:start + 10_000]}).encode("utf-8")
        req = urllib.request.Request(ENDPOINT, data=body, method="POST",
                                     headers={"Content-Type": "application/json; charset=utf-8", "User-Agent": UA})
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                # 200: taken. 202: taken, and the key is still being checked.
                print(f"Sent {len(pages[start:start + 10_000])} pages: {r.status}")
        except urllib.error.HTTPError as e:
            # 400 a malformed list, 403 the key file did not match, 422 an address not on this site, 429 too many.
            print(f"IndexNow refused the list: {e.code} {e.read()[:300]!r}")
            sys.exit(1)


def main():
    args = [a for a in sys.argv[1:] if a != "--dry-run"]
    dry = "--dry-run" in sys.argv
    urls = sitemap()
    if args == ["--all"]:
        pages = urls
    elif len(args) == 2:
        pages = changed_pages(args[0], args[1], urls)
    else:
        print(__doc__)
        sys.exit(2)
    print(f"{len(pages)} pages to tell the search engines about")
    for p in pages[:40]:
        print(" ", p)
    if len(pages) > 40:
        print(f"  … and {len(pages) - 40} more")
    if pages and not dry:
        send(pages)


if __name__ == "__main__":
    main()
