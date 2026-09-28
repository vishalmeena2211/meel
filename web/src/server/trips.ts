import "server-only";

import { indiaDay, shortName } from "@/lib/format";

import { all, newId, now, one, run, together } from "./db";

export type Pace = "relaxed" | "steady" | "fast";
export type TripStatus = "waiting-for-editor" | "open" | "withdrawn" | "hidden";
export type MemberStatus = "asked" | "accepted" | "declined" | "left" | "took-back" | "waiting-for-place";

export interface TripRow {
  id: string;
  route_slug: string;
  leader_id: string;
  leaves_on: string;
  back_on: string;
  from_city: string;
  places: number;
  pace: Pace;
  who_can_join: string;
  asks: string | null;
  chat_link: string | null;
  nights: string;
  is_company: number;
  status: TripStatus;
  created_at: string;
}

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

const CARD = `
  SELECT t.id, t.route_slug, t.leaves_on, t.back_on, t.from_city, t.places, t.pace, t.is_company, t.status,
         u.name AS leader_full,
         1 + (SELECT COUNT(*) FROM trip_members m WHERE m.trip_id = t.id AND m.status = 'accepted') AS going
    FROM trips t JOIN users u ON u.id = t.leader_id
`;

interface CardRow extends Omit<TripCard, "leader_name" | "is_company"> {
  leader_full: string;
  is_company: number;
}

function toCard(r: CardRow): TripCard {
  const { leader_full, is_company, ...rest } = r;
  return { ...rest, leader_name: shortName(leader_full), is_company: is_company === 1 };
}

function today(): string {
  return indiaDay();
}

function safely<T>(work: () => T, otherwise: T): T {
  try {
    return work();
  } catch {
    // No database yet, as when the site is first built.
    return otherwise;
  }
}

/** Riders' own trips come first, then trips run by tour companies. Soonest first within each. */
export function openTrips(): TripCard[] {
  return safely(
    () =>
      all<CardRow>(
        `${CARD} WHERE t.status = 'open' AND t.back_on >= ? ORDER BY t.is_company ASC, t.leaves_on ASC LIMIT 200`,
        today(),
      ).map(toCard),
    [],
  );
}

export function openTripsOnRoute(routeSlug: string): TripCard[] {
  return safely(
    () =>
      all<CardRow>(
        `${CARD} WHERE t.status = 'open' AND t.back_on >= ? AND t.route_slug = ? ORDER BY t.leaves_on ASC LIMIT 20`,
        today(),
        routeSlug,
      ).map(toCard),
    [],
  );
}

export function pastTripsOnRoute(routeSlug: string): TripCard[] {
  return safely(
    () =>
      all<CardRow>(
        `${CARD} WHERE t.status = 'open' AND t.back_on < ? AND t.route_slug = ? ORDER BY t.leaves_on DESC LIMIT 10`,
        today(),
        routeSlug,
      ).map(toCard),
    [],
  );
}

export function tripsOf(userId: string): Array<TripCard & { mine: "leading" | MemberStatus }> {
  const led = all<CardRow>(`${CARD} WHERE t.leader_id = ? AND t.status != 'withdrawn' ORDER BY t.leaves_on DESC`, userId);
  const joined = all<CardRow & { member_status: MemberStatus }>(
    `SELECT c.*, m.status AS member_status FROM (${CARD}) c
       JOIN trip_members m ON m.trip_id = c.id
      WHERE m.user_id = ? AND m.status IN ('asked', 'accepted', 'declined', 'waiting-for-place') AND c.status = 'open'
      ORDER BY c.leaves_on DESC`,
    userId,
  );
  return [
    ...led.map((r) => ({ ...toCard(r), mine: "leading" as const })),
    ...joined.map(({ member_status, ...r }) => ({ ...toCard(r), mine: member_status })),
  ];
}

