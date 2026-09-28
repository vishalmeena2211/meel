import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { indiaDay, shortName } from "@/lib/format";

import { asDate, asDay, asMoment, type Client, db, newId, together } from "./db";

export type Pace = "relaxed" | "steady" | "fast";
export type TripStatus = "waiting-for-editor" | "open" | "withdrawn" | "hidden";
export type MemberStatus = "asked" | "accepted" | "declined" | "left" | "took-back" | "waiting-for-place";

export interface TripCard {
  id: string;
  route_slug: string;
  leaves_on: string;
  back_on: string;
  from_city: string;
  places: number;
  pace: Pace;
  is_company: boolean;
  status: TripStatus;
  leader_name: string;
  /** Counting the leader. */
  going: number;
}

export interface Trip extends TripCard {
  leader_id: string;
  leader_since: string;
  leader_trips: number;
  leader_facts: number;
  who_can_join: string;
  asks: string | null;
  /** Only ever sent to the leader and to riders the leader has accepted. */
  chat_link: string | null;
  nights: string[];
  flags: number;
}

export interface Member {
  user_id: string;
  name: string;
  home_city: string;
  bike: string | null;
  status: MemberStatus;
  note: string | null;
  asked_at: string;
  answered_at: string | null;
  since: string;
  trips_done: number;
  facts_confirmed: number;
}

const ACCEPTED = { status: "accepted" } as const;

const CARD = {
  id: true,
  routeSlug: true,
  leavesOn: true,
  backOn: true,
  fromCity: true,
  places: true,
  pace: true,
  isCompany: true,
  status: true,
  leader: { select: { name: true } },
  _count: { select: { members: { where: ACCEPTED } } },
} satisfies Prisma.TripSelect;

type CardData = Prisma.TripGetPayload<{ select: typeof CARD }>;

function toCard(t: CardData): TripCard {
  return {
    id: t.id,
    route_slug: t.routeSlug,
    leaves_on: asDay(t.leavesOn),
    back_on: asDay(t.backOn),
    from_city: t.fromCity,
    places: t.places,
    pace: t.pace as Pace,
    is_company: t.isCompany,
    status: t.status as TripStatus,
    leader_name: shortName(t.leader.name),
    going: 1 + t._count.members,
  };
}

/** India's calendar day, as the value a DATE column is compared with. */
function today(): Date {
  return asDate(indiaDay());
}

async function safely<T>(work: () => Promise<T>, otherwise: T): Promise<T> {
  try {
    return await work();
  } catch {
    // No database to reach, as when the site is built on a machine without one.
    return otherwise;
  }
}

/**
 * Hold one trip still until the end of the transaction. Everything that counts a trip's places and then
 * changes them takes this first, so two answers at the same moment cannot fill one place twice.
 */
async function holdTrip(tx: Prisma.TransactionClient, tripId: string): Promise<void> {
  await tx.$queryRaw`SELECT id FROM trips WHERE id = ${tripId} FOR UPDATE`;
}

/** Riders' own trips come first, then trips run by tour companies. Soonest first within each. */
export function openTrips(): Promise<TripCard[]> {
  return safely(
    async () =>
      (
        await db().trip.findMany({
          where: { status: "open", backOn: { gte: today() } },
          orderBy: [{ isCompany: "asc" }, { leavesOn: "asc" }],
          take: 200,
          select: CARD,
        })
      ).map(toCard),
    [],
  );
}

export function openTripsOnRoute(routeSlug: string): Promise<TripCard[]> {
  return safely(
    async () =>
      (
        await db().trip.findMany({
          where: { status: "open", backOn: { gte: today() }, routeSlug },
          orderBy: { leavesOn: "asc" },
          take: 20,
          select: CARD,
        })
      ).map(toCard),
    [],
  );
}

export function pastTripsOnRoute(routeSlug: string): Promise<TripCard[]> {
  return safely(
    async () =>
      (
        await db().trip.findMany({
          where: { status: "open", backOn: { lt: today() }, routeSlug },
          orderBy: { leavesOn: "desc" },
          take: 10,
          select: CARD,
        })
      ).map(toCard),
    [],
  );
}

export async function tripsOf(userId: string): Promise<Array<TripCard & { mine: "leading" | MemberStatus }>> {
  const [led, joined] = await Promise.all([
    db().trip.findMany({
      where: { leaderId: userId, status: { not: "withdrawn" } },
      orderBy: { leavesOn: "desc" },
      select: CARD,
    }),
    db().tripMember.findMany({
      where: {
        userId,
        status: { in: ["asked", "accepted", "declined", "waiting-for-place"] },
        trip: { status: "open" },
      },
      orderBy: { trip: { leavesOn: "desc" } },
      select: { status: true, trip: { select: CARD } },
    }),
  ]);
  return [
    ...led.map((t) => ({ ...toCard(t), mine: "leading" as const })),
    ...joined.map((m) => ({ ...toCard(m.trip), mine: m.status as MemberStatus })),
  ];
}

