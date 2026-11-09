#!/usr/bin/env python3
"""A "Gear for this ride" block for a YouTube video description, with Meel's shop links.

Prints the buyable items on a route's packing list, each with its link on rideplanner.in (/go/<item>), which sends
the rider on to the store with Meel's tag and counts the click as coming from YouTube. Papers, permits, cash and
medicines never get a link, as on the site.

Usage:  python3 gear_block.py <route-slug> [month 1-12]

Needs the store tag in ../site/shop.json; without it the links would not work, so nothing is printed.
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "..")
SITE = "https://rideplanner.in"
MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October",
          "November", "December"]


def main(args):
    if not args:
        sys.exit("Usage: python3 gear_block.py <route-slug> [month 1-12]")
    slug = args[0]
    month = int(args[1]) if len(args) > 1 else None
    if month is not None and not 1 <= month <= 12:
        sys.exit("The month is a number from 1 to 12.")
    path = os.path.join(DATA, "routes", f"{slug}.json")
    if not os.path.exists(path):
        sys.exit(f"No route called {slug}.")
    route = json.load(open(path, encoding="utf-8"))
    shop = json.load(open(os.path.join(DATA, "site", "shop.json"), encoding="utf-8"))
    if not shop["store"]["tag"].strip():
        sys.exit("No store tag in data/site/shop.json yet, so the links would not work.")
    packing = json.load(open(os.path.join(DATA, "site", "packing", f"{route['terrain']}.json"), encoding="utf-8"))
    items = [i for i in packing["items"]
             if i.get("shop") in shop["items"] and (month is None or not i["months"] or month in i["months"])]
    when = f" in {MONTHS[month - 1]}" if month else ""
    print(f"Gear for this ride{when} ({route['name']}):")
    for i in items:
        print(f"• {i['item']}: {SITE}/go/{i['shop']}?route={slug}&from=youtube")
    print()
    print(f"The full packing list for this road, with why each thing is on it: {SITE}/routes/{slug}/packing")
    # Said in the creator's own voice: the video description is theirs, and so is the Associates account.
    print(f"These are {shop['store']['name']} links. As an {shop['store']['name']} Associate I earn from qualifying purchases.")


if __name__ == "__main__":
    main(sys.argv[1:])