export function getTrip(id: string): Trip | null {
  if (!/^[a-f0-9]{8,32}$/.test(id)) return null;
  const row = one<TripRow & { leader_full: string; leader_since: string; going: number }>(
    `SELECT t.*, u.name AS leader_full, u.created_at AS leader_since,
            1 + (SELECT COUNT(*) FROM trip_members m WHERE m.trip_id = t.id AND m.status = 'accepted') AS going
       FROM trips t JOIN users u ON u.id = t.leader_id WHERE t.id = ?`,
    id,
  );
  if (!row) return null;
  let nights: string[] = [];
  try {
    const parsed = JSON.parse(row.nights) as unknown;
    if (Array.isArray(parsed)) nights = parsed.filter((n): n is string => typeof n === "string");
  } catch {
    nights = [];
  }
  return {
    id: row.id,
    route_slug: row.route_slug,
    leaves_on: row.leaves_on,
    back_on: row.back_on,
    from_city: row.from_city,
    places: row.places,
    pace: row.pace,
    is_company: row.is_company === 1,
    status: row.status,
    leader_id: row.leader_id,
    leader_name: shortName(row.leader_full),
    leader_since: row.leader_since,
    leader_trips: one<{ n: number }>("SELECT COUNT(*) AS n FROM trips WHERE leader_id = ? AND status = 'open'", row.leader_id)?.n ?? 0,
    leader_facts:
      one<{ n: number }>("SELECT COUNT(*) AS n FROM fact_reports WHERE user_id = ? AND status = 'applied'", row.leader_id)?.n ?? 0,
    who_can_join: row.who_can_join,
    asks: row.asks,
    chat_link: row.chat_link,
    nights,
    going: row.going,
    flags: one<{ n: number }>("SELECT COUNT(*) AS n FROM trip_flags WHERE trip_id = ?", id)?.n ?? 0,
  };
}

export function membersOf(tripId: string): Member[] {
  return all<Omit<Member, "name"> & { full: string }>(
    `SELECT m.user_id, u.name AS full, u.home_city, u.bike, m.status, m.note, m.asked_at, m.answered_at,
            u.created_at AS since,
            (SELECT COUNT(*) FROM trip_members x JOIN trips t ON t.id = x.trip_id
              WHERE x.user_id = u.id AND x.status = 'accepted' AND t.back_on < date('now')) AS trips_done,
            (SELECT COUNT(*) FROM fact_reports f WHERE f.user_id = u.id AND f.status = 'applied') AS facts_confirmed
       FROM trip_members m JOIN users u ON u.id = m.user_id
      WHERE m.trip_id = ? ORDER BY m.asked_at ASC`,
    tripId,
  ).map(({ full, ...rest }) => ({ ...rest, name: shortName(full) }));
}

export interface CameBack {
  /** Riders who sent a trip report after it. */
  reports: number;
  facts: number;
  legs: number;
  videos: number;
}

/** What a trip that is over gave back to its route: the reports and confirmations its riders sent. */
export function cameBackFrom(trip: Trip): CameBack {
  return safely(() => {
    const riders = [
      trip.leader_id,
      ...all<{ user_id: string }>(
        "SELECT user_id FROM trip_members WHERE trip_id = ? AND status = 'accepted'",
        trip.id,
      ).map((m) => m.user_id),
    ];
    const marks = riders.map(() => "?").join(", ");
    // A rider may write up a trip some weeks after coming home.
    const until = new Date(new Date(`${trip.back_on}T00:00:00Z`).getTime() + 45 * 86_400_000).toISOString().slice(0, 10);
    const facts =
      one<{ n: number }>(
        `SELECT COUNT(*) AS n FROM fact_reports
          WHERE route_slug = ? AND status = 'applied' AND seen_on >= ? AND seen_on <= ? AND user_id IN (${marks})`,
        trip.route_slug,
        trip.leaves_on,
        until,
        ...riders,
      )?.n ?? 0;
    const sent = all<{ body: string }>(
      `SELECT body FROM trip_reports
        WHERE route_slug = ? AND month >= ? AND month <= ? AND user_id IN (${marks})`,
      trip.route_slug,
      trip.leaves_on.slice(0, 7),
      until.slice(0, 7),
      ...riders,
    );
    const legs = new Set<string>();
    let videos = 0;
    for (const r of sent) {
      try {
        const body = JSON.parse(r.body) as { legs?: Array<{ from?: string; to?: string }>; video?: string };
        for (const l of body.legs ?? []) if (l.from && l.to) legs.add(`${l.from}|${l.to}`);
        if (typeof body.video === "string" && body.video.trim()) videos += 1;
      } catch {
        // A report in an older shape. It still counts as a report.
      }
    }
    return { reports: sent.length, facts, legs: legs.size, videos };
  }, { reports: 0, facts: 0, legs: 0, videos: 0 });
}

export function membershipOf(tripId: string, userId: string): MemberStatus | null {
  return one<{ status: MemberStatus }>("SELECT status FROM trip_members WHERE trip_id = ? AND user_id = ?", tripId, userId)?.status ?? null;
}

export function openTripCount(leaderId: string): number {
  return (
    one<{ n: number }>(
      "SELECT COUNT(*) AS n FROM trips WHERE leader_id = ? AND status IN ('open', 'waiting-for-editor') AND back_on >= ?",
      leaderId,
      today(),
    )?.n ?? 0
  );
}

