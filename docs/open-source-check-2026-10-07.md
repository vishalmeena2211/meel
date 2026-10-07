# Before making the repository public

**Date:** 7 October 2026
**Asked by:** Vishal: "what data we are storing in repo, that can leak, if we do open source now?"

**Short answer:** no secret has ever been committed: no key, password or database address, in the files today or anywhere in the history. What would become public that you may not want public:
1. **Your Gmail address**, as the author of all 64 commits.
2. **Internal research notes** that quote forum members word for word, by their handles.
3. **Mentions of employer** and of your work machine.
4. **Mixpanel's token, built into the code.** It is public by design, but a copy of Meel that someone else runs would count into *your* Mixpanel project.

Each of these is fixable in under an hour. Nothing has been changed yet.

---

## How to read this

- Each finding is a box to tick when it is dealt with: `- [ ]` not yet, `- [x]` done.
- **Must** means fix it before the repository goes public. **Should** means it is better fixed, but nothing leaks if not. **Fine** means checked and nothing to do.
- **History** means the problem is in past commits, not only in today's files. Deleting a file today does not remove it from history: anyone can read old commits once the repository is public.
- A **noreply address** is the address GitHub gives every account, such as `123456+vishalmeena2211@users.noreply.github.com`. It hides your real email on commits.

---

## Must, before going public

- [ ] **1. Your email is on every commit.** All 64 commits are signed "Vishal Meena <personal-email-removed>". On a public repository anyone can read it, and email-harvesting bots do. **History.**
  - **Fix:** rewrite the history so every commit carries your GitHub noreply address, or publish a fresh repository with the code as one first commit. Then set the noreply address for this folder (`git config user.email …`), and turn on GitHub's "Block command line pushes that expose my email".
  - Rewriting changes every commit's id. Nothing depends on the old ids except Vercel's list of past deployments.

- [ ] **2. The research notes quote people word for word.** `docs/research-notes/` holds about 43,000 words of desk research. Among them:
  - posts from xBhp and Team-BHP forum members, quoted by their handles and in one case by a real name;
  - app-store reviews, quoted verbatim;
  - 13 quotations longer than 150 characters.

  That was fine for private planning. Published, it republishes other people's words without asking, and forum rules may forbid it. **History.**
  - **Fix:** take `docs/research-notes/` (and `docs/research-interim-findings.md`, `docs/knowledge-document.md`, which draw on it) out of the public repository, or rewrite them as summaries with no quotes and no handles. Because they are in history, the history rewrite in item 1 is where to remove them.

- [ ] **3. A copy of Meel would count into your Mixpanel project.** `web/src/lib/analytics-config.ts` falls back to your project's token. Anyone who deploys their own copy, without setting their own token, sends their visitors' events to you. The token itself is not secret: every page already carries it.
  - **Fix:** remove the fallback, so counting needs `NEXT_PUBLIC_MIXPANEL_TOKEN`. Vercel already has it (you added it on 7 October), so the live site carries on unchanged. The README line naming the project id can go too.

## Should

- [ ] **4. Mentions of employer and your work machine.**
  - The wireframe file's first lines say it was made with its employer's wireframe method.
  - `docs/morning-report-2026-09-28.md` gives the folder as `the project folder` and links a private Claude page.

  Nothing secret, but it ties a personal project to your employer in public. **Worth checking your employment contract's clause on side projects before publishing anything built alongside work.** That is a question for you, not something this check can answer.
  - **Fix:** take the two lines out of the wireframe file, and the folder path and the link out of the morning report (or drop that report: it is a one-day status note).

- [ ] **5. An example email that could be a real person's.** The wireframes use `rahul@example.com` as a made-up rider. It may well be someone's real address.
  - **Fix:** change it to `rahul@example.com`; `example.com` is reserved for this.

- [ ] **6. Pumps copied from the oil companies' own locators.** `data/research/*.json` lists 453 IndianOil and HP outlets: name, town and position, each linking to its page on the company's locator. Publishing them as data is a step beyond showing them on the site. Their sites' terms of use were not read.
  - **Fix:** read the terms on locator.iocl.com and petrolpump.hpretail.in, or keep the list in the site's data only and say where it came from (as now). Low risk either way: each pump names its source.

