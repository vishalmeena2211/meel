import { NextResponse } from "next/server";

import { getIndex } from "@/lib/content";
import type { SearchRoute } from "@/lib/search";

// What the header's search box suggests from. Fetched once, the first time a rider clicks into the box, so no page
// is heavier for riders who never search. Built with the site; routes change only when it is built again.
export const dynamic = "force-static";

export async function GET() {
  const index = await getIndex();
  const routes: SearchRoute[] = index.routes.map(({ slug, name, region_name, places, distance_km }) => ({
    slug,
    name,
    region_name,
    places,
    distance_km,
  }));
  return NextResponse.json({ routes });
}
