"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import type { FormState } from "@/components/form";
import { getRoute } from "@/lib/content";
import { indiaDay } from "@/lib/format";
import { checkTrip, type Check } from "@/lib/trip-checks";
import { currentUser, profileFirst } from "@/server/auth";
import {
  answer,
  askToJoin,
  flagTrip,
  getTrip,
  leave,
  openTripCount,
  postTrip,
  takeBack,
  withdrawTrip,
} from "@/server/trips";
import { refreshRoute } from "@/server/refresh";

function text(form: FormData, key: string): string {
  const v = form.get(key);
  return typeof v === "string" ? v : "";
}

function errorsOf(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}

const day = (words: string) => z.string().regex(/^\d{4}-\d{2}-\d{2}$/, words);

const tripForm = z.object({
  route: z.string().regex(/^[a-z0-9-]{1,80}$/, "Pick a route."),
  leaves_on: day("Pick the day you leave."),
  back_on: day("Pick the day you are back."),
  from_city: z.string().trim().min(2, "Say which city the trip starts from.").max(60),
  places: z.coerce.number().int().min(2, "At least 2, counting you.").max(12, "At most 12, counting you."),
  pace: z.enum(["relaxed", "steady", "fast"], { message: "Pick a pace." }),
  who_can_join: z.string().trim().min(2, "Say who can join, such as “Any bike”.").max(80),
  asks: z.string().trim().max(300).optional(),
  chat_link: z
    .string()
    .trim()
    .max(200)
    .optional()
    .refine((v) => !v || /^https:\/\/[^\s]+$/.test(v), "Paste the full link, starting with https://"),
  is_company: z.enum(["yes", "no"]),
});

export interface TripFormState extends FormState {
  /** "review" once the form is sound and the checks are shown; the leader then publishes. */
  step?: "form" | "review";
  nights?: string[];
}

export async function postTripAction(_previous: TripFormState, form: FormData): Promise<TripFormState> {
  const user = await currentUser();
  if (!user) redirect("/login?next=/trips/new");
  profileFirst(user, "/trips/new");

  const nights = form.getAll("nights").filter((n): n is string => typeof n === "string" && n.length > 0);
  const values = {
    route: text(form, "route"),
    leaves_on: text(form, "leaves_on"),
    back_on: text(form, "back_on"),
    from_city: text(form, "from_city"),
    places: text(form, "places"),
    pace: text(form, "pace"),
    who_can_join: text(form, "who_can_join"),
    asks: text(form, "asks"),
    chat_link: text(form, "chat_link"),
    is_company: text(form, "is_company") === "yes" ? "yes" : "no",
  };
  if (text(form, "intent") === "edit") {
    return { ok: false, message: "", errors: {}, values, nights, step: "form" };
  }
  const parsed = tripForm.safeParse({ ...values, asks: values.asks || undefined, chat_link: values.chat_link || undefined });
  const errors = parsed.success ? {} : errorsOf(parsed.error);

  const today = indiaDay();
  if (!errors.leaves_on && values.leaves_on < today) errors.leaves_on = "That day has passed. Pick a day from today on.";
  if (!errors.back_on && !errors.leaves_on && values.back_on < values.leaves_on) {
    errors.back_on = "The trip cannot end before it starts.";
  }
  const route = parsed.success ? await getRoute(parsed.data.route) : null;
  if (parsed.success && !route) errors.route = "Pick a route.";

  if (!parsed.success || !route || Object.keys(errors).length > 0) {
    return { ok: false, message: "Something needs fixing.", errors, values, nights, step: "form" };
  }
  if ((await openTripCount(user.id)) >= 3) {
    return {
      ok: false,
      message: "You already have 3 trips open. Withdraw one, or wait for one to finish, before posting another.",
      errors: {},
      values,
      nights,
      step: "form",
    };
  }

  // Night halts must be places on this route, in the order the road meets them.
  const onRoute = route.waypoints.filter((w) => w.kind === "place").map((w) => w.name);
  const ordered = onRoute.filter((name, i) => onRoute.indexOf(name) === i && nights.includes(name));

  if (text(form, "intent") !== "publish") {
    return { ok: false, message: "", errors: {}, values, nights: ordered, step: "review" };
  }

  const made = await postTrip({
    routeSlug: route.slug,
    leaderId: user.id,
    leavesOn: parsed.data.leaves_on,
    backOn: parsed.data.back_on,
    fromCity: parsed.data.from_city,
    places: parsed.data.places,
    pace: parsed.data.pace,
    whoCanJoin: parsed.data.who_can_join,
    asks: parsed.data.asks ?? null,
    chatLink: parsed.data.chat_link ?? null,
    nights: ordered,
    isCompany: parsed.data.is_company === "yes",
  });
  refreshRoute(route.slug);
  redirect(`/trips/${made.id}?posted=${made.status === "open" ? "open" : "waiting"}`);
}

