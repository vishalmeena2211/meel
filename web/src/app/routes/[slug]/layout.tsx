import Link from "next/link";
import { notFound } from "next/navigation";

import { IconAlert, IconExternal, IconFlag, IconFuel, IconList, IconMap, IconPhone, IconSend } from "@/components/icons";
import { OfflineBar, SaveRoute } from "@/components/offline/save-route";
import { RouteLine } from "@/components/route/drawings";
import { FactSheet } from "@/components/route/fact-sheet";
import { HeadSlot, RouteNav, type NavItem } from "@/components/route/route-nav";
import { SectionIcon } from "@/components/route/route-parts";
import { Badge, SectionHeading } from "@/components/ui";
import { daysBetween, hostOf, plural, sayAge, sayDate } from "@/lib/format";
import { REPORTS_NEEDED } from "@/lib/sections";
import { alertsFor, officeDates, readableHost } from "@/server/live";
import { savedPages } from "@/server/route-pages";
import { getRouteView } from "@/server/route-view";

/**
 * Every screen of one route sits inside this.
 * On a phone it adds nothing to see: the sheet for facts, and the bar that says there is no network.
 * On a wider screen it puts the list of sections on the left, and what riders check again and again on the right.
 */
export default async function RouteLayout(props: LayoutProps<"/routes/[slug]">) {
  const { slug } = await props.params;
  const view = await getRouteView(slug);
  if (!view) notFound();
  const { route, sections, views } = view;
  const top = `/routes/${slug}`;
  // The side panel says when each office was last seen speaking, as drawn. What it announces is on "Is it open?".
  // Where Meel reads an office's own date every hour, that date is said instead.
  const [alerts, reads] = await Promise.all([route.level === "unwritten" ? null : alertsFor(route), officeDates(route)]);
  const now = new Date();
  const seen = views.open.map((v, i) => {
    const a = route.authorities[i];
    const host = a ? readableHost(a) : null;
    const read = host ? reads[host] : undefined;
    if (read) {
      return { line: read.said, badge: `Dated ${sayAge(Math.max(0, daysBetween(read.dated, now)))}`, url: read.link?.url ?? null };
    }
    return {
      line: a?.source.source_date ? `Last notice seen ${sayDate(a.source.source_date)}` : "No date found",
      badge: v.aside,
      url: null,
    };
  });
  const inForce = alerts?.alerts.length ?? 0;

  const nav: NavItem[] = sections
    .filter((s) => s.id !== "bikes" && s.id !== "costs")
    .map((s) => ({ href: s.href, name: s.name, icon: <SectionIcon id={s.id} />, warn: s.warn[0] ?? null }));
  const fromReports: NavItem[] =
    view.used.length >= REPORTS_NEEDED
      ? sections
          .filter((s) => s.id === "bikes" || s.id === "costs")
          .map((s) => ({ href: s.href, name: s.name, icon: <SectionIcon id={s.id} /> }))
      : [];
  const more: NavItem[] = [
    { href: `${top}/trips`, name: "Trips on this route", icon: <IconFlag /> },
    { href: `${top}/sources`, name: "Sources, and what is missing", icon: <IconList /> },
  ];
  const hasFuelCheck = route.fuel.longest_gaps.length > 0;
  const saving = savedPages(view);

  return (
    <div data-desk className="lg:grid lg:min-h-[calc(100dvh-3.5rem)] lg:grid-cols-[236px_minmax(0,1fr)_348px] lg:bg-surface">
      <FactSheet
        routeSlug={slug}
        routeName={route.name}
        chatNumber={process.env.NEXT_PUBLIC_MEEL_CHAT_NUMBER?.replace(/\D/g, "") || null}
      />
      <HeadSlot>
        <SaveRoute
          as="button"
          routeSlug={slug}
          routeName={route.name}
          facts={route.counts.facts}
          tools={saving.tools}
          pages={saving.pages}
          extras={saving.extras}
        />
        <Link className="btn btn-primary" href={`/report?route=${slug}`}>
          Send a trip report
        </Link>
      </HeadSlot>

      <RouteNav routeName={route.name} top={top} sections={nav} fromReports={fromReports} more={more} />

      <div className="flex min-w-0 flex-col gap-4 lg:px-7 lg:py-5">
        <OfflineBar routeSlug={slug} />
        {props.children}
      </div>

      {/* The panel scrolls when it is taller than the screen; nothing in it is squeezed to fit. */}
      <aside className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] flex-col gap-3.5 overflow-y-auto border-l border-line bg-surface-2 p-5 lg:flex [&>*]:shrink-0">
        {views.open.length > 0 ? (
          <>
            <SectionHeading title="Is it open?" aside="We link, we do not guess" />
            {inForce > 0 ? (
              <Link
                href={`${top}/open`}
                className="flex min-h-12 items-center gap-2 rounded-lg border border-stale-fg/30 bg-stale-bg px-3 py-2 text-stale-fg hover:opacity-90"
              >
                <IconAlert className="size-4 shrink-0" />
                <b className="min-w-0 flex-1 text-sm leading-5">
                  {plural(inForce, "official alert")} in force on this road
                </b>
              </Link>
            ) : null}
            <ul className="card flex flex-col">
              {views.open.slice(0, 4).map((v, i) => (
                <li key={v.slug} className="border-b border-line last:border-b-0">
                  <a
                    href={seen[i]?.url ?? v.rowLink?.url ?? v.href}
                    data-track={seen[i]?.url || v.rowLink ? "Office page opened" : undefined}
                    data-track-props={JSON.stringify({ host: hostOf(seen[i]?.url ?? v.rowLink?.url ?? "") })}
                    target={seen[i]?.url || v.rowLink ? "_blank" : undefined}
                    rel={seen[i]?.url || v.rowLink ? "noreferrer noopener" : undefined}
                    className="flex min-h-12 items-center gap-2 px-3 py-2 hover:bg-surface-2"
                  >
                    <span className="min-w-0 flex-1">
                      <b className="block text-sm leading-5">{v.title}</b>
                      <span className="hint num block">{seen[i]?.line ?? "No date found"}</span>
                    </span>
                    {seen[i]?.badge ? <Badge>{seen[i]?.badge?.replace(/^Dated /, "")}</Badge> : null}
                    <IconExternal className="size-4 shrink-0 text-ink-2" />
                  </a>
                </li>
              ))}
            </ul>
            {views.open.length > 4 ? (
              <Link className="link text-sm" href={`${top}/open`}>
                All {plural(views.open.length, "office")}, and the years on record
              </Link>
            ) : null}
          </>
        ) : null}
        {route.line.length > 0 ? <RouteLine line={route.line} waypoints={route.waypoints} /> : null}
        {hasFuelCheck ? (
          <Link className="btn btn-primary btn-block" href={`${top}/fuel-check`}>
            <IconFuel />
            Check fuel for your bike
          </Link>
        ) : null}
        {route.line.length > 0 ? (
          <>
            <h2 className="label mt-1">Before you leave</h2>
            <ul className="card flex flex-col">
              {[
                { href: `${top}/map-apps`, icon: <IconMap />, name: "Route file for your map app" },
                { href: `${top}/emergency`, icon: <IconPhone />, name: "Emergency card" },
                { href: `${top}/tell-home`, icon: <IconSend />, name: "Tell someone at home" },
              ].map((r) => (
                <li key={r.href} className="border-b border-line last:border-b-0">
                  <Link href={r.href} className="flex min-h-11 items-center gap-2.5 px-3 py-2 text-sm font-semibold hover:bg-surface-2">
                    {r.icon}
                    {r.name}
                  </Link>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </aside>
    </div>
  );
}
