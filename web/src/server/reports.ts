import "server-only";

import type { Confirmation } from "@/lib/types";

import { all, newId, now, one, run } from "./db";

export interface FactReportRow {
  id: string;
  route_slug: string;
  fact_id: string;
  fact_title: string;
  kind: "still-true" | "changed";
  change_kind: string | null;
  note: string | null;
  seen_on: string;
  name: string | null;
  user_id: string | null;
  status: "new" | "applied" | "set-aside";
  created_at: string;
  decided_at: string | null;
}

export interface TripReportRow {
  id: string;
  route_slug: string;
  month: string;
  bike: string;
  body: string;
  name: string | null;
  user_id: string | null;
  status: "new" | "applied" | "set-aside";
  created_at: string;
}

export function sendFactReport(input: {
  routeSlug: string;
  factId: string;
  factTitle: string;
  kind: "still-true" | "changed";
  changeKind: string | null;
  note: string | null;
  seenOn: string;
  name: string | null;
  userId: string | null;
}): string {
  const id = newId();
  run(
    `INSERT INTO fact_reports
       (id, route_slug, fact_id, fact_title, kind, change_kind, note, seen_on, name, user_id, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?)`,
    id,
    input.routeSlug,
    input.factId,
    input.factTitle,
    input.kind,
    input.changeKind,
    input.note,
    input.seenOn,
    input.name,
    input.userId,
    now(),
  );
  return id;
}

/**
 * What riders have said about the facts on one route.
 *
 * A report the editor has applied counts in full.
 * A report of a change that the editor has not yet read counts too, as a warning,
 * but its words are not shown until it has been read.
 */
export function confirmationsFor(routeSlug: string): Confirmation[] {
  let rows: FactReportRow[] = [];
  try {
    rows = all<FactReportRow>(
      `SELECT * FROM fact_reports
        WHERE route_slug = ? AND (status = 'applied' OR (status = 'new' AND kind = 'changed'))
        ORDER BY seen_on DESC`,
      routeSlug,
    );
  } catch {
    // No database yet, as when the site is first built. Every fact is then "not yet checked".
    return [];
  }
  return rows.map((r) => ({
    fact_id: r.fact_id,
    route_slug: r.route_slug,
    seen_on: r.seen_on,
    by: r.name ?? "a rider",
    kind: r.kind,
    note: r.status === "applied" ? r.note : null,
  }));
}

export function sendTripReport(input: {
  routeSlug: string;
  month: string;
  bike: string;
  body: Record<string, unknown>;
  name: string | null;
  userId: string | null;
}): string {
  const id = newId();
  run(
    `INSERT INTO trip_reports (id, route_slug, month, bike, body, name, user_id, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'new', ?)`,
    id,
    input.routeSlug,
    input.month,
    input.bike,
    JSON.stringify(input.body),
    input.name,
    input.userId,
    now(),
  );
  return id;
}

export function tripReportCount(routeSlug: string): number {
  try {
    return one<{ n: number }>("SELECT COUNT(*) AS n FROM trip_reports WHERE route_slug = ?", routeSlug)?.n ?? 0;
  } catch {
    return 0;
  }
}

export function suggestPlace(place: string, note: string | null, name: string | null): void {
  run(
    "INSERT INTO suggestions (id, place, note, name, created_at) VALUES (?, ?, ?, ?, ?)",
    newId(),
    place,
    note,
    name,
    now(),
  );
}

// ── the editor's side ────────────────────────────────────────────────────

export function inbox(): { facts: FactReportRow[]; trips: TripReportRow[]; places: Array<Record<string, string>> } {
  return {
    facts: all<FactReportRow>("SELECT * FROM fact_reports WHERE status = 'new' ORDER BY created_at DESC LIMIT 200"),
    trips: all<TripReportRow>("SELECT * FROM trip_reports WHERE status = 'new' ORDER BY created_at DESC LIMIT 200"),
    places: all<Record<string, string>>("SELECT * FROM suggestions ORDER BY created_at DESC LIMIT 100"),
  };
}

export function factReport(id: string): FactReportRow | null {
  return one<FactReportRow>("SELECT * FROM fact_reports WHERE id = ?", id);
}

export function decideFactReport(id: string, decision: "applied" | "set-aside", note?: string): void {
  if (note !== undefined) {
    run("UPDATE fact_reports SET status = ?, decided_at = ?, note = ? WHERE id = ?", decision, now(), note, id);
  } else {
    run("UPDATE fact_reports SET status = ?, decided_at = ? WHERE id = ?", decision, now(), id);
  }
}

export function decideTripReport(id: string, decision: "applied" | "set-aside"): void {
  run("UPDATE trip_reports SET status = ? WHERE id = ?", decision, id);
}

/** How many earlier reports from the same person were applied. Shown to the editor as evidence. */
export function recordOf(userId: string | null, name: string | null): { sent: number; applied: number } {
  if (!userId && !name) return { sent: 0, applied: 0 };
  const row = userId
    ? one<{ sent: number; applied: number }>(
        `SELECT COUNT(*) AS sent, COALESCE(SUM(status = 'applied'), 0) AS applied FROM fact_reports WHERE user_id = ?`,
        userId,
      )
    : one<{ sent: number; applied: number }>(
        `SELECT COUNT(*) AS sent, COALESCE(SUM(status = 'applied'), 0) AS applied FROM fact_reports WHERE name = ?`,
        name,
      );
  return row ?? { sent: 0, applied: 0 };
}
