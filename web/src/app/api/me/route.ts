import { NextResponse } from "next/server";

import { currentUser } from "@/server/auth";

// The header asks this once a page has loaded, so that pages themselves can be cached.
export async function GET() {
  let me: { name: string; initials: string } | null = null;
  try {
    const user = await currentUser();
    if (user) me = { name: user.shown_as, initials: user.initials };
  } catch {
    me = null;
  }
  return NextResponse.json({ me }, { headers: { "Cache-Control": "no-store" } });
}
