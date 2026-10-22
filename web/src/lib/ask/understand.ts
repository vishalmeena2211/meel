import type { Route, RouteSummary } from "../types";
import type { AskKind, AskLang } from "./types";

/*
  Reading a question before any model sees it: which language, which kind of question, which places.
  Plain word rules, so the answers that must never vary (is it open, feeling unwell, costs) never depend on a model.
*/

const HINGLISH = /\b(kya|kyaa|hai|hain|kitna|kitni|kitne|kahan|kaha|kidhar|milega|milegi|milta|chahiye|chaiye|kaise|kab|tak|mein|me|bhai|nahi|nahin|haan|batao|bata|konsa|kaunsa|wala|wali|raste|rasta|jana|jaana|sakte|hoga|hogi|abhi|aaj)\b/g;

export function languageOf(q: string): AskLang {
  if (/[ऀ-ॿ]/.test(q)) return "hi";
  const hits = q.toLowerCase().match(HINGLISH)?.length ?? 0;
  return hits >= 2 ? "hinglish" : "en";
}

const RULES: Array<[AskKind, RegExp]> = [
  ["health", /\b(headache|head ache|vomit\w*|nausea|breathless\w*|breath(e|ing)? (problem|issue)|can'?t breathe|dizz\w*|faint\w*|ams|altitude sickness|mountain sickness|chest pain|unwell|sick|sar ?dard|ulti|chakkar|saans|bimar|tabiyat)\b|उल्टी|सिर दर्द|चक्कर|सांस/],
  ["off-topic", /\b(cost|costs|budget|price|prices|kharcha|kharch|expense\w*|how much money|best bike|which bike|konsi bike|kaunsi bike|bike for|bike suggest\w*|hotel\w*|homestay\w*|hostel\w*|restaurant\w*|dhaba recommend\w*|cricket|movie|song|weather forecast)\b|खर्च|होटल/],
  ["fuel", /\b(petrol|diesel|fuel|pump|pumps|tank|jerry ?can|jerrycan|refuel|bunk|tel)\b|पेट्रोल|पंप|डीजल/],
  // "Plan a trip", "give me an itinerary", "Spiti kitne din": the legs of a route, worked out from its stretches.
  ["plan", /\b(itinerar\w*|plan|planning|day ?by ?day|day ?wise|how many days|kitne din\w*|kitne dino|trip plan|schedule)\b|यात्रा योजना|कितने दिन/],
  ["distance", /\b(distance|how far|kitna door|kitni door|kitne door|km from|kms? (from|to|between)|kilomet\w*|duri)\b|दूरी|कितनी दूर/],
  ["rule", /\b(permit\w*|e-?aagman|eaagman|e aagman|ilp|inner line|fee|fees|toll\w*|tax|check ?post\w*|checkpost\w*|timing\w*|cut-?off|allowed|rule\w*|document\w*|papers|licen[cs]e|rental bike|rented bike|green tax|registration)\b|परमिट|नियम|पास/],
  ["season", /\b(when|best time|season|kab|closing|opening|opens|closes|snow\w*|winter|monsoon|month|january|february|march|april|may|june|july|august|september|october|november|december)\b|कब|मौसम/],
  ["altitude", /\b(altitude|height|elevation|feet|ft|metres?|meters?|night halt|halts?|stay the night|stop the night|stop for the night|overnight|night stop|sleep|acclimati\w*|raat|rukna|rukein)\b|ऊंचाई|रात/],
  ["video", /\b(video\w*|vlog\w*|youtube)\b/],
  ["road", /\b(road condition\w*|condition\w*|landslide\w*|water crossing\w*|rough|kaisa|kaisi|kaise hai|what is the road like|road like|potholes?|gravel|off-?road)\b/],
];

const OPEN = /\b(open|opened|closed|close|shut|khula|khuli|khule|band|status|chalu|clear|blocked|passable|today|aaj)\b|खुला|बंद/;
const WHEN = /\b(when|kab|month|date|season|usually|every year)\b|कब/;

/** The kind of question, by word rules. "Is it open today" is never a season question. */
export function kindOf(q: string): AskKind {
  const s = q.toLowerCase();
  const health = RULES[0]![1].test(s);
  if (health) return "health";
  const fuel = RULES[2]![1].test(s);
  if (OPEN.test(s) && !fuel && !WHEN.test(s) && !/\b(opening|open) (hours|time|timings)\b/.test(s)) return "open";
  for (const [kind, re] of RULES.slice(1)) if (re.test(s)) return kind;
  return "general";
}

export interface PlaceHit {
  name: string;
  slug: string;
  /** km from the start of that route, when it is a place on it. */
  km: number | null;
  /** Where in the question it was found, to tell "from" from "to". */
  at: number;
  /** Found inside a route's own name ("Mussoorie, Dhanaulti and Chakrata"): it names the route, not a stretch of it. */
  inName?: boolean;
}

export interface Gazetteer {
  /** `route` marks a route's own name rather than a place on it. */
  entries: Array<{ key: string; name: string; slug: string; km: number | null; route?: boolean }>;
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9ऀ-ॿ]+/g, " ")
    .trim();

/** Every place name Meel knows, with the routes it is on. */
export function gazetteerOf(routes: Route[], summaries: RouteSummary[]): Gazetteer {
  const entries: Gazetteer["entries"] = [];
  const add = (name: string, slug: string, km: number | null, route = false) => {
    const key = norm(name.replace(/\(.*?\)/g, ""));
    if (key.length < 3 || /^(the|road|pass|lake|town|city|valley)$/.test(key)) return;
    entries.push({ key, name, slug, km, route });
  };
  for (const r of routes) {
    for (const w of r.waypoints) add(w.name, r.slug, w.km_from_start);
    for (const p of r.places) if (!r.waypoints.some((w) => w.name === p)) add(p, r.slug, null);
    for (const p of r.fuel.pumps) if (p.near && !r.waypoints.some((w) => w.name === p.near)) add(p.near, r.slug, null);
  }
  for (const s of summaries) {
    const short = s.name.split(":")[0]!;
    add(short, s.slug, null, true);
    // "Spiti circuit" is asked about as "Spiti".
    const bare = short.replace(/\b(circuit|valley|route|hills|hill roads|coast|loop|desert)\b/gi, "").trim();
    if (bare !== short && bare.split(" ").length <= 3) add(bare, s.slug, null, true);
  }
  // Longest names first, so "Leh" inside "Manali to Leh" is not matched before the whole name.
  entries.sort((a, b) => b.key.length - a.key.length);
  return { entries };
}

/** The places named in a question, in the order they appear. */
export function placesIn(q: string, g: Gazetteer): PlaceHit[] {
  const text = ` ${norm(q)} `;
  const hits: PlaceHit[] = [];
  const taken: Array<[number, number]> = [];
  // A route's own name ("Manali to Leh") never hides the places inside it: it is one more vote for that route,
  // without taking up the words. The places inside it are marked, so "Fuel stops on Mussoorie, Dhanaulti and
  // Chakrata" is read as the whole route, not as Mussoorie to Dhanaulti.
  const names: Array<[number, number, string]> = [];
  for (const e of g.entries) {
    if (!e.route) continue;
    const at = text.indexOf(` ${e.key} `);
    if (at < 0) continue;
    names.push([at, at + e.key.length + 1, e.slug]);
    hits.push({ name: e.name, slug: e.slug, km: null, at });
  }
  // Places on the road, longest names first.
  for (const e of g.entries) {
    if (e.route) continue;
    const at = text.indexOf(` ${e.key} `);
    if (at < 0) continue;
    const end = at + e.key.length + 1;
    const overlaps = taken.some(([a, b]) => at < b && end > a && !(a === at && b === end));
    if (overlaps) continue;
    taken.push([at, end]);
    const inName = names.some(([a, b, slug]) => slug === e.slug && at >= a && end <= b);
    hits.push({ name: e.name, slug: e.slug, km: e.km, at, ...(inName ? { inName } : {}) });
  }
  return hits.sort((a, b) => a.at - b.at);
}

/** "Spiti or Ladakh", "Spiti vs Manali to Leh", "Spiti ya Leh". */
export function comparing(q: string): boolean {
  return /\b(or|vs|versus|ya|compare|better|difference)\b|या/.test(q.toLowerCase());
}

/** The routes a set of places sits on, most places first. */
export function routesOf(hits: PlaceHit[]): string[] {
  const count = new Map<string, number>();
  for (const h of hits) count.set(h.slug, (count.get(h.slug) ?? 0) + 1);
  return [...count.entries()].sort((a, b) => b[1] - a[1]).map(([slug]) => slug);
}
