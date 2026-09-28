import { NextResponse } from "next/server";

import { getRouteView } from "@/server/route-view";

// Asked for when a rider opens a fact. Always read afresh, so an opened fact is never an hour behind.
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: RouteContext<"/routes/[slug]/facts.json">) {
  const { slug } = await context.params;
  const view = await getRouteView(slug);
  if (!view) return NextResponse.json({ facts: {} }, { status: 404 });
  const facts = Object.fromEntries(view.views.all.map((v) => [`${v.section}/${v.slug}`, v]));
  return NextResponse.json(
    { route: view.route.slug, name: view.route.name, read: new Date().toISOString(), facts },
    { headers: { "Cache-Control": "no-store" } },
  );
}
