import { NextResponse } from "next/server";

import { takeFactReport } from "@/server/fact-report";

/** A report is only taken from a page of this site. */
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

export async function POST(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  if (!fromThisSite(request)) {
    return NextResponse.json({ ok: false, message: "Send this from the route page.", errors: {} }, { status: 403, headers });
  }
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ ok: false, message: "That did not arrive whole. Try again.", errors: {} }, { status: 400, headers });
  }
  const answer = await takeFactReport(form);
  return NextResponse.json(answer, { status: answer.ok ? 200 : 422, headers });
}
