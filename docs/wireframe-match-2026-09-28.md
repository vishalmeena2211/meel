# Do the built screens match the wireframes?

**Date:** 28 September 2026
**Asked by:** Vishal
**Short answer when first checked: no.** Of 81 frames, 14 matched.
**After the rebuild the same day:** 74 of 81 match. 6 differ on purpose, and the drawings were changed to agree. 1 is close: the editor's desk has no way to ask a rider a question.

---

## How to read this

- **Screen** is one entry in the list on the left of the wireframe file. There are 30.
- **Frame** is one drawn phone or laptop inside a screen. There are 81. Screen 30 is a table of data, with no frames.
- **4.1** means screen 4, frame 1.
- **First check** is what I found on 28 September, before fixing anything. It is kept so the record is honest.
- **Now** is the state after the rebuild. A ticked box matches. **Kept** means it differs on purpose and the drawing now shows what was built. An empty box still differs, with the reason beside it.

The five verdicts:

| Verdict | Meaning |
|---|---|
| Matches | Same parts, same order, same behaviour. Wording may differ by a word |
| Close | Same job and the same main parts. One or two parts are missing or moved |
| Differs | The job is done, but in a different shape from the drawing |
| Not built | Nothing on the site does this |
| On purpose | I built it differently and mean to keep it. The reason is given, and it is yours to overrule |

## How I checked

I did not rely on memory. I filled a scratch database with the wireframes' own example world: the same riders, the same trips, facts in each of the five states. Then I opened every built screen as each rider and set its text beside the text of the frame. The scratch database is deleted afterwards.

---

## The count, at first check

| Verdict | Frames | Share |
|---|---|---|
| Matches | 14 | 17 in 100 |
| Close | 26 | 32 in 100 |
| Differs | 25 | 31 in 100 |
| Not built | 15 | 19 in 100 |
| On purpose | 1 | 1 in 100 |
| **All frames** | **81** | |

## Why so many differed

Three causes account for most of it.

1. **A fact was drawn as a short row that opens. I built it as a long card that is always open.** Every route page is a list of facts, so this one choice touches about twenty frames. It is also why a route page is 13,000 pixels long on a phone.
2. **Tools and forms were drawn as their own screens, in steps. I built them inside the route page, or as one long form.** The fuel check, the altitude check, the trip report and posting a trip.
3. **Sections that only riders can fill were never built**, because there is no rider data yet: mechanics, mobile network, stays, riding hours, sightings, bikes, costs.

---

## Every frame

### Arriving

| Frame | What it shows | First check | What differed | Now |
|---|---|---|---|---|
| 1.1 | A link in a chat group, with a card that carries the fact and its date | Not built | The card is for the whole route and shows its picture. There is no card for one fact | [x] A fact has its own address, and the card a chat app shows carries the fact, its label and its date |
| 1.2 | The link opens on that one fact | Differs | The page scrolls to the fact and outlines it. There is no notice saying why, and the fact is not brought to the top | [x] |
| 2.1 | Front page as a map, with every route | Not built | No map, and nothing drawn in its place | Kept. Every road is drawn, with nothing beneath and no border |
| 2.2 | Front page as a list | Close | Cards carry a picture and the distance. The line saying how recently riders confirmed is missing | [x] |
| 2.3 | Search finds nothing | Close | The message and "Suggest this place" match. "Nearby routes that are here" is missing | Kept. Routes with names spelt like it. The site cannot know where an unknown place lies |
| 3.1 | Saving a route before leaving | Not built | | [x] |
| 3.2 | Opened with no network | Not built | | [x] A saved route opens, with a dark bar saying when it was saved |
| 3.3 | Reporting with no network | Not built | | Kept. The report waits on the phone and sends itself when the signal returns. Tested |

### A route

