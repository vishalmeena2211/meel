# Meel, the website

The website for **rideplanner.in**. Built with Next.js 16, React 19, Tailwind CSS 4 and TypeScript in strict mode.

## How to read this file

- **Setting:** a value the site reads from the environment when it starts. None is kept in a file in this repository.
- **Editor:** the person who keeps Meel. They read reports and approve first trips.
- **Scratch database:** a throwaway database for testing, in a folder you can delete.

## What you need

| Thing | Version |
|---|---|
| Node.js | 22.13 or newer. The database is the one built into Node, so nothing else is installed |
| pnpm | 9 |

## Run it on your machine

Install once:

```bash
pnpm install
```

Run while you work on it:

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

All four are optional on your own machine. Set them where the site is hosted, in the host's own settings screen.

| Setting | What it does | If it is not set |
|---|---|---|
| `MEEL_DATA_DIR` | The folder that holds the database file `meel.sqlite` | `web/.data/` is used |
| `MEEL_EDITOR_EMAILS` | The email of each editor, with commas between them | Nobody is an editor, and the inbox at `/editor` cannot be opened |
| `MEEL_EDITOR_SIGNUP` | Set to `open` to let an editor's email sign up | An editor's email cannot sign up |
| `NEXT_PUBLIC_MEEL_CHAT_NUMBER` | A WhatsApp number, with country code, digits only. Adds "Send from my chat app instead" to the report sheet | That button is not shown |

### Making the editor's account

Emails are not checked by post. So the site will not let anyone sign up with an editor's email unless you open the door first.

1. Set `MEEL_EDITOR_EMAILS` to your email.
2. Set `MEEL_EDITOR_SIGNUP` to `open` and restart the site.
3. Sign up at `/signup` with that email.
4. Remove `MEEL_EDITOR_SIGNUP` and restart the site.

Do step 4 the same day. While the door is open, anyone who knows the email could take it.

### A rider who has forgotten their password

Meel sends no email. The rider writes to you. You check it is them, then open `/editor`, go to "A rider cannot get in", type their email and set a one-time password. It is shown once. Give it to them yourself. They are asked to choose their own password as soon as they log in.

An editor's own account cannot be opened this way. If you lose your own password, open the door as in "Making the editor's account", delete your row from the `users` table, and sign up again.

## Where things are kept

| What | Where | In git |
|---|---|---|
| Routes, facts, sources, picture credits | `../data/` | Yes |
| Accounts, trips, reports | One database file in `MEEL_DATA_DIR` | No |
| A rider's bike, packing ticks and name | That rider's own phone | No |

The database is one file. **Back it up by copying that file.** If the host wipes its disk on every deploy, accounts and trips are lost with it, so choose a host with a disk that stays.

The tables are made by the site itself the first time it starts. There is nothing to run by hand.

## How the code is laid out

| Folder | What is in it |
|---|---|
| `src/app/` | One folder for each page. `actions/` holds what forms send to |
| `src/components/` | The pieces pages are built from |
| `src/lib/` | Plain helpers: dates, words, fact states, trip checks |
| `src/server/` | The database, accounts, trips and reports. Never sent to the browser |
| `scripts/` | The copy of data into the site |
| `test-fixtures/` | Made-up accounts for testing on a scratch database |

## Testing by hand with a scratch database

Build, then start the site against a folder you can throw away:

```bash
pnpm build
```

```bash
MEEL_DATA_DIR=/tmp/meel-scratch MEEL_EDITOR_EMAILS=editor@meel.test MEEL_EDITOR_SIGNUP=open pnpm start -p 3100
```

The accounts in `test-fixtures/accounts.json` are for this. Sign each one up, then walk through: post a trip, approve it as the editor, ask to join as the second rider, accept as the leader.

## Rules the site keeps

- **It never says a road is open.** It links to the office that decides.
- **Every "today" is India's calendar day**, on the server and on the phone.
- **A report needs no account.** The inbox takes 5 unread reports for one fact and 60 in an hour, then asks the rider to try later.
- **A chat group link is shown only to riders the leader has accepted.** It is not in the page at all for anyone else.
- **A rider's first trip waits for the editor.** Later trips appear at once. Three reports hide a trip until the editor has looked.

## Not built yet

- [ ] Resetting a forgotten password by a link in an email. Until then the editor sets a one-time password by hand.
- [ ] Saving a whole route for use with no network.
- [ ] Logging in with a phone number.
- [ ] Changing the words of a fact from the editor's inbox. The words live in `../data` and need a rebuild.
- [ ] Automatic tests. Everything so far was checked by hand in a browser.
