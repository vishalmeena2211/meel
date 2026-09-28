# Do the built screens match the wireframes?

**Date:** 28 September 2026
**Asked by:** Vishal
**Short answer when first checked: no.** Of 81 frames, 14 matched. This file records every frame, what differed, and what has been done about it since.

---

## How to read this

- **Screen** is one entry in the list on the left of the wireframe file. There are 30.
- **Frame** is one drawn phone or laptop inside a screen. There are 81. Screen 30 is a table of data, with no frames.
- **4.1** means screen 4, frame 1.
- **First check** is what I found on 28 September, before fixing anything. It is kept so the record is honest.
- **Now** is the state after the fixes. An empty box under "Now" means it still does not match.

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
| 1.1 | A link in a chat group, with a card that carries the fact and its date | Not built | The card is for the whole route and shows its picture. There is no card for one fact | [ ] |
| 1.2 | The link opens on that one fact | Differs | The page scrolls to the fact and outlines it. There is no notice saying why, and the fact is not brought to the top | [ ] |
| 2.1 | Front page as a map, with every route | Not built | No map, and nothing drawn in its place | [ ] |
| 2.2 | Front page as a list | Close | Cards carry a picture and the distance. The line saying how recently riders confirmed is missing | [ ] |
| 2.3 | Search finds nothing | Close | The message and "Suggest this place" match. "Nearby routes that are here" is missing | [ ] |
| 3.1 | Saving a route before leaving | Not built | | [ ] |
| 3.2 | Opened with no network | Not built | | [ ] |
| 3.3 | Reporting with no network | Not built | | [ ] |

### A route

| Frame | What it shows | First check | What differed | Now |
|---|---|---|---|---|
| 4.1 | Top of a full page | Differs | The list "On this page", with counts and a warning where facts are ageing, is missing. A row of chips stands in for it | [ ] |
| 4.2 | Fuel | Differs | The strip and the pumps are there. Facts are long cards, not short rows. The fuel check sits inside the page | [ ] |
| 4.3 | Mechanics | Not built | No data. Shown as a locked row | [ ] |
| 5.1 | Is it open, in season | Close | The offices and "Open their page" match. How long ago each office last spoke is missing | [ ] |
| 5.2 | What riders saw, with dates | Not built | Hazards from published sources stand in its place | [ ] |
| 5.3 | Is it open, in winter | Differs | The table of years is there, with more in it than drawn. The notice "last official word" and the note for next season are missing | [ ] |
| 6.1 | Rules, as a list | Differs | Long cards, not short rows | [ ] |
| 6.2 | One rule, with every change | Differs | The changes and the official link are inside the card. No sheet opens | [ ] |
| 6.3 | Changed since your last visit | Not built | | [ ] |
| 7.1 | Mobile network, halt by halt | Not built | No data | [ ] |
| 7.2 | Real riding hours | Not built | Only what a map app claims is shown | [ ] |
| 7.3 | Stays | Not built | No data | [ ] |
| 8.1 | Top of a basic page | Differs | One line with a label, where a notice was drawn. No list "On this page" | [ ] |
| 8.2 | What is missing, and how it arrives | Close | Locked rows, notice, count and button match. "What a trip report asks" is missing | [ ] |
| 8.3 | A fact not yet checked | Close | The dashed label, the source and both buttons match. The card is long | [ ] |
| 9.1 | A route with no page yet | Close | Built, but no route is in this state, so it cannot be seen. "Written routes nearby" is missing | [ ] |
| 9.2 | Reports are arriving | Not built | | [ ] |

### Facts

| Frame | What it shows | First check | What differed | Now |
|---|---|---|---|---|
| 10.1 | The five states, side by side | Close | All five states work. I saw each one. They are long cards | [ ] |
| 10.2 | One fact opened, with its history | Differs | History is a fold inside the card. Nothing says why the fact is ageing | [ ] |
| 10.3 | Reports disagree | Differs | One line and the newest words. Both reports are not set side by side | [ ] |
| 11.1 | The rider taps "Still true" | Differs | The sheet opens. The day is typed into a date box, where three choices were drawn. The main button sends to Meel, not to the chat app | [ ] |
| 11.2 | The message, ready to send | Matches | Seen only when a chat number is set | [x] |
| 11.3 | After the editor has read it | Matches | | [x] |
| 12.1 | What has changed | Close | Five choices, with different words | [ ] |
| 12.2 | Before the editor has checked | On purpose | The warning shows at once. The rider's words are held back until you have read them | [ ] |
| 12.3 | After the editor has checked | Differs | The words show with the rider's name. The fact is not rewritten, and it does not turn fresh | [ ] |

### Tools

