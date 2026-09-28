import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { tripChecksAction } from "@/app/actions/trips";
import { PageTitle } from "@/components/form";
import { PostTripForm } from "@/components/trips/forms";
import { getAllRoutes } from "@/lib/content";
import { currentUser } from "@/server/auth";

export const metadata: Metadata = { title: "Post a trip" };

export default async function NewTripPage(props: PageProps<"/trips/new">) {
  const query = await props.searchParams;
  const start = typeof query.route === "string" ? query.route : "";
  const user = await currentUser();
  if (!user) redirect(`/signup?next=${encodeURIComponent(`/trips/new${start ? `?route=${start}` : ""}`)}`);

  const routes = (await getAllRoutes()).map((r) => ({
    slug: r.slug,
    name: r.name,
    region_name: r.region_name,
    halts: [...new Set(r.waypoints.filter((w) => w.kind === "place").map((w) => w.name))],
  }));

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
      <div className="hidden md:block">
        <PageTitle
          title="Post a trip"
          lede="A short form. Before it is published, the plan is checked against what the route page knows."
        />
      </div>
      <PostTripForm
        routes={routes}
        startRoute={routes.some((r) => r.slug === start) ? start : ""}
        checksFor={tripChecksAction}
      />
    </div>
  );
}
