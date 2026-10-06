import "server-only";

import { unstable_cache } from "next/cache";

import { getRouteDistricts } from "@/lib/content";
import { sayDate, sayMoment } from "@/lib/format";
import type { Authority, Route, RouteDistrict } from "@/lib/types";

/*
  What some offices say today, read by Meel every hour, never typed by hand.

  - Official alerts: the government's alert feed (NDMA SACHET), one feed a state, each alert filed under districts.
  - Offices whose own page carries a date a computer can read.
  - Road closures that Uttarakhand's PWD lists.
  - A weather forecast for each pass and high night halt (Open-Meteo).

  Each reader answers with what it found and when, or says it could not read. None of them ever throws,
  and nothing read here is kept in the database: it lives in the built page for an hour.
*/

const UA = "Meel rider site (+https://rideplanner.in)";

/** Reads under way, so pages made at the same moment share one request to an office instead of each sending their own. */
const underWay = new Map<string, Promise<{ text: string; headers: Headers } | null>>();

function readText(
  url: string,
  options: { timeoutMs?: number; headers?: Record<string, string> } = {},
): Promise<{ text: string; headers: Headers } | null> {
  const key = `${url}|${JSON.stringify(options.headers ?? {})}`;
  const running = underWay.get(key);
  if (running) return running;
  const read = readOnce(url, options).finally(() => underWay.delete(key));
  underWay.set(key, read);
  return read;
}

async function readOnce(
  url: string,
  { timeoutMs = 10_000, headers = {} }: { timeoutMs?: number; headers?: Record<string, string> },
): Promise<{ text: string; headers: Headers } | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, ...headers },
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });
    if (!res.ok) return null;
    return { text: await res.text(), headers: res.headers };
  } catch {
    return null;
  }
}

/** What a reader found, or `late` if it took longer than `ms`. A slow office never holds up the page. */
function inTime<T>(work: Promise<T>, ms: number, late: () => T): Promise<T> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(late()), ms);
    work.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        clearTimeout(timer);
        resolve(late());
      },
    );
  });
}

// ── reading XML and HTML without a library ──────────────────────────

function decode(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function all(xml: string, name: string): string[] {
  const out: string[] = [];
  const re = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "g");
  for (let m = re.exec(xml); m; m = re.exec(xml)) out.push(m[1] ?? "");
  return out;
}

function one(xml: string, name: string): string | null {
  const found = all(xml, name)[0];
  return found === undefined ? null : decode(found);
}

/** A CAP field, whether the file writes it as <cap:headline> or <headline>. */
function cap(xml: string, name: string): string | null {
  return one(xml, `cap:${name}`) ?? one(xml, name);
}

function capAll(xml: string, name: string): string[] {
  const found = all(xml, `cap:${name}`);
  return found.length > 0 ? found : all(xml, name);
}

// ── districts ────────────────────────────────────────────────────────

/** Spellings that differ between the open map, the alert feed and Uttarakhand's PWD, word by word. */
const SPELLINGS: Record<string, string> = { lahul: "lahaul", nanital: "nainital" };

/** Districts that go by two names: an old one and a new one, or a short one and an official one. */
const OTHER_NAMES: Record<string, string> = {
  coorg: "kodagu",
  shimoga: "shivamogga",
  mysore: "mysuru",
  tumkur: "tumakuru",
  chikmagalur: "chikkamagaluru",
  belgaum: "belagavi",
  bellary: "ballari",
  gulbarga: "kalaburagi",
  bijapur: "vijayapura",
  balasore: "baleshwar",
  keonjhar: "kendujhar",
  angul: "anugul",
  jajpur: "jajapur",
  deogarh: "debagarh",
  nabarangapur: "nabarangpur",
  sonepur: "subarnapur",
  boudh: "baudh",
  trichy: "tiruchirappalli",
  tuticorin: "thoothukudi",
  kanyakumari: "kanniyakumari",
  villupuram: "viluppuram",
  tiruvarur: "thiruvarur",
  trivandrum: "thiruvananthapuram",
  morigaon: "marigaon",
  sibsagar: "sivasagar",
  kamrupmetro: "kamrupmetropolitan",
  eastsikkim: "gangtok",
  northsikkim: "mangan",
  southsikkim: "namchi",
  westsikkim: "gyalshing",
  gurgaon: "gurugram",
  allahabad: "prayagraj",
  anantapuram: "anantapur",
  bagalkote: "bagalkot",
  dhaulpur: "dholpur",
  kachchh: "kutch",
  thiruvallur: "tiruvallur",
  uttarbastarkanker: "kanker",
  santravidasnagar: "bhadohi",
};