| Frame | What it shows | First check | What differed | Now |
|---|---|---|---|---|
| 4.1 | Top of a full page | Differs | The list "On this page", with counts and a warning where facts are ageing, is missing. A row of chips stands in for it | [x] |
| 4.2 | Fuel | Differs | The strip and the pumps are there. Facts are long cards, not short rows. The fuel check sits inside the page | [x] |
| 4.3 | Mechanics | Not built | No data. Shown as a locked row | [x] Shows as soon as riders send mechanics. A phone number only with the shop's agreement |
| 5.1 | Is it open, in season | Close | The offices and "Open their page" match. How long ago each office last spoke is missing | [x] |
| 5.2 | What riders saw, with dates | Not built | Hazards from published sources stand in its place | [x] |
| 5.3 | Is it open, in winter | Differs | The table of years is there, with more in it than drawn. The notice "last official word" and the note for next season are missing | [x] |
| 6.1 | Rules, as a list | Differs | Long cards, not short rows | [x] |
| 6.2 | One rule, with every change | Differs | The changes and the official link are inside the card. No sheet opens | [x] |
| 6.3 | Changed since your last visit | Not built | | [x] Kept on the rider's own phone |
| 7.1 | Mobile network, halt by halt | Not built | No data | [x] |
| 7.2 | Real riding hours | Not built | Only what a map app claims is shown | [x] |
| 7.3 | Stays | Not built | No data | [x] |
| 8.1 | Top of a basic page | Differs | One line with a label, where a notice was drawn. No list "On this page" | [x] |
| 8.2 | What is missing, and how it arrives | Close | Locked rows, notice, count and button match. "What a trip report asks" is missing | [x] |
| 8.3 | A fact not yet checked | Close | The dashed label, the source and both buttons match. The card is long | [x] |
| 9.1 | A route with no page yet | Close | Built, but no route is in this state, so it cannot be seen. "Written routes nearby" is missing | [x] Built. No route is in this state today |
| 9.2 | Reports are arriving | Not built | | Kept. The count shows. The words wait for the editor, as in 12.2 |

### Facts

| Frame | What it shows | First check | What differed | Now |
|---|---|---|---|---|
| 10.1 | The five states, side by side | Close | All five states work. I saw each one. They are long cards | [x] |
| 10.2 | One fact opened, with its history | Differs | History is a fold inside the card. Nothing says why the fact is ageing | [x] |
| 10.3 | Reports disagree | Differs | One line and the newest words. Both reports are not set side by side | [x] |
| 11.1 | The rider taps "Still true" | Differs | The sheet opens. The day is typed into a date box, where three choices were drawn. The main button sends to Meel, not to the chat app | Kept. Send to Meel first, the chat app second |
| 11.2 | The message, ready to send | Matches | Seen only when a chat number is set | [x] |
| 11.3 | After the editor has read it | Matches | | [x] |
| 12.1 | What has changed | Close | Five choices, with different words | [x] The choices follow the kind of fact |
| 12.2 | Before the editor has checked | On purpose | The warning shows at once. The rider's words are held back until you have read them | Kept. Drawing changed |
| 12.3 | After the editor has checked | Differs | The words show with the rider's name. The fact is not rewritten, and it does not turn fresh | [x] The words replace the old ones, and the fact turns fresh |

### Tools

| Frame | What it shows | First check | What differed | Now |
|---|---|---|---|---|
| 13.1 | Fuel check: pick a bike | Differs | A drop-down, where a list with search was drawn | [x] |
| 13.2 | Not enough: carry fuel | Close | Verdict, litres, range and bar match. The three rows under it, and the warning about the pump it depends on, are missing | [x] Same answer as drawn: 2 litres from Keylong, safe range 312 km |
| 13.3 | Enough | Close | The same | [x] |
| 14.1 | The climb, drawn to scale | Close | Drawing and heights match. Tick boxes stand in for the button "Check my night halts" | [x] |
| 14.2 | A plan that climbs too fast | Close | "Add a night at Jispa" is missing | [x] |
| 14.3 | The gentlest plan the road allows | Differs | It says "steep". It does not work out whether the road allows anything gentler | [x] |
| 15.1 | Packing list, by month | Close | Twelve months shown, where only the months of the season were drawn | [x] Only the months of the season are offered |
| 15.2 | Videos, pinned to stretches | Differs | One flat list | [x] |
| 15.3 | A stretch with no video | Not built | One button for the whole route | [x] |

