# Meel: what to make better on the screens

Audit of the site as it runs on this machine, 28 September 2026, after the search, picker and Google login work.

## How to read this

- Each item is a box to tick when it is done: `- [ ]` open, `- [x]` done.
- **Fix first**: the page shows something wrong or misleading, or a part cannot be used.
- **Next**: makes the main things riders come for quicker or clearer.
- **Later**: polish.
- **Size**: *small* is under an hour; *medium* is about half a day; *large* needs data work, or several screens.
- Every change to a screen is drawn in `design/meel-wireframes.src.html` first, then built, then checked frame by frame, as before.
- Addresses such as `/routes/manali-leh/fuel` are pages on the site.

## How it was checked

- 29 pages, each at phone size (390 wide) and laptop size (1280 wide): every public page, a route and six of its sections, a fact's own page, the tools, the trips board, the trip report, logging in, signing up, and, with a test account, posting a trip, a trip's page and the account page. The test account and its trip were deleted afterwards.
- An automated accessibility scan (axe) on every page at phone size.
- Measured on every page: sideways scrolling, tap targets under 40 px, the smallest text used.
- **Not checked:** the editor's inbox (it needs the editor's login on this machine), a real phone and its screen reader, speed on the live site (it is private; the dev server's speed means nothing), use with no network, and reading in sunlight.

**Overall:** the site is in good shape. No page scrolls sideways on a phone, and the scan found only three problems across 29 pages. The fuel gap strip, the dated sources and the new pickers work well. The biggest problems are one wrong height on the altitude chart, the "Is it open?" wording, and the front page on a laptop.

---

## Fix first

- [x] **The altitude chart shows a peak that is not on the road.** *Done 28 September: tunnels are taken from the open map, and the line runs straight through them on 6 routes; the chart names a tunnel of 1 km or more.* On Manali to Leh (`/routes/manali-leh/altitude`), the line jumps to 4,687 m at km 29, then drops back to 3,073 m. That height is the mountain above the Atal Tunnel; the road goes through it at about 3,000 m. A rider planning a slow climb for their body sees a false peak on day one.
  *Fix:* in the data tools, find stretches the map marks as tunnels, and draw a straight line between the two ends instead of the ground above. Then check every route with a tunnel: Atal, Chenani–Nashri, Banihal (Navyug), and Zoji La once it opens. *Size:* medium (data).

- [x] **"Is it open?" leads with old news that reads like a road status.** *Done 28 September: three office lines reworded to say what the office announces, and the data tools now warn when a line reads like news.* The Border Roads Organisation card says "Snow clearance finished and road connected", dated May 2025, 17 months ago. On a laptop, the side panel shows it cut off, next to a small date badge. The site's one promise is that it never says a road is open, and this line reads as if it does.
  *Fix:* lead each card with what that office announces, such as "Announces snow clearance and when the road opens". Show the last notice only as "Last notice we saw, 12 May 2025: …", smaller, or drop it. *Size:* small (words), plus a drawing change.

- [x] **On a laptop, the region chips past the right edge cannot be reached with a mouse.** *Done 28 September: they wrap from tablet width up.* The chip row on the front page scrolls sideways with its scrollbar hidden. A trackpad can swipe it, but a plain mouse wheel cannot (only Shift with the wheel does), so for most mouse users "Rajasthan" and everything after it is out of reach.
  *Fix:* on laptop widths, let the chips wrap onto a second line, and keep sideways scrolling on phones. *Size:* small.

- [x] **On a laptop, the front page is mostly the road drawing.** *Done 28 September: the routes come first, with the drawing beside them (drawn as frame 2.6).* The drawing stretches to the full width, about 1,120 × 700 px, and its "North is up" grows to about 33 px text. The first route appears only after about 1,000 px of scrolling. The page is 4,971 px tall.
  *Fix:* cap the drawing's height (about 360 px), or put it beside the list, so the routes come first. *Size:* small, plus a drawing change.

## Next

All eleven done on 28 September 2026, drawn first (see `docs/wireframe-match-2026-09-28.md`).

- [x] **On a phone, the drawing comes before the routes, and says little.** It takes about 450 px above the first route. With all 50 routes the same grey, it shows roads but no names. Its key lists "Full page" and "Not written yet", though every route is a basic page today.
  *Fix:* put the list first, and open the drawing from a small "See them drawn" link, or put it after the list. Show only the key entries that apply. *Size:* small, plus a drawing change.

- [x] **"Basic page" is on every card, and the header says "none written in full yet".** When all 50 are basic pages, the badge tells a rider nothing, and the header reads as an apology to a first visitor.
  *Fix:* show the badge only once routes differ. Make the header "50 routes · 13 regions". The honesty stays, in "How far to trust it" and on each route. *Size:* small.

- [x] **A route's overview does not show the longest stretch with no fuel.** On a phone, the photo, its credit, the "basic page" note and two links come first. The stretch with no fuel is the question riders ask most, and it is already worked out (`longest_gaps` in the route's data).
  *Fix:* add "No fuel for 329 km, Keylong to Karu" to the row of three numbers (usual days, highest point, usually open), or as a fourth. *Size:* small, plus a drawing change.

