import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import type { Confirmation } from "@/lib/types";

import { asDate, asDay, asMoment, db, newId } from "./db";

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
  /** As the rider sent it. Kept as text here, as the editor's desk reads it. */
  body: string;
  name: string | null;
  user_id: string | null;
  status: "new" | "applied" | "set-aside";
  created_at: string;
}

type FactData = Prisma.FactReportGetPayload<object>;
type TripData = Prisma.TripReportGetPayload<object>;

function toFactRow(r: FactData): FactReportRow {
  return {
    id: r.id,
    route_slug: r.routeSlug,
    fact_id: r.factId,
    fact_title: r.factTitle,
    kind: r.kind as FactReportRow["kind"],
    change_kind: r.changeKind,
    note: r.note,
    seen_on: asDay(r.seenOn),
    name: r.name,
    user_id: r.userId,
    status: r.status as FactReportRow["status"],
    created_at: asMoment(r.createdAt),
    decided_at: r.decidedAt ? asMoment(r.decidedAt) : null,
  };
}

function toTripRow(r: TripData): TripReportRow {
  return {
    id: r.id,
    route_slug: r.routeSlug,
    month: r.month,
    bike: r.bike,
    body: JSON.stringify(r.body),
    name: r.name,
    user_id: r.userId,
    status: r.status as TripReportRow["status"],
    created_at: asMoment(r.createdAt),
  };
}

function asObject(value: Prisma.JsonValue): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export async function sendFactReport(input: {
  routeSlug: string;
  factId: string;
  factTitle: string;
  kind: "still-true" | "changed";
  changeKind: string | null;
  note: string | null;
  seenOn: string;
  name: string | null;
  userId: string | null;
}): Promise<string> {
  const id = newId();
  await db().factReport.create({
    data: {
      id,
      routeSlug: input.routeSlug,
      factId: input.factId,
      factTitle: input.factTitle,
      kind: input.kind,
      changeKind: input.changeKind,
      note: input.note,
      seenOn: asDate(input.seenOn),
      name: input.name,
      userId: input.userId,
      status: "new",
    },
  });
  return id;
}

// No account is needed to report, so the inbox has a lid.
const UNREAD_PER_FACT = 5;
const UNREAD_PER_HOUR = 60;

/** False when one fact, or the whole inbox, already has more unread reports than one editor can read. */
export async function inboxHasRoom(routeSlug: string, factId: string): Promise<boolean> {
  const forFact = await db().factReport.count({ where: { routeSlug, factId, status: "new" } });
  if (forFact >= UNREAD_PER_FACT) return false;
  const lately = await db().factReport.count({
    where: { status: "new", createdAt: { gt: new Date(Date.now() - 3_600_000) } },
  });
  return lately < UNREAD_PER_HOUR;
}

/**
 * What riders have said about the facts on one route.
 *
 * A report the editor has applied counts in full.
 * A report of a change that the editor has not yet read counts too, as a warning,
 * but its words are not shown until it has been read.
 */
export async function confirmationsFor(routeSlug: string): Promise<Confirmation[]> {
  let rows: FactData[] = [];
  try {
    rows = await db().factReport.findMany({
      where: { routeSlug, OR: [{ status: "applied" }, { status: "new", kind: "changed" }] },
      orderBy: { seenOn: "desc" },
    });
  } catch {
    // No database to reach, as when the site is built on a machine without one. Every fact is then "not yet checked".
    return [];
  }
  return rows.map((r) => ({
    fact_id: r.factId,
    route_slug: r.routeSlug,
    seen_on: asDay(r.seenOn),
    by: r.name ?? "a rider",
    kind: r.kind as Confirmation["kind"],
    note: r.status === "applied" ? r.note : null,
    read: r.status === "applied",
    applied_on: r.status === "applied" && r.decidedAt ? asMoment(r.decidedAt) : null,
  }));
}

export async function sendTripReport(input: {
  routeSlug: string;
  month: string;
  bike: string;
  body: Record<string, unknown>;
  name: string | null;
  userId: string | null;
}): Promise<string> {
  const id = newId();
  await db().tripReport.create({
    data: {
      id,
      routeSlug: input.routeSlug,
      month: input.month,
      bike: input.bike,
      body: input.body as Prisma.InputJsonObject,
      name: input.name,
      userId: input.userId,
      status: "new",
    },
  });
  return id;
}

