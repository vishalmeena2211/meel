import type { ChoiceSet } from "./change-choices";
import { kindIdOf, standingOf, type FactStanding } from "./facts";
import { daysBetween, hostOf, km, sayAge, sayDate, sayMonths, sourceKindName } from "./format";
import type { Confirmation, FactKind, FactState, Route, Source } from "./types";

/** The part of a route a fact belongs to. It is also the middle of the fact's own address. */
export type FactSection = "open" | "fuel" | "rules" | "road" | "mechanics" | "stays";

export interface FactLink {
  label: string;
  url: string;
}

/**
 * Everything the site shows about one fact, worked out once on the server.
 * A row in a list uses the first few fields. The opened fact uses all of them.
 */
export interface FactView {
  /** The id reports are filed under, such as "rule:rohtang-pass-permit". */
  id: string;
  section: FactSection;
  /** The last part of the fact's address. */
  slug: string;
  /** The fact's address on the site. */
  href: string;
  title: string;
  state: FactState;
  /** Shown in place of the state, for an office: how long ago it last spoke. */
  aside: string | null;
  short: string | null;
  line: string;
  long: string | null;
  meta: string | null;
  caution: string | null;
  explain: { tone: "warn" | "plain" | "danger"; title: string; words: string } | null;
  /** Shown on the row itself, as a button. */
  rowLink: FactLink | null;
  link: FactLink | null;
  changes: Array<{ when: string; what: string; host: string | null; url: string | null }>;
  history: Array<{ when: string; what: string }>;
  /** The last three answers the editor has read, newest first: a tick or a cross, and the day. No score. */
  recent: Array<{ kind: "still-true" | "changed"; when: string }>;
  quote: { words: string; by: string; when: string } | null;
  sources: Array<{ title: string; words: string; url: string }>;
  ask: string | null;
  /** When this fact last changed on the site. A date, or a date and time. */
  touched: string;
  /** Whether a rider can confirm or correct it. */
  report: boolean;
  /** Which list of choices "This has changed" offers. */
  choices: ChoiceSet;
  /** "is still working?" for a pump, "is still true?" for a rule. */
  question: string;
}

const RULE_WORDS: Record<string, string> = {
  permit: "Permit",
  fee: "Fee",
  tax: "Tax or toll",
  "motorcycle-rule": "Rule for motorcycles",
  document: "Document",
  timing: "Timing",
};

function slugOf(id: string): string {
  return id.slice(id.indexOf(":") + 1).replace(/[^a-z0-9-]/gi, "-").toLowerCase();
}

function sourceWords(s: Source): string {
  const parts = [sourceKindName(s.kind)];
  const dated = sayDate(s.source_date);
  if (dated) parts.push(`dated ${dated}`);
  const read = sayDate(s.accessed);
  if (read) parts.push(`read ${read}`);
  if (!s.opened) parts.push("seen in search results only");
  return parts.join(" · ");
}

function sourceRow(s: Source): { title: string; words: string; url: string } {
  return { title: s.title || hostOf(s.url), words: `${hostOf(s.url)} · ${sourceWords(s)}`, url: s.url };
}

/** The grey line under a fact in a list. It says how far to trust the fact, in words. */
function lineOf(standing: FactStanding, source: Source | null, verb: string, order: boolean): string {
  const { state, latest, previous, waiting, daysOld, updated } = standing;
  if (state === "pending" && waiting) {
    return `A rider reported a change on ${sayDate(waiting.seen_on)}. Being checked.`;
  }
  if (state === "conflict" && latest && previous) {
    const said = (c: Confirmation) => `${c.by} ${c.kind === "changed" ? "reported a change" : "confirmed it"} on ${sayDate(c.seen_on)}`;
    return `${said(latest)} · ${said(previous)}`;
  }
  if (latest && daysOld !== null) {
    return updated
      ? `Updated from ${latest.by}’s report · ${sayDate(latest.seen_on)} · ${sayAge(daysOld)}`
      : `${verb} by ${latest.by} · ${sayDate(latest.seen_on)} · ${sayAge(daysOld)}`;
  }
  if (!source) return "No rider has confirmed it";
  const from = source.kind === "map" ? "From the open map" : `From ${hostOf(source.url)}`;
  const lead = order ? from : `No government order found · ${from.charAt(0).toLowerCase()}${from.slice(1)}`;
  const dated = sayDate(source.source_date);
  return `${lead}${dated ? ` · dated ${dated}` : ""} · read ${sayDate(source.accessed)} · no rider has confirmed it`;
}

