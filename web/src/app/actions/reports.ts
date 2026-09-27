"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getRoute } from "@/lib/content";
import { shortName } from "@/lib/format";
import { currentUser } from "@/server/auth";
import { sendFactReport, sendTripReport, suggestPlace } from "@/server/reports";

export interface FormState {
  ok: boolean;
  message: string;
  errors: Record<string, string>;
}

const blank: FormState = { ok: false, message: "", errors: {} };

const day = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Pick the day you were there.")
  .refine((d) => d <= new Date().toISOString().slice(0, 10), "That day has not happened yet.")
  .refine((d) => d >= "2015-01-01", "That is too long ago to help.");

const factReport = z.object({
  route: z.string().regex(/^[a-z0-9-]{1,80}$/),
  fact: z.string().min(3).max(120),
  title: z.string().min(1).max(160),
  kind: z.enum(["still-true", "changed"]),
  change: z.enum(["closed", "moved", "wrong-detail", "rule-changed", "other"]).optional(),
  note: z.string().trim().max(400).optional(),
  seen_on: day,
  name: z.string().trim().max(60).optional(),
});

function errorsOf(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}

export async function reportFact(_previous: FormState, form: FormData): Promise<FormState> {
  const parsed = factReport.safeParse({
    route: form.get("route"),
    fact: form.get("fact"),
    title: form.get("title"),
    kind: form.get("kind"),
    change: form.get("change") || undefined,
    note: form.get("note") || undefined,
    seen_on: form.get("seen_on"),
    name: form.get("name") || undefined,
  });
  if (!parsed.success) {
    return { ...blank, message: "Something needs fixing.", errors: errorsOf(parsed.error) };
  }
  const input = parsed.data;
  if (input.kind === "changed" && !input.note) {
    return { ...blank, message: "Something needs fixing.", errors: { note: "Say what you saw, in a few words." } };
  }
  const route = await getRoute(input.route);
  if (!route) return { ...blank, message: "That route is not on Meel." };

  const user = await currentUser();
  sendFactReport({
    routeSlug: input.route,
    factId: input.fact,
    factTitle: input.title,
    kind: input.kind,
    changeKind: input.change ?? null,
    note: input.note ?? null,
    seenOn: input.seen_on,
    name: user ? user.shown_as : input.name ? shortName(input.name) : null,
    userId: user?.id ?? null,
  });
  revalidatePath(`/routes/${input.route}`);
  return {
    ok: true,
    errors: {},
    message:
      input.kind === "changed"
        ? "Sent. The fact is now marked “change reported”. Your words show once the editor has read them."
        : "Sent. The date on this fact changes once the editor has read your report.",
  };
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
    return { ...blank, message: "Something needs fixing.", errors: errorsOf(parsed.error) };
  }
  const input = parsed.data;
  if (input.month > new Date().toISOString().slice(0, 7)) {
    return { ...blank, message: "Something needs fixing.", errors: { month: "That month has not happened yet." } };
  }
  const route = await getRoute(input.route);
  if (!route) return { ...blank, message: "Something needs fixing.", errors: { route: "Pick a route." } };

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
  const parsed = suggestion.safeParse({
    place: form.get("place"),
    note: form.get("note") || undefined,
    name: form.get("name") || undefined,
  });
  if (!parsed.success) {
    return { ...blank, message: "Something needs fixing.", errors: errorsOf(parsed.error) };
  }
  suggestPlace(parsed.data.place, parsed.data.note ?? null, parsed.data.name ? shortName(parsed.data.name) : null);
  return { ok: true, errors: {}, message: `Sent. “${parsed.data.place}” is on the list to look at.` };
}
