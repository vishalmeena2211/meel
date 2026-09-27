import { NextResponse } from "next/server";

import { currentUser, everythingAbout } from "@/server/auth";

// Everything Meel holds about the rider who asks, as one file they can keep.
export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ message: "Log in first." }, { status: 401 });
  return new NextResponse(JSON.stringify(everythingAbout(user.id), null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="meel-my-data.json"',
      "Cache-Control": "no-store",
    },
  });
}