### Trip reports

| Frame | What it shows | First check | What differed | Now |
|---|---|---|---|---|
| 16.1 | The three things we need | Differs | One long form, where three steps were drawn | [x] |
| 16.2 | Optional details, folded | Differs | Not folded. Riding hours are typed freely, not leg by leg | [x] Hours are asked leg by leg |
| 16.3 | Review, then send | Differs | No review step | [x] |
| 17.1 | Locked: not enough reports | Close | The words are there. The bar showing progress is missing | [x] |
| 17.2 | Bikes riders took | Not built | | [x] Shows after 10 reports |
| 17.3 | What the trip cost | Not built | | [x] Shows after 10 reports that give a cost |

### Riding together

| Frame | What it shows | First check | What differed | Now |
|---|---|---|---|---|
| 18.1 | The board of trips | Close | Cards match. The filters are missing. "Post a trip" is at the top, not fixed at the foot | [x] |
| 18.2 | Trips on one route | Differs | A short section on the route page. No list "Already ridden" | [x] |
| 18.3 | No trips yet | Close | "Trips on roads nearby" is missing | [x] |
| 19.1 | The trip, before joining | Matches | | [x] |
| 19.2 | Asked, and waiting | Close | The notice does not give the day you asked | [x] |
| 19.3 | Accepted | Close | The rows under "Before you leave" do not give their answers | [x] |
| 20.1 | An account, asked for at the right moment | Matches | | [x] |
| 20.2 | Creating an account | Matches | | [x] |
| 20.3 | Logging in, and getting it wrong | Matches | | [x] |
| 21.1 | Posting a trip: where and when | Differs | One form, where three steps were drawn | [x] |
| 21.2 | Posting a trip: how you ride | Differs | The same | [x] |
| 21.3 | Checked against the route | Close | Season, altitude and fuel match. The check on opening dates is missing | [x] |
| 22.1 | People asking to join | Matches | | [x] |
| 22.2 | Your account | Differs | Your details are an open form, where one row with "Change" was drawn | [x] |
| 22.3 | Deleting an account | Close | It does not ask what to do with a trip you lead | [x] A trip you lead can be handed to a rider who is going |
| 23.1 | A trip that is full | Close | It does not say how many are waiting. Nearby trips are from the same road only | [x] |
| 23.2 | Declined | Close | The same, for nearby trips | [x] |
| 23.3 | Over, and reporting a trip | Differs | "What came back from it" is missing | [x] |
| 24.1 | Fields that need fixing | Matches | | [x] |
| 24.2 | The email is already in use | Close | The words are in the error line, where a notice was drawn | [x] |
| 24.3 | A forgotten password | Matches | | [x] |
| 25.1 | Changing your password | Matches | | [x] |
| 25.2 | After a one-time password | Matches | | [x] |
| 25.3 | The editor lets a rider back in | Close | No "Done" button | [x] |

### Wider screens, and the editor

| Frame | What it shows | First check | What differed | Now |
|---|---|---|---|---|
| 26 | A route page on a laptop | Differs | Two columns, where three were drawn. No search in the top bar | [x] |
| 27 | The editor's morning | Differs | A plain list. The fact as it stands and as it would become are not set side by side | [ ] Close. Built as drawn, except "Ask the rider a question": Meel holds no way to reach a rider. Drawing changed to say so |

### Credit where it is due

| Frame | What it shows | First check | What differed | Now |
|---|---|---|---|---|
| 28.1 | A route with its picture | Matches | | [x] |
| 28.2 | Where one fact came from | Differs | The source is one line on the card. No sheet | [x] |
| 28.3 | The credits page | Matches | It names more than was drawn | [x] |
| 29.1 | Tools | Close | It does not say the tools work with no network | [x] |
| 29.2 | What Meel is | Matches | | [x] |
| 29.3 | A page that does not exist | Close | No search box | [x] |