/** "Lahaul & Spiti district" and "Lahul and Spiti" both become "lahaulspiti". */
function placeKey(name: string): string {
  const key = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .split(/[^a-z]+/)
    .filter((w) => w && !["district", "dist", "and", "the", "of"].includes(w))
    .map((w) => SPELLINGS[w] ?? w)
    .join("");
  return OTHER_NAMES[key] ?? key;
}

/** One name may be the short form of the other: "Tehri" and "Tehri Garhwal". */
function samePlace(a: string, b: string): boolean {
  const x = placeKey(a);
  const y = placeKey(b);
  if (!x || !y) return false;
  return x === y || (x.length >= 4 && y.startsWith(x)) || (y.length >= 4 && x.startsWith(y));
}

// ── official alerts ──────────────────────────────────────────────────

/** Each state's feed on SACHET, from the list on its own feed page. */
const STATE_FEEDS: Record<string, string> = {
  andamannicobarislands: "andaman",
  andhrapradesh: "andhra",
  arunachalpradesh: "arunachal",
  assam: "assam",
  bihar: "bihar",
  chandigarh: "chandigarh",
  chhattisgarh: "chhattisgarh",
  dadranagarhavelidamandiu: "dadra",
  delhi: "delhi",
  goa: "goa",
  gujarat: "gujarat",
  haryana: "haryana",
  himachalpradesh: "himachal",
  jammukashmir: "jammu",
  jharkhand: "jharkhand",
  karnataka: "karnataka",
  kerala: "kerala",
  ladakh: "ladakh",
  lakshadweep: "lakshadweep",
  madhyapradesh: "madhya",
  maharashtra: "maharashtra",
  manipur: "manipur",
  meghalaya: "meghalaya",
  mizoram: "mizoram",
  nagaland: "nagaland",
  odisha: "odisha",
  puducherry: "puducherry",
  punjab: "punjab",
  rajasthan: "rajasthan",
  sikkim: "sikkim",
  tamilnadu: "tamil",
  telangana: "telangana",
  tripura: "tripura",
  uttarakhand: "uttarakhand",
  uttarpradesh: "uttar",
  westbengal: "west",
};

const SACHET = "https://sachet.ndma.gov.in";
export const SACHET_HOME = `${SACHET}/`;

export interface OfficialAlert {
  id: string;
  /** What kind of alert, in the issuer's words: "Heavy Snowfall". */
  event: string;
  /** The issuer's own word: Extreme, Severe, Moderate, Minor or Unknown. */
  severity: string | null;
  /** The alert itself, in the issuer's words. */
  headline: string;
  /** Who issued it: "IMD Shimla". */
  issuer: string;
  /** Where it was issued for, said for this route: "Kullu and Lahaul and Spiti district", or the alert's own words. */
  where: string;
  sent: string;
  expires: string | null;
  /** The alert as issued, on SACHET. */
  url: string;
}

export interface AlertsRead {
  alerts: OfficialAlert[];
  /** When the feeds were read. */
  read: string;
  /** The districts the route crosses, as the open map names them. */
  districts: string[];
  /** True when no feed could be read, so "none in force" cannot be said. */
  failed: boolean;
}

interface FeedItem {
  id: string;
  link: string;
  issuer: string;
  published: string;
}

interface AlertArea {
  desc: string;
  /** Local Government Directory district codes, where the alert gives them. */
  codes: string[];
}