const note = z.string().trim().max(300).optional();

export async function askAction(_previous: FormState, form: FormData): Promise<FormState> {
  const tripId = text(form, "trip");
  const user = await currentUser();
  if (!user) redirect(`/signup?next=/trips/${tripId}`);
  profileFirst(user, `/trips/${tripId}`);
  const parsed = note.safeParse(text(form, "note") || undefined);
  if (!parsed.success) return { ok: false, message: "", errors: { note: "That note is too long. 300 letters at most." } };

  const result = await askToJoin(tripId, user.id, parsed.data ?? null);
  revalidatePath(`/trips/${tripId}`);
  switch (result) {
    case "asked":
      return { ok: true, errors: {}, message: "Asked. You will see the answer on this page." };
    case "waiting-for-place":
      return { ok: true, errors: {}, message: "The trip is full. You are on the list if a place opens." };
    case "already":
      return { ok: true, errors: {}, message: "You have already asked to join this trip." };
    case "own-trip":
      return { ok: false, errors: {}, message: "This is your own trip." };
    default:
      return { ok: false, errors: {}, message: "This trip is no longer open." };
  }
}

export async function takeBackAction(form: FormData): Promise<void> {
  const tripId = text(form, "trip");
  const user = await currentUser();
  if (!user) redirect(`/login?next=/trips/${tripId}`);
  await takeBack(tripId, user.id);
  revalidatePath(`/trips/${tripId}`);
}

export async function leaveAction(form: FormData): Promise<void> {
  const tripId = text(form, "trip");
  const user = await currentUser();
  if (!user) redirect(`/login?next=/trips/${tripId}`);
  await leave(tripId, user.id);
  revalidatePath(`/trips/${tripId}`);
  const trip = await getTrip(tripId);
  if (trip) refreshRoute(trip.route_slug);
}

export async function answerAction(form: FormData): Promise<void> {
  const tripId = text(form, "trip");
  const user = await currentUser();
  if (!user) redirect(`/login?next=/trips/${tripId}/requests`);
  const result = await answer(tripId, user.id, text(form, "rider"), text(form, "answer") === "accept");
  revalidatePath(`/trips/${tripId}`);
  revalidatePath(`/trips/${tripId}/requests`);
  const trip = await getTrip(tripId);
  if (trip) refreshRoute(trip.route_slug);
  if (result === "full") redirect(`/trips/${tripId}/requests?full=1`);
}

export async function withdrawAction(form: FormData): Promise<void> {
  const tripId = text(form, "trip");
  const user = await currentUser();
  if (!user) redirect(`/login?next=/trips/${tripId}`);
  const trip = await getTrip(tripId);
  await withdrawTrip(tripId, user.id);
  if (trip) refreshRoute(trip.route_slug);
  redirect("/account");
}

const flagForm = z.object({
  reason: z.enum(["money-up-front", "unmarked-company", "not-real", "other"], { message: "Pick a reason." }),
  note: z.string().trim().max(300).optional(),
});

export async function flagAction(_previous: FormState, form: FormData): Promise<FormState> {
  const tripId = text(form, "trip");
  const user = await currentUser();
  if (!user) redirect(`/login?next=/trips/${tripId}`);
  const parsed = flagForm.safeParse({ reason: text(form, "reason"), note: text(form, "note") || undefined });
  if (!parsed.success) return { ok: false, message: "Something needs fixing.", errors: errorsOf(parsed.error) };
  if (!(await getTrip(tripId))) return { ok: false, message: "This trip is no longer here.", errors: {} };
  await flagTrip(tripId, user.id, parsed.data.reason, parsed.data.note ?? null);
  revalidatePath(`/trips/${tripId}`);
  return { ok: true, errors: {}, message: "Sent to the person who keeps Meel. The leader is not told who reported." };
}

/** The checks shown on the review step of posting a trip. Reads only what is public. */
export async function tripChecksAction(route: string, leaves: string, back: string, nights: string[]): Promise<Check[]> {
  const found = await getRoute(route);
  if (!found || !/^\d{4}-\d{2}-\d{2}$/.test(leaves) || !/^\d{4}-\d{2}-\d{2}$/.test(back)) return [];
  return checkTrip(found, leaves, back, nights.slice(0, 20));
}