---

## Where the site and the first drawing still part

These are yours to overrule. In each case the drawing was changed on 28 September, so the wireframes and the site now agree.

| Frame | The drawing | What I built | Why |
|---|---|---|---|
| 2.1 | A map with the routes on it | The roads alone, with nothing beneath | A map of India's borders drawn wrongly is against Indian law. A road has no border |
| 11.1, 12.1, 16.3 | "Open chat app" is the main button | "Send to Meel" is the main button. The chat app comes second | The drawing assumed a site with no inbox. You then asked for accounts, so an inbox exists. A message sent straight to it needs no typing by you |
| 12.2, 9.2 | The rider's words show at once | The warning, or the count, shows at once. The words wait until you have read them | Anyone can report, with no account. Words nobody has read should not appear on a public page |
| 2.3 | Routes near a place Meel does not know | Routes whose names are spelt like it | The site cannot know where an unknown place lies. Showing "nearby" routes would be a guess |
| 3.3 | The chat app holds a report made with no network | The phone holds it, and sends it when the signal returns | The site has its own inbox, and there may be no chat number |
| 27 | "Ask Rahul a question" | Not there | Meel holds no phone number for a rider. There is no way to reach one yet |

---

## How the rebuild was checked

- [x] Every screen of all 50 routes opened: 650 addresses, no failure
- [x] Each rebuilt screen seen on a phone, and the route page and the editor's desk on a laptop, beside their frames
- [x] The wireframes' own example worked through: Classic 350 on Manali to Leh gives 2 litres from Keylong; Manali, Sarchu, Leh gives "Night 2 climbs too fast" and offers a night at Keylong
- [x] A report made with the network off was kept, then sent when it came back, with the day it was seen
- [x] Type check and lint clean
- [ ] Mechanics, network, riding hours, stays, bikes and costs were seen with made-up riders' data on a test copy. No route has real riders' data yet, so on the live site these still show as "not here yet"
- [ ] Saving a route for no network was tested for what it stores. It has not been tried on a real phone in a real valley

---

## Logging in with Google, checked the same day

**Asked by:** Vishal, who asked for Google log-in through Auth.js and for the accounts to move to Postgres.
**Drawn first:** six new frames, added at the end of four screens so no earlier number moved. The gallery now has 87 frames.
**Short answer:** all 9 frames that Google touches were compared with the built screen in the same situation. 5 matched at once. In 4 the build was right and the drawing had left something out, so the drawing was changed to agree.

How it was checked: a scratch database was filled with the drawings' own example world (Rahul Negi from Delhi, Anjali leading Manali to Leh, Meera Joshi, whose password Google takes over). Each screen was opened on a phone, as that rider, and set beside its frame. A rider who came in through Google was given the login cookie Auth.js would have given them, because a real Google login needs your own Google settings. The scratch database was deleted afterwards.

| Frame | What it shows | First check | What differed | Now |
|---|---|---|---|---|
| 20.1 | Joining a trip needs an account, with Google first | Matches | | [x] |
| 20.2 | Creating an account, with Google above the form | Matches | The notice about why an account is needed sits above Google, as it did before | [x] |
| 20.3 | Logging in, and getting it wrong, with Google above the form | Matches | | [x] |
| 20.4 | The first time with Google: "Nearly done" | Matches | | [x] |
| 22.4 | Deleting an account that logs in with Google | Close | The site also says you leave the trips you joined. The drawing had dropped that line | [x] Drawing changed: a rider who uses Google still leaves their trips |
| 24.4 | Google did not let you in | Close | The site also shows "I have forgotten my password" and "New here?" | [x] Drawing changed: it is the same log-in form as 20.3 |
| 25.4 | A rider who logs in with Google | Matches | | [x] |
| 25.5 | When Google takes over an account | Close | The site shows "How you log in" before "Your password" | [x] Drawing changed, to match frame 25.4 |
| 25.6 | The editor, and a rider who uses Google | Close | The site keeps "Check it is them first" from frame 25.3, and "Set a one-time password" sits under the words, with "Done" at the foot | [x] Drawing changed to agree |