const readFeed = unstable_cache(
  async (state: string): Promise<FeedItem[]> => {
    const got = await readText(`${SACHET}/cap_public_website/rss/rss_${state}.xml`);
    // Thrown, so a failed read is not kept for the hour.
    if (!got) throw new Error(`SACHET feed ${state} could not be read`);
    return all(got.text, "item").map((item) => {
      const published = new Date(one(item, "pubDate") ?? "");
      return {
        id: one(item, "guid") ?? "",
        link: one(item, "link") ?? "",
        issuer: (one(item, "author") ?? "").replace(/^.*\((.*)\)\s*$/, "$1"),
        published: (Number.isNaN(published.getTime()) ? new Date(0) : published).toISOString(),
      };
    });
  },
  ["sachet-feed-v1"],
  { revalidate: 1800 },
);

interface ParsedAlert {
  status: string;
  msgType: string;
  references: string[];
  identifier: string;
  sent: string;
  event: string;
  severity: string | null;
  headline: string;
  expires: string | null;
  areas: AlertArea[];
}

/** One alert file. An alert never changes once issued, so it is read once. */
const readAlert = unstable_cache(
  async (link: string): Promise<ParsedAlert> => {
    if (!link.startsWith(`${SACHET}/`)) throw new Error("not a SACHET address");
    const got = await readText(link);
    if (!got) throw new Error(`SACHET alert could not be read: ${link}`);
    const xml = got.text;
    const infos = capAll(xml, "info");
    const info = infos.find((i) => /^en/i.test(cap(i, "language") ?? "")) ?? infos[0] ?? "";
    return {
      status: cap(xml, "status") ?? "",
      msgType: cap(xml, "msgType") ?? "",
      references: (cap(xml, "references") ?? "")
        .split(/\s+/)
        .map((r) => r.split(",")[1] ?? "")
        .filter(Boolean),
      identifier: cap(xml, "identifier") ?? "",
      sent: cap(xml, "sent") ?? "",
      event: cap(info, "event") ?? "Alert",
      severity: cap(info, "severity"),
      headline: cap(info, "headline") ?? cap(info, "description") ?? "",
      expires: cap(info, "expires"),
      areas: capAll(info, "area").map((a) => ({
        desc: cap(a, "areaDesc") ?? "",
        codes: capAll(a, "geocode")
          .filter((g) => /LGD District/i.test(cap(g, "valueName") ?? ""))
          .map((g) => cap(g, "value") ?? "")
          .filter(Boolean),
      })),
    };
  },
  ["sachet-alert-v2"],
  { revalidate: false },
);

const SEVERITY_ORDER = ["extreme", "severe", "moderate", "minor"];

/** Short forms the alert feed uses for some districts. */
const SHORT_FORMS: Record<string, string> = { ddn: "Dehradun", usn: "Udham Singh Nagar" };

/**
 * The district names an alert's own words give, or "unnamed" when they say only "8 districts of Uttarakhand".
 * The words vary from office to office: "Jehanabad district of Bihar", "uttarkashi,tehri,rudraprayag and chamoli",
 * "Uttarkashi,Rudraprayag,Tehri and Champawat districts", "ddn,tehri,pauri".
 */
