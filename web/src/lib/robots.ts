/*
  Telling a program from a person by the name its browser gives, in one place for the browser (analytics.ts: a visit
  by a program is neither counted nor recorded) and the server (/go/: a shop link is not opened for a program).

  Mixpanel skips the crawlers it knows by name (Googlebot, Bingbot), but not a browser run by a program: headless
  Chrome, Google's own page inspector, SEO crawlers, link previews, test tools. On 8 October 2026 these were 12 of
  Meel's first 17 "visitors". The rest of the list is what fetches a page without any browser at all: link previews in
  chat apps (WhatsApp's names itself "WhatsApp/2…", unlike a browser's "Mozilla/5.0…") and download tools. They never
  reach the browser's check, only the server's.
*/

const ROBOT =
  /bot\b|bot\/|crawl|spider|slurp|headless|lighthouse|inspectiontool|pagespeed|preview|phantom|selenium|puppeteer|playwright|^whatsapp\/|facebookexternalhit|embedly|iframely|curl\/|wget\/|python|go-http-client|okhttp|axios|node-fetch|undici|libwww|scrapy|httpclient|java\//i;

/** A browser name that belongs to a program, not a person. A phone named Cubot carries "bot" in its name; its owner is a person. */
export function isRobotName(userAgent: string): boolean {
  return ROBOT.test(userAgent) && !/cubot/i.test(userAgent);
}
