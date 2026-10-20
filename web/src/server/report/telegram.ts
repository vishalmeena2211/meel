import "server-only";

/* The Telegram bot that carries the report: TELEGRAM_BOT_TOKEN, and TELEGRAM_CHAT_ID (the editor's own chat). */

export function telegramReady(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
}

async function call(method: string, body: object): Promise<void> {
  const res = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Telegram ${method} ${res.status}`);
}

/** Sends HTML to the editor's chat. Long reports are split at line breaks, under Telegram's 4,096 letters. */
export async function sendToEditor(html: string): Promise<void> {
  const parts: string[] = [];
  let part = "";
  for (const line of html.split("\n")) {
    if (part.length + line.length + 1 > 3800) {
      parts.push(part);
      part = "";
    }
    part += (part ? "\n" : "") + line;
  }
  if (part) parts.push(part);
  for (const text of parts) {
    await call("sendMessage", { chat_id: process.env.TELEGRAM_CHAT_ID, text, parse_mode: "HTML", disable_web_page_preview: true });
  }
}

/** Points the bot's messages at /api/telegram, so a reply of "now" gets a fresh report. Safe to call every day. */
export async function registerWebhook(siteUrl: string): Promise<void> {
  await call("setWebhook", { url: `${siteUrl}/api/telegram`, allowed_updates: ["message"] });
}
