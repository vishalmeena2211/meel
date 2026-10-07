import type { Mixpanel } from "mixpanel-browser";

import { ANALYTICS_ON, MIXPANEL_API_HOST, MIXPANEL_TOKEN } from "./analytics-config";
import type { EventName, EventProps } from "./analytics-events";

/*
  What Meel tells Mixpanel, in the browser only. Which project, and when counting is on: analytics-config.ts.

  It counts pages (by their path, never the part after "?") and the few things riders do with the tools, listed in
  analytics-events.ts. It never sends a name, an email, a phone number or anything typed into a box. Mixpanel keeps a random
  number in the browser to tell one visitor from another. A browser set to "Do Not Track" is not counted.

  In development nothing is sent: each event is written to the browser's console instead, so the list can be checked.
*/

export { EVENTS, type EventName, type EventProps } from "./analytics-events";

const SEND = ANALYTICS_ON;

let started: Promise<Mixpanel | null> | null = null;

/** Loads Mixpanel once, after the page is up, so no page waits for it. Does nothing where counting is off. */
export function startAnalytics(): Promise<Mixpanel | null> {
  if (started) return started;
  if (typeof window === "undefined" || !SEND) {
    started = Promise.resolve(null);
    return started;
  }
  started = import("mixpanel-browser")
    .then(({ default: mixpanel }) => {
      mixpanel.init(MIXPANEL_TOKEN, {
        api_host: MIXPANEL_API_HOST,
        // A page counts when its path changes.
        track_pageview: "url-with-path",
        // Addresses are kept to their path. What follows "?" can hold words a rider typed, such as a search, and a
        // referring page's full address can hold someone else's. The path and the referring site's name stay.
        property_blacklist: ["$current_url", "current_url_search", "$referrer", "$initial_referrer"],
        // Nothing is recorded by itself: no clicks, no text, no screen recordings.
        autocapture: false,
        record_sessions_percent: 0,
        // The random visitor number lives in the browser's storage, not in a cookie sent with every page.
        persistence: "localStorage",
        // "Do Not Track" is honoured.
        ignore_dnt: false,
        debug: process.env.NODE_ENV === "development",
      });
      return mixpanel;
    })
    .catch(() => null);
  return started;
}

/** Sends one event. Safe to call anywhere: where counting is off, or on the server, it does nothing. */
export function track(event: EventName, props: EventProps = {}): void {
  if (typeof window === "undefined") return;
  if (!SEND) {
    if (process.env.NODE_ENV === "development") console.debug(`[analytics] ${event}`, props);
    return;
  }
  void startAnalytics().then((mixpanel) => mixpanel?.track(event, props));
}

/** The route a page belongs to, read from its address: "/routes/manali-leh/fuel" gives "manali-leh". */
export function routeOfPage(): string | null {
  if (typeof window === "undefined") return null;
  return /^\/routes\/([a-z0-9-]+)/.exec(window.location.pathname)?.[1] ?? null;
}