export function postTrip(input: {
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
}): { id: string; status: TripStatus } {
  // A rider's first trip is read by the editor before it appears. After that, trips appear at once.
  const before = one<{ n: number }>("SELECT COUNT(*) AS n FROM trips WHERE leader_id = ? AND status = 'open'", input.leaderId)?.n ?? 0;
  const status: TripStatus = before > 0 ? "open" : "waiting-for-editor";
  const id = newId();
  run(
    `INSERT INTO trips (id, route_slug, leader_id, leaves_on, back_on, from_city, places, pace, who_can_join, asks,
                        chat_link, nights, is_company, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    input.routeSlug,
    input.leaderId,
    input.leavesOn,
    input.backOn,
    input.fromCity,
    input.places,
    input.pace,
    input.whoCanJoin,
    input.asks,
    input.chatLink,
    JSON.stringify(input.nights),
    input.isCompany ? 1 : 0,
    status,
    now(),
  );
  return { id, status };
}

export function withdrawTrip(tripId: string, leaderId: string): void {
  run("UPDATE trips SET status = 'withdrawn' WHERE id = ? AND leader_id = ?", tripId, leaderId);
}

export type AskResult = "asked" | "waiting-for-place" | "already" | "own-trip" | "gone";

export function askToJoin(tripId: string, userId: string, note: string | null): AskResult {
  return together(() => {
    const trip = getTrip(tripId);
    if (!trip || trip.status !== "open" || trip.back_on < today()) return "gone";
    if (trip.leader_id === userId) return "own-trip";
    const existing = membershipOf(tripId, userId);
    if (existing === "asked" || existing === "accepted") return "already";
    const status: MemberStatus = trip.going >= trip.places ? "waiting-for-place" : "asked";
    run(
      `INSERT INTO trip_members (trip_id, user_id, status, note, asked_at) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (trip_id, user_id) DO UPDATE SET status = excluded.status, note = excluded.note,
         asked_at = excluded.asked_at, answered_at = NULL`,
      tripId,
      userId,
      status,
      note,
      now(),
    );
    return status;
  });
}

export function takeBack(tripId: string, userId: string): void {
  run(
    "UPDATE trip_members SET status = 'took-back', answered_at = ? WHERE trip_id = ? AND user_id = ? AND status IN ('asked', 'waiting-for-place')",
    now(),
    tripId,
    userId,
  );
}

export function leave(tripId: string, userId: string): void {
  run(
    "UPDATE trip_members SET status = 'left', answered_at = ? WHERE trip_id = ? AND user_id = ? AND status = 'accepted'",
    now(),
    tripId,
    userId,
  );
}

export type AnswerResult = "done" | "full" | "not-yours" | "gone";

export function answer(tripId: string, leaderId: string, riderId: string, accept: boolean): AnswerResult {
  return together(() => {
    const trip = getTrip(tripId);
    if (!trip) return "gone";
    if (trip.leader_id !== leaderId) return "not-yours";
    if (accept && trip.going >= trip.places) return "full";
    const changed = run(
      "UPDATE trip_members SET status = ?, answered_at = ? WHERE trip_id = ? AND user_id = ? AND status IN ('asked', 'waiting-for-place')",
      accept ? "accepted" : "declined",
      now(),
      tripId,
      riderId,
    );
    return changed > 0 ? "done" : "gone";
  });
}

/** Three reports hide a trip until the editor has looked. */
export function flagTrip(tripId: string, userId: string, reason: string, note: string | null): void {
  together(() => {
    run(
      `INSERT INTO trip_flags (trip_id, user_id, reason, note, at) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (trip_id, user_id) DO UPDATE SET reason = excluded.reason, note = excluded.note, at = excluded.at`,
      tripId,
      userId,
      reason,
      note,
      now(),
    );
    const flags = one<{ n: number }>("SELECT COUNT(*) AS n FROM trip_flags WHERE trip_id = ?", tripId)?.n ?? 0;
    if (flags >= 3) run("UPDATE trips SET status = 'hidden' WHERE id = ? AND status = 'open'", tripId);
  });
}

// ── the editor's side ────────────────────────────────────────────────────

export function tripsForEditor(): TripCard[] {
  return all<CardRow>(`${CARD} WHERE t.status IN ('waiting-for-editor', 'hidden') ORDER BY t.created_at DESC LIMIT 100`).map(toCard);
}

export function flagsOn(tripId: string): Array<{ reason: string; note: string | null; at: string }> {
  return all("SELECT reason, note, at FROM trip_flags WHERE trip_id = ? ORDER BY at DESC", tripId);
}

export function setTripStatus(tripId: string, status: TripStatus): void {
  run("UPDATE trips SET status = ? WHERE id = ?", status, tripId);
}
