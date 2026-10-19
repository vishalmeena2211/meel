import { z } from "zod";

import { currentUser } from "@/server/auth";
import { markShared, markUseful, reportAnswer } from "@/server/ask/store";

/* POST /api/ask/answer: Useful, Share, or This answer is wrong, on one answer. Taken only from a page of this site. */

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("useful"), id: z.string().regex(/^[a-f0-9]{6,16}$/), useful: z.boolean() }),
  z.object({ action: z.literal("share"), id: z.string().regex(/^[a-f0-9]{6,16}$/) }),
  z.object({
    action: z.literal("report"),
    id: z.string().regex(/^[a-f0-9]{6,16}$/),
    reason: z.enum(["out-of-date", "not-in-sources", "wrong-question", "other"]),
    note: z.string().trim().max(600).optional(),
  }),
]);

export async function POST(request: Request) {
  const noStore = { "Cache-Control": "no-store" };
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  let same = false;
  try {
    same = Boolean(origin) && new URL(origin!).host === host;
  } catch {
    same = false;
  }
  if (!same) return Response.json({ ok: false }, { status: 403, headers: noStore });

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await request.json());
  } catch {
    return Response.json({ ok: false }, { status: 400, headers: noStore });
  }
  if (body.action === "useful") {
    await markUseful(body.id, body.useful);
    return Response.json({ ok: true }, { headers: noStore });
  }
  if (body.action === "share") {
    const ok = await markShared(body.id);
    return Response.json({ ok, path: `/ask/a/${body.id}` }, { status: ok ? 200 : 404, headers: noStore });
  }
  const user = await currentUser();
  const ok = await reportAnswer(body.id, body.reason, body.note || null, user?.id ?? null);
  return Response.json({ ok }, { status: ok ? 200 : 429, headers: noStore });
}