- [x] **The fuel list says the same thing eleven times.** Every pump card carries the same "NOT YET CHECKED" badge and the same line: "From the open map · read 28 September 2026 · no rider has confirmed it".
  *Fix:* say it once above the list: "All 11 are from the open map, read 28 September 2026. No rider has confirmed any yet." Each card then shows its name, its km, and anything that differs. Mark the last pump before the gap: "Last fuel for 329 km". *Size:* medium, plus a drawing change.

- [x] **Some pump names read badly.** Examples: "Karu Fuel Station., near Karu" (stray full stop), "Indian oil" and "Indian Oil" on the same page, and "Petrol pump, near Manali" with "0 km from Manali."
  *Fix:* tidy names in the data tool: trim stray punctuation, spell the fuel companies one way, and drop "0 km from". *Size:* small (data).

- [x] **A leader's own trip page hides the trip.** The route, dates and leader start about 1,100 px down on a phone. The waiting notice, the chat link note, "Before you leave" and the safety note all come first.
  *Fix:* trip summary first, then a one-line status, then the rest. *Size:* small, plus a drawing change.

- [x] **On Tools, the three tools look tappable before a route is picked.** They are only slightly greyed, and tapping one does nothing.
  *Fix:* tapping a tool opens the route list, then goes to that tool for the route picked. Or show them plainly shut, with the words "Pick a route to open". *Size:* small.

- [x] **Tools says "Work with no network", which is only true for saved routes.** The tools page itself is not kept on the phone.
  *Fix:* "Work with no network, on a route you have saved". *Size:* small.

- [x] **The trips board is empty, and looks it.** A first visitor sees one dashed box.
  *Fix:* show what a trip looks like, as one card plainly marked "Example". Also add a line on how joining works, and links to the three most-read routes' "Trips on this route". *Size:* medium, plus a drawing change.

- [x] **On a phone, a route page always shows "I have ridden this · send a trip report" at the foot.** Most visitors will be planning, not back from a ride. The big green bar competes with reading and covers about 90 px of the screen.
  *Fix:* make it a quieter button at the end of the page, and let "Save for the road" be the stronger action for planners. *Size:* small, plus a drawing change.

- [x] **Fuel check needs one tap too many.** After picking a bike, the rider must press "Check this route".
  *Fix:* show the answer as soon as a bike is picked. *Size:* small.

## Later

All done on 28 September 2026, drawn first (see `docs/wireframe-match-2026-09-28.md`). The dark look follows the phone's setting.

- [x] **Some text is very small.** Badges such as "NOT YET CHECKED" and "DATED 17 MONTHS AGO" are 10.5 to 11 px, in narrow capitals. Labels on the road drawing are 10 px. These are hard to read in sunlight at a halt.
  *Fix:* at least 12 px. *Size:* small.

- [x] **Two buttons are small on a phone.** The back arrow and "Log in" are 36 px tall.
  *Fix:* 44 px. *Size:* small.

- [x] **The site's foot shows under step-by-step forms.** On the trip report, posting a trip, signing up and logging in, the full dark foot sits right under the form and pulls the eye away.
  *Fix:* hide it on those pages, or show a one-line foot. *Size:* small.

- [x] **The account page does not say a trip is waiting for the editor.** The trip card shows "You lead this", but not that nobody can see it yet.
  *Fix:* add the waiting badge the trip page already has. *Size:* small.

