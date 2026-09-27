import Link from "next/link";
import type { ReactNode } from "react";

import { daysBetween, sayDate } from "@/lib/format";
import type { TripCard } from "@/server/trips";

import { Badge } from "../ui";

export const PACE_WORDS: Record<string, string> = {
  relaxed: "Relaxed pace",
  steady: "Steady pace",
  fast: "Fast pace",
};

export function tripLength(leaves: string, back: string): string {
  const days = daysBetween(leaves, new Date(`${back}T00:00:00Z`)) + 1;
  return days === 1 ? "1 day" : `${days} days`;
}

export function placesBadge(trip: TripCard, today: Date): ReactNode {
  const left = trip.places - trip.going;
  if (trip.status === "waiting-for-editor") return <Badge tone="unchecked">Waiting for the editor</Badge>;
  if (trip.status === "hidden") return <Badge tone="stale">Hidden, being looked at</Badge>;
  if (trip.back_on < today.toISOString().slice(0, 10)) return <Badge>Already ridden</Badge>;
  if (left <= 0) return <Badge>Full</Badge>;
  return <Badge tone="fresh">{left === 1 ? "1 place left" : `${left} places left`}</Badge>;
}

export function Seats({ going, places }: { going: number; places: number }) {
  return (
    <span className="mt-1 flex items-center gap-1" role="img" aria-label={`${going} of ${places} places taken`}>
      {Array.from({ length: places }, (_, i) => (
        <i
          key={i}
          className={`size-3.5 rounded-full border-[1.5px] ${i < going ? "border-sign bg-sign" : "border-rule"}`}
        />
      ))}
      <span className="hint num ml-1.5">
        {going} of {places} going
      </span>
    </span>
  );
}

export function TripCardView({
  trip,
  routeName,
  state,
}: {
  trip: TripCard;
  routeName: string;
  state?: ReactNode;
}) {
  return (
    <Link href={`/trips/${trip.id}`} className="card flex flex-col gap-0.5 px-3 py-2.5 hover:border-ink-2">
      <span className="flex items-start justify-between gap-2">
        <b className="display text-lg leading-tight">{routeName}</b>
        {state ?? placesBadge(trip, new Date())}
      </span>
      <span className="num text-sm">
        {sayDate(trip.leaves_on)} to {sayDate(trip.back_on)} · {tripLength(trip.leaves_on, trip.back_on)}
      </span>
      <span className="hint">
        From {trip.from_city} · led by {trip.leader_name} · {PACE_WORDS[trip.pace] ?? trip.pace}
        {trip.is_company ? " · run by a tour company" : ""}
      </span>
      <Seats going={trip.going} places={trip.places} />
    </Link>
  );
}
