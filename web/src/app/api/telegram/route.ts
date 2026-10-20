import { buildReport, claimSend } from "@/server/report/build";
import { fromTelegram, sendToEditor, telegramReady } from "@/server/report/telegram";

/*
  POST /api/telegram: messages to @meel_report_bot. Only the editor's own chat (TELEGRAM_CHAT_ID) is answered;
  anything from any other chat is ignored without a reply. "now" sends a fresh report, "week" the week's.
  A message without the webhook secret did not come from Telegram and is ignored too.
*/

export const maxDuration = 60;

export async function POST(request: Request) {
  const ok = () => Response.json({ ok: true });
  if (!telegramReady() || !fromTelegram(request)) return ok();
  let update: { message?: { chat?: { id?: number }; text?: string } };
  try {
    update = await request.json();
  } catch {
    return ok();
  }
  const chat = update.message?.chat?.id;
  if (!chat || String(chat) !== process.env.TELEGRAM_CHAT_ID) return ok();
  const text = (update.message?.text ?? "").trim().toLowerCase().replace(/^\//, "");
  try {
    if (text === "now" || text === "week") {
      if (!(await claimSend("now"))) {
        await sendToEditor("That's ten reports today. The next one comes at 9:00 tomorrow.");
      } else {
        await sendToEditor(await buildReport({ weekly: text === "week" }));
      }
    } else {
      await sendToEditor('Meel\'s visitor report comes every day at 9:00 IST, and the week on Mondays. Reply "now" for a fresh one, or "week" for the week.');
    }
  } catch (error) {
    console.error("telegram: reply failed", (error as Error).message);
  }
  return ok();
}