What was not compared, because it cannot be seen without your Google settings:

- [ ] Google's own screen, where a rider picks an account and agrees. The test stopped at the moment the browser reached accounts.google.com, and checked only what Meel sent there: its Google id, the address to come back to, and the three things it asks for (a sign-in, the email, the name).

---

## The foot of every page, checked the same day

**Asked by:** Vishal: "make the footer proper".
**Drawn first:** a new last screen, 31, "The foot of every page", with a phone frame and a laptop frame. No earlier number moved. The gallery now has 31 screens and 89 frames.

Before this, the footer had never been drawn. It was three lines of small text: the map credit first, then four links, then the promise.

| Frame | What it shows | First check | What differed | Now |
|---|---|---|---|---|
| 31.1 | On a phone | Matches | The drawing shows the tab bar beneath. The built About page has none, as before; pages that have one keep the footer clear of it | [x] |
| 31.2 | On a laptop | Matches | | [x] |

How it was checked: the About page and the log-in page, on the site running on this machine, at phone width and laptop width, scrolled to the bottom. On the log-in page, the button fixed to the foot of the screen was checked not to cover the footer's last line.

One word changed in the drawing to agree with the site: "All routes", not "All 50 routes", so the footer cannot go out of date when a route is added.

---

## Meel's own share card, checked the same day

**Asked by:** Vishal: "do its proper SEO things". Most of that work changes no screen (addresses, search-engine files, structured data). One part does: a link to rideplanner.in itself had no preview card.
**Drawn first:** frame 1.3, "A link to Meel itself", added at the end of screen 1. The gallery now has 90 frames.

| Frame | What it shows | First check | What differed | Now |
|---|---|---|---|---|
| 1.3 | A link to Meel itself, with Meel's own card | Close | The drawing sketched the card's picture as a dark band. The built card is white, like every fact's card | [x] Drawing changed: the preview in frames 1.1 and 1.3 is now drawn white, as both cards are built |

How it was checked: the card was made by the site running on this machine and set beside the frame. Its route count is read from the data when the site is built.

---

## Sharing a trip on WhatsApp, checked the same day

**Asked by:** Vishal: a way to share trips into WhatsApp groups so riders can join.
**Drawn first:** a "Share on WhatsApp" button in the trip summary that frames 19.1 and 19.2 share; frame 19.4, the message and the trip's own card in a riding group; frame 21.4, the trip page straight after publishing. The gallery now has 92 frames.

| Frame | What it shows | First check | What differed | Now |
|---|---|---|---|---|
| 19.1 | The trip, with "Share on WhatsApp" under the leader | Matches | | [x] |
| 19.4 | Shared into a riding group: the written message and the trip's card | Matches | The card's words are the route, "Trip · led by", the places left, the dates and the starting city, as drawn | [x] |
| 21.4 | On the board, and ready to share | Matches | | [x] |

How it was checked: on the site running on this machine, as a visitor with no account, with a test trip that was deleted afterwards. The test trip's chat group link held a marker; it appeared in none of the page, the message or the card. A trip waiting for the editor gave Meel's own card, byte for byte. A full trip's message said so, and its card said "Full".

Not checked: WhatsApp itself fetching the card. That needs the site public, since a private site shows WhatsApp only Vercel's log-in page.

---

## Search suggestions as you type, checked the same day

**Asked by:** Vishal: "search bar is not suggesting things when typing". The box in the header only searched when Enter was pressed. The one on the front page did narrow the routes, but below the big road drawing, out of sight on a phone.
**Drawn first:** frame 2.4, suggestions under the front page's box on a phone; frame 2.5, the header's box on a laptop, from a route page, with a word spelt wrong. The gallery now has 94 frames.

