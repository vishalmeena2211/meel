import type { Metadata } from "next";

import { PageTitle } from "@/components/form";
import { SuggestForm, TripReportForm } from "@/components/report/trip-report-form";
import { getIndex } from "@/lib/content";
import { currentUser } from "@/server/auth";

export const metadata: Metadata = {
  title: "Send a trip report",
  description: "Rode one of these routes? Three fields are enough. Your report keeps the facts fresh for the next rider.",
};

export default async function ReportPage(props: PageProps<"/report">) {
  const query = await props.searchParams;
  const index = await getIndex();
  const start = typeof query.route === "string" && index.routes.some((r) => r.slug === query.route) ? query.route : "";
  const suggested = typeof query.suggest === "string" ? query.suggest.slice(0, 120) : null;
  const user = await currentUser();

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
      {suggested !== null ? (
        <section className="flex flex-col gap-3">
          <PageTitle title="Suggest a place" lede="Meel has fifty routes so far. Tell us about one that is missing." />
          <SuggestForm place={suggested} />
        </section>
      ) : (
        <>
          <PageTitle
            title="Send a trip report"
            lede="One short form after a trip. It feeds riding hours, fuel, mechanics, gear, costs and videos for that route. No account needed."
          />
          <TripReportForm
            routes={index.routes.map((r) => ({ slug: r.slug, name: r.name, region_name: r.region_name }))}
            startRoute={start}
            loggedInAs={user?.shown_as ?? null}
          />
        </>
      )}
    </div>
  );
}
