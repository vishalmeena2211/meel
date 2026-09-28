import { PACE_WORDS } from "@/components/trips/trip-card";

import { sayDate } from "./format";

/*
  The words a trip travels with when it is shared: the message written into WhatsApp, and the line under
  its preview card. Kept in one place so the two never disagree. Neither ever holds the chat group link.
*/

export interface SharedTrip {
  route: string;
  leaves_on: string;
  back_on: string;
  from_city: string;
  pace: string;
  who_can_join: string;
  places: number;
  /** Counting the leader. */
  going: number;
  leader_name: string;
}

/** "Saturday 19 June", with the year when asked. Days are calendar days, so they are read as they are written. */
function longDay(day: string, withYear: boolean): string {
  const weekday = new Intl.DateTimeFormat("en-GB", { weekday: "long", timeZone: "UTC" }).format(new Date(`${day}T00:00:00Z`));
  const date = sayDate(day) ?? day;
  return `${weekday} ${withYear ? date : date.replace(/ \d{4}$/, "")}`;
}

function datesOf(t: SharedTrip): string {
  if (t.leaves_on === t.back_on) return longDay(t.leaves_on, true);
  return `${longDay(t.leaves_on, t.leaves_on.slice(0, 4) !== t.back_on.slice(0, 4))} to ${longDay(t.back_on, true)}`;
}

/** "350 cc and above" stays as it is; "Any bike" reads as "any bike" in the middle of a sentence. */
function whoCanJoin(t: SharedTrip): string {
  const w = t.who_can_join.trim();
  return /^[A-Z][a-z]/.test(w) ? w.charAt(0).toLowerCase() + w.slice(1) : w;
}

function pace(t: SharedTrip): string {
  return PACE_WORDS[t.pace] ?? t.pace;
}

/**
 * The message written into WhatsApp, without its link. The page adds "Ask to join on Meel:" and the link,
 * from wherever the site is being read.
 */
export function tripShareText(t: SharedTrip): string {
  const left = t.places - t.going;
  const places = left > 0 ? `${left} of ${t.places} places left.` : "The trip is full. You can ask to be told if a place opens.";
  return `Riding ${t.route}, ${datesOf(t)}, from ${t.from_city}. ${pace(t)}, ${whoCanJoin(t)}. ${places}`;
}

/** The line under the trip's preview card, and the page's description. */
export function tripCardLine(t: SharedTrip): string {
  const left = t.places - t.going;
  // The short name already ends with a full stop ("Anjali T."), so none is added after it.
  const leader = t.leader_name.endsWith(".") ? t.leader_name : `${t.leader_name}.`;
  return `From ${t.from_city}. ${pace(t)}, ${whoCanJoin(t)}. ${left > 0 ? `${left} of ${t.places} places left` : "Full"}. Led by ${leader}`;
}
