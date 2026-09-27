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
  /** The newest confirmation, if any. */
  latest: Confirmation | null;
  daysOld: number | null;
}

/**
 * Work out how much a fact can be trusted today.
 *
 * - No confirmation at all: not yet checked.
 * - The two newest confirmations disagree, within 30 days of each other: reports disagree.
 * - The newest says something changed: change reported.
 * - Otherwise its age decides, against the limits for that kind of fact.
 */
export function standingOf(
  confirmations: Confirmation[],
  kind: FactKind | undefined,
  today: Date,
): FactStanding {
  const sorted = [...confirmations].sort((a, b) => b.seen_on.localeCompare(a.seen_on));
  const latest = sorted[0] ?? null;
  if (!latest) return { state: "unchecked", latest: null, daysOld: null };

  const daysOld = daysBetween(latest.seen_on, today);
  const previous = sorted[1];
  if (previous && previous.kind !== latest.kind) {
    const apart = Math.abs(
      daysBetween(previous.seen_on, new Date(`${latest.seen_on.slice(0, 10)}T00:00:00Z`)),
    );
    if (apart <= 30) return { state: "conflict", latest, daysOld };
  }
  if (latest.kind === "changed") return { state: "pending", latest, daysOld };

  const ageing = kind?.ageing_after_days ?? 180;
  const stale = kind?.stale_after_days ?? 365;
  if (daysOld > stale) return { state: "stale", latest, daysOld };
  if (daysOld > ageing) return { state: "ageing", latest, daysOld };
  return { state: "fresh", latest, daysOld };
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
    default:
      return "rule";
  }
}
