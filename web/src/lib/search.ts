import type { RouteSummary } from "./types";

/*
  What the search boxes suggest as a rider types: routes by name, then routes in a region, then places
  along a route, and, when none of those match, the routes spelt most like it. Shared by the box in the
  header and the one on the front page, so both answer the same way.
*/

/** The few things a suggestion needs about a route. The header's box fetches these once, from /search-index.json. */
export type SearchRoute = Pick<RouteSummary, "slug" | "name" | "region_name" | "places" | "distance_km">;

export interface Suggestion {
  kind: "route" | "place" | "like";
  slug: string;
  /** What the row says in bold: a route's name, or a place's. */
  label: string;
  /** Where in the label the typed words are, to underline them. */
  hit: [start: number, end: number] | null;
  /** The quiet line under it. */
  hint: string;
}

const ROUTES = 5;
const PLACES = 4;
const LIKE = 3;

/** Lower case, with accents taken off, for matching what a rider types. */
export function fold(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function hintOf(r: SearchRoute): string {
  return r.distance_km ? `${r.region_name} · ${Math.round(r.distance_km).toLocaleString("en-IN")} km` : r.region_name;
}

/**
 * Where the typed words sit in a name: at the start of a word counts before the middle of one.
 * Two letters match only at the start of a word, or "sp" would bring up Jispa.
 */
function find(name: string, q: string): { at: number; score: number } | null {
  const n = fold(name);
  for (let at = n.indexOf(q); at >= 0; at = n.indexOf(q, at + 1)) {
    const wordStart = at === 0 || /[^a-z0-9]/.test(n.charAt(at - 1));
    if (wordStart) return { at, score: at === 0 ? 0 : 1 };
  }
  const at = n.indexOf(q);
  return at >= 0 && q.length >= 3 ? { at, score: 2 } : null;
}

function grams(text: string): Set<string> {
  const t = ` ${fold(text).replace(/[^a-z0-9]+/g, " ").trim()} `;
  const out = new Set<string>();
  for (let i = 0; i < t.length - 2; i += 1) out.add(t.slice(i, i + 3));
  return out;
}

/** Routes whose names or places are spelt most like what was typed. Spelling only: the site does not know where a strange place is. */
export function spelledLike<T extends Pick<RouteSummary, "name" | "places">>(query: string, routes: T[], limit = LIKE): T[] {
  const q = grams(query);
  if (q.size < 2) return [];
  return routes
    .map((r) => {
      const best = Math.max(
        ...[r.name, ...r.places].map((name) => {
          const g = grams(name);
          let shared = 0;
          for (const x of q) if (g.has(x)) shared += 1;
          return shared / Math.max(q.size, 1);
        }),
      );
      return { route: r, best };
    })
    .filter((x) => x.best >= 0.34)
    .sort((a, b) => b.best - a.best)
    .slice(0, limit)
    .map((x) => x.route);
}

/** Suggestions for what has been typed. Nothing until two letters, so a single letter does not flood the list. */
export function suggest(typed: string, routes: SearchRoute[]): Suggestion[] {
  const q = fold(typed.trim());
  if (q.length < 2) return [];

  const byName = routes
    .map((r) => ({ r, m: find(r.name, q) }))
    .filter((x): x is { r: SearchRoute; m: { at: number; score: number } } => x.m !== null)
    .sort((a, b) => a.m.score - b.m.score || a.r.name.localeCompare(b.r.name));
  const inRegion = routes.filter((r) => !byName.some((x) => x.r.slug === r.slug) && find(r.region_name, q));

  const out: Suggestion[] = [
    ...byName.map(({ r, m }) => ({ kind: "route" as const, slug: r.slug, label: r.name, hit: [m.at, m.at + q.length] as [number, number], hint: hintOf(r) })),
    ...inRegion.map((r) => ({ kind: "route" as const, slug: r.slug, label: r.name, hit: null, hint: hintOf(r) })),
  ].slice(0, ROUTES);

  // A place on a route already listed by name adds nothing, so it is left out.
  const listed = new Set(out.map((s) => s.slug));
  const places: Suggestion[] = [];
  for (const r of routes) {
    if (listed.has(r.slug)) continue;
    for (const place of r.places) {
      const m = find(place, q);
      if (!m) continue;
      places.push({ kind: "place", slug: r.slug, label: place, hit: [m.at, m.at + q.length], hint: `On ${r.name}` });
      break;
    }
  }
  places.sort((a, b) => (find(a.label, q)?.score ?? 3) - (find(b.label, q)?.score ?? 3) || a.hint.localeCompare(b.hint));
  out.push(...places.slice(0, PLACES));

  if (out.length > 0) return out;
  return spelledLike(typed, routes).map((r) => ({ kind: "like" as const, slug: r.slug, label: r.name, hit: null, hint: hintOf(r) }));
}
