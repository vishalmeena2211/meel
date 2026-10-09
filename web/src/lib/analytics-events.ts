/*
  Every event Meel sends to Mixpanel, and what it means, in one place. The browser sends most of them; the few that
  only the server sees happen (an account made, a trip posted) are sent from the server with no rider attached.

  The words after each meaning are the event's properties. None ever names a person, holds an email or a phone
  number, or carries anything a rider typed. Page views are counted by Mixpanel itself, by path.
*/

export const EVENTS = {
  // ── reading a route ───────────────────────────────────────────────
  "Fact opened": "A fact's sheet was opened from a list. route, section.",
  "Source opened": "A rider opened the page a fact came from. route, host.",
  "Office page opened": "A rider opened an office's own page from Is it open?. route, host.",
  "Official alert opened": "A rider opened an official alert on SACHET. route.",
  "Video opened": "A rider video was opened on YouTube. route.",
  "Page shared": "The share button on a route or fact. route, via (share sheet or copy).",

  // ── finding a route ───────────────────────────────────────────────
  "Search suggestion picked": "A suggestion was picked in a search box. kind (route, place or all routes).",
  "Search found nothing": "A search on the front page matched no route. letters (how many were typed, never what).",
  "Routes filtered by region": "A region chip was picked on the front page. region.",
  "Home view switched": "The phone's front page switched between the list and the roads drawn. to.",

  // ── the tools ─────────────────────────────────────────────────────
  "Fuel check run": "A rider worked out fuel for a bike. route, bike, from (maker's figures or the rider's own).",
  "Night halts checked": "The altitude check was run on chosen night halts. route, nights.",
  "Packing month picked": "A month was picked on a packing list. route, month.",
  "Route saved for no network": "A route's pages were kept on the phone. route, pages.",
  "Saved route removed": "A route kept on the phone was removed. route.",
  "Route file downloaded": "The GPX file was opened or downloaded. route.",
  "Map app opened": "A route, or the road to its start, was sent to a map app. route, app, from (the city, for the road to the start).",
  "Riding from picked": "A rider picked the city they set out from, or none. city.",
  "Emergency number tapped": "A number on the emergency card was tapped. route, number.",
  "Message for home sent": "The plan for home went to WhatsApp, or was copied. route, via. Never the message.",

  // ── riders telling Meel ───────────────────────────────────────────
  "Fact report started": "Still true, or This has changed, was tapped. route, section, kind.",
  "Fact report sent": "A rider said a fact is still true, or has changed. route, section, kind, kept_offline.",
  "Offline reports sent": "Reports kept on a phone with no signal were sent once it had one. count.",
  "Trip report step reached": "A rider moved on in the trip report form. step.",
  "Trip report sent": "A trip report was sent. route, month.",
  "Place suggested": "A rider asked Meel to write about a place. Sent from the server.",
  "Source code opened": "A rider opened Meel's code on GitHub. from (footer or about).",

  // ── accounts, from the server ─────────────────────────────────────
  "Signed up": "An account was made. method (password or google).",
  "Logged in": "A rider logged in. method (password or google).",
  "Logged out": "A rider logged out.",
  "Account deleted": "A rider deleted their account.",

  // ── riding together, from the server ──────────────────────────────
  "Trip posted": "A trip was published, or sent to the editor. route, places, pace, company, status.",
  "Asked to join a trip": "A rider asked to join. route, result (asked, waiting for a place, already asked).",
  "Join request taken back": "A rider took back their request. route.",
  "Join request answered": "A leader accepted or declined a rider. route, answer.",
  "Left a trip": "A rider left a trip they were on. route.",
  "Trip withdrawn": "A leader withdrew their trip. route.",
  "Trip flagged": "A rider reported a trip to the editor. route, reason.",
  "Trip shared": "A trip was sent to WhatsApp, or its link copied. via.",
} as const;

export type EventName = keyof typeof EVENTS;
export type EventProps = Record<string, string | number | boolean | null>;
