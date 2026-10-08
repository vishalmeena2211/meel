import type { Mixpanel } from "mixpanel-browser";

import { ANALYTICS_ON, MIXPANEL_API_HOST, MIXPANEL_TOKEN, RECORD_PERCENT } from "./analytics-config";
import type { EventName, EventProps } from "./analytics-events";

/*
  What Meel tells Mixpanel, in the browser only. Which project, and when counting is on: analytics-config.ts.

  It counts pages (by their path, never the part after "?") and the few things riders do with the tools, listed in
  analytics-events.ts. It never sends a name, an email, a phone number or anything typed into a box. Mixpanel keeps a random
  number in the browser to tell one visitor from another. A browser set to "Do Not Track" is not counted, and nor is
  one run by a program (a crawler, a page inspector, a test tool): see looksAutomated.

  It also records how pages are used, as Mixpanel's Session Replay: a replay of the page, not a video of the screen.
  Everything typed is hidden, and so is anything marked data-private; anything marked data-private-block is left out
  whole. Pages about a rider's account, logging in, posting a trip and the editor's are never recorded (NOT_RECORDED).
  Anything new that shows a rider's name, contact or chat link needs one of the two marks.

  In development nothing is sent: each event is written to the browser's console instead, so the list can be checked.
*/

export { EVENTS, type EventName, type EventProps } from "./analytics-events";

const SEND = ANALYTICS_ON;

let started: Promise<Mixpanel | null> | null = null;

// Words in the browser's name that only programs use. Mixpanel skips the crawlers it knows by name (Googlebot,
// Bingbot), but not a browser run by a program: headless Chrome, Google's own page inspector, SEO crawlers, link
// previews, test tools. On 8 October 2026 these were 12 of Meel's first 17 "visitors".
const ROBOT = /bot\b|bot\/|crawl|spider|slurp|headless|lighthouse|inspectiontool|pagespeed|preview|phantom|selenium|puppeteer|playwright/i;

/** A browser run by a program, not a person. Such a visit is neither counted nor recorded. */
export function looksAutomated(): boolean {
  try {
    const ua = navigator.userAgent;
    // A phone named Cubot carries "bot" in its name; its owner is a person.
    return navigator.webdriver === true || (ROBOT.test(ua) && !/cubot/i.test(ua));
  } catch {
    return false;
  }
}

/** Loads Mixpanel once, after the page is up, so no page waits for it. Does nothing where counting is off. */
export function startAnalytics(): Promise<Mixpanel | null> {
  if (started) return started;
  if (typeof window === "undefined" || !SEND || looksAutomated()) {
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
        // No clicks are captured by themselves.
        autocapture: false,
        // Screen recordings are started and stopped by hand, page by page (followRecording below), so a page about
        // a rider's account is never recorded, not even for a moment.
        record_sessions_percent: 0,
        // In a recording, everything typed is hidden, and so is any text marked data-private. The rest of a page is
        // the route facts anyone can read, so it is shown.
        record_mask_all_inputs: true,
        record_mask_all_text: false,
        record_mask_text_selector: ["[data-private]"],
        // A part marked data-private-block is left out whole, attributes and all: a chat group's link, riders' names.
        record_block_selector: "video, audio, iframe, [data-private-block]",
        record_console: false,
        record_network: false,
        record_canvas: false,
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

/** Pages never recorded: a rider's account, logging in and signing up, posting a trip, a leader's requests, the editor. */
const NOT_RECORDED = [
  /^\/account/,
  /^\/editor/,
  /^\/login/,
  /^\/signup/,
  /^\/welcome/,
  /^\/forgotten-password/,
  /^\/trips\/new/,
  /^\/trips\/[^/]+\/requests/,
];

export function mayRecord(path: string): boolean {
  return !NOT_RECORDED.some((r) => r.test(path));
}

/** Decided once a visit: is this visit among the share that is recorded? */
let chosen: boolean | null = null;
let recording = false;

/** Starts the screen recording on a page that may be recorded, and stops it before one that may not. */
export function followRecording(path: string): void {
  if (typeof window === "undefined" || !SEND || RECORD_PERCENT === 0) return;
  chosen ??= Math.random() * 100 < RECORD_PERCENT;
  if (!chosen) return;
  const allowed = mayRecord(path);
  if (allowed === recording) return;
  recording = allowed;
  void startAnalytics().then((mixpanel) => {
    if (!mixpanel) return;
    if (allowed) mixpanel.start_session_recording();
    else mixpanel.stop_session_recording();
  });
}

/** The route a page belongs to, read from its address: "/routes/manali-leh/fuel" gives "manali-leh". */
export function routeOfPage(): string | null {
  if (typeof window === "undefined") return null;
  return /^\/routes\/([a-z0-9-]+)/.exec(window.location.pathname)?.[1] ?? null;
}