- [ ] **7. Planning documents show how decisions were made.** `docs/plan.md`, the morning report, the audits and the research ideas are candid working notes, including ideas about earning money. Nothing leaks, but they will be read.
  - **Fix:** keep them (many open-source projects do), or move them to a private notes repository. Your call.

- [ ] **8. Four dependency warnings.** `pnpm audit` reports 3 high and 1 moderate. All come from tools Meel does not use at run time:
  - Prisma's command-line tool bundles a MySQL driver, though Meel uses Postgres;
  - a build-time source-map reader;
  - a merge helper.

  Public repositories get these flagged by GitHub automatically.
  - **Fix:** update Prisma when a release with the newer MySQL driver is out, or pin the fixed versions with pnpm overrides.

- [ ] **9. The README pictures are out of date.** `.github/readme/screens.png` shows heights in metres ("5,328 m") and the old fuel list. Not a leak.
  - **Fix:** take them again from the site as it is now.

## Fine: checked, nothing to do

- **No secrets, ever.** The whole history was searched for cloud keys, private keys, GitHub, Slack, OpenAI and Anthropic tokens, Google client secrets, Neon passwords, database addresses with passwords, Razorpay and Vercel tokens. The only matches are the README's own examples, which use made-up values (`AUTH_SECRET=scratch-only-secret`, `postgresql://localhost:5432/meel_scratch`).
- **No `.env` file was ever committed.** `web/.gitignore` keeps `.env*` out; the history has none. Google's client id and secret, `AUTH_SECRET`, the database addresses and the editor's email live only in Vercel's settings and in `web/.env.local` on your machine.
- **No `.vercel` folder was ever committed.** It holds only project ids, and it is ignored.
- **No phone numbers** of anyone in the code, data or documents.
- **No rider data.** The database (accounts, trips, reports) lives in Neon, not in the repository. The one test file, `web/test-fixtures/accounts.json`, holds made-up accounts on the reserved `.test` domain for a scratch database on your machine.
- **The locator cache stays out.** The 62 MB of the oil companies' pages under `data/computed/locators/` are ignored and were never committed.
- **Pictures are all under free licences** (CC BY-SA, CC BY, CC0), each with its author in `data/images/credits.json`, which the site shows beside each picture.
- **Map data** (road lines, pumps, hospitals and police, districts) is OpenStreetMap's, under the Open Database Licence. `data/LICENSE.md` already says so, and that a changed copy must be shared under the same licence.
- **District codes** come from Wikidata, which is public domain.
- **The licences are already split right**: MIT for the code; the data keeps its sources' licences.
- **Opening the code does not open the site.** The live site stays behind Vercel's login until you change that setting yourself.
- **Your name** appears in `LICENSE` ("Copyright (c) 2026 Vishal Meena") and in the docs ("Asked by: Vishal"). That is normal for an open-source project, but it is your name in public.

## What opening the code changes for the site, once the site is public too

- Anyone can read how the anonymous reports are limited (a few per device a day, the editor's inbox cap) and write a script just under those limits. The editor's queue is the backstop.
- The Mixpanel token is readable in every page already. Anyone could send junk events to your project, with or without the code. Mixpanel can block a source if that ever happens.
- The editor is whoever's email is in `MEEL_EDITOR_EMAILS`, set only in Vercel. With Google login, nobody can claim that email. A password sign-up with an editor's email is refused unless `MEEL_EDITOR_SIGNUP` is open, and it is not set on Vercel.

## How it was checked

On 7 October 2026, on this machine:
- every file in the repository today, and every change in all 64 commits, searched for the patterns above;
- the list of files ever added, deleted or renamed;
- the authors of every commit;
- `pnpm audit` on the site's dependencies.

Nothing was changed. The three "Must" items need your yes: item 1 rewrites history and needs a force-push.
