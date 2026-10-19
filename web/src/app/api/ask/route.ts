import { cookies } from "next/headers";
import { z } from "zod";

import type { AskEvent } from "@/lib/ask/types";
import { ASK_MAX_QUESTION } from "@/lib/ask/types";
import { runAsk } from "@/server/ask/answer";
import { currentUser } from "@/server/auth";

/*
  POST /api/ask. Answers one question as a stream of JSON lines (see AskEvent in lib/ask/types.ts):
  a few "step" lines while it looks, "text" lines as each checked sentence is written, then "done" with the whole
  answer, or "error" or "limit".

  Taken only from a page of this site. Switched off entirely with ASK_MEEL_OFF=1.
*/

export const maxDuration = 30;

const Body = z.object({
  question: z.string().trim().min(2).max(ASK_MAX_QUESTION),
  route: z.string().regex(/^[a-z0-9-]{1,80}$/).optional(),
  fact: z.string().max(200).optional(),
  previous: z
    .object({ question: z.string().max(400), answer: z.string().max(1200), route: z.string().regex(/^[a-z0-9-]{1,80}$/).nullable() })
    .optional(),
});

function fromThisSite(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

const PHONE_COOKIE = "meel_ask";

export async function POST(request: Request) {
  const noStore = { "Cache-Control": "no-store" };
  if (process.env.ASK_MEEL_OFF === "1") {
    return Response.json({ message: "Ask Meel is switched off for now." }, { status: 503, headers: noStore });
  }
  if (!fromThisSite(request)) return Response.json({ message: "Ask from the site." }, { status: 403, headers: noStore });

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await request.json());
  } catch {
    return Response.json({ message: "Type a question of 2 to 300 letters." }, { status: 400, headers: noStore });
  }

  // Who is asking, only to count the day's questions: an account, or a random number kept on this phone.
  const user = await currentUser();
  const jar = await cookies();
  let phone = jar.get(PHONE_COOKIE)?.value;
  if (!phone || !/^[a-f0-9]{32}$/.test(phone)) {
    phone = crypto.randomUUID().replace(/-/g, "");
    jar.set(PHONE_COOKIE, phone, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 400 * 86400, path: "/" });
  }
  const who = user ? `user:${user.id}` : `phone:${phone}`;

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (e: AskEvent) => controller.enqueue(encoder.encode(`${JSON.stringify(e)}\n`));
      try {
        await runAsk(body, { who, loggedIn: Boolean(user), signal: request.signal }, emit);
      } catch (error) {
        console.error("ask: failed", error);
        emit({ t: "error", message: "Ask Meel couldn’t answer just now. This didn’t count towards your questions today.", counted: false });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { ...noStore, "Content-Type": "application/x-ndjson; charset=utf-8", "X-Accel-Buffering": "no" } });
}
