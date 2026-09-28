import "server-only";

import { z } from "zod";

import { CHANGE_VALUES } from "@/lib/change-choices";
import { getRoute } from "@/lib/content";
import { indiaDay, shortName } from "@/lib/format";

import { currentUser } from "./auth";
import { inboxHasRoom, sendFactReport } from "./reports";
import { refreshRoute } from "./refresh";

export interface FactReportAnswer {
  ok: boolean;
  message: string;
  errors: Record<string, string>;
}

const blank: FactReportAnswer = { ok: false, message: "", errors: {} };

const factReport = z.object({
  route: z.string().regex(/^[a-z0-9-]{1,80}$/),
  fact: z.string().min(3).max(120),
  title: z.string().min(1).max(160),
  kind: z.enum(["still-true", "changed"]),
  change: z.enum(CHANGE_VALUES).optional(),
  note: z.string().trim().max(400).optional(),
  seen_on: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Pick the day you were there.")
    .refine((d) => d <= indiaDay(), "That day has not happened yet.")
    .refine((d) => d >= "2015-01-01", "That is too long ago to help."),
  name: z.string().trim().max(60).optional(),
});

/**
 * Takes one rider's word on one fact. No account is needed.
 *
 * The built route page is marked as out of date, and is made again when it is next opened.
 * The rider's own screen is left alone, so they keep their place on a long page.
 */
export async function takeFactReport(form: FormData): Promise<FactReportAnswer> {
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
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) errors[String(issue.path[0] ?? "form")] ??= issue.message;
    return { ...blank, message: "Something needs fixing.", errors };
  }
  const input = parsed.data;
  if (input.kind === "changed" && !input.note) {
    return { ...blank, message: "Something needs fixing.", errors: { note: "Say what you saw, in a few words." } };
  }
  const route = await getRoute(input.route);
  if (!route) return { ...blank, message: "That route is not on Meel." };

  if (!(await inboxHasRoom(input.route, input.fact))) {
    return {
      ...blank,
      message: "The editor has a pile of reports to read first. Try again in an hour.",
    };
  }

  const user = await currentUser();
  await sendFactReport({
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
  refreshRoute(input.route);
  return {
    ok: true,
    errors: {},
    message:
      input.kind === "changed"
        ? "Sent. The fact shows “change reported” when this page is next opened. Your words show once the editor has read them."
        : "Sent. The date on this fact changes once the editor has read your report.",
  };
}