export async function getTrip(id: string, client: Client = db()): Promise<Trip | null> {
  if (!/^[a-f0-9]{8,32}$/.test(id)) return null;
  const t = await client.trip.findUnique({
    where: { id },
    include: {
      leader: { select: { name: true, createdAt: true } },
      _count: { select: { members: { where: ACCEPTED }, flags: true } },
    },
  });
  if (!t) return null;
  const [leaderTrips, leaderFacts] = await Promise.all([
    client.trip.count({ where: { leaderId: t.leaderId, status: "open" } }),
    client.factReport.count({ where: { userId: t.leaderId, status: "applied" } }),
  ]);
  return {
    id: t.id,
    route_slug: t.routeSlug,
    leaves_on: asDay(t.leavesOn),
    back_on: asDay(t.backOn),
    from_city: t.fromCity,
    places: t.places,
    pace: t.pace as Pace,
    is_company: t.isCompany,
    status: t.status as TripStatus,
    leader_id: t.leaderId,
    leader_name: shortName(t.leader.name),
    leader_since: asMoment(t.leader.createdAt),
    leader_trips: leaderTrips,
    leader_facts: leaderFacts,
    who_can_join: t.whoCanJoin,
    asks: t.asks,
    chat_link: t.chatLink,
    nights: t.nights,
    going: 1 + t._count.members,
    flags: t._count.flags,
  };
}

export async function membersOf(tripId: string): Promise<Member[]> {
  const rows = await db().tripMember.findMany({
    where: { tripId },
    orderBy: { askedAt: "asc" },
    select: {
      userId: true,
      status: true,
      note: true,
      askedAt: true,
      answeredAt: true,
      user: {
        select: {
          name: true,
          homeCity: true,
          bike: true,
          createdAt: true,
          _count: {
            select: {
              // Trips ridden: accepted on a trip that has come back. "Today" is India's day, as everywhere.
              memberships: { where: { ...ACCEPTED, trip: { backOn: { lt: today() } } } },
              factReports: { where: { status: "applied" } },
            },
          },
        },
      },
    },
  });
  return rows.map((m) => ({
    user_id: m.userId,
    name: shortName(m.user.name),
    home_city: m.user.homeCity ?? "",
    bike: m.user.bike,
    status: m.status as MemberStatus,
    note: m.note,
    asked_at: asMoment(m.askedAt),
    answered_at: m.answeredAt ? asMoment(m.answeredAt) : null,
    since: asMoment(m.user.createdAt),
    trips_done: m.user._count.memberships,
    facts_confirmed: m.user._count.factReports,
  }));
}

export interface CameBack {
  /** Riders who sent a trip report after it. */
  reports: number;
  facts: number;
  legs: number;
  videos: number;
}

/** What a trip that is over gave back to its route: the reports and confirmations its riders sent. */
export function cameBackFrom(trip: Trip): Promise<CameBack> {
  return safely(
    async () => {
      const accepted = await db().tripMember.findMany({ where: { tripId: trip.id, ...ACCEPTED }, select: { userId: true } });
      const riders = [trip.leader_id, ...accepted.map((m) => m.userId)];
      // A rider may write up a trip some weeks after coming home.
      const until = asDay(new Date(asDate(trip.back_on).getTime() + 45 * 86_400_000));
      const [facts, sent] = await Promise.all([
        db().factReport.count({
          where: {
            routeSlug: trip.route_slug,
            status: "applied",
            seenOn: { gte: asDate(trip.leaves_on), lte: asDate(until) },
            userId: { in: riders },
          },
        }),
        db().tripReport.findMany({
          where: {
            routeSlug: trip.route_slug,
            month: { gte: trip.leaves_on.slice(0, 7), lte: until.slice(0, 7) },
            userId: { in: riders },
          },
          select: { body: true },
        }),
      ]);
      const legs = new Set<string>();
      let videos = 0;
      for (const r of sent) {
        const body = r.body;
        if (!body || typeof body !== "object" || Array.isArray(body)) continue; // A report in an older shape still counts.
        const { legs: sentLegs, video } = body as { legs?: unknown; video?: unknown };
        if (Array.isArray(sentLegs)) {
          for (const l of sentLegs as Array<{ from?: unknown; to?: unknown }>) {
            if (typeof l?.from === "string" && typeof l.to === "string" && l.from && l.to) legs.add(`${l.from}|${l.to}`);
          }
        }
        if (typeof video === "string" && video.trim()) videos += 1;
      }
      return { reports: sent.length, facts, legs: legs.size, videos };
    },
    { reports: 0, facts: 0, legs: 0, videos: 0 },
  );
}

export async function membershipOf(tripId: string, userId: string, client: Client = db()): Promise<MemberStatus | null> {
  const row = await client.tripMember.findUnique({ where: { tripId_userId: { tripId, userId } }, select: { status: true } });
  return (row?.status as MemberStatus | undefined) ?? null;
}

export function openTripCount(leaderId: string): Promise<number> {
  return db().trip.count({
    where: { leaderId, status: { in: ["open", "waiting-for-editor"] }, backOn: { gte: today() } },
  });
}

