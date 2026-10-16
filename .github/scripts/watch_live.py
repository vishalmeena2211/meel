#!/usr/bin/env python3
"""Watch the sources "Is it open?" reads for itself, and say so in an issue when one stops answering.

Run every hour by .github/workflows/watch-live-sources.yml. It reads each route's "Is it open?" page on the live
site, the same page a rider sees, and looks for the notes the site shows when a source did not answer:
"Could not read the alert feed", "Could not read the PWD's list", "Could not read the forecast".

A source that fails once is normal. One that keeps failing past its limit (three hours; six for the forecast,
which is only read every three hours) gets one issue, labelled live-source-down, listing the routes it affects.
When every source answers again, the issue says so and closes. Between runs it remembers, in a small state file,
since when each source has been failing.

    python3 watch_live.py STATE_FILE        needs the gh command and GH_TOKEN when there is an issue to write
"""
import html
import json
import os
import re
import subprocess
import sys
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone

SITE = "https://rideplanner.in"
UA = "meel-watch-live (github.com/vishalmeena2211/meel)"
LABEL = "live-source-down"
TITLE = "A source “Is it open?” reads has stopped answering"

# For each source: its name in the issue, the heading of its part of the page, the note shown when it failed, and
# how long it may keep failing before a person is told.
SOURCES = {
    "alerts": ("The government's alert feed (NDMA's SACHET)", "Official alerts", "Could not read the alert feed", 3),
    "pwd": ("Uttarakhand PWD's list of closed roads", "Closures the PWD lists", "Could not read the PWD", 3),
    "weather": ("The forecast for the passes (Open-Meteo)", "Weather at the passes", "Could not read the forecast", 6),
}


def fetch(url, timeout=60):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read().decode("utf-8", "replace")


def open_pages():
    """Every route's "Is it open?" page, from the sitemap, so a new route is watched by itself."""
    xml = fetch(f"{SITE}/sitemap.xml")
    return [u for u in re.findall(r"<loc>([^<]+)</loc>", xml) if re.fullmatch(rf"{re.escape(SITE)}/routes/[^/]+/open", u)]


def look(url):
    """Which sources this page shows, and which of them it says did not answer, with the time it says."""
    try:
        text = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", html.unescape(fetch(url))))
    except Exception:  # noqa: BLE001 - one page that does not load is counted, not fatal
        return url, None
    shown, failed = [], {}
    for key, (_name, heading, note, _hours) in SOURCES.items():
        if heading in text:
            shown.append(key)
            if note in text:
                at = re.search(re.escape(note) + r".{0,80}?did not answer at ([^.]+?)\s*\.", text)
                failed[key] = at.group(1).strip() if at else ""
    return url, (shown, failed)


def gh(*args, body=None):
    return subprocess.run(["gh", *args], input=body, text=True, capture_output=True, check=True).stdout.strip()


def main():
    state_path = sys.argv[1] if len(sys.argv) > 1 else "state.json"
    try:
        state = json.load(open(state_path))
    except (FileNotFoundError, json.JSONDecodeError):
        state = {}
    now = datetime.now(timezone.utc)

    pages = open_pages()
    with ThreadPoolExecutor(max_workers=4) as pool:
        looked = list(pool.map(look, pages))
    unreachable = [u for u, r in looked if r is None]
    print(f"Read {len(pages) - len(unreachable)} of {len(pages)} “Is it open?” pages")

    failing = {}
    for key in SOURCES:
        on = [(u, r[1][key]) for u, r in looked if r and key in r[1]]
        shown = sum(1 for _u, r in looked if r and key in r[0])
        print(f"  {key}: shown on {shown} pages, failing on {len(on)}")
        if on:
            failing[key] = on
    # Most pages not loading at all means the site itself is down, which matters more than any one source.
    if len(unreachable) > len(pages) // 2:
        failing["site"] = [(u, "") for u in unreachable]

    names = {**{k: v[0] for k, v in SOURCES.items()}, "site": "rideplanner.in itself"}
    limits = {**{k: v[3] for k, v in SOURCES.items()}, "site": 1}
    since = {}
    for key in names:
        if key in failing:
            since[key] = state.get(key) or now.isoformat()
    json.dump(since, open(state_path, "w"))

    overdue = {k: v for k, v in failing.items() if now - datetime.fromisoformat(since[k]) >= timedelta(hours=limits[k])}
    existing = gh("issue", "list", "--label", LABEL, "--state", "open", "--json", "number", "--jq", ".[0].number // empty") \
        if os.environ.get("GH_TOKEN") else ""

    if overdue:
        lines = [f"Checked {now:%d %b %Y, %H:%M} UTC. Riders on these routes see a note that the source did not answer, "
                 "instead of what it says.", ""]
        for key, on in overdue.items():
            started = datetime.fromisoformat(since[key])
            lines += [f"## {names[key]}", "",
                      f"Failing since at least {started:%d %b, %H:%M} UTC, on {len(on)} "
                      f"{'page' if len(on) == 1 else 'pages'}:", ""]
            for url, at in on:
                lines.append(f"- {url.replace(SITE, '')}" + (f" (last tried {at})" if at else ""))
            lines.append("")
        lines += ["Made by the hourly watch (`.github/scripts/watch_live.py`). It closes this issue itself once every "
                  "source answers again."]
        body = "\n".join(lines) + "\n"
        print(body)
        if os.environ.get("GH_TOKEN"):
            gh("label", "create", LABEL, "--color", "D93F0B", "--description", "A source the site reads live has stopped answering", "--force")
            if existing:
                gh("issue", "edit", existing, "--body-file", "-", body=body)
            else:
                gh("issue", "create", "--title", TITLE, "--label", LABEL, "--body-file", "-", body=body)
    elif not failing and existing:
        gh("issue", "comment", existing, "--body", f"Every source answered at {now:%d %b %Y, %H:%M} UTC. Closing.")
        gh("issue", "close", existing)
    else:
        print("Nothing to report" if not failing else "Failing, but not for long enough to report yet")


if __name__ == "__main__":
    main()