function namesIn(desc: string, states: string[]): string[] | "unnamed" {
  let words = desc.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  for (const state of states) {
    const pattern = state.toLowerCase().replace(/&/g, "and").split(/[^a-z]+/).filter((w) => w && w !== "and").join("[^a-z]+(?:and[^a-z]+)?");
    if (pattern) words = words.replace(new RegExp(`\\b${pattern}\\b`, "g"), " ");
  }
  const parts = words
    .replace(/&/g, ",")
    .replace(/\band\b/g, ",")
    .replace(/\b(districts?|dist|of|all|the|state|areas?|parts?|in|over)\b/g, " ")
    .split(/[,;/]+/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  if (parts.length === 0 || parts.every((p) => /^\d+$/.test(p))) return "unnamed";
  return parts.map((p) => SHORT_FORMS[p.replace(/\s/g, "")] ?? p);
}

function letters(s: string): string {
  return s.normalize("NFKD").replace(/[^a-zA-Z]/g, "").toLowerCase();
}

/** "Kullu", "Kullu and Lahaul and Spiti", "Kullu, Mandi and Shimla", each followed by "district". */
function districtList(names: string[]): string {
  const clean = names.map((n) => n.replace(/\s+district$/i, ""));
  const joined = clean.length <= 1 ? (clean[0] ?? "") : `${clean.slice(0, -1).join(", ")} and ${clean.at(-1)}`;
  return `${joined} ${clean.length > 1 ? "districts" : "district"}`;
}

/**
 * Whether an alert's area takes in this route, and how to say so. The district codes decide when the alert gives
 * them. Otherwise the names in its words do. When it names no district at all, it is shown with its own words,
 * so a warning is never hidden because Meel could not tell.
 */
function whereOnRoute(area: AlertArea, inState: RouteDistrict[], states: string[], headline: string): string | null {
  if (area.codes.length > 0) {
    const hit = inState.filter((d) => d.lgd && area.codes.includes(d.lgd));
    if (hit.length > 0) return districtList(hit.map((d) => d.district));
    if (inState.every((d) => d.lgd)) return null;
  }
  const names = namesIn(area.desc, states);
  if (names === "unnamed") {
    // The area names no district, but the alert's own words often do: "isolated places over Dehradun, Tehri Garhwal".
    const said = letters(headline);
    const named = inState.filter((d) => said.includes(letters(d.district.replace(/\s+district$/i, ""))));
    return named.length > 0 ? districtList(named.map((d) => d.district)) : `“${area.desc.trim()}”, without naming them`;
  }
  const hit = inState.filter((d) => names.some((n) => samePlace(d.district, n)));
  return hit.length > 0 ? districtList(hit.map((d) => d.district)) : null;
}

async function inTurn<T, R>(items: T[], width: number, work: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(width, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await work(items[i] as T);
      }
    }),
  );
  return out;
}

