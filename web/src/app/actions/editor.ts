"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { currentUser, findRider, type RiderFound, setOneTimePassword } from "@/server/auth";
import { decideFactReport, decideTripReport, factReport, tripReport } from "@/server/reports";
import { getTrip, setTripStatus } from "@/server/trips";
import { refreshRoute } from "@/server/refresh";

function text(form: FormData, key: string): string {
  const v = form.get(key);
  return typeof v === "string" ? v : "";
}

/** Only the people named in MEEL_EDITOR_EMAILS may use these. Everyone else is sent away. */
async function editorOnly(): Promise<void> {
  const user = await currentUser();
  if (!user) redirect("/login?next=/editor");
  if (!user.is_editor) redirect("/");
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
