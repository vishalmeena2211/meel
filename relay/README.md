# The PWD relay

Uttarakhand PWD's list of closed roads, at [mis.pwduk.in](https://mis.pwduk.in/pwd/roadClosure), turns away requests from servers outside India. That includes Vercel's Singapore servers, where rideplanner.in runs, and GitHub's. From October 2026 every Uttarakhand route's "Is it open?" page could only say "Could not read the PWD's list".

This relay is a separate Vercel project, `meel-pwd-relay`, that runs in Mumbai (`bom1`), where the PWD does answer. It has one address, `/api/pwd?roadType=1`, `2` or `3` (national highways, state highways and major district roads). It asks the PWD for that part of the list and passes it on unchanged. It asks for nothing else.

- **Live address:** https://meel-pwd-relay.vercel.app/api/pwd?roadType=1
- **Used by:** `readClosures` in `web/src/server/live.ts`
- **Cached:** Vercel's network keeps each answer for 15 minutes, so the PWD is asked at most a few times an hour, however many pages are built.

It is not connected to Git. After changing it, deploy it from this folder:

```bash
vercel deploy --prod
```

The main site is unaffected by this folder: Vercel builds it from `web/`.
