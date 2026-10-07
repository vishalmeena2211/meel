# Meel, the website

The website for **rideplanner.in**. Built with Next.js 16, React 19, Tailwind CSS 4 and TypeScript in strict mode. Accounts, trips and reports are kept in Postgres through Prisma. Logging in is done by Auth.js, with an email and a password, or with Google.

## How to read this file

- **Setting:** a value the site reads from the environment when it starts. None is kept in a file in this repository.
- **Settings file:** `web/.env.local`, a file on your own machine that Next.js and Prisma both read. It is never committed.
- **Editor:** the person who keeps Meel. They read reports and approve first trips.
- **Migration:** one numbered change to the database's tables, kept in `prisma/migrations/`.
- **Scratch database:** a throwaway database for testing, which you can drop.

## What you need

| Thing | Version |
|---|---|
| Node.js | 22.13 or newer |
| pnpm | 9 |
| Postgres | 14 or newer. On a Mac, Homebrew's `postgresql@16` is what this was built against |

## Run it on your machine

Install once. This also makes the Prisma client in `src/generated/`:

```bash
pnpm install
```

Make the database once. On a Homebrew Postgres it belongs to your own user:

```bash
createdb meel
```

Make its tables, and again whenever someone adds a migration:

```bash
pnpm db:migrate
```

Make the settings file. It needs at least a secret for the login cookie; see Settings below. Then run the site while you work on it:

```bash
pnpm dev
```

Then open http://localhost:3000.

Before it starts, the site copies the routes and pictures from `../data` into `content/` and `public/route-images/`. Both folders are made by that copy and are not kept in git. Change the data in `../data`, never in the copies.

## Checks before a commit

```bash
pnpm typecheck
```

```bash
pnpm lint
```

```bash
pnpm build
```

Do not run the build while `pnpm dev` or `pnpm start` is running from the same folder. Stop the server first.

## Settings

Put them in `web/.env.local` on your own machine, one per line, as `NAME=value`. Where the site is hosted, set them in the host's own settings screen instead.

| Setting | What it does | If it is not set |
|---|---|---|
| `AUTH_SECRET` | Seals the login cookie. Make one with `openssl rand -base64 32`. Changing it logs everyone out | **Nobody can log in.** A production server refuses to serve any page and says why in its log. A development server says so loudly |
| `DATABASE_URL` | Where Postgres is, such as `postgresql://user:password@host:5432/meel` | On your own machine: the database `meel` at `localhost:5432`, as your own user. Where the site is hosted, the site stops with an error |
| `AUTH_URL` | The site's own address, such as `https://rideplanner.in`. Google sends riders back to it | Worked out from each request. Set it where the site is hosted |
| `AUTH_GOOGLE_ID` | The Google client id. See "Setting up Google" | "Continue with Google" is not shown. Email and password still work |
| `AUTH_GOOGLE_SECRET` | The Google client secret, from the same place | As above |
| `MEEL_EDITOR_EMAILS` | The email of each editor, with commas between them | Nobody is an editor, and the inbox at `/editor` cannot be opened |
| `MEEL_EDITOR_SIGNUP` | Set to `open` to let an editor's email sign up with a password | An editor's email cannot sign up with a password. Logging in with Google still works |
| `NEXT_PUBLIC_MEEL_CHAT_NUMBER` | A WhatsApp number, with country code, digits only. Adds "Send from my chat app instead" to the report sheet | That button is not shown |
| `NEXT_PUBLIC_MIXPANEL_TOKEN` | Another Mixpanel project's token, such as a test project's. See "Mixpanel" | Meel's own project, "Meel", whose token is in `src/lib/analytics-config.ts` |
| `NEXT_PUBLIC_MIXPANEL_API_HOST` | Where that other project keeps its data: `https://api.mixpanel.com` for the US, `https://api-in.mixpanel.com` for India | `https://api-eu.mixpanel.com`, as Meel's project keeps its data in the EU |
| `NEXT_PUBLIC_MIXPANEL_IN_DEVELOPMENT` | `1` to send events from your own machine too. Use a separate test project | On your own machine each event is written to the browser's console instead of being sent |

### Mixpanel

The list of events, with what each one means and the details it carries, is `src/lib/analytics-events.ts`: about 40, from opening a fact to posting a trip. Each is sent from the place a rider does the thing. In the browser that is `track()` from `src/lib/analytics.ts`; parts of a page made on the server name their event in the markup instead, as `data-track="Route file downloaded"`, and `src/components/analytics-start.tsx` counts the click. What only the server sees finish (an account made, a login, a trip posted or answered) is sent by `trackOnServer()` in `src/server/analytics.ts`, after the page has answered, with no rider attached.