- [x] **Two page titles.** A trip that is not on the board is titled "A trip on Meel · Meel", with Meel twice. The page that does not exist uses the front page's title.
  *Fix:* "A trip · Meel" and "No page here · Meel". *Size:* small.

- [x] **The three problems the accessibility scan found:**
  - [x] The front page's road drawing is marked as a picture but holds links, so screen readers treat it unevenly. The list below has the same links, so mark the drawing as decoration, or drop the picture role and label the group. *Size:* small.
  - [x] On a fact's own page, the headings jump from level 2 to level 4: "History" and "Where this came from" are level 4 under the fact's level-2 name. *Size:* small.
  - [x] On About, a table that scrolls sideways cannot be scrolled with the keyboard. Let it take the focus, and give it a label. *Size:* small.

- [x] **Altitude chart labels touch the markers at phone width**, for example "Keylong" and "Pang".
  *Fix:* nudge labels clear of the dots. *Size:* small.

- [x] **The laptop side panel cuts office notes mid-sentence**, for example "Snow clearance finished an…".
  *Fix:* show a short full line instead. This goes with the "Is it open?" fix above. *Size:* small.

- [x] **No dark look.** Reading at night at a halt would be easier on the eyes. *Size:* large.

## Found while fixing the first four

- [x] **Guwahati to Tawang still goes over Sela Pass, not through the Sela Tunnel.** *Done 28 September: the stop at Sela Pass that forced the line over it is gone, and the line now runs through both bores of the tunnel (488 km, 7 km shorter). The highest point is now the Sela Tunnel, 3,962 m (13,000 feet, from the government's press release of 9 March 2024; the height grid reads 3,944 to 4,002 m at its mouths). The route's line says both ways: "through the Sela Tunnel, or over Sela Pass at 4,170 m". Wikipedia gives the tunnel as 3,000 m, which the release and the grid both contradict, so it was not used.* The tunnel opened in 2024, but the road line comes from a routing service that sends it over the pass (4,175 m). The heights are right for that line. Riders now mostly take the tunnel, which is lower. *Fix:* route that stretch through the tunnel, then say both ways on the page. *Size:* medium (data).
- [x] **Three steep jumps on the altitude charts, to look at by hand.** *Done 28 September: heights read every 200 m show smooth slopes, not spikes. Jalori climbs about 1,000 m in 8 km to the pass; the Darjeeling route drops about 1,200 m in 10 km to the Teesta. The road line skips the tightest hairpins, so the real slope is a little gentler. Nothing was changed on the charts; the data tools now know these stretches were checked (`STEEP_CHECKED` in `assemble.py`).* The data tools now name any jump steeper than one in eight between two height samples. Jalori and Tirthan has two, near Jalori Pass, which may be real, because that road is famously steep. Darjeeling and Sandakphu has one, a drop of 786 m in 6 km towards the Teesta. *Size:* small, each.

- [x] **Guwahati to Tawang shows "No fuel for 287 km", Tezpur to Jang.** *Done 28 September: the open map truly had no pump there, even off the road. 23 pumps were read from IndianOil's own locator; 18 were new (5 were already on the map). The longest gap is now 84 km, Dirang to Jang, over the Sela Tunnel. Each such pump names the locator as its source, and says so when it is more than half a kilometre off the road. Other companies' pumps were not added.* The open map has no pump within 900 m of the road through Bhalukpong, Bomdila or Dirang, although these are towns, where a pump would be expected. Now that the gap is one of the four numbers at the top of a route, a gap caused by a thin map is easy to take as fact. *Fix:* check the open map near those towns (its query server was timing out on 28 September), add the pumps to OpenStreetMap if they are missing, or widen the search in towns. *Size:* small to medium (data).

## What already works well, and should stay

- Every fact shows its source and its date, and "How far to trust it" is one tap from the front page.
- The fuel gap strip on a route: "329 km · no pump" in red is the clearest thing on the site.
- The trip checks before publishing (season, fuel), which warn but never stop.
- The safety note on a trip ("You are riding with people you have not met").
- Search suggestions, and the new list, day and month pickers.
- On a phone, the bar of four tabs, and each section on its own screen with a way back.
- No page scrolls sideways at phone width.

## A note from the checking run

In development only, the trip page logged "Failed to execute 'measure' on 'Performance' … cannot have a negative time stamp". This comes from React's timing in development, not from Meel's code, and does not happen on the live site.
