#!/usr/bin/env python3
"""The day each route video was posted on YouTube.

The research files say when a video was filmed only when the video itself says so, which is one in five. YouTube
always knows when it was posted, and a video cannot be posted before it was filmed, so the posting day tells a
rider the footage is at least that old.

Writes ../computed/video-dates.json: {video id: "YYYY-MM-DD"}. assemble.py reads it.

Usage:  python3 video_dates.py [--force]     (--force asks again for videos already known)

Needs a YouTube Data API key: YOUTUBE_API_KEY, or the file ~/.config/meel/youtube-api-key. One request covers 50
videos, so all of them take a handful of YouTube's free 10,000 a day.
"""
import json
import os
import re
import sys
import urllib.parse
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "..")
OUT = os.path.join(DATA, "computed", "video-dates.json")
sys.path.insert(0, HERE)
from build_computed import load, save  # noqa: E402
from routes_def import ROUTES  # noqa: E402

VIDEO_ID = r"(?:v=|youtu\.be/|/shorts/|/embed/)([A-Za-z0-9_-]{11})"


def api_key():
    key = os.environ.get("YOUTUBE_API_KEY")
    if key:
        return key.strip()
    path = os.path.expanduser("~/.config/meel/youtube-api-key")
    if os.path.exists(path):
        return open(path, encoding="utf-8").read().strip()
    sys.exit("No YouTube key: set YOUTUBE_API_KEY or put it in ~/.config/meel/youtube-api-key")


def video_ids():
    ids = []
    for r in ROUTES:
        rs = load(os.path.join(DATA, "research", r["slug"] + ".json"), {}) or {}
        for v in rs.get("videos", []) or []:
            m = re.search(VIDEO_ID, str(v.get("url") or ""))
            if m and m.group(1) not in ids:
                ids.append(m.group(1))
    return ids


def main():
    known = load(OUT, {}) or {}
    ids = video_ids()
    ask = ids if "--force" in sys.argv else [i for i in ids if i not in known]
    key = api_key()
    for i in range(0, len(ask), 50):
        q = urllib.parse.urlencode({"part": "snippet", "id": ",".join(ask[i:i + 50]), "key": key,
                                    "fields": "items(id,snippet/publishedAt)"})
        with urllib.request.urlopen("https://www.googleapis.com/youtube/v3/videos?" + q, timeout=60) as r:
            for item in json.load(r).get("items", []):
                known[item["id"]] = item["snippet"]["publishedAt"][:10]
    gone = [i for i in ask if i not in known]
    save(OUT, dict(sorted(known.items())))
    print(f"video dates: {len(ask)} asked, {len(ask) - len(gone)} answered, {len(known)} known"
          + (f"; no answer (removed or private): {', '.join(gone)}" if gone else ""))


if __name__ == "__main__":
    main()
