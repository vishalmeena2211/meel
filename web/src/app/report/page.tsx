import type { Metadata } from "next";

import { PageTitle } from "@/components/form";
import { SuggestForm, TripReportForm } from "@/components/report/trip-report-form";
import { getAllRoutes } from "@/lib/content";
import { currentUser } from "@/server/auth";

export const metadata: Metadata = {
  title: "Send a trip report",
  alternates: { canonical: "/report" },
  description: "Rode one of these routes? Three fields are enough. Your report keeps the facts fresh for the next rider.",
};

export default async function ReportPage(props: PageProps<"/report">) {
  const query = await props.searchParams;
  const routes = (await getAllRoutes()).map((r) => ({
    slug: r.slug,
    name: r.name,
    region_name: r.region_name,
    legs: r.stretches.map((s) => ({ from: s.from, to: s.to, km: s.distance_km })),
  }));
  const start = typeof query.route === "string" && routes.some((r) => r.slug === query.route) ? query.route : "";
  const suggested = typeof query.suggest === "string" ? query.suggest.slice(0, 120) : null;
  const user = await currentUser();

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
      {suggested !== null ? (
        <section className="flex flex-col gap-3">
          <PageTitle
            title="Suggest a place"
            lede={`Meel has ${routes.length} routes so far. Tell us about one that is missing.`}
            phone={{ sub: "Meel", back: "/" }}
          />
          <p className="hint md:hidden">Meel has {routes.length} routes so far. Tell us about one that is missing.</p>
          <SuggestForm place={suggested} />
        </section>
      ) : (
        <>
          <div className="hidden md:block">
            <PageTitle
              title="Send a trip report"
              lede="One short form after a trip. It feeds riding hours, fuel, mechanics, gear, costs and videos for that route. No account needed."
            />
          </div>
          <TripReportForm
            routes={routes}
            startRoute={start}
            loggedInAs={user?.shown_as ?? null}
            chatNumber={process.env.NEXT_PUBLIC_MEEL_CHAT_NUMBER?.replace(/\D/g, "") || null}
            openAt={query.add === "video" ? "video" : null}
          />
        </>
      )}
    </div>
  );
}
