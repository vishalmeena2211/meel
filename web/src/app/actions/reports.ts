"use server";

import { z } from "zod";

import type { FormState } from "@/components/form";
import { getRoute } from "@/lib/content";
import { indiaMonth, shortName } from "@/lib/format";
import { currentUser } from "@/server/auth";
import { sendTripReport, suggestPlace } from "@/server/reports";
import { trackOnServer } from "@/server/analytics";
import { refreshRoute } from "@/server/refresh";

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

const money = z
  .string()
  .trim()
  .max(12)
  .optional()
  .refine((v) => !v || /^\d{1,7}$/.test(v.replace(/[,₹\s]/g, "")), "Type the amount in rupees, in figures only.");

const tripReport = z.object({
  route: z.string().regex(/^[a-z0-9-]{1,80}$/, "Pick a route."),
  month: z.string().regex(/^\d{4}-\d{2}$/, "Pick the month you rode."),
  bike: z.string().trim().min(2, "Say which bike you rode.").max(80),
  name: z.string().trim().max(60).optional(),
  fuel: z.string().trim().max(800).optional(),
  gear: z.string().trim().max(800).optional(),
  problems: z.string().trim().max(800).optional(),
  cost_total: money,
  cost_fuel: money,
  cost_stays: money,
  cost_food: money,
  cost_permits: money,
  cost_repairs: money,
  nights: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || (/^\d{1,2}$/.test(v) && Number(v) <= 60), "Type the number of nights, in figures."),
  video: z
    .string()
    .trim()
    .max(200)
    .optional()
    .refine((v) => !v || /^https:\/\/(www\.)?(youtube\.com|youtu\.be)\//.test(v), "Paste a link from YouTube."),
});

const FIELDS = [
  "route",
  "month",
  "bike",
  "name",
  "fuel",
  "gear",
  "problems",
  "cost_total",
  "cost_fuel",
  "cost_stays",
  "cost_food",
  "cost_permits",
  "cost_repairs",
  "nights",
  "video",
] as const;

/** "3 hours 30 min", "3:30", "3.5" and "3h" all mean the same. Null when the words cannot be read as hours. */
function readHours(words: string): number | null {
  const w = words.trim().toLowerCase();
  if (!w) return null;
  const clock = /^(\d{1,2})[:.](\d{2})$/.exec(w);
  if (clock && Number(clock[2]) < 60 && w.includes(":")) return Number(clock[1]) + Number(clock[2]) / 60;
  const plain = /^(\d{1,2}(?:\.\d{1,2})?)$/.exec(w);
  if (plain) return Number(plain[1]);
  const said = /^(\d{1,2}(?:\.\d)?)\s*(?:h|hr|hrs|hour|hours)\s*(?:(\d{1,2})\s*(?:m|min|mins|minute|minutes)?)?$/.exec(w);
  if (said) return Number(said[1]) + (said[2] ? Number(said[2]) / 60 : 0);
  const minutes = /^(\d{2,3})\s*(?:m|min|mins|minute|minutes)$/.exec(w);
  if (minutes) return Number(minutes[1]) / 60;
  return null;
}

export async function reportTrip(_previous: FormState, form: FormData): Promise<FormState> {
  const values = typed(form, FIELDS);
  for (const [key, value] of form.entries()) {
    if (key.startsWith("leg:") && typeof value === "string") values[key] = value;
  }
  const given = Object.fromEntries(FIELDS.map((f) => [f, form.get(f) || undefined]));
  const parsed = tripReport.safeParse(given);
  if (!parsed.success) {
    return { ...blank, message: "Something needs fixing.", errors: errorsOf(parsed.error), values };
  }
  const input = parsed.data;
  if (input.month > indiaMonth()) {
    return { ...blank, message: "Something needs fixing.", errors: { month: "That month has not happened yet." }, values };
  }
  const route = await getRoute(input.route);
  if (!route) return { ...blank, message: "Something needs fixing.", errors: { route: "Pick a route." }, values };

  // Riding hours are asked leg by leg, along the route's own stretches.
  const legs: Array<{ from: string; to: string; hours: number }> = [];
  const errors: Record<string, string> = {};
  route.stretches.forEach((s, i) => {
    const words = String(form.get(`leg:${i}`) ?? "").trim();
    if (!words) return;
    const hours = readHours(words);
    if (hours === null || hours <= 0 || hours > 24) {
      errors[`leg:${i}`] = `${s.from} to ${s.to}: type the hours, such as “3 hours 30 min”.`;
      return;
    }
    legs.push({ from: s.from, to: s.to, hours: Math.round(hours * 100) / 100 });
  });
  if (Object.keys(errors).length > 0) return { ...blank, message: "Something needs fixing.", errors, values };

  const rupees = (v: string | undefined) => (v ? Number(v.replace(/[,₹\s]/g, "")) : undefined);
  const user = await currentUser();
  const { route: slug, month, bike, name, nights, ...rest } = input;
  const body: Record<string, unknown> = {
    legs: legs.length > 0 ? legs : undefined,
    fuel: rest.fuel,
    gear: rest.gear,
    problems: rest.problems,
    cost_total: rupees(rest.cost_total),
    cost_fuel: rupees(rest.cost_fuel),
    cost_stays: rupees(rest.cost_stays),
    cost_food: rupees(rest.cost_food),
    cost_permits: rupees(rest.cost_permits),
    cost_repairs: rupees(rest.cost_repairs),
    nights: nights ? Number(nights) : undefined,
    video: rest.video,
  };
  await sendTripReport({
    routeSlug: slug,
    month,
    bike,
    body: Object.fromEntries(Object.entries(body).filter(([, v]) => v !== undefined && v !== "")),
    name: user ? user.shown_as : name ? shortName(name) : null,
    userId: user?.id ?? null,
  });
  refreshRoute(slug);
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
  await suggestPlace(parsed.data.place, parsed.data.note ?? null, parsed.data.name ? shortName(parsed.data.name) : null);
  await trackOnServer("Place suggested");
  return { ok: true, errors: {}, message: `Sent. “${parsed.data.place}” is on the list to look at.` };
}
