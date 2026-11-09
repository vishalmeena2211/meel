"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { currentUser, findRider, type RiderFound, setOneTimePassword } from "@/server/auth";
import { decideAskReport } from "@/server/ask/store";
import { indiaDay } from "@/server/ask/store";
import {
  applyAllStillTrue,
  confirmOwnRide,
  decideFactReport,
  decideTripReport,
  factReport,
  tripReport,
} from "@/server/reports";
import { getRouteView } from "@/server/route-view";
import { getTrip, setTripStatus } from "@/server/trips";
import { refreshRoute } from "@/server/refresh";

function text(form: FormData, key: string): string {
  const v = form.get(key);
  return typeof v === "string" ? v : "";
}

/** Only the people named in MEEL_EDITOR_EMAILS may use these. Everyone else is sent away. */
async function editorOnly() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/editor");
  if (!user.is_editor) redirect("/");
  return user;
}

export async function decideFactAction(form: FormData): Promise<void> {
  await editorOnly();
  const id = text(form, "id");
  const report = await factReport(id);
  if (!report) return;
  const decision = text(form, "decision") === "apply" ? "applied" : "set-aside";
  const wording = text(form, "wording").trim().slice(0, 400);
  const reason = text(form, "reason").trim().slice(0, 300);
  await decideFactReport(
    id,
    decision,
    decision === "applied" && report.kind === "changed" && wording ? wording : undefined,
    decision === "set-aside" && reason ? reason : undefined,
  );
  refreshRoute(report.route_slug);
  redirect("/editor");
}

export async function decideTripReportAction(form: FormData): Promise<void> {
  await editorOnly();
  const report = await tripReport(text(form, "id"));
  if (!report) return;
  const reason = text(form, "reason").trim().slice(0, 300);
  await decideTripReport(report.id, text(form, "decision") === "apply" ? "applied" : "set-aside", reason || undefined);
  refreshRoute(report.route_slug);
  redirect("/editor");
}

export async function decideTripAction(form: FormData): Promise<void> {
  await editorOnly();
  const trip = await getTrip(text(form, "id"));
  if (!trip) return;
  await setTripStatus(trip.id, text(form, "decision") === "show" ? "open" : "withdrawn");
  refreshRoute(trip.route_slug);
  revalidatePath(`/trips/${trip.id}`);
  redirect("/editor");
}

export interface LetInState {
  email: string;
  error: string;
  rider: RiderFound | null;
  /** Given once, straight after it is set. It cannot be read again. */
  password: string | null;
}

const NOBODY =
  "No rider’s account uses that email. Check the spelling with them. An editor’s own account cannot be opened this way.";

export async function letRiderInAction(_previous: LetInState, form: FormData): Promise<LetInState> {
  await editorOnly();
  const email = text(form, "email").trim().toLowerCase();
  const blank: LetInState = { email, error: "", rider: null, password: null };
  if (!email) return { ...blank, error: "Type the email on the rider’s account." };

  const found = await findRider(email);
  if (!found.ok) return { ...blank, error: NOBODY };
  if (text(form, "intent") !== "set") return { ...blank, rider: found.rider };

  const set = await setOneTimePassword(email);
  if (!set.ok) return { ...blank, error: NOBODY };
  return { ...blank, rider: found.rider, password: set.password };
}

/** An answer a rider marked wrong: read and acted on, or set aside. The answer is never given again either way. */
export async function decideAskAction(form: FormData): Promise<void> {
  await editorOnly();
  await decideAskReport(text(form, "id"), text(form, "decision") === "apply" ? "applied" : "set-aside");
  redirect("/editor");
}

/** Every unread "still true" report on one route, applied at once. */
export async function applyAllStillTrueAction(form: FormData): Promise<void> {
  await editorOnly();
  const route = text(form, "route");
  if (!route) return;
  const applied = await applyAllStillTrue(route);
  if (applied > 0) refreshRoute(route);
  redirect(`/editor?applied=${applied}&route=${encodeURIComponent(route)}`);
}

/** The oldest day a ride can be entered for. Facts seen longer ago than this would only make the page look fresher. */
const OLDEST_RIDE_DAYS = 365;

/**
 * "I rode this": the facts the editor saw on their own ride, as confirmations in their name.
 * "all" names whole sections; "fact" names single facts. Both are checked against the route's real facts.
 */
export async function rodeThisAction(form: FormData): Promise<void> {
  const user = await editorOnly();
  const route = text(form, "route");
  const seenOn = text(form, "seen_on");
  const back = `/editor/rode?route=${encodeURIComponent(route)}&seen_on=${encodeURIComponent(seenOn)}`;
  const today = indiaDay();
  const oldest = new Date(Date.now() - OLDEST_RIDE_DAYS * 86_400_000).toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(seenOn) || seenOn > today || seenOn < oldest) redirect(`${back}&error=date`);
  const view = await getRouteView(route);
  if (!view) redirect("/editor/rode?error=route");

  const sections = new Set(form.getAll("all").filter((v): v is string => typeof v === "string"));
  const picked = new Set(form.getAll("fact").filter((v): v is string => typeof v === "string"));
  const facts = view.views.all
    .filter((f) => sections.has(f.section) || picked.has(f.id))
    .map((f) => ({ id: f.id, title: f.title }));
  if (facts.length === 0) redirect(`${back}&error=none`);

  const saved = await confirmOwnRide({ routeSlug: route, seenOn, facts, name: user.shown_as, userId: user.id });
  refreshRoute(route);
  redirect(`${back}&saved=${saved}&asked=${facts.length}`);
}
