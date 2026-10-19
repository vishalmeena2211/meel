import type { Route } from "../types";

/*
  The starter questions (wireframes, screen 9). Fixed words, never written by a model, so each one always has an
  answer. Overall: real Search Console queries rewritten as a rider asks them, one in Hinglish.
*/

export const STARTERS = [
  "Petrol pump in Chitkul?",
  "Toong check post timing",
  "Gandikota to Araku valley distance",
  "e-Aagman pass bike ke liye chahiye?",
];

/** Four questions for one route, made from its own facts. */
export function startersFor(route: Route): string[] {
  const out: string[] = [];
  const short = route.name.split(":")[0]!;
  const places = route.waypoints.filter((w) => w.kind === "place");
  const first = places[0]?.name ?? route.places[0];
  // A loop ends where it starts ("Leh to Leh"): ask about the far end instead.
  const lastPlace = places.at(-1);
  const last =
    lastPlace && lastPlace.name !== first
      ? lastPlace.name
      : [...places].filter((w) => w.name !== first).sort((a, b) => b.km_from_start - a.km_from_start)[0]?.name ?? route.places.at(-1);
  if (route.fuel.longest_gaps[0] && first && last) out.push(`How much fuel from ${first} to ${last}?`);
  else if (last) out.push(`Where is the last pump before ${last}?`);
  const rule = route.rules.find((r) => r.kind === "permit") ?? route.rules[0];
  if (rule) out.push(rule.kind === "permit" ? `Do I need a permit for ${short}?` : `What are the rules for motorcycles on ${short}?`);
  const s = route.stretches[1] ?? route.stretches[0];
  if (s) out.push(`How far is ${s.to} from ${s.from}?`);
  if (route.terrain === "mountain") out.push(`When does ${short} usually close?`);
  else out.push(`When is the best time for ${short}?`);
  return out.slice(0, 4);
}
