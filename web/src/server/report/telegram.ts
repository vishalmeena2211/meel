import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";

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

/*
  Telegram sends this secret back on every message (X-Telegram-Bot-Api-Secret-Token), so /api/telegram can tell
  a real message from a forged one. It comes from the bot token, so there is no extra setting; a new token means
  a new secret, which the next 9:00 report registers.
*/
function webhookSecret(): string {
  return createHash("sha256").update(`meel-webhook:${process.env.TELEGRAM_BOT_TOKEN}`).digest("hex").slice(0, 48);
}

/** True when a message to /api/telegram carries the secret Telegram was given. */
export function fromTelegram(request: Request): boolean {
  const got = Buffer.from(request.headers.get("x-telegram-bot-api-secret-token") ?? "");
  const want = Buffer.from(webhookSecret());
  return got.length === want.length && timingSafeEqual(got, want);
}

/** Points the bot's messages at /api/telegram, so a reply of "now" gets a fresh report. Safe to call every day. */
export async function registerWebhook(siteUrl: string): Promise<void> {
  await call("setWebhook", { url: `${siteUrl}/api/telegram`, allowed_updates: ["message"], secret_token: webhookSecret() });
}
