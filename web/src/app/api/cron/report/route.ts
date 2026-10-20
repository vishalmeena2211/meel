import { SITE_URL } from "@/lib/site";
import { indiaDay } from "@/server/ask/store";
import { buildReport, claimSend } from "@/server/report/build";
import { registerWebhook, sendToEditor, telegramReady } from "@/server/report/telegram";

/*
  GET /api/cron/report. Vercel's cron calls it every day at 9:00 IST (web/vercel.json). On Mondays it sends the week.
  It needs no secret: whoever calls it, the report only ever goes to the editor's own chat, at most once a day.
*/

export const maxDuration = 60;

export async function GET() {
  const noStore = { "Cache-Control": "no-store" };
  if (!telegramReady()) return Response.json({ sent: false, why: "Telegram is not set up" }, { headers: noStore });
  if (!(await claimSend("cron"))) return Response.json({ sent: false, why: "already sent today" }, { headers: noStore });
  const weekly = new Date(`${indiaDay()}T12:00:00+05:30`).getUTCDay() === 1;
  try {
    await sendToEditor(await buildReport({ weekly }));
    await registerWebhook(SITE_URL).catch(() => {});
    return Response.json({ sent: true, weekly }, { headers: noStore });
  } catch (error) {
    console.error("report: not sent", (error as Error).message);
    return Response.json({ sent: false, why: "send failed" }, { status: 500, headers: noStore });
  }
}
