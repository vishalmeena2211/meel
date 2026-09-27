"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { FormState } from "@/components/form";
import { getRoute } from "@/lib/content";
import { indiaMonth, shortName } from "@/lib/format";
import { currentUser } from "@/server/auth";
import { sendTripReport, suggestPlace } from "@/server/reports";

const blank: FormState = { ok: false, message: "", errors: {} };

/** What the rider typed, so that a form with one mistake in it comes back full, not empty. */
function typed(form: FormData, names: readonly string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const name of names) {
    const value = form.get(name);
    out[name] = typeof value === "string" ? value : "";
  }
  return out;
}

function errorsOf(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}

const tripReport = z.object({
  route: z.string().regex(/^[a-z0-9-]{1,80}$/, "Pick a route."),
  month: z.string().regex(/^\d{4}-\d{2}$/, "Pick the month you rode."),
  bike: z.string().trim().min(2, "Say which bike you rode.").max(80),
  name: z.string().trim().max(60).optional(),
  hours: z.string().trim().max(1200).optional(),
  fuel: z.string().trim().max(800).optional(),
  gear: z.string().trim().max(800).optional(),
  cost: z.string().trim().max(400).optional(),
  video: z
    .string()
    .trim()
    .max(200)
    .optional()
    .refine((v) => !v || /^https:\/\/(www\.)?(youtube\.com|youtu\.be)\//.test(v), "Paste a link from YouTube."),
});

export async function reportTrip(_previous: FormState, form: FormData): Promise<FormState> {
  const values = typed(form, ["route", "month", "bike", "name", "hours", "fuel", "gear", "cost", "video"]);
  const parsed = tripReport.safeParse({
    route: form.get("route"),
    month: form.get("month"),
    bike: form.get("bike"),
    name: form.get("name") || undefined,
    hours: form.get("hours") || undefined,
    fuel: form.get("fuel") || undefined,
    gear: form.get("gear") || undefined,
    cost: form.get("cost") || undefined,
    video: form.get("video") || undefined,
  });
  if (!parsed.success) {
    return { ...blank, message: "Something needs fixing.", errors: errorsOf(parsed.error), values };
  }
  const input = parsed.data;
  if (input.month > indiaMonth()) {
    return { ...blank, message: "Something needs fixing.", errors: { month: "That month has not happened yet." }, values };
  }
  const route = await getRoute(input.route);
  if (!route) return { ...blank, message: "Something needs fixing.", errors: { route: "Pick a route." }, values };

  const user = await currentUser();
  const { route: slug, month, bike, name, ...body } = input;
  sendTripReport({
    routeSlug: slug,
    month,
    bike,
    body,
    name: user ? user.shown_as : name ? shortName(name) : null,
    userId: user?.id ?? null,
  });
  revalidatePath(`/routes/${slug}`);
  return { ok: true, errors: {}, message: `Sent. Thank you. Your report for ${route.name} will be read by the editor.` };
}

const suggestion = z.object({
  place: z.string().trim().min(2, "Name the place or route.").max(120),
  note: z.string().trim().max(400).optional(),
  name: z.string().trim().max(60).optional(),
});

export async function suggest(_previous: FormState, form: FormData): Promise<FormState> {
  const values = typed(form, ["place", "note", "name"]);
  const parsed = suggestion.safeParse({
    place: form.get("place"),
    note: form.get("note") || undefined,
    name: form.get("name") || undefined,
  });
  if (!parsed.success) {
    return { ...blank, message: "Something needs fixing.", errors: errorsOf(parsed.error), values };
  }
  suggestPlace(parsed.data.place, parsed.data.note ?? null, parsed.data.name ? shortName(parsed.data.name) : null);
  return { ok: true, errors: {}, message: `Sent. “${parsed.data.place}” is on the list to look at.` };
}
