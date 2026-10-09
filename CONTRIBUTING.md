# Contributing to Meel

Thank you for wanting to help. Meel is kept by one person, as a hobby, so the most useful help is the kind that is easy to check.

## If you ride

You do not need this repository at all.

- **Check a fact on a road you know.** Every fact on [rideplanner.in](https://rideplanner.in) has two buttons, "Still true" and "This has changed". Neither needs an account, and the editor reads every report before a fact changes.
- **Send a trip report** after a ride, at [rideplanner.in/report](https://rideplanner.in/report). It takes about three minutes, and it is how the sections only riders can fill (mechanics, network, riding hours, stays) get written.
- **Missing a route?** Search for it on the front page. When nothing matches, "Suggest this place" sends it to the editor.

Please do not open a GitHub issue to correct a fact: the buttons on the site are quicker, and they keep the fact's history in one place.

## If you fix data

Routes and facts live in [`data/`](data), one file per route. [`data/README.md`](data/README.md) explains every part of a route file.

- **Every fact needs its source and the day it was read.** A link to the page, and whether the page itself was opened or only a search result was seen.
- **Write facts in your own words.** Never paste text from another site.
- **No private people.** No names or phone numbers of mechanics, homestay owners or riders.
- **The data keeps its sources' licences**, not MIT. See [`data/LICENSE.md`](data/LICENSE.md). Map data you add from OpenStreetMap stays under the Open Database Licence.
- The scripts in [`data/tools/`](data/tools) need only Python 3, with no packages to install. After changing a route, run `python3 data/tools/assemble.py`, then `pnpm sync-data` in `web/`.

## If you write code

Start with [`web/README.md`](web/README.md): how to run the site, every setting, and the rules the code keeps.

- **A change to a screen starts in the wireframes**, in [`design/meel-wireframes.src.html`](design/meel-wireframes.src.html), before it is built. Open `design/meel-wireframes.html` in a browser to see them; it is the same file inside a page shell. Each frame's notes are the specification.
- **Keep the words plain.** The site talks to riders, often on a weak signal and in sunlight, not to developers.
- **The site never says a road is open.** It links to the office that decides.
- **Anything new that shows a rider's name, contact or chat link** needs `data-private` or `data-private-block`, so screen recordings leave it out. See "Mixpanel" in `web/README.md`.
- **No secrets in the code.** Every key and password is a setting, read from the environment.

Before you open a pull request, from `web/`:

```bash
pnpm typecheck
```

```bash
pnpm lint
```

```bash
pnpm build
```

In the pull request, say what changed, why, and how you checked it. For a change to a screen, add a picture of it on a phone.

## Licence of what you send

Code you contribute is under the [MIT licence](LICENSE), like the rest of the code. Data you contribute keeps the licence of its source.

## Security problems

Please do not report them in an issue or a pull request. [`SECURITY.md`](SECURITY.md) says how to report one privately.

## Being decent

Be kind and patient with each other. Riders of every kind of bike, and every level of experience, are welcome here.