export async function postTrip(input: {
  routeSlug: string;
  leaderId: string;
  leavesOn: string;
  backOn: string;
  fromCity: string;
  places: number;
  pace: Pace;
  whoCanJoin: string;
  asks: string | null;
  chatLink: string | null;
  nights: string[];
  isCompany: boolean;
}): Promise<{ id: string; status: TripStatus }> {
  // A rider's first trip is read by the editor before it appears. After that, trips appear at once.
  const before = await db().trip.count({ where: { leaderId: input.leaderId, status: "open" } });
  const status: TripStatus = before > 0 ? "open" : "waiting-for-editor";
  const id = newId();
  await db().trip.create({
    data: {
      id,
      routeSlug: input.routeSlug,
      leaderId: input.leaderId,
      leavesOn: asDate(input.leavesOn),
      backOn: asDate(input.backOn),
      fromCity: input.fromCity,
      places: input.places,
      pace: input.pace,
      whoCanJoin: input.whoCanJoin,
      asks: input.asks,
      chatLink: input.chatLink,
      nights: input.nights,
      isCompany: input.isCompany,
      status,
    },
  });
  return { id, status };
}

export async function withdrawTrip(tripId: string, leaderId: string): Promise<void> {
  await db().trip.updateMany({ where: { id: tripId, leaderId }, data: { status: "withdrawn" } });
}

export type AskResult = "asked" | "waiting-for-place" | "already" | "own-trip" | "gone";

export function askToJoin(tripId: string, userId: string, note: string | null): Promise<AskResult> {
  return together(async (tx) => {
    await holdTrip(tx, tripId);
    const trip = await getTrip(tripId, tx);
    if (!trip || trip.status !== "open" || trip.back_on < indiaDay()) return "gone";
    if (trip.leader_id === userId) return "own-trip";
    const existing = await membershipOf(tripId, userId, tx);
    if (existing === "asked" || existing === "accepted") return "already";
    const status: MemberStatus = trip.going >= trip.places ? "waiting-for-place" : "asked";
    const askedAt = new Date();
    await tx.tripMember.upsert({
      where: { tripId_userId: { tripId, userId } },
      create: { tripId, userId, status, note, askedAt },
      update: { status, note, askedAt, answeredAt: null },
    });
    return status;
  });
}

export async function takeBack(tripId: string, userId: string): Promise<void> {
  await db().tripMember.updateMany({
    where: { tripId, userId, status: { in: ["asked", "waiting-for-place"] } },
    data: { status: "took-back", answeredAt: new Date() },
  });
}

export async function leave(tripId: string, userId: string): Promise<void> {
  await db().tripMember.updateMany({
    where: { tripId, userId, ...ACCEPTED },
    data: { status: "left", answeredAt: new Date() },
  });
}

export type AnswerResult = "done" | "full" | "not-yours" | "gone";

export function answer(tripId: string, leaderId: string, riderId: string, accept: boolean): Promise<AnswerResult> {
  return together(async (tx) => {
    await holdTrip(tx, tripId);
    const trip = await getTrip(tripId, tx);
    if (!trip) return "gone";
    if (trip.leader_id !== leaderId) return "not-yours";
    if (accept && trip.going >= trip.places) return "full";
    const changed = await tx.tripMember.updateMany({
      where: { tripId, userId: riderId, status: { in: ["asked", "waiting-for-place"] } },
      data: { status: accept ? "accepted" : "declined", answeredAt: new Date() },
    });
    return changed.count > 0 ? "done" : "gone";
  });
}

/** Three reports hide a trip until the editor has looked. */
export async function flagTrip(tripId: string, userId: string, reason: string, note: string | null): Promise<void> {
  await together(async (tx) => {
    // Held, so that two reports at the same moment are both counted before the third decides.
    await holdTrip(tx, tripId);
    const at = new Date();
    await tx.tripFlag.upsert({
      where: { tripId_userId: { tripId, userId } },
      create: { tripId, userId, reason, note, at },
      update: { reason, note, at },
    });
    const flags = await tx.tripFlag.count({ where: { tripId } });
    if (flags >= 3) await tx.trip.updateMany({ where: { id: tripId, status: "open" }, data: { status: "hidden" } });
  });
}

// ── the editor's side ────────────────────────────────────────────────────

export async function tripsForEditor(): Promise<TripCard[]> {
  const rows = await db().trip.findMany({
    where: { status: { in: ["waiting-for-editor", "hidden"] } },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: CARD,
  });
  return rows.map(toCard);
}

export async function flagsOn(tripId: string): Promise<Array<{ reason: string; note: string | null; at: string }>> {
  const rows = await db().tripFlag.findMany({
    where: { tripId },
    orderBy: { at: "desc" },
    select: { reason: true, note: true, at: true },
  });
  return rows.map((f) => ({ reason: f.reason, note: f.note, at: asMoment(f.at) }));
}

export async function setTripStatus(tripId: string, status: TripStatus): Promise<void> {
  await db().trip.updateMany({ where: { id: tripId }, data: { status } });
}