What is never sent: a name, an email, a phone number, anything typed into a box, or the part of an address after "?". Mixpanel's own automatic capture and screen recording are off. Its random visitor number is kept in the browser's storage, not a cookie. A browser set to "Do Not Track" is not counted. Logged-in riders are not identified.

Where it counts: the project "Meel" in Vishal's own Mixpanel organisation, made on 7 October 2026, data kept in the EU, days in India's time. Only the live site counts: not this machine, and not Vercel's preview deployments. The token is in the code because it is public by design: every page carries it, and it can only send events, not read them.

### Setting up Google

Only you can do this, because it is done in your own Google account.

1. Open https://console.cloud.google.com, and make a project called Meel.
2. Under **Google Auth Platform**, fill in the consent screen: the app's name is Meel, and give your own email for support. Meel asks for nothing beyond the name, the email and a sign-in, so no extra scopes are needed.
3. While the consent screen is in testing, only the Google accounts you list as test users can log in. Publish it when riders should.
4. Under **Clients**, make a client of the type **Web application**. Under **Authorised redirect URIs**, add all three:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://meel-livid.vercel.app/api/auth/callback/google`, the address the site has on Vercel until the domain points at it
   - `https://rideplanner.in/api/auth/callback/google`
5. Copy the client id into `AUTH_GOOGLE_ID` and the secret into `AUTH_GOOGLE_SECRET`, and restart the site. Google shows the secret only once, when the client is made: download its JSON file then, and keep it outside this folder.

This was done on 28 September 2026, in the Google Cloud project `meel-project` (client "Meel website"). Both settings are on Vercel for production. The consent screen is still in testing, so only the test users listed under **Audience** can log in with Google. Publish it there when riders should.

### Making the editor's account

The easy way: set `MEEL_EDITOR_EMAILS` to your email, restart, and log in with Google using that email. Google has checked the email is yours, so nothing else is needed.

With a password instead: Meel does not check emails, so the site will not let anyone sign up with an editor's email unless you open the door first.

1. Set `MEEL_EDITOR_EMAILS` to your email.
2. Set `MEEL_EDITOR_SIGNUP` to `open` and restart the site.
3. Sign up at `/signup` with that email.
4. Remove `MEEL_EDITOR_SIGNUP` and restart the site.

Do step 4 the same day. While the door is open, anyone who knows the email could take it.

### A rider who has forgotten their password

Meel sends no email. The rider writes to you. You check it is them, then open `/editor`, go to "A rider cannot get in", type their email and set a one-time password. It is shown once. Give it to them yourself. They are asked to choose their own password as soon as they log in.

A rider who logs in with Google usually needs only to press "Continue with Google". The editor's screen says so. A one-time password still works for them, if they have lost their Google account: it adds a password to the account.

An editor's own account cannot be opened this way. Log in with Google instead. If that is not possible, open the door as in "Making the editor's account", delete your own row, and sign up again:

```bash
psql meel -c "DELETE FROM users WHERE email = 'you@example.com'"
```

### When Google takes over an account

If someone logs in with Google and their email already has a Meel account made with a password, the two become one account, and **Google takes over**: the password is removed and every phone is logged out. Meel never checked that whoever set that password owned the email; Google has. This stops anyone who signed up first with someone else's email from keeping a way in. The account page says what happened for two weeks, and the rider can add a new password there.

## Where things are kept

| What | Where | In git |
|---|---|---|
| Routes, facts, sources, picture credits | `../data/` | Yes |
| Accounts, trips, reports, Google links | The Postgres database in `DATABASE_URL` | No |
| The shape of those tables | `prisma/schema.prisma` and `prisma/migrations/` | Yes |
| Who is logged in on a phone | A sealed cookie on that phone. It holds the rider's id and a session number, nothing else | No |
| A rider's bike, packing ticks and name | That rider's own phone | No |

**Back up the database** with:

```bash
pg_dump meel > meel-backup.sql
```

Where the site is hosted, run the migrations before starting a new version:

```bash
pnpm db:deploy
```

### Changing a table

Edit `prisma/schema.prisma`, then make and run a migration with a name that says what changed:

```bash
pnpm db:migrate --name what-changed
```

Never edit a migration that has already run. `pnpm db:studio` opens a page for looking through the tables by hand.

## How the code is laid out