function explainOf(
  standing: FactStanding,
  kind: FactKind | undefined,
  noun: string,
  unchecked: string,
): FactView["explain"] {
  const { state, daysOld } = standing;
  const limits = kind
    ? `A ${noun} turns ageing after ${kind.ageing_after_days} days and stale after ${kind.stale_after_days}.`
    : "";
  switch (state) {
    case "ageing":
      return { tone: "warn", title: `Ageing: last confirmed ${sayAge(daysOld ?? 0)}`, words: limits };
    case "stale":
      return {
        tone: "danger",
        title: `Stale: last confirmed ${sayAge(daysOld ?? 0)}`,
        words: `${limits} It stays on the page, because hiding it would lose the record.`,
      };
    case "unchecked":
      return { tone: "plain", title: "Not yet checked", words: unchecked };
    case "conflict":
      return {
        tone: "plain",
        title: "Two riders saw different things",
        words: "We show both, newest first. Do not count on this.",
      };
    case "pending":
      return {
        tone: "warn",
        title: "A rider says this has changed",
        words: "The editor has not read the report yet. Until then, the words here are as the source has them.",
      };
    default:
      return null;
  }
}

function historyOf(mine: Confirmation[], verb: string, source: Source | null): FactView["history"] {
  const rows = mine
    .filter((c) => c.read !== false)
    .map((c) => ({
      on: c.seen_on,
      what: c.kind === "changed" ? `${c.note ? `${c.note} ` : "Changed. "}Reported by ${c.by}` : `${verb} by ${c.by}`,
    }));
  if (source) {
    rows.push({
      on: source.accessed,
      what: source.kind === "map" ? "First entered from the open map" : `First entered from ${hostOf(source.url)}`,
    });
  }
  // Newest first. A correction sits above the entry it corrects.
  return rows
    .sort((a, b) => b.on.localeCompare(a.on))
    .map((r) => ({ when: sayDate(r.on, true) ?? r.on, what: r.what }));
}

function touchedOf(standing: FactStanding, source: Source | null, built: string): string {
  // The day a report was applied counts, not the day the rider was on the road.
  const dates = [source?.accessed ?? built];
  if (standing.latest) dates.push(standing.latest.applied_on ?? standing.latest.seen_on);
  return dates.sort().reverse()[0] ?? built;
}

interface Made {
  id: string;
  section: FactSection;
  title: string;
  short: string | null;
  long: string | null;
  meta?: string | null;
  caution?: string | null;
  source: Source | null;
  moreSources?: Source[];
  verb?: string;
  noun: string;
  unchecked: string;
  order?: boolean;
  aside?: string | null;
  rowLink?: FactLink | null;
  link?: FactLink | null;
  changes?: FactView["changes"];
  report?: boolean;
  choices: FactView["choices"];
  question: string;
}

export interface FactViews {
  all: FactView[];
  open: FactView[];
  fuel: FactView[];
  rules: FactView[];
  road: FactView[];
  mechanics: FactView[];
  stays: FactView[];
}

