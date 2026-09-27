import { NextResponse } from "next/server";

// Filled in with the account work. Until then nobody is logged in.
export async function GET() {
  return NextResponse.json({ me: null });
}
