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

// No account is needed to report, so the inbox has a lid.
const UNREAD_PER_FACT = 5;
const UNREAD_PER_HOUR = 60;

/** False when one fact, or the whole inbox, already has more unread reports than one editor can read. */
export function inboxHasRoom(routeSlug: string, factId: string): boolean {
  const forFact = one<{ n: number }>(
    "SELECT COUNT(*) AS n FROM fact_reports WHERE route_slug = ? AND fact_id = ? AND status = 'new'",
    routeSlug,
    factId,
  );
  if ((forFact?.n ?? 0) >= UNREAD_PER_FACT) return false;
  const hourAgo = new Date(Date.now() - 3_600_000).toISOString();
  const lately = one<{ n: number }>(
    "SELECT COUNT(*) AS n FROM fact_reports WHERE status = 'new' AND created_at > ?",
    hourAgo,
  );
  return (lately?.n ?? 0) < UNREAD_PER_HOUR;
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
    read: r.status === "applied",
    applied_on: r.status === "applied" ? r.decided_at : null,
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

/** For each route, how many facts riders confirmed in the last seven days. */
export function confirmedLately(): Record<string, number> {
  try {
    const since = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);
    const rows = all<{ route_slug: string; n: number }>(
      `SELECT route_slug, COUNT(DISTINCT fact_id) AS n FROM fact_reports
        WHERE status = 'applied' AND seen_on >= ? GROUP BY route_slug`,
      since,
    );
    return Object.fromEntries(rows.map((r) => [r.route_slug, r.n]));
  } catch {
    return {};
  }
}

/** Trip reports the editor has read and used, for working out bikes, hours and costs. Newest first. */
export function tripReportsUsed(
  routeSlug: string,
): Array<{ month: string; bike: string; by: string | null; body: Record<string, unknown> }> {
  let rows: TripReportRow[] = [];
  try {
    rows = all<TripReportRow>(
      "SELECT * FROM trip_reports WHERE route_slug = ? AND status = 'applied' ORDER BY month DESC LIMIT 500",
      routeSlug,
    );
  } catch {
    return [];
  }
  return rows.map((r) => {
    let body: Record<string, unknown> = {};
    try {
      const parsed = JSON.parse(r.body) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) body = parsed as Record<string, unknown>;
    } catch {
      body = {};
    }
    return { month: r.month, bike: r.bike, by: r.name, body };
  });
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

export function decideFactReport(
  id: string,
  decision: "applied" | "set-aside",
  wording?: string,
  reason?: string,
): void {
  if (wording !== undefined) {
    run("UPDATE fact_reports SET status = ?, decided_at = ?, note = ? WHERE id = ?", decision, now(), wording, id);
  } else {
    run(
      "UPDATE fact_reports SET status = ?, decided_at = ?, editor_note = ? WHERE id = ?",
      decision,
      now(),
      reason ?? null,
      id,
    );
  }
}

export function decideTripReport(id: string, decision: "applied" | "set-aside", reason?: string): void {
  run("UPDATE trip_reports SET status = ?, editor_note = ? WHERE id = ?", decision, reason ?? null, id);
}

export function tripReport(id: string): TripReportRow | null {
  return one<TripReportRow>("SELECT * FROM trip_reports WHERE id = ?", id);
}

/** How many other riders have said the same of the same fact, in the thirty days around this report. */
export function othersSaying(report: FactReportRow): number {
  const from = new Date(new Date(`${report.seen_on}T00:00:00Z`).getTime() - 30 * 86_400_000).toISOString().slice(0, 10);
  return (
    one<{ n: number }>(
      `SELECT COUNT(*) AS n FROM fact_reports
        WHERE route_slug = ? AND fact_id = ? AND kind = ? AND id <> ? AND status <> 'set-aside' AND seen_on >= ?`,
      report.route_slug,
      report.fact_id,
      report.kind,
      report.id,
      from,
    )?.n ?? 0
  );
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
