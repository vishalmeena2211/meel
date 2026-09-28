import type { Metadata } from "next";

import { TopHead, WideTitle } from "@/components/shell";
import { RoutePicker } from "@/components/tools/route-picker";
import { getIndex } from "@/lib/content";

export const metadata: Metadata = {
  title: "Tools",
  description: "Fuel check, altitude check and packing list for any of fifty Indian motorcycle routes.",
};

export default async function ToolsPage() {
  const index = await getIndex();
  const routes = index.routes.map((r) => ({
    slug: r.slug,
    name: r.name,
    region_name: r.region_name,
    high: (r.highest_m ?? 0) >= 2500,
  }));
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
      <TopHead title="Tools" sub="Work with no network" />
      <WideTitle
        title="Tools"
        lede="Three tools that work on any route. They run on your phone, need no account, and send nothing anywhere."
      />
      <p className="hint md:hidden">They run on your phone, need no account, and send nothing anywhere.</p>
      <RoutePicker routes={routes} />
    </div>
  );
}