export async function tripReportCount(routeSlug: string): Promise<number> {
  try {
    return await db().tripReport.count({ where: { routeSlug } });
  } catch {
    return 0;
  }
}

/** For each route, how many facts riders confirmed in the last seven days. */
export async function confirmedLately(): Promise<Record<string, number>> {
  try {
    const since = asDate(asDay(new Date(Date.now() - 7 * 86_400_000)));
    // One row per route and fact, so a fact confirmed twice counts once.
    const rows = await db().factReport.groupBy({
      by: ["routeSlug", "factId"],
      where: { status: "applied", seenOn: { gte: since } },
    });
    const counts: Record<string, number> = {};
    for (const r of rows) counts[r.routeSlug] = (counts[r.routeSlug] ?? 0) + 1;
    return counts;
  } catch {
    return {};
  }
}

/** Trip reports the editor has read and used, for working out bikes, hours and costs. Newest first. */
export async function tripReportsUsed(
  routeSlug: string,
): Promise<Array<{ month: string; bike: string; by: string | null; body: Record<string, unknown> }>> {
  let rows: TripData[] = [];
  try {
    rows = await db().tripReport.findMany({
      where: { routeSlug, status: "applied" },
      orderBy: { month: "desc" },
      take: 500,
    });
  } catch {
    return [];
  }
  return rows.map((r) => ({ month: r.month, bike: r.bike, by: r.name, body: asObject(r.body) }));
}

export async function suggestPlace(place: string, note: string | null, name: string | null): Promise<void> {
  await db().suggestion.create({ data: { id: newId(), place, note, name } });
}

// ── the editor's side ────────────────────────────────────────────────────

export async function inbox(): Promise<{
  facts: FactReportRow[];
  trips: TripReportRow[];
  places: Array<Record<string, string>>;
}> {
  const [facts, trips, places] = await Promise.all([
    db().factReport.findMany({ where: { status: "new" }, orderBy: { createdAt: "desc" }, take: 200 }),
    db().tripReport.findMany({ where: { status: "new" }, orderBy: { createdAt: "desc" }, take: 200 }),
    db().suggestion.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
  ]);
  return {
    facts: facts.map(toFactRow),
    trips: trips.map(toTripRow),
    // The desk reads these by their column names, as it did before.
    places: places.map((s) => {
      const row: Record<string, string> = { id: s.id, place: s.place, created_at: asMoment(s.createdAt) };
      if (s.note !== null) row.note = s.note;
      if (s.name !== null) row.name = s.name;
      return row;
    }),
  };
}

export async function factReport(id: string): Promise<FactReportRow | null> {
  const r = await db().factReport.findUnique({ where: { id } });
  return r ? toFactRow(r) : null;
}

export async function decideFactReport(
  id: string,
  decision: "applied" | "set-aside",
  wording?: string,
  reason?: string,
): Promise<void> {
  const decidedAt = new Date();
  await db().factReport.updateMany({
    where: { id },
    data:
      wording !== undefined
        ? { status: decision, decidedAt, note: wording }
        : { status: decision, decidedAt, editorNote: reason ?? null },
  });
}

export async function decideTripReport(id: string, decision: "applied" | "set-aside", reason?: string): Promise<void> {
  await db().tripReport.updateMany({ where: { id }, data: { status: decision, editorNote: reason ?? null } });
}

export async function tripReport(id: string): Promise<TripReportRow | null> {
  const r = await db().tripReport.findUnique({ where: { id } });
  return r ? toTripRow(r) : null;
}

/** How many other riders have said the same of the same fact, in the thirty days around this report. */
export function othersSaying(report: FactReportRow): Promise<number> {
  const from = new Date(asDate(report.seen_on).getTime() - 30 * 86_400_000);
  return db().factReport.count({
    where: {
      routeSlug: report.route_slug,
      factId: report.fact_id,
      kind: report.kind,
      id: { not: report.id },
      status: { not: "set-aside" },
      seenOn: { gte: from },
    },
  });
}

/** How many earlier reports from the same person were applied. Shown to the editor as evidence. */
export async function recordOf(userId: string | null, name: string | null): Promise<{ sent: number; applied: number }> {
  if (!userId && !name) return { sent: 0, applied: 0 };
  const who: Prisma.FactReportWhereInput = userId ? { userId } : { name };
  const [sent, applied] = await Promise.all([
    db().factReport.count({ where: who }),
    db().factReport.count({ where: { ...who, status: "applied" } }),
  ]);
  return { sent, applied };
}