async function readAlertsFor(districts: RouteDistrict[], now: Date): Promise<AlertsRead> {
  const read = now.toISOString();
  const names = districts.map((d) => d.district);
  const states = [...new Set(districts.map((d) => STATE_FEEDS[placeKey(d.state)]).filter((s): s is string => !!s))];
  if (states.length === 0) return { alerts: [], read, districts: names, failed: false };

  const feeds = await Promise.all(states.map((s) => readFeed(s).catch(() => null)));
  if (feeds.every((f) => f === null)) return { alerts: [], read, districts: names, failed: true };

  // An alert lasts hours or days. One published more than a week ago has ended.
  const weekAgo = now.getTime() - 7 * 86_400_000;
  const items = feeds
    .flatMap((f, i) => (f ?? []).map((item) => ({ ...item, feed: states[i] ?? "" })))
    .filter((i) => i.link && new Date(i.published).getTime() >= weekAgo);
  const parsed = await inTurn(items, 3, async (i) => ({ item: i, alert: await readAlert(i.link).catch(() => null) }));

  const replaced = new Set(parsed.flatMap((p) => p.alert?.references ?? []));
  const seen = new Set<string>();
  const alerts: OfficialAlert[] = [];
  for (const { item, alert } of parsed) {
    if (!alert || alert.status !== "Actual" || !["Alert", "Update"].includes(alert.msgType)) continue;
    if (replaced.has(alert.identifier)) continue;
    if (alert.expires && new Date(alert.expires).getTime() < now.getTime()) continue;
    // The route's districts in the state whose feed carried the alert.
    const inState = districts.filter((d) => STATE_FEEDS[placeKey(d.state)] === item.feed);
    const states = [...new Set(inState.map((d) => d.state))];
    const where = [...new Set(alert.areas.map((a) => whereOnRoute(a, inState, states, alert.headline)).filter((w): w is string => w !== null))];
    if (where.length === 0 || !alert.headline) continue;
    const key = `${alert.event}|${alert.headline}|${where.join()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    alerts.push({
      id: item.id,
      event: alert.event,
      severity: alert.severity,
      headline: alert.headline,
      issuer: item.issuer || "SACHET",
      where: where.join("; "),
      sent: alert.sent || item.published,
      expires: alert.expires,
      url: item.link,
    });
  }
  const rank = (s: string | null) => {
    const i = SEVERITY_ORDER.indexOf((s ?? "").toLowerCase());
    return i < 0 ? SEVERITY_ORDER.length : i;
  };
  alerts.sort((a, b) => rank(a.severity) - rank(b.severity) || b.sent.localeCompare(a.sent));
  return { alerts, read, districts: names, failed: false };
}

/** Official alerts in force for the districts a route crosses. Null for a route with no districts on record. */
export async function alertsFor(route: Route): Promise<AlertsRead | null> {
  if (route.country !== "in") return null;
  const districts = await getRouteDistricts(route.slug);
  if (districts.length === 0) return null;
  const now = new Date();
  return inTime(readAlertsFor(districts, now), 20_000, () => ({
    alerts: [],
    read: now.toISOString(),
    districts: districts.map((d) => d.district),
    failed: true,
  }));
}

// ── offices whose page carries its own date ─────────────────────────

export interface OfficeRead {
  /** What the office's page or file says about its own date. */
  said: string;
  /** That date, as a day or a moment. */
  dated: string;
  read: string;
  link: { label: string; url: string } | null;
}

const JK_ADVISORY = "https://trafficpolice.jk.gov.in/documents/Advisory/ADVISORY.pdf";
const LAHAUL_STATUS = "https://hplahaulspiti.nic.in/road-status/";
const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

const READERS: Record<string, () => Promise<OfficeRead>> = {
  // Jammu and Kashmir Traffic Police put out one advisory file a day at the same address. Its own date is the file's.
  "trafficpolice.jk.gov.in": async () => {
    const got = await readText(JK_ADVISORY, { headers: { Range: "bytes=0-0" } });
    const modified = got?.headers.get("last-modified");
    const at = modified ? new Date(modified) : null;
    if (!at || Number.isNaN(at.getTime())) throw new Error("no date on the advisory");
    return {
      said: `Daily advisory file dated ${sayMoment(at)}`,
      dated: at.toISOString(),
      read: new Date().toISOString(),
      link: { label: "Read the advisory (PDF)", url: JK_ADVISORY },
    };
  },
  // Lahaul and Spiti's road status page says when it was last updated, at its foot.
  "hplahaulspiti.nic.in": async () => {
    const got = await readText(LAHAUL_STATUS, { timeoutMs: 15_000 });
    const found = got ? /Last Updated:\s*(?:<[^>]+>\s*)*([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})/.exec(got.text) : null;
    const month = found ? MONTHS.indexOf((found[1] ?? "").toLowerCase()) + 1 : 0;
    if (!found || month === 0) throw new Error("no date on the road status page");
    const day = `${found[3]}-${String(month).padStart(2, "0")}-${String(found[2]).padStart(2, "0")}`;
    return {
      said: `Their page says “Last updated ${sayDate(day)}”`,
      dated: day,
      read: new Date().toISOString(),
      link: { label: "Open their page", url: LAHAUL_STATUS },
    };
  },
};

const readOffice = unstable_cache(
  async (host: string): Promise<OfficeRead> => {
    const reader = READERS[host];
    if (!reader) throw new Error(`no reader for ${host}`);
    return reader();
  },
  ["office-read-v1"],
  { revalidate: 3600 },
);

function hostOfUrl(url: string | null | undefined): string | null {
  try {
    return url ? new URL(url).hostname.replace(/^www\./, "") : null;
  } catch {
    return null;
  }
}

/** The host whose reader speaks for an office, if Meel can read its date. */
export function readableHost(a: Authority): string | null {
  for (const url of [a.url, a.source.url]) {
    const host = hostOfUrl(url);
    if (host && READERS[host]) return host;
  }
  return null;
}

/** What each office Meel can read says about its own date, keyed by the host its reader speaks for. */
export async function officeDates(route: Route): Promise<Record<string, OfficeRead>> {
  const hosts = [...new Set(route.authorities.map(readableHost).filter((h): h is string => h !== null))];
  const out: Record<string, OfficeRead> = {};
  await Promise.all(
    hosts.map(async (host) => {
      const read = await inTime(readOffice(host), 15_000, () => null);
      if (read) out[host] = read;
    }),
  );
  return out;
}

// ── Uttarakhand PWD's list of closed roads ──────────────────────────

const UK_CLOSURES = "https://mis.pwduk.in/pwd/roadClosure";
export const UK_CLOSURES_PAGE = UK_CLOSURES;

export interface Closure {
  road: string;
  km: string;
  /** "Closed", "Partly closed" or "Partly reopened". */
  status: string;
  closedAt: string | null;
  expectedAt: string | null;
  district: string;
  /** NH, SH or MDR. */
  roadType: string;
}

export interface ClosuresRead {
  closures: Closure[];
  read: string;
  districts: string[];
  failed: boolean;
}

/** "2026-10-06 13:51", as the PWD writes India's time. */
function pwdMoment(value: string): string | null {
  const m = /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2})/.exec(value.trim());
  return m ? new Date(`${m[1]}T${m[2]}:00+05:30`).toISOString() : null;
}

const STATUS_WORDS: Record<string, string> = {
  closed: "Closed",
  "partially closed": "Partly closed",
  "partially opened": "Partly reopened",
};

/** Every main road the PWD lists as not open, across the state. Village roads are left out, and so are officers' names. */
const readClosures = unstable_cache(
  async (): Promise<{ closures: Closure[]; read: string }> => {
    const got = await readText(UK_CLOSURES, { timeoutMs: 30_000 });
    if (!got) throw new Error("Uttarakhand PWD list could not be read");
    const start = got.text.indexOf('id="detail_table"');
    if (start < 0) throw new Error("Uttarakhand PWD list has changed shape");
    const table = got.text.slice(start, got.text.indexOf("</table>", start));
    const rows = [...table.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map((r) =>
      [...(r[1] ?? "").matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/g)].map((c) => decode((c[1] ?? "").replace(/<[^>]+>/g, " "))),
    );
    const head = rows[0] ?? [];
    const col = (starts: string) => head.findIndex((h) => h.toLowerCase().startsWith(starts));
    const at = {
      road: col("name of road"),
      km: col("km no"),
      closed: col("road closed at"),
      expected: col("expected time"),
      status: col("status"),
      district: col("district"),
      type: col("road type"),
    };
    if (Object.values(at).some((i) => i < 0)) throw new Error("Uttarakhand PWD list has changed shape");
    const closures: Closure[] = [];
    for (const r of rows.slice(1)) {
      if (r.length !== head.length) continue;
      const status = STATUS_WORDS[(r[at.status] ?? "").toLowerCase()];
      const roadType = r[at.type] ?? "";
      if (!status || !["NH", "SH", "MDR"].includes(roadType)) continue;
      closures.push({
        road: (r[at.road] ?? "").replace(/\s*\[\d+\]\s*$/, "").replace(/\s*:\s*\.?\s*$/, ""),
        km: (r[at.km] ?? "").replace(/\s*,\s*/g, ", "),
        status,
        closedAt: pwdMoment(r[at.closed] ?? ""),
        expectedAt: pwdMoment(r[at.expected] ?? ""),
        district: r[at.district] ?? "",
        roadType,
      });
    }
    return { closures, read: new Date().toISOString() };
  },
  ["uk-closures-v1"],
  { revalidate: 3600 },
);

/** Main roads Uttarakhand's PWD lists as closed in the districts a route crosses. Null outside Uttarakhand. */
export async function closuresFor(route: Route): Promise<ClosuresRead | null> {
  const districts = (await getRouteDistricts(route.slug)).filter((d) => placeKey(d.state) === "uttarakhand");
  if (districts.length === 0) return null;
  const names = districts.map((d) => d.district);
  const got = await inTime(readClosures(), 35_000, () => null);
  if (!got) return { closures: [], read: new Date().toISOString(), districts: names, failed: true };
  return {
    closures: got.closures
      .filter((c) => districts.some((d) => samePlace(d.district, c.district)))
      .sort((a, b) => (b.closedAt ?? "").localeCompare(a.closedAt ?? "")),
    read: got.read,
    districts: names,
    failed: false,
  };
}

// ── weather at the passes ────────────────────────────────────────────

export interface WeatherDay {
  day: string;
  snowCm: number;
  lowC: number;
  gustKmh: number;
  /** The freezing level drops below this place at some hour of the day. */
  freezingBelow: boolean;
}

export interface WeatherPlace {
  name: string;
  kind: "pass" | "halt";
  altitudeM: number;
  /** "18:59", the place's own clock. */
  sunset: string | null;
  days: WeatherDay[];
}

export interface WeatherRead {
  places: WeatherPlace[];
  read: string;
  failed: boolean;
}

export const OPEN_METEO = "https://open-meteo.com/";

/** Places worth a forecast: every pass, and each place to sleep at 3,000 m (9,800 ft) or more. Six at most. */
export function weatherPlaces(route: Route): Array<{ name: string; kind: "pass" | "halt"; lat: number; lon: number; altitudeM: number }> {
  const picked = route.waypoints
    .filter((w) => w.altitude_m !== null && (w.kind === "pass" || w.altitude_m >= 3000))
    .map((w) => ({ name: w.name, kind: w.kind === "pass" ? ("pass" as const) : ("halt" as const), lat: w.lat, lon: w.lon, altitudeM: w.altitude_m ?? 0, km: w.km_from_start }));
  const unique = picked.filter((p, i) => picked.findIndex((q) => q.name === p.name) === i);
  // Passes first, then the highest halts; then back in road order.
  const chosen = [...unique].sort((a, b) => (a.kind === b.kind ? b.altitudeM - a.altitudeM : a.kind === "pass" ? -1 : 1)).slice(0, 6);
  return chosen.sort((a, b) => a.km - b.km).map((p) => ({ name: p.name, kind: p.kind, lat: p.lat, lon: p.lon, altitudeM: p.altitudeM }));
}

interface MeteoAnswer {
  daily?: {
    time: string[];
    sunset: string[];
    snowfall_sum: number[];
    wind_gusts_10m_max: number[];
    temperature_2m_min: number[];
  };
  hourly?: { time: string[]; freezing_level_height: Array<number | null> };
}

const readWeather = unstable_cache(
  async (slug: string, places: Array<{ lat: number; lon: number; altitudeM: number }>): Promise<{ answers: MeteoAnswer[]; read: string }> => {
    const q = new URLSearchParams({
      latitude: places.map((p) => p.lat.toFixed(4)).join(","),
      longitude: places.map((p) => p.lon.toFixed(4)).join(","),
      elevation: places.map((p) => Math.round(p.altitudeM)).join(","),
      daily: "sunset,snowfall_sum,wind_gusts_10m_max,temperature_2m_min",
      hourly: "freezing_level_height",
      timezone: "auto",
      forecast_days: "3",
    });
    const got = await readText(`https://api.open-meteo.com/v1/forecast?${q}`);
    if (!got) throw new Error(`weather for ${slug} could not be read`);
    const parsed = JSON.parse(got.text) as MeteoAnswer | MeteoAnswer[];
    return { answers: Array.isArray(parsed) ? parsed : [parsed], read: new Date().toISOString() };
  },
  ["open-meteo-v1"],
  // Weather models are run every six hours. Three hours keeps Meel well inside the free service's daily limit.
  { revalidate: 10_800 },
);