| Folder | What is in it |
|---|---|
| `src/app/` | One folder for each page. `actions/` holds what forms send to. `api/auth/` is Auth.js |
| `src/components/` | The pieces pages are built from |
| `src/lib/` | Plain helpers: dates, words, fact states, trip checks |
| `src/server/` | The database, accounts, trips and reports. Never sent to the browser |
| `src/server/session.ts` | The Auth.js setup: the two ways in, and what goes in the cookie |
| `src/generated/` | The Prisma client, made by `prisma generate`. Not in git |
| `prisma/` | The tables and their migrations |
| `scripts/` | The copy of data into the site |
| `test-fixtures/` | Made-up accounts for testing on a scratch database |

## Testing by hand with a scratch database

Make a scratch database and its tables:

```bash
createdb meel_scratch
```

```bash
DATABASE_URL=postgresql://localhost:5432/meel_scratch pnpm db:deploy
```

Build, then start the site against it:

```bash
pnpm build
```

```bash
DATABASE_URL=postgresql://localhost:5432/meel_scratch AUTH_SECRET=scratch-only-secret MEEL_EDITOR_EMAILS=editor@meel.test MEEL_EDITOR_SIGNUP=open pnpm start -p 3100
```

The accounts in `test-fixtures/accounts.json` are for this. Sign each one up, then walk through: post a trip, approve it as the editor, ask to join as the second rider, accept as the leader. Drop the scratch database afterwards:

```bash
dropdb meel_scratch
```

## Rules the site keeps

- **It never says a road is open.** It links to the office that decides.
- **Every "today" is India's calendar day**, on the server and on the phone.
- **A report needs no account.** The inbox takes 5 unread reports for one fact and 60 in an hour, then asks the rider to try later. A report is only taken from a page of this site.
- **A chat group link is shown only to riders the leader has accepted.** It is not in the page at all for anyone else.
- **A rider's first trip waits for the editor.** Later trips appear at once. Three reports hide a trip until the editor has looked.
- **Two answers at the same moment cannot fill one place twice.** Accepting a rider holds the trip still until the answer is saved.
- **A rider who came in through Google gives a home city before joining or posting a trip**, because the leader sees it.

## Search engines

- **Only rideplanner.in can be listed.** Every other address the site answers on (meel-livid.vercel.app, a deployment's own address, this machine) sends `X-Robots-Tag: noindex`. See `next.config.ts`.
- `/robots.txt` and `/sitemap.xml` are made by `src/app/robots.ts` and `src/app/sitemap.ts`. The sitemap lists every route, section, tool and fact page, about 3,400 addresses.
- Every public page names its own address on rideplanner.in as the canonical one. Pages for one rider, and the pages on the way to logging in, say `noindex`.
- Search results can show a trail (Meel › Manali to Leh › Fuel) and a search box, from structured data in the pages.
- Share cards: every fact has its own, Meel has one for the site (`src/app/opengraph-image.tsx`), and a route uses its picture.

**When the site goes public on rideplanner.in**, add it to [Google Search Console](https://search.google.com/search-console) and [Bing Webmaster Tools](https://www.bing.com/webmasters), prove you own the domain, and submit `https://rideplanner.in/sitemap.xml`. Until the domain points at the site, share cards made in production point at rideplanner.in and will not load.

## Good to know

- **Logging out works on this phone only.** It removes this phone's cookie. A copy of that cookie taken from this phone would still work until it runs out after 30 days. Changing the password, or the editor setting a one-time password, logs out every phone at once.
- **Pages that ask who is logged in read the cookie through `cookies()`, not Auth.js's `auth()`.** After a form logs a phone in, Next.js re-renders the page in the same request, and only `cookies()` already holds the new cookie. See `currentUser` in `src/server/auth.ts`.
- **The Prisma CLI is pinned to 7.10.0.** On npm its "latest" tag has pointed at a release candidate of version 8.
- **Prisma offers to install files for AI coding tools** (`.claude/skills`, `.agents`, `.windsurf`) into the folder it runs in. `prisma init` does it without asking; `prisma generate` asks, with Yes as the answer if you press Enter or wait 30 seconds. This site's scripts pass `--no-hints`, so `pnpm dev` never asks. If you run Prisma by hand here, add `--no-hints` too.

## Not built yet

- [ ] Resetting a forgotten password by a link in an email. Until then the editor sets a one-time password by hand.
- [ ] Saving a route for no network is built ("Save for the road"), but has not yet been tried on a real phone somewhere with no signal.
- [ ] Logging in with a phone number.
- [ ] Changing the words of a fact from the editor's inbox. The words live in `../data` and need a rebuild.
- [ ] Automatic tests. Everything so far was checked by hand, and by a browser script run once on a scratch database.
