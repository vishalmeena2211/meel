# What to add to Meel: ideas from other products, open source and official data

Research of 6 October 2026. Four researchers looked at:
- rider and trip apps;
- open-source code and open data;
- Indian official sources;
- how crowd-sourced sites keep facts fresh.

Each source was opened on the day unless marked otherwise. Nothing here is built yet.

## How to read this

- Each idea is a box to tick when it is built: `- [ ]` not yet, `- [x]` built.
- **Size**: *small* is about a day; *medium* is a few days; *large* is a week or more, or likely to break.
- **Upkeep** says what the maintainer must keep doing once it is built. "None" means it runs by itself.
- **Fits the rules** checks the idea against Meel's fixed rules:
  - It never says a road is open.
  - Every fact has a source and a date.
  - No map is drawn under the roads (India's border law).
  - No ads.
  - Free services only.
  - Nothing needs daily upkeep.
- *Not confirmed* means the researcher could not open the page that would prove it.
- Every screen change is drawn in the wireframes first, as before.

## The short answer

The best ideas are cheap and keep the rules:
- **Official alerts on each route.** The government's own alert feed (NDMA SACHET) carries IMD weather, avalanche and river warnings, by district. It is free, public domain and current today.
- **Offices' "last spoke on" dates read automatically.** Jammu and Kashmir's daily traffic PDF, Uttarakhand's closure dashboard and a few permit sites show their own dates, so the "Is it open?" cards can stay current without anyone typing.
- **Weather at the passes, said as a dated forecast.** Open-Meteo gives freezing level, snow, wind and sunset, free for a site with no ads.
- **Route files for offline map apps.** A GPX file per route opens in Organic Maps, OsmAnd and Google Maps. The rider's own app draws the map, so Meel still draws none.
- **Facts that age on their own.** Each kind of fact gets a shelf life, and each "Still true" renews it. Show the last three dated rider answers, not a score. Ask riders who just finished a trip to check the ageing facts on their route.
- **A plan for home, and an emergency card.** One WhatsApp message for the person back home, and a saved card with numbers that works with no signal.

---

## Build first (small, high value, no upkeep)

- [x] **1. Official alerts on each route** — *small*. **Built 6 October.** Matched by the government's district codes where an alert gives them (from Wikidata), else by the names in its words. On "Is it open?", with a count on the route page.
  - **What:** Show current official alerts for the districts a route passes through. These cover heavy rain, snow, avalanche danger and river levels. Each is shown in the issuer's words, with its issue time, its expiry and the issuer named.
  - **Source:** the NDMA SACHET feed, one per state: `https://sachet.ndma.gov.in/cap_public_website/rss/rss_<state>.xml` (for example `rss_himachal`, `rss_ladakh`, `rss_uttarakhand`, `rss_sikkim`, `rss_arunachal`). Each item links to a standard alert file (Common Alerting Protocol) carrying official district codes and an expiry time. The newest item seen was dated 6 Oct 2026. The feed declares itself public domain.
  - **How:** an hourly build step matches district codes to the districts each route crosses. The step drops expired alerts.
  - **Upkeep:** none. **Fits the rules:** yes. It quotes an official alert with its date, and never says a road is open or shut.

- [x] **2. Offices' "last spoke on" dates, read automatically** — *small to medium*. **Built 6 October**, for Jammu and Kashmir's advisory file, Lahaul and Spiti's road status page and Uttarakhand's closure list. **Not done:** quoting the Zojila and Mughal Road paragraphs (needs a PDF reader), Nagaland's permit page (not linked from any route), HP PWD (no date of its own, and an unofficial address), Ladakh Police (no date on the page).
  - **Jammu and Kashmir Traffic Police:** a daily PDF at a fixed address, `https://trafficpolice.jk.gov.in/documents/Advisory/ADVISORY.pdf`. It covers Zojila (with cut-off times), the Mughal Road and NH 44. Its Last-Modified date is a true "last spoke on". The text extracts cleanly, so the Zojila and Mughal Road paragraphs can be quoted on Srinagar to Leh and the Mughal Road route.
  - **Uttarakhand PWD road closure dashboard:** `https://mis.pwduk.in/pwd/roadClosure`. Every closure since April is listed, with road, km, time closed and expected reopening. It covers PWD, BRO and NH roads, and the newest row was minutes old. Show closures on Meel's Uttarakhand roads as the office's own words with their time. Never treat the absence of a closure as "open".
  - **Footer dates:** the Nagaland permit site ("last updated 2026-07-15") and the Lahaul-Spiti road status page ("Last Updated: May 14, 2024", which is stale). Read them so each card shows its true age.
  - **Upkeep:** a page layout can change; the build should warn, not fail. **Fits the rules:** yes, if every line is shown as the office's words with its date.

- [x] **3. Route files for offline map apps** — *small*. **Built 6 October**, with Organic Maps and Google Maps links. **Not done:** the gpx.studio link, as the site is still private and gpx.studio could not fetch the file.
  - **What:** a GPX file per route, written by the build with Python's own XML library. It holds the road line plus points for pumps, night halts, passes, checkposts and offices, with the map-data credit inside.
  - **Buttons:**
    - "Open in Organic Maps" (`om://` links; it also imports GPX).
    - "Open in Google Maps" (up to 9 stops, two-wheeler mode).
    - "Open in gpx.studio" (needs one cross-site header on the files).
  - **Saved routes:** the file is saved with the route for no network.
  - **Upkeep:** none. **Fits the rules:** yes. The rider's app draws the map, and none is embedded on Meel.
  - **Sources:** Organic Maps link format: omaps.app/api. Google Maps URL docs: developers.google.com/maps/documentation/urls. gpx.studio is MIT-licensed.

- [x] **4. Facts that age on their own** — *small*. **Mostly built before:** shelf lives, ageing, stale and "reports disagree" were already in place. **Added 6 October:** the last three answers on an opened fact, and a reason of at least a few words for "This has changed". **Not done:** a 14-day life for hazards. Meel's hazards come from published guides and hold for a season; riders' sightings, which should fade fast, do not exist yet.
  - **Shelf life:** one table gives each kind of fact a shelf life. A first proposal:
    - a hazard, 14 days;
    - a pass's season status, 7 days;
    - a pump or an office's phone, 12 months;
    - a permit rule, checked before each season.

    A fact turns "ageing" at three-quarters of its shelf life. Each "Still true" renews it. This follows OpenStreetMap's `check_date` and StreetComplete's re-survey idea: re-check twice as often as a thing is expected to change.
  - **Recent answers, not a score:** show the last three dated rider answers ("✓ 12 Sep · ✓ 3 Sep · ✗ 1 Aug"). PlugShare scores chargers on recent check-ins, not an all-time average. In one survey, 72.5% of chargers worked, against the 95–98% operators claimed.
  - **Disagreement:** two "changed" answers within the shelf life, or a mix of ✓ and ✗, turns a fact to "riders disagree". It then moves up the editor's queue.
  - **Hazards expire:** a hazard nobody re-confirms goes stale by itself, as Waze reports do. The editor never has to remove it.
  - **A reason for changes:** "This has changed" asks for one line of reason. iOverlander asks for at least 40 characters before an edit.
  - **Upkeep:** none. **Fits the rules:** yes.

- [x] **5. Weather at the passes, as a dated forecast** — *small*. **Built 6 October**, read every three hours. **Not done:** the satellite picture link, whose address format was not confirmed.
  - **What:** for each pass and night halt, three days ahead:
    - freezing level and snowfall, in feet;
    - wind gusts;
    - sunrise and sunset.

    Each forecast says when it was issued. It is labelled "This is a weather forecast, not a road status", with the deciding office linked beside it.
  - **Source:** Open-Meteo. It is free for sites "that do not have subscriptions or advertising", up to 10,000 calls a day, and its data is CC BY 4.0 (credit it). Two or three points per route, hourly, is about 3,600 calls a day.
  - **Satellite link:** add a link to a free satellite viewer (Copernicus Browser or NASA Worldview) to see dated snow on a pass. *Link format not confirmed.* Only link out: imagery inside Meel would be a base map.
  - **Upkeep:** none. **Fits the rules:** yes, if worded as weather and never "clear".

- [x] **6. A plan for home, and an emergency card** — *small*. **Built 6 October.** Hospitals and police come from the open map, not the national hospital directory, whose download asks for a form. The satellite rule is sourced to the Embassy of India's notice.
  - **Plan for home:** a pre-written WhatsApp message to one person at home. It lists:
    - the route, each night's stop and the expected arrival times;
    - the stretches with no signal, from Meel's own data;
    - "if no word by 9 pm on X: call my riding partner, then this police station, then 112".

    xBhp's Ladakh guide recommends exactly this: one contact at home who knows your plan.
  - **Emergency card:** saved with the route, it works with no signal. It shows:
    - 112;
    - 1033 on national highways only;
    - who to complain to (NHAI, BRO or the state PWD);
    - nearest hospitals and police by km.

    Hospitals come from the national hospital directory on data.gov.in: 30,273 with coordinates, under the Government Open Data Licence, credited. Its true age is unknown and it should be shown that way. Police come from OpenStreetMap.
  - **Satellite messengers:** the card says that devices such as Garmin inReach are illegal in India without the Department of Telecommunications' permission. *Seen once:* ExplorersWeb, January 2025.
  - **Upkeep:** none. **Fits the rules:** yes.

- [x] **7. More pumps from HP's own locator** — *small*. **Done 6 October**: see the data notes for which routes changed.
  - **What:** HP's locator (`https://petrolpump.hpretail.in`) runs on the same platform as IndianOil's. Its robots file allows reading, and each outlet page carries coordinates.
  - **How:** reuse the Tawang script for every route where the map is thin, especially the North-East.
  - **Upkeep:** re-read once a season. **Fits the rules:** yes, with each pump citing its locator page.
  - BPCL's locator did not respond: *not confirmed*.

## Next (a few days each)

- [ ] **8. Ask riders who just came back** — *medium*. When a posted trip's end date passes, or a rider sends a trip report or reopens a saved route, show the ageing facts on that route as a checklist: "Still true / Changed / Didn't see". Google Maps asks visitors about facts it is unsure of, and AllTrails asks for conditions after a hike. In an Indian WhatsApp civic project (Reap Benefit), about 1 in 6 people answered each request.
- [ ] **9. "Ask your group" on a stale fact** — *small*. A button writes a WhatsApp question with a link that collects the answer: "Anyone crossed Koksar this week? Is the pump open? Tap to answer: rideplanner.in/f/123". It reuses the `wa.me/?text=` links Meel already makes.
- [ ] **10. The editor's 15-minute queue** — *small to medium*. One report at a time, sorted: hazards first, then facts with two or more reports, then ageing facts on routes people read. Fixed buttons: Accept, Reject (with a stock reason), Mark disagree, Snooze 7 days.
  - **Caps on anonymous reports:** about 5 per device a day, no links in the text, and a hidden field that only bots fill in.
  - **A quiet record:** the queue shows how many of a device's earlier reports were accepted. It is never shown publicly.
  - **The bar for accepting:** "plausible and not abusive", as Wikipedia's pending-changes reviewers use. Acceptance is not an endorsement.
- [ ] **11. Plan my days, with daylight** — *medium*. The rider picks the number of days, or hours a day. Night stops are chosen from the route's own halts. The existing height and fuel checks then run. Each day shows sunset and "leave by 07:40 to arrive before dark". Furkot places night stops by an end-of-day time, and Komoot splits multi-day tours.
- [ ] **12. A printable route card** — *small*. One page per route: fuel gaps, halts with heights, checkposts, permits, the emergency card, and a date on every fact. It is drawn as roads alone. Paper never runs out of battery.
- [ ] **13. Group fuel check** — *small*. On a posted trip, accepted riders add their bikes, and the fuel check runs on the bike with the shortest range. No other product was found doing this.
- [ ] **14. Leader and back rider, and regroup points, on posted trips** — *small*. Fields for who leads and who rides last, plus agreed regroup points. These follow xBhp's group-riding rules: a lead, a most-experienced last rider, regroup waypoints, at most 6–8 bikes.
- [ ] **15. Avalanche bulletins in season** — *small to medium*. DGRE publishes a daily PDF with a danger level per district for J&K, Ladakh, Himachal, Uttarakhand and Sikkim: `https://drdo.gov.in/drdo/sites/default/files/avalanche_warning_bulletin/DGRE_AWB_DD-Mon-YYYY.pdf`. It is seasonal (the newest was 3 June 2026). These alerts also reach the SACHET feed in idea 1, so this may not be needed.
- [ ] **16. "Report this on OpenStreetMap" for a missing pump** — *small*. A link that opens OpenStreetMap's own note page at the spot: `https://www.openstreetmap.org/note/new?lat=…&lon=…`. The rider writes the note. OpenStreetMap asks for no automated notes and has limited anonymous ones since February 2026, so Meel must never post notes itself.
- [ ] **17. Tyre pressures per bike** — *small*. Owner's-manual pressures, solo and loaded, added to the bikes in the fuel check, each with its source and date. About 30 bikes, typed once; upkeep only for new models. None of the touring apps checked has this.
- [ ] **18. Trip cost** — *small to medium*. Fuel cost per bike: km ÷ km per litre × the petrol price. The price is a dated fact riders can correct. Add the permit fees already listed and, later, daily spend from trip reports.
- [ ] **19. One line on tolls and closed roads** — *small*.
  - NHAI says two-wheelers pay no toll on national highways and expressways (News on AIR, August 2025).
  - Bikes are banned on some expressways, such as Delhi–Dausa.
  - The build flags any stretch that OpenStreetMap marks closed to motorcycles.
  - *Not confirmed:* whether state or private expressways charge bikes.

## Later (bigger, or needs riders first)

- [ ] **20. Places riders vouch for** — *medium*. Mechanics, puncture shops, bike-friendly stays, water and checkposts, each pinned to a km on a route with a one-line tip. They use the same trust states and buttons as facts. iOverlander has these place types and gets 5,000+ corrections a month. Start from OpenStreetMap places. Needs spam removal.
- [ ] **21. "Which network worked here"** — *medium*. A dated fact at each halt and pass (Jio, Airtel, BSNL or Vi), and later a no-signal strip like the fuel strip. TRAI links each operator's coverage map, but they are pictures, not data, so link only. OpenCelliD: *licence and hill coverage not confirmed*.
- [ ] **22. "I rode it" check-ins** — *small to medium*. A short dated log per section: date, direction, bike, a few ticks ("petrol at Tandi") and one line. Newest first, fading with age. Worded as a past report: no green ticks, with the official link beside it.
- [ ] **23. GPX upload for trip reports** — *medium*. A rider adds their track. It is drawn as a line alone, with its altitude chart. The night-halt check runs on where they actually slept, and their fuel stops become confirmations. Points near the rider's home are dropped for privacy, and tracks are thinned to about 500 points. Library: @tmcw/togeojson (BSD-2).
- [ ] **24. Dated road photos at passes and hazards** — *medium*. Mapillary photos are CC BY-SA 4.0, and each has a date and an author. Its viewer can show the photo with no map. It needs the Mapillary logo and a link, and bulk scraping is not allowed. *Coverage on Himalayan roads not confirmed.*
- [ ] **25. Twisty sections** — *small*. Label stretches like "twisty, km 112–140" with Meel's own bend-radius script over its road lines. adamfranco/curvature does this but is GPL; write the idea fresh, don't copy its code.
- [ ] **26. A second opinion on road lines** — *small*. Valhalla (MIT) has a motorcycle mode and returns heights along the route. If it and the current router (OSRM) disagree a lot, flag the route for a person to check. The public server needs a client id and an announcement. *Motorcycle mode on the public server not confirmed.*
- [ ] **27. A height cross-check** — *medium*. Compare heights with Copernicus GLO-90 (through Open-Meteo's elevation service, credited) or GLO-30 (one-off run, credited). Both smooth sharp passes, so use them only to catch errors, never as a pass's height. Wikidata pass heights are mostly unreferenced (41 of 42 cite only Wikipedia), so use them to cross-check and link, not as a source.
- [ ] **28. Short Wikivoyage summaries** — *small*. Credited, linked, same licence (CC BY-SA 4.0), kept apart from map data. Rules and permits still come from the official offices.
- [ ] **29. A WhatsApp channel** — *small*, but weekly. A post such as "These 8 facts on Manali to Leh are going stale. Rode it? Tap to confirm." It is one-way, numbers stay hidden, and history is kept for 30 days. It needs someone to post each week, so it is optional.

## Do not do, and why

| Idea | Why not |
|---|---|
| Windy's weather API | The free key returns "randomly shuffled and slightly modified data"; real data is about €990 a year. |
| GraphHopper's hosted router | The free plan has no custom models (the curvy-road feature). Running it ourselves needs a big Java machine. |
| Live group tracking (Traccar, OwnTracks) | Needs an always-on server and a map. There is no signal for long stretches. Holding live locations is a privacy burden. |
| Alerts sent from a server when a rider is overdue | If it ever fails, Meel carries the blame. The plan-for-home message (idea 6) covers most of the need. |
| A WhatsApp Business bot | Needs a dedicated number, a business account and approved templates. It is cheap per message, but large to set up. |
| Posting OpenStreetMap notes automatically | OpenStreetMap asks for no automated notes, and anonymous notes are now limited. |
| Embedding satellite pictures or any map tiles | That would be a base map under the roads. Link out instead. |
| NHAI's Rajmargyatra data or IMD's API | Rajmargyatra has no public API. IMD's needs an approved key, and approval is uncertain; the SACHET feed carries IMD's alerts anyway. |
| Toll plaza lists | Two-wheelers don't pay NH tolls, so this is little use to riders. |
| Medical posts at Sarchu and Pang as facts | Only blogs mention them; no official source was found. |
| Treating old official pages as current | Lahaul-Spiti road status (May 2024), Sikkim Roads and Bridges (June 2025) and the Rohtang FAQ (2018) are stale. Show them only with their own date. |

## What was not checked

These were blocked or unreachable on 6 October 2026:
- Team-BHP and BCMTouring (pages blocked).
- Komoot, AllTrails, Wikiloc, PlugShare and Ride with GPS help pages; their app-store listings and blogs were used instead.
- The BPCL locator, BEE's EV Yatra, 112.gov.in and NHAI's toll information site (no response).
- Sikkim's permit page (its security certificate expired on the day).
- Uttarakhand's inner-line permits.
- Reddit (blocked to the research tools).

Each finding was seen once, by one researcher, on 6 October 2026. None has been through an adversarial check.

## Where the sources are

Main pages cited above, all opened on 6 October 2026 unless marked:
- NDMA SACHET feeds: sachet.ndma.gov.in/cap_public_website/rss/rss_india.xml.
- J&K Traffic Police advisory: trafficpolice.jk.gov.in/advisory.html.
- Uttarakhand PWD closures: mis.pwduk.in/pwd/roadClosure.
- HP PWD road status: hppwd.in.
- DGRE bulletins: drdo.gov.in (avalanche_warning_bulletin).
- Hospital directory: data.gov.in (national-hospital-directory-geo-code…).
- Government Open Data Licence India: data.gov.in.
- HP fuel locator: petrolpump.hpretail.in.
- Open-Meteo terms and pricing: open-meteo.com/en/terms, /en/pricing.
- MET Norway terms: api.met.no/doc/TermsOfService.
- Mapillary terms: mapillary.com/terms.
- OpenStreetMap Notes: wiki.openstreetmap.org/wiki/Notes.
- `check_date`: wiki.openstreetmap.org/wiki/Key:check_date.
- StreetComplete re-survey proposal: wiki.openstreetmap.org/wiki/User:Westnordost/Proposed_Resurvey_Intervals.
- Organic Maps link format: omaps.app/api.
- Google Maps URLs: developers.google.com/maps/documentation/urls/get-started.
- Valhalla API: valhalla.github.io/valhalla/api/route/api-reference.
- Copernicus DEM: registry.opendata.aws/copernicus-dem.
- PlugShare scores: help.plugshare.com (Station PlugScores).
- Waze partner spec: support.google.com/waze/partners/answer/13458165.
- Wikipedia pending changes: en.wikipedia.org/wiki/Wikipedia:Pending_changes.
- iOverlander FAQ: ioverlander.com/faq.
- Reap Benefit nudging study: glific.org.
- WhatsApp Business pricing: developers.facebook.com (business-messaging/whatsapp/pricing).
- xBhp Ladakh guide and group riding: xbhp.com.
- Furkot overnight stops: help.furkot.com.
- Komoot multi-day planner: komoot.com/premium/multiday-planner.
- NHAI on two-wheeler tolls: newsonair.gov.in.
- Satellite messengers in India: explorersweb.com, January 2025 (seen once).
