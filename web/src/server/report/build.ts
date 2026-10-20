import "server-only";

import { db } from "../db";
import { indiaDay } from "../ask/store";

import { mixpanelReady, riders, type Rider } from "./riders";
import { searchWeek, type SearchWeek } from "./search";

/*
  The visitor report sent to the editor on Telegram (plan: meel-daily-report-plan.md).
  Every day: yesterday's real riders, the last 7 days, Google search, Ask Meel. Mondays add the week in detail.
  A source that cannot be read becomes one line saying so; the rest still goes out.
*/

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const n = (v: number) => v.toLocaleString("en-IN");
const dayName = (d: string) => new Date(`${d}T12:00:00+05:30`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
const shift = (d: string, by: number) => {
  const x = new Date(`${d}T12:00:00+05:30`);
  x.setUTCDate(x.getUTCDate() + by);
  return x.toISOString().slice(0, 10);
};
const stay = (s: number) => (s < 60 ? `${s} s` : `${Math.round(s / 60)} min`);

function tally<T extends string>(items: T[]): Array<[T, number]> {
  const m = new Map<T, number>();
  for (const i of items) m.set(i, (m.get(i) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

/** Rupees Ask Meel spent on Gemini on one India day, from the tokens saved with each answer. ₹88 to the dollar. */
async function askSpend(day: string): Promise<{ answers: number; rupees: number }> {
  const since = new Date(`${day}T00:00:00+05:30`);
  const until = new Date(`${shift(day, 1)}T00:00:00+05:30`);
  const r = await db().askAnswer.aggregate({
    where: { createdAt: { gte: since, lt: until } },
    _count: { _all: true },
    _sum: { promptTokens: true, outputTokens: true },
  });
  const rupees = (((r._sum.promptTokens ?? 0) * 0.1 + (r._sum.outputTokens ?? 0) * 0.4) / 1e6) * 88;
  return { answers: r._count._all, rupees };
}

export async function buildReport({ weekly = false, now = new Date() }: { weekly?: boolean; now?: Date } = {}): Promise<string> {
  const today = indiaDay(now);
  const yesterday = shift(today, -1);
  const weekFrom = shift(today, -7);
  const lines: string[] = [`<b>Meel · ${esc(dayName(today))}</b>${weekly ? " · the week" : ""}`];

  // Riders.
  let week: Rider[] | null = null;
  if (!mixpanelReady()) {
    lines.push("", "Riders: Mixpanel is not connected yet (MIXPANEL_SA_USER and MIXPANEL_SA_SECRET in Vercel).");
  } else {
    try {
      week = await riders(weekFrom, yesterday);
    } catch (error) {
      lines.push("", `Riders: could not read Mixpanel (${esc(String((error as Error).message))}).`);
    }
  }
  if (week) {
    const y = week.filter((r) => r.day === yesterday);
    const ySources = tally(y.map((r) => r.source)).map(([s, c]) => `${esc(s)} ${c}`).join(" · ");
    lines.push("", `<b>Yesterday:</b> ${y.length} rider${y.length === 1 ? "" : "s"}${y.length ? ` · ${ySources}` : ""}`);
    for (const r of y.slice(0, 12)) {
      const extra = [r.pages > 1 ? `${r.pages} pages` : null, r.seconds >= 5 ? stay(r.seconds) : null, ...r.tools, r.asked ? `asked Meel ${r.asked}×` : null].filter(Boolean).join(", ");
      lines.push(` • ${esc(r.city ?? "India")}, ${esc(r.device)} (${esc(r.source)}) → ${esc(r.first)}${extra ? ` · ${esc(extra)}` : ""}`);
    }
    if (y.length > 12) lines.push(` • and ${y.length - 12} more`);
    const wSources = tally(week.map((r) => r.source)).slice(0, 4).map(([s, c]) => `${esc(s)} ${c}`).join(" · ");
    lines.push("", `<b>Last 7 days:</b> ${week.length} riders${week.length ? ` · ${wSources}` : ""}`);
    if (weekly) {
      const perDay = Array.from({ length: 7 }, (_, i) => shift(weekFrom, i)).map((d) => `${dayName(d).split(" ")[0]} ${week!.filter((r) => r.day === d).length}`);
      lines.push(` ${perDay.join(" · ")}`);
      const pages = tally(week.map((r) => r.first)).slice(0, 5);
      if (pages.length) lines.push("", "<b>What they read first</b>", ...pages.map(([p, c]) => ` • ${esc(p)} (${c})`));
      const tools = tally(week.flatMap((r) => r.tools));
      if (tools.length) lines.push("", `<b>Tools used:</b> ${tools.map(([t, c]) => `${esc(t)} ${c}`).join(" · ")}`);
    }
  }

  // Google search.
  let search: SearchWeek | null = null;
  try {
    search = await searchWeek(today);
  } catch (error) {
    lines.push("", `Google search: could not read Search Console (${esc(String((error as Error).message))}). Add meel-ask@meel-rideplanner.iam.gserviceaccount.com as a Restricted user.`);
  }
  if (search) {
    lines.push("", `<b>Google search</b> (${esc(dayName(search.from))} to ${esc(dayName(search.to))}): ${n(search.clicks)} clicks · shown ${n(search.shown)} times · position ${search.position.toFixed(1)}`);
    if (weekly && search.queries.length) {
      lines.push(...search.queries.map((q) => ` • ${esc(q.q)}: shown ${n(q.shown)}, ${n(q.clicks)} click${q.clicks === 1 ? "" : "s"}, position ${q.position.toFixed(1)}`));
    }
  }

  // Ask Meel.
  try {
    const spend = await askSpend(yesterday);
    const asked = week ? week.filter((r) => r.day === yesterday).reduce((t, r) => t + r.asked, 0) : null;
    lines.push("", `<b>Ask Meel:</b> ${asked === null ? "" : `${asked} question${asked === 1 ? "" : "s"} from riders · `}${spend.answers} answers in all · ₹${spend.rupees.toFixed(2)} spent`);
  } catch {
    lines.push("", "Ask Meel: could not read the database.");
  }

  lines.push("", `<i>Reply "now" for a fresh report, "week" for the week.</i>`);
  return lines.join("\n");
}

/**
 * True the first time a given send happens on a given India day, so a retried cron does not send twice and "now"
 * cannot be pressed more than ten times a day. Kept in ask_uses, under a "report:" day.
 */
export async function claimSend(what: "cron" | "now", now = new Date()): Promise<boolean> {
  const day = `report:${indiaDay(now)}`;
  const row = await db().askUse.upsert({ where: { day_who: { day, who: what } }, create: { day, who: what, count: 1 }, update: { count: { increment: 1 } } });
  return what === "cron" ? row.count === 1 : row.count <= 10;
}
