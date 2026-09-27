"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { currentUser } from "@/server/auth";
import { decideFactReport, decideTripReport, factReport } from "@/server/reports";
import { getTrip, setTripStatus } from "@/server/trips";

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
  const report = factReport(id);
  if (!report) return;
  const decision = text(form, "decision") === "apply" ? "applied" : "set-aside";
  const wording = text(form, "wording").trim().slice(0, 400);
  decideFactReport(id, decision, decision === "applied" && report.kind === "changed" && wording ? wording : undefined);
  revalidatePath(`/routes/${report.route_slug}`);
  revalidatePath("/editor");
}

export async function decideTripReportAction(form: FormData): Promise<void> {
  await editorOnly();
  decideTripReport(text(form, "id"), text(form, "decision") === "apply" ? "applied" : "set-aside");
  revalidatePath("/editor");
}

export async function decideTripAction(form: FormData): Promise<void> {
  await editorOnly();
  const trip = getTrip(text(form, "id"));
  if (!trip) return;
  setTripStatus(trip.id, text(form, "decision") === "show" ? "open" : "withdrawn");
  revalidatePath(`/routes/${trip.route_slug}`);
  revalidatePath(`/trips/${trip.id}`);
  revalidatePath("/editor");
}