/** Every fact on one route, ready to show. */
export function factViews(route: Route, confirmations: Confirmation[], kinds: FactKind[], today: Date): FactViews {
  const start = route.waypoints[0]?.name ?? route.places[0] ?? "the start";

  const make = (m: Made): FactView => {
    const mine = confirmations.filter((c) => c.fact_id === m.id);
    const kind = kinds.find((k) => k.id === kindIdOf(m.id));
    const standing = standingOf(mine, kind, today);
    const verb = m.verb ?? "Confirmed";
    const { latest, previous, state, updated } = standing;
    const slug = slugOf(m.id);

    // A change the editor has read replaces the words of the fact. The old words stay in its history.
    const rewritten = updated && latest?.note ? latest.note : null;
    const sources = [m.source, ...(m.moreSources ?? [])].filter((s): s is Source => s !== null);
    const seen = new Set<string>();

    return {
      id: m.id,
      section: m.section,
      slug,
      href: `/routes/${route.slug}/${m.section}/${slug}`,
      title: m.title,
      state,
      aside: m.aside ?? null,
      short: rewritten ?? m.short,
      line: lineOf(standing, m.source, verb, m.order ?? true),
      long: rewritten ? `${rewritten} Before that: ${m.long ?? m.short ?? ""}`.trim() : m.long,
      meta: m.meta ?? null,
      caution: m.caution ?? null,
      explain: explainOf(standing, kind, m.noun, m.unchecked),
      rowLink: m.rowLink ?? null,
      link: m.link ?? null,
      changes: m.changes ?? [],
      history: historyOf(mine, verb, m.source),
      recent: mine
        .filter((c) => c.read !== false)
        .sort((a, b) => b.seen_on.localeCompare(a.seen_on))
        .slice(0, 3)
        .map((c) => ({ kind: c.kind, when: sayDate(c.seen_on, true) ?? c.seen_on })),
      quote:
        state === "conflict" && latest && previous
          ? null
          : latest?.note && !rewritten
            ? { words: latest.note, by: latest.by, when: sayDate(latest.seen_on) ?? latest.seen_on }
            : null,
      sources: sources
        .filter((s) => (seen.has(s.url) ? false : (seen.add(s.url), true)))
        .map(sourceRow),
      ask: state === "conflict" && latest ? `Were you there after ${sayDate(latest.seen_on)}?` : null,
      touched: touchedOf(standing, m.source, route.built),
      report: m.report ?? true,
      choices: m.choices,
      question: m.question,
    };
  };

  const open = route.authorities.map((a, i) => {
    const dated = a.source.source_date;
    const days = dated && dated.length >= 10 ? daysBetween(dated, today) : null;
    // Two desks of one office can share an id. Each still needs an address of its own.
    const twin = route.authorities.findIndex((b) => b.id === a.id) !== i;
    return make({
      id: twin ? `${a.id}-${i + 1}` : a.id,
      section: "open",
      title: a.office,
      short: a.announces,
      long: [a.announces, a.stretch ? `Covers ${a.stretch}.` : null, a.channel ? `Announces on: ${a.channel}.` : null]
        .filter(Boolean)
        .join(" "),
      source: a.source,
      noun: "source",
      unchecked:
        "No rider and no editor has looked at this office’s page lately. Open it and read the date on what it says.",
      aside: days === null ? (dated ? `Dated ${sayDate(dated)}` : "No date found") : `Dated ${sayAge(days)}`,
      rowLink: a.url ? { label: "Open their page", url: a.url } : null,
      link: a.url ? { label: "Open their page", url: a.url } : null,
      report: false,
      choices: "office",
      question: "is still where this office announces?",
    });
  });

  const fuel = route.fuel.listed
    ? route.fuel.pumps.map((p) => {
        const total = route.header.distance_km ?? 0;
        const where =
          p.km_from_start < 0.5
            ? `At the start, in ${start}`
            : total > 0 && total - p.km_from_start < 0.5
              ? "At the end of the route"
              : `${km(p.km_from_start)} from ${start}`;
        const brand = p.brand && p.brand !== p.name ? `${p.brand}. ` : "";
        const hours = p.opening_hours ? ` Hours on the map: ${p.opening_hours}.` : "";
        // A pump in a town can sit off the road. Past half a kilometre, that is said.
        const off = p.off_road_m && p.off_road_m >= 500 ? `, ${km(p.off_road_m / 1000)} off the road` : "";
        // A pump from the oil company's own locator names it; every other pump is from the open map.
        const fromCompany = p.source ?? null;
        return make({
          id: p.id,
          section: "fuel",
          title: `${p.name}${p.near ? `, near ${p.near}` : ""}`,
          short: `${brand}${where}${off}.`,
          long: `${brand}${where}${off}.${hours}`,
          source: fromCompany ?? {
            url: p.osm_url ?? "https://www.openstreetmap.org/copyright",
            title: "OpenStreetMap",
            kind: "map",
            opened: true,
            source_date: null,
            accessed: route.fuel.fetched ?? route.built,
          },
          verb: "Confirmed working",
          noun: "pump",
          unchecked: fromCompany
            ? "No rider and no editor has confirmed this pump. It is on the oil company's own list, which is not the same as being open."
            : "No rider and no editor has confirmed this pump. It is on the map, which is not the same as being open.",
          choices: "pump",
          question: "is still working?",
        });
      })
    : [];

  const rules = route.rules.map((r) =>
    make({
      id: r.id,
      section: "rules",
      title: r.title,
      short: r.detail,
      long: r.detail,
      meta: [RULE_WORDS[r.kind] ?? "Rule", r.applies_to ? `applies to ${r.applies_to}` : null, r.set_by ? `set by ${r.set_by}` : null]
        .filter(Boolean)
        .join(" · "),
      caution: r.has_official_order
        ? null
        : "No government order was found for this. It is reported as what happens in practice.",
      source: r.source,
      moreSources: r.history.map((c) => c.source),
      verb: "Confirmed",
      noun: "rule",
      order: r.has_official_order,
      unchecked:
        "Gathered from the source below. No rider and no editor has confirmed it on the road. Read the official page before you rely on it.",
      link: r.official_url ? { label: `Open the official page, ${hostOf(r.official_url)}`, url: r.official_url } : null,
      changes: [...r.history]
        .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
        .map((c) => ({
          when: sayDate(c.date, true) ?? "No date",
          what: c.change,
          host: hostOf(c.source.url),
          url: c.source.url,
        })),
      choices: "rule",
      question: "is still true?",
    }),
  );

  const road = route.hazards.map((z) =>
    make({
      id: z.id,
      section: "road",
      title: z.title,
      short: z.detail,
      long: z.detail,
      meta: `When: ${sayMonths(z.months)}`,
      source: z.source,
      verb: "Seen",
      noun: "warning",
      unchecked: "Taken from a published guide. No rider has reported seeing it this season.",
      choices: "road",
      question: "is still so?",
    }),
  );

  const mechanics = (route.mechanics ?? []).map((m) =>
    make({
      id: m.id,
      section: "mechanics",
      title: `${m.name}, ${m.village}`,
      short: m.fixes,
      long: m.fixes,
      meta: m.phone && m.phone_agreed ? `Phone, given with the shop’s agreement: ${m.phone}` : null,
      source: m.source,
      noun: "shop",
      unchecked: "A rider named this shop. Nobody has confirmed it since.",
      choices: "shop",
      question: "is still open?",
    }),
  );

  const stays = (route.stays ?? []).map((s) =>
    make({
      id: s.id,
      section: "stays",
      title: `${s.name}, ${s.village}`,
      short: s.notes,
      long: s.notes,
      meta: s.phone && s.phone_agreed ? `Phone, given with the owner’s agreement: ${s.phone}` : null,
      source: s.source,
      verb: "Stayed and confirmed",
      noun: "stay",
      unchecked: "A rider named this place. Nobody has confirmed it since.",
      choices: "stay",
      question: "is still open?",
    }),
  );

  return { all: [...open, ...fuel, ...rules, ...road, ...mechanics, ...stays], open, fuel, rules, road, mechanics, stays };
}

/** How many facts in a list need a second look. Shown as a small warning beside a section's name. */
export function warningsIn(views: FactView[]): { ageing: number; stale: number; pending: number; conflict: number } {
  const count = (s: FactState) => views.filter((v) => v.state === s).length;
  return { ageing: count("ageing"), stale: count("stale"), pending: count("pending"), conflict: count("conflict") };
}