| Frame | What it shows | First check | What differed | Now |
|---|---|---|---|---|
| 2.4 | "Leh" typed: two routes, then Leh on two other routes | Close | The drawing listed the places Pangong first. The built list puts them in the order of their routes' names, Nubra first | [x] Drawing changed to Nubra first |
| 2.5 | "spitti" typed in the header: Spiti circuit, then "Search all routes for “spitti”" | Matches | | [x] |

What the notes now also say: nothing is picked until an arrow key is pressed. Enter with nothing picked searches every route from the header, and on the front page closes the list so the routes below show. Two letters match only at the start of a word, so "sp" brings up Spiti, not Jispa.

How it was checked: 24 steps in a real browser, on the site running on this machine, at phone and laptop sizes. They included the arrow keys, Enter, Escape, tapping and clicking a suggestion, clicking away, and what a screen reader is told. The header's box asks for the route list (about 10 KB) only the first time it is used. The front page asks for nothing, as it already has the routes. No errors appeared in the browser.

**Focus on a typing box, fixed after this check.** Vishal saw a thick double ring around the header's search box when clicked. Every typing box on the site had it: the site-wide keyboard ring was drawn on top of the box's own focus style, because the ring's rule outranked it. The drawings show a focused box as a green border with a soft glow and no ring (`.input.focus`). The ring now gives way to a part's own focus style, so all eleven screens with typing boxes match that. Links, buttons and chips still show the ring when reached with the keyboard. The footer's links now show their ring in yellow, as written, where before the green one overrode it.

---

## Meel's own lists, days and months, checked the same day

**Asked by:** Vishal: many places used the browser's own controls ("select, dates and all"). The browser drew the route lists, the day boxes on a trip, the month on a trip report, the day in a fact's report, the hand-over list when deleting an account, and every tick and round choice. Each phone drew them differently: a day read 28/09/2026 on one and 09/28/2026 on another. The search boxes also showed the browser's blue cross, and one fold-out showed the browser's triangle.
**Drawn first:** screen 32, "Picking from a list, a day or a month", with six frames. The closed lists, days and months in screens 18, 20, 21, 23 and 26 now show their arrow or calendar. The gallery now has 32 screens and 100 frames.

| Frame | What it shows | First check | What differed | Now |
|---|---|---|---|---|
| 32.1 | A list on a phone: a sheet with the label as its title, a box to narrow it, routes grouped by region | Close | The built sheet shaded the first row before anything was picked. The drawing shades nothing | [x] Build changed: on a phone no row is shaded until the rider types |
| 32.2 | A day on a phone: a month, today ringed, days before today pale, and why | Matches | The line saying why ends with a full stop in the build | [x] Drawing changed to match |
| 32.3 | A month on a phone: a year of months, months still to come pale | Close | The drawing shortened June, July and September to Jun, Jul and Sep. The site's own short forms are June, July and Sept | [x] Drawing changed to the site's short forms |
| 32.4 | A list on a laptop: a panel right under the box, the keyboard's row shaded | Matches | | [x] |
| 32.5 | A day on a laptop, inside a fact's sheet | Matches | Checked in a window 800 high. With no room under the box, the calendar opened above it, as the notes say | [x] |
| 32.6 | Closed: arrow, calendar, "Pick a…", a mistake in red, ticks, round choices, the search box's own cross | Matches | | [x] |

How it was checked: 47 steps in a real browser, on the site running on this machine, at phone and laptop sizes. They covered Tools, a trip report, a fact's two report sheets, signing up, posting a trip, the account page's delete sheet, the front page and the page that does not exist. On the keyboard: arrows, Page Up, Enter, Escape, and typing to narrow a list. Escape inside a fact's sheet closed only the calendar. Pale days and months could not be picked. The server saved the days exactly as picked: 10 to 15 October 2026. The test accounts and trips were deleted afterwards, and the local database is empty again.

Not checked: a real phone's screen reader. The parts carry the labels a screen reader needs: each day is read in full, such as "Saturday 10 October 2026".
