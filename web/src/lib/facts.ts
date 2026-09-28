import { daysBetween } from "./format";
import type { Confirmation, FactKind, FactState } from "./types";

export const STATE_WORDS: Record<FactState, string> = {
  fresh: "Fresh",
  ageing: "Ageing",
  stale: "Stale",
  unchecked: "Not yet checked",
  conflict: "Reports disagree",
  pending: "Change reported",
};

export interface FactStanding {
  state: FactState;
  /** The newest report the editor has read, if any. */
  latest: Confirmation | null;
  /** The one before it. */
  previous: Confirmation | null;
  daysOld: number | null;
  /** True when the newest report the editor read was of a change: the fact was updated from it. */
  updated: boolean;
  /** A report of a change that the editor has not read yet. */
  waiting: Confirmation | null;
}

/**
 * Work out how much a fact can be trusted today.
 *
 * - A change has been reported and the editor has not read it: change reported.
 * - Nothing the editor has read: not yet checked.
 * - The two newest reports disagree, within 30 days of each other: reports disagree.
 * - Otherwise the age of the newest report decides, against the limits for that kind of fact.
 *   That holds whether the newest report confirmed the fact or updated it.
 */
export function standingOf(
  confirmations: Confirmation[],
  kind: FactKind | undefined,
  today: Date,
): FactStanding {
  const sorted = [...confirmations].sort((a, b) => b.seen_on.localeCompare(a.seen_on));
  const read = sorted.filter((c) => c.read !== false);
  const waiting = sorted.find((c) => c.read === false) ?? null;
  const latest = read[0] ?? null;
  const previous = read[1] ?? null;
  const daysOld = latest ? daysBetween(latest.seen_on, today) : null;
  const updated = latest?.kind === "changed";

  if (waiting && (!latest || waiting.seen_on >= latest.seen_on)) {
    return { state: "pending", latest, previous, daysOld, updated, waiting };
  }
  if (!latest || daysOld === null) {
    return { state: "unchecked", latest: null, previous: null, daysOld: null, updated: false, waiting: null };
  }
  if (previous && previous.kind !== latest.kind) {
    const apart = Math.abs(daysBetween(previous.seen_on, new Date(`${latest.seen_on.slice(0, 10)}T00:00:00Z`)));
    if (apart <= 30) return { state: "conflict", latest, previous, daysOld, updated, waiting: null };
  }

  const ageing = kind?.ageing_after_days ?? 180;
  const stale = kind?.stale_after_days ?? 365;
  const state: FactState = daysOld > stale ? "stale" : daysOld > ageing ? "ageing" : "fresh";
  return { state, latest, previous, daysOld, updated, waiting: null };
}

/** Which kind of fact an id belongs to, from its prefix. */
export function kindIdOf(factId: string): string {
  const prefix = factId.split(":")[0] ?? "";
  switch (prefix) {
    case "fuel":
      return "fuel-pump";
    case "rule":
      return "rule";
    case "authority":
      return "authority";
    case "hazard":
      return "hazard";
    case "mechanic":
      return "mechanic";
    case "stay":
      return "stay";
    case "sighting":
      return "hazard";
    default:
      return "rule";
  }
}
