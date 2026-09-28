import "server-only";

import { revalidatePath } from "next/cache";

import { SECTION_ORDER, TOOL_IDS } from "@/lib/sections";

/**
 * A fact, a trip or a report on one route has changed.
 * Every screen of that route is made again the next time it is opened.
 */
export function refreshRoute(slug: string): void {
  const top = `/routes/${slug}`;
  revalidatePath(top);
  for (const part of [...SECTION_ORDER, ...TOOL_IDS]) revalidatePath(`${top}/${part}`);
  revalidatePath("/routes/[slug]/[section]/[fact]", "page");
  revalidatePath("/");
}
