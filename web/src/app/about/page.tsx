import type { Metadata } from "next";
import Link from "next/link";

import { PageTitle } from "@/components/form";
import { IconCheck, IconClock } from "@/components/icons";
import { Callout, KmStone, StateBadge } from "@/components/ui";
import { getFactKinds, getIndex } from "@/lib/content";
import { ANALYTICS_ON, RECORD_PERCENT } from "@/lib/analytics-config";

export const metadata: Metadata = {
  title: "About Meel",
  alternates: { canonical: "/about" },
  description: "What Meel is, who keeps it, and how far to trust what it says.",
};

export default async function AboutPage() {
  const [index, kinds] = await Promise.all([getIndex(), getFactKinds()]);
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="flex items-center gap-3">
        <KmStone cap="MEEL" value={String(index.routes.length)} unit="ROUTES" />
        <PageTitle
          title="Every fact has a date"
          lede="Kept by riders, for riders. At rideplanner.in."
          phone={{ title: "About Meel", sub: "rideplanner.in", back: "/" }}
        />
      </div>

      <section className="flex flex-col gap-2 text-[0.9375rem]">
        <p>
          Riders ask the same questions every season. Is the pass open? Is there fuel at Tandi? How many nights before
          Khardung La? The answers live in chat groups, and are lost by the next year.
        </p>
        <p>
          Meel writes them down, with the date and the name of whoever saw it. It does not replace your group. It is the
          link someone pastes into the group when the question comes up.
        </p>
        <p>
          <i>Meel</i> (मील) is Hindi for mile, as in the kilometre stones beside every Indian road.
        </p>
      </section>

      <section id="trust" className="flex scroll-mt-24 flex-col gap-3">
        <h2 className="display text-2xl">How far to trust it</h2>
        <ul className="flex flex-col gap-2 text-[0.9375rem]">
          <li className="flex items-start gap-2">
            <IconCheck className="mt-1 size-4 shrink-0 text-fresh-fg" />
            Every fact shows where it came from, and when it was last confirmed.
          </li>
          <li className="flex items-start gap-2">
            <IconClock className="mt-1 size-4 shrink-0 text-ageing-fg" />
            Most facts are marked “not yet checked”. They were gathered at a desk, from official pages, news reports and
            the open map, and they await a rider.
          </li>
          <li className="flex items-start gap-2">
            <IconClock className="mt-1 size-4 shrink-0 text-ageing-fg" />
            Meel never says a road is open. It links to the office that decides, because conditions change by the hour.
          </li>
          <li className="flex items-start gap-2">
            <IconClock className="mt-1 size-4 shrink-0 text-ageing-fg" />
            Fuel pumps come from the open map. A pump missing from the map is missing here, so every fuel gap is a worst
            case. A pump on the map may still be shut.
          </li>
          <li className="flex items-start gap-2">
            <IconClock className="mt-1 size-4 shrink-0 text-ageing-fg" />
            The altitude check compares the height of your beds. It is not medical advice.
          </li>
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="display text-2xl">What the labels mean</h2>
        <dl className="card flex flex-col text-sm">
          {(
            [
              ["fresh", "A rider or the editor confirmed it recently."],
              ["ageing", "Confirmed, but a while ago. Treat with care."],
              ["stale", "Confirmed too long ago to rely on. It stays on the page, because hiding it would lose the record."],
              ["unchecked", "Gathered from a source. Nobody has confirmed it on the road."],
              ["conflict", "Two riders saw different things. Both are shown."],
              ["pending", "A rider says it has changed. The editor has not yet read the report."],
            ] as const
          ).map(([state, words]) => (
            <div key={state} className="flex items-start gap-3 border-b border-line px-3 py-2.5 last:border-b-0">
              <dt className="w-36 shrink-0">
                <StateBadge state={state} />
              </dt>
              <dd>{words}</dd>
            </div>
          ))}
        </dl>
        {/* On a phone it scrolls sideways, so the keyboard can reach it too. */}
        <div className="card overflow-x-auto" tabIndex={0} role="region" aria-label="How long each kind of fact stays fresh">
          <table className="num w-full min-w-[420px] border-collapse text-sm">
            <caption className="hint px-3 pt-2.5 text-left">How long each kind of fact stays fresh, in days</caption>
            <thead>
              <tr className="text-left">
                <th className="label px-3 py-2">Kind of fact</th>
                <th className="label px-3 py-2 text-right">Ageing after</th>
                <th className="label px-3 py-2 text-right">Stale after</th>
              </tr>
            </thead>
            <tbody>
              {kinds.map((k) => (
                <tr key={k.id} className="border-t border-line">
                  <td className="px-3 py-2">{k.name}</td>
                  <td className="px-3 py-2 text-right">{k.ageing_after_days}</td>
                  <td className="px-3 py-2 text-right">{k.stale_after_days}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="hint">These limits are a first proposal. Riders who know the roads should tune them.</p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="display text-2xl">What needs an account, and what does not</h2>
        <p className="text-[0.9375rem]">
          Reading any route, the fuel check, the altitude check, the packing list, confirming a fact and sending a trip
          report need no account. Asking to join a trip, or posting one, does: the leader needs to know who is asking.
        </p>
      </section>

      <Callout title="Kept by one person, as a hobby">
        No advertising. No paid listings. If that ever changes, every paid link will be marked as such. Visits are counted with Vercel’s Web Analytics, which uses no cookies and keeps nothing that names you.
        {ANALYTICS_ON
          ? ` Mixpanel counts which pages are read and which tools are used, such as the fuel check or the route file.${
              RECORD_PERCENT > 0
                ? " It also records how the pages are used, as a replay of the page, so that confusing parts can be fixed: what you type is hidden, riders’ names and chat links are left out, and pages about your account, logging in and posting a trip are never recorded."
                : ""
            } It keeps a random number in your browser to tell visits apart, and never your name, your email or anything you type. A browser set to “Do Not Track” is not counted.`
          : null}
      </Callout>

      <nav className="flex flex-wrap gap-x-4 gap-y-1">
        <Link className="link" href="/credits">
          Credits and sources
        </Link>
        <Link className="link" href="/rules">
          Rules for riding together
        </Link>
      </nav>
    </div>
  );
}