| Frame | What it shows | First check | What differed | Now |
|---|---|---|---|---|
| 13.1 | Fuel check: pick a bike | Differs | A drop-down, where a list with search was drawn | [ ] |
| 13.2 | Not enough: carry fuel | Close | Verdict, litres, range and bar match. The three rows under it, and the warning about the pump it depends on, are missing | [ ] |
| 13.3 | Enough | Close | The same | [ ] |
| 14.1 | The climb, drawn to scale | Close | Drawing and heights match. Tick boxes stand in for the button "Check my night halts" | [ ] |
| 14.2 | A plan that climbs too fast | Close | "Add a night at Jispa" is missing | [ ] |
| 14.3 | The gentlest plan the road allows | Differs | It says "steep". It does not work out whether the road allows anything gentler | [ ] |
| 15.1 | Packing list, by month | Close | Twelve months shown, where only the months of the season were drawn | [ ] |
| 15.2 | Videos, pinned to stretches | Differs | One flat list | [ ] |
| 15.3 | A stretch with no video | Not built | One button for the whole route | [ ] |

### Trip reports

| Frame | What it shows | First check | What differed | Now |
|---|---|---|---|---|
| 16.1 | The three things we need | Differs | One long form, where three steps were drawn | [ ] |
| 16.2 | Optional details, folded | Differs | Not folded. Riding hours are typed freely, not leg by leg | [ ] |
| 16.3 | Review, then send | Differs | No review step | [ ] |
| 17.1 | Locked: not enough reports | Close | The words are there. The bar showing progress is missing | [ ] |
| 17.2 | Bikes riders took | Not built | | [ ] |
| 17.3 | What the trip cost | Not built | | [ ] |

### Riding together

| Frame | What it shows | First check | What differed | Now |
|---|---|---|---|---|
| 18.1 | The board of trips | Close | Cards match. The filters are missing. "Post a trip" is at the top, not fixed at the foot | [ ] |
| 18.2 | Trips on one route | Differs | A short section on the route page. No list "Already ridden" | [ ] |
| 18.3 | No trips yet | Close | "Trips on roads nearby" is missing | [ ] |
| 19.1 | The trip, before joining | Matches | | [x] |
| 19.2 | Asked, and waiting | Close | The notice does not give the day you asked | [ ] |
| 19.3 | Accepted | Close | The rows under "Before you leave" do not give their answers | [ ] |
| 20.1 | An account, asked for at the right moment | Matches | | [x] |
| 20.2 | Creating an account | Matches | | [x] |
| 20.3 | Logging in, and getting it wrong | Matches | | [x] |
| 21.1 | Posting a trip: where and when | Differs | One form, where three steps were drawn | [ ] |
| 21.2 | Posting a trip: how you ride | Differs | The same | [ ] |
| 21.3 | Checked against the route | Close | Season, altitude and fuel match. The check on opening dates is missing | [ ] |
| 22.1 | People asking to join | Matches | | [x] |
| 22.2 | Your account | Differs | Your details are an open form, where one row with "Change" was drawn | [ ] |
| 22.3 | Deleting an account | Close | It does not ask what to do with a trip you lead | [ ] |
| 23.1 | A trip that is full | Close | It does not say how many are waiting. Nearby trips are from the same road only | [ ] |
| 23.2 | Declined | Close | The same, for nearby trips | [ ] |
| 23.3 | Over, and reporting a trip | Differs | "What came back from it" is missing | [ ] |
| 24.1 | Fields that need fixing | Matches | | [x] |
| 24.2 | The email is already in use | Close | The words are in the error line, where a notice was drawn | [ ] |
| 24.3 | A forgotten password | Matches | | [x] |
| 25.1 | Changing your password | Matches | | [x] |
| 25.2 | After a one-time password | Matches | | [x] |
| 25.3 | The editor lets a rider back in | Close | No "Done" button | [ ] |

### Wider screens, and the editor

| Frame | What it shows | First check | What differed | Now |
|---|---|---|---|---|
| 26 | A route page on a laptop | Differs | Two columns, where three were drawn. No search in the top bar | [ ] |
| 27 | The editor's morning | Differs | A plain list. The fact as it stands and as it would become are not set side by side | [ ] |

### Credit where it is due

| Frame | What it shows | First check | What differed | Now |
|---|---|---|---|---|
| 28.1 | A route with its picture | Matches | | [x] |
| 28.2 | Where one fact came from | Differs | The source is one line on the card. No sheet | [ ] |
| 28.3 | The credits page | Matches | It names more than was drawn | [x] |
| 29.1 | Tools | Close | It does not say the tools work with no network | [ ] |
| 29.2 | What Meel is | Matches | | [x] |
| 29.3 | A page that does not exist | Close | No search box | [ ] |

---

## Three places where I mean to keep the difference

These are yours to overrule. Where I keep the difference, I change the drawing, so the wireframes and the site agree.

| Frame | The drawing | What I built | Why |
|---|---|---|---|
| 2.1 | A map with the routes on it | The roads alone, with nothing beneath | A map of India's borders drawn wrongly is against Indian law. A road has no border |
| 11.1, 12.1, 16.3 | "Open chat app" is the main button | "Send to Meel" is the main button. The chat app comes second | The drawing assumed a site with no inbox. You then asked for accounts, so an inbox exists. A message sent straight to it needs no typing by you |
| 12.2 | The rider's words show at once | The warning shows at once. The words wait until you have read them | Anyone can report, with no account. Words nobody has read should not appear on a public page |