/** A three-day forecast for each pass and high night halt. Null for a route with none. */
export async function weatherFor(route: Route): Promise<WeatherRead | null> {
  const places = weatherPlaces(route);
  if (places.length === 0) return null;
  const got = await inTime(
    readWeather(
      route.slug,
      places.map(({ lat, lon, altitudeM }) => ({ lat, lon, altitudeM })),
    ),
    15_000,
    () => null,
  );
  if (!got || got.answers.length !== places.length) return { places: [], read: new Date().toISOString(), failed: true };
  return {
    read: got.read,
    failed: false,
    places: places.map((p, i) => {
      const a = got.answers[i] ?? {};
      const d = a.daily;
      const days: WeatherDay[] = (d?.time ?? []).map((day, j) => {
        const levels = (a.hourly?.time ?? [])
          .map((t, k) => (t.startsWith(day) ? a.hourly?.freezing_level_height[k] : null))
          .filter((v): v is number => typeof v === "number");
        return {
          day,
          snowCm: Math.round((d?.snowfall_sum[j] ?? 0) * 10) / 10,
          lowC: Math.round(d?.temperature_2m_min[j] ?? 0),
          gustKmh: Math.round(d?.wind_gusts_10m_max[j] ?? 0),
          freezingBelow: levels.length > 0 && Math.min(...levels) < p.altitudeM,
        };
      });
      return { name: p.name, kind: p.kind, altitudeM: p.altitudeM, sunset: d?.sunset[0]?.slice(11, 16) ?? null, days };
    }),
  };
}
