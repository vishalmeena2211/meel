# Meel — data folder

**Started:** 28 September 2026
**What this is:** every piece of data the Meel wireframes need, for fifty routes, gathered at a desk. Nothing here has been confirmed by a rider. Nothing here has been checked by you.

---

## How to read this folder

| Folder | What is in it | Where it came from |
|---|---|---|
| `routes/` | One file per route. This is what the website reads. | Put together from the three folders below |
| `computed/` | Positions, distances, heights, fuel pumps and the line on the map | Worked out by script from open map data |
| `research/` | Rules, permits, seasons, official sources, videos | Read from websites by research assistants, each with its link |
| `site/` | Things entered once for the whole site: bikes, kinds of fact, regions, packing lists; the districts each road crosses (`route-districts.json`, by `tools/districts.py`) and the hospitals and police near it (`route-help.json`, by `tools/help_places.py`) | A mix; each file says |
| `images/` | One picture per route, with its author and licence | Wikimedia Commons |
| `tools/` | The scripts that fetched and built everything | Written for this project |

**Words used in the files:**

- **Source** — the web page a fact came from. Every fact has one.
- **Opened** — `true` means the page was actually opened and read. `false` means the fact came from a search-result snippet only, and is weaker.
- **Checked by editor** — `false` on every fact in this folder. It turns `true` only when you have looked at the source yourself.
- **Evidence** — `official` (a government or operator's own page), `news`, `encyclopedia`, `map` (open map data), `blog`, `forum`, `operator` (a tour company).
- **Gaps** — a list, in each file, of what could not be found. A gap is not a fact that something does not exist.

**On the site, all of this shows as "Not yet checked"** until a rider or the editor confirms it. The wireframes call this the dashed grey state.

---

## What was deliberately left out

- **Phone numbers and names of private people.** Mechanics, homestay owners and riders are not listed. The wireframes raise the question of whether a shop's number should be public; until you decide, none is collected.
- **Text copied from other sites.** Facts are recorded in our own words, with a link. Nothing is pasted.
- **Anything a rider must supply.** Mobile network by halt, real riding hours, stays and riders' sightings stay empty. They come from trip reports.
- **Fee amounts that only tour operators quote.** Where an official page gives the amount, it is recorded. Otherwise the fee is noted as existing, with no figure.

---

## Licences you must honour

| Data | Licence | What it requires |
|---|---|---|
| Map data: positions, the line on the map, fuel pumps | Open Database Licence, from OpenStreetMap | Show "© OpenStreetMap contributors" wherever the data appears. If you publish a changed copy of the data, publish it under the same licence. |
| Heights | SRTM, from NASA, served by Open Topo Data | Public domain. No requirement. |
| Districts' government codes | Wikidata (property P12746, the Local Government Directory's district code) | CC0. No requirement. |
| Hospitals and police on the emergency card | Open Database Licence, from OpenStreetMap | As for map data. |
| Pictures | Creative Commons, per picture | Show the author and the licence beside or below each picture. `images/credits.json` holds both. |

---

## The route file

One file per route, in `routes/`. Parts that are empty are kept as empty lists, so the website never has to guess.

| Part | What it holds | Filled by |
|---|---|---|
| `slug`, `name`, `region`, `batch`, `terrain` | Identity | Route list |
| `level` | `basic` for every route at first | Route list |
| `header` | Highway number, distance, usual days, highest point, usual season | Script and research |
| `waypoints` | Each place: position, height, distance from the start, whether it is a pass | Script |
| `stretches` | Each leg: distance, and what a map app says it takes | Script |
| `profile` | Height every few kilometres, for the altitude drawing | Script |
| `line` | The route on the map | Script |
| `fuel` | Each pump near the road: name, brand, distance from the start | Script, from open map data; where the map has a hole, from the oil companies' own locators, IndianOil's and HP's (`pumps_from_companies` in the route's research file, read by `tools/company_pumps.py`), with each pump's own page as its source |
| `fuel_gaps` | The longest stretches with no pump | Script |
| `rules` | Permits, fees, taxes, rules for motorcycles, each with its history | Research |
| `season` | Usual window, and what happened each year | Research |
| `authorities` | Who decides and who announces, for "Is it open?" | Research |
| `hazards` | Water crossings, landslide zones, forest gate timings | Research |
| `videos` | Riders' videos pinned to stretches | Research |
| `image` | The picture, with its credit | Wikimedia Commons |
| `gaps` | What could not be found | Both |

---

## Known weaknesses

- **Fuel pumps come from open map data, which is incomplete in places.** In the North-East and the Himalaya especially, a missing pump on the map does not mean a missing pump on the road. Every computed fuel gap is a *worst case* and says so. Where the map had holes, pumps from the oil companies' own locators were added, each with its own page as the source: on Guwahati to Tawang from IndianOil's (read 28 September 2026), and on 26 more routes from IndianOil's and HP's (read 6 October 2026, only for the districts each road runs through, and only where no pump on the map lies within 5 km along the road). Bharat Petroleum's locator did not answer, and Nayara's, Jio-bp's and the others' were not read, so a gap can still hide one of their pumps. Some long gaps are real: neither locator lists a pump between Keylong and Karu, for example.
- **Hospitals and police come from the open map, and nobody has checked them.** At most two are kept in each 10 km of road. Kashmir to Kanyakumari is too long for the map service to answer in time, so it has none, and its card says so.
- **A district the road crosses for only a few kilometres can be missed.** Positions are looked up every 20 km (40 km on a very long route) and at every named place.
- **A stretch ridden twice counts its pumps once.** On a road ridden out and back (Srinagar to Pahalgam and back, say), each pump is placed on one pass only, so the other pass can show as a gap it is not.
- **"What a map app says" is a car on a clear road.** It is recorded so the site can show how wrong it is, once riders report real hours.
- **Seasonal roads are routed as if open.**
- **Research was done in one pass.** No fact has been through a second, adversarial check.
