import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { km, feet, plural, stoneCap } from "@/lib/format";
import { REPORTS_NEEDED, type SectionId } from "@/lib/sections";
import type { RouteView } from "@/server/route-view";

import {
  IconAlert,
  IconBag,
  IconBed,
  IconCard,
  IconClock,
  IconFlag,
  IconFuel,
  IconList,
  IconLock,
  IconPeak,
  IconPlay,
  IconRight,
  IconShield,
  IconSignal,
  IconWrench,
} from "../icons";
import { Badge, Callout, KeyFacts, KmStone, type KeyFact } from "../ui";
import { ShowCurrentChip } from "./show-current-chip";

export function SectionIcon({ id, className }: { id: SectionId; className?: string }) {
  const size = className ?? "size-4";
  switch (id) {
    case "open":
      return <IconFlag className={size} />;
    case "fuel":
      return <IconFuel className={size} />;
    case "rules":
      return <IconShield className={size} />;
    case "altitude":
      return <IconPeak className={size} />;
    case "road":
      return <IconAlert className={size} />;
    case "network":
      return <IconSignal className={size} />;
    case "mechanics":
      return <IconWrench className={size} />;
    case "hours":
      return <IconClock className={size} />;
    case "stays":
      return <IconBed className={size} />;
    case "packing":
      return <IconBag className={size} />;
    case "videos":
      return <IconPlay className={size} />;
    case "bikes":
      return <IconList className={size} />;
    case "costs":
      return <IconCard className={size} />;
  }
}

export function levelWords(view: RouteView): string {
  const { route } = view;
  const level = route.level === "full" ? "Full page" : route.level === "unwritten" ? "Not written yet" : "Basic page";
  return route.level === "unwritten" ? level : `${level} · ${plural(route.counts.facts, "fact")}`;
}

/** The picture of the road, with the name of whoever took it directly beneath. */
export function RoutePicture({ view }: { view: RouteView }) {
  const { route } = view;
  if (!route.image) return null;
  return (
    <figure className="-mx-4 overflow-hidden md:mx-0 md:rounded-xl md:border md:border-line">
      <Image
        src={`/route-images/${route.image.file}`}
        alt={`${route.image.shows}, on the ${route.name} route`}
        width={1600}
        height={1067}
        priority
        sizes="(min-width: 1024px) 700px, 100vw"
        className="h-44 w-full object-cover md:h-64"
      />
      <figcaption className="hint border-b border-line bg-surface px-4 py-1.5 text-xs md:border-b-0">
        <b className="font-semibold text-ink">{route.image.shows}</b>
        <span className="block">
          Photo: {route.image.author} ·{" "}
          <a className="link font-medium" href={route.image.licence_url || route.image.source_page} target="_blank" rel="noreferrer noopener">
            {route.image.licence}
          </a>{" "}
          ·{" "}
          <a className="link font-medium" href={route.image.source_page} target="_blank" rel="noreferrer noopener">
            Wikimedia Commons
          </a>{" "}
          · resized
        </span>
      </figcaption>
    </figure>
  );
}

/** The route's name beside a kilometre stone, and the three things riders ask first. */
export function RouteHead({ view, as: Name = "h2" }: { view: RouteView; as?: "h1" | "h2" }) {
  const { route } = view;
  const h = route.header;
  const unwritten = route.level === "unwritten";
  const mountain = route.terrain === "mountain";
  const gap = route.fuel.longest_gaps[0];
  return (
    <div className="flex flex-col gap-3 lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center lg:gap-5">
      <div className="flex items-center gap-3">
        <span title={h.highway?.value}>
          <KmStone
            cap={unwritten ? "—" : stoneCap(h.highway?.value)}
            value={unwritten || !h.distance_km ? "?" : Math.round(h.distance_km).toLocaleString("en-IN")}
            unit="KM"
          />
        </span>
        <div className="min-w-0 flex-1">
          <Name className="display text-[1.625rem] uppercase md:text-[2rem]">{route.name}</Name>
          <p className="hint mt-1">{route.one_line ?? `${route.region_name} · ${route.places.join(", ")}`}</p>
        </div>
      </div>
      {unwritten ? null : (
        <KeyFacts
          items={(
            [
              h.usual_days ? { label: "Usual days", value: h.usual_days.value } : null,
              h.highest_point ? { label: "Highest point", value: feet(h.highest_point.altitude_m) } : null,
              h.usual_season
                ? { label: mountain ? "Usually open" : "Best months", value: shortSeason(h.usual_season.value) }
                : null,
              // The question riders ask most. It opens the fuel section, and turns red past 150 km.
              gap && route.fuel.pump_count > 0
                ? { label: "No fuel for", value: km(gap.gap_km), href: `/routes/${route.slug}/fuel`, warn: gap.gap_km >= 150 }
                : null,
            ] as Array<KeyFact | null>
          ).filter((x): x is KeyFact => x !== null)}
        />
      )}
    </div>
  );
}

const SHORT: Array<[RegExp, string]> = [
  [/January/g, "Jan"],
  [/February/g, "Feb"],
  [/March/g, "Mar"],
  [/April/g, "Apr"],
  [/June/g, "Jun"],
  [/July/g, "Jul"],
  [/August/g, "Aug"],
  [/September/g, "Sept"],
  [/October/g, "Oct"],
  [/November/g, "Nov"],
  [/December/g, "Dec"],
];

/** "June to October for the full circuit over Kunzum La" becomes "June to Oct". The full words are on the page below. */
function shortSeason(words: string): string {
  const head = /^[A-Za-z]+ to [A-Za-z]+/.exec(words)?.[0] ?? words;
  return SHORT.reduce((w, [from, to]) => w.replace(from, to), head);
}

function Pill({ words, tone }: { words: string; tone: "ageing" | "stale" }) {
  return <Badge tone={tone}>{words}</Badge>;
}

function Row({
  href,
  icon,
  title,
  sub,
  aside,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  sub: string;
  aside?: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-12 items-center gap-2.5 border-b border-line px-3 py-2.5 last:border-b-0 hover:bg-surface-2"
    >
      <span className="grid size-8 shrink-0 place-items-center rounded-md bg-surface-2 text-ink">{icon}</span>
      <span className="min-w-0 flex-1">
        <b className="block text-[0.9375rem] leading-5">{title}</b>
        <span className="hint num block">{sub}</span>
      </span>
      {aside}
      <IconRight className="size-4 shrink-0 text-ink-2" />
    </Link>
  );
}

/** The list a phone shows under the route's header. Each row opens one section. */
export function OnThisPage({ view }: { view: RouteView }) {
  const rows = view.sections.filter((s) => s.id !== "open");
  if (rows.length === 0) return null;
  return (
    <section className="flex flex-col gap-1.5">
      <h2 className="label">On this page</h2>
      <div className="card flex flex-col">
        {rows.map((s) => (
          <Row
            key={s.id}
            href={s.href}
            icon={<SectionIcon id={s.id} />}
            title={s.name}
            sub={s.sub}
            aside={s.warn.map((w) => <Pill key={w.words} words={w.words} tone={w.tone} />)}
          />
        ))}
      </div>
    </section>
  );
}

/** Two rows that stand above the list: where to check the road today, and how to keep the page for the road. */
export function FirstRows({ view, save }: { view: RouteView; save: ReactNode }) {
  const open = view.sections.find((s) => s.id === "open");
  return (
    <div className="card flex flex-col">
      {open ? (
        <Row
          href={open.href}
          icon={<IconFlag />}
          title="Is it open? Where to check today"
          sub={open.sub}
          aside={open.warn.map((w) => <Pill key={w.words} words={w.words} tone={w.tone} />)}
        />
      ) : null}
      {save}
    </div>
  );
}

/** A row of chips that moves between sections. It scrolls sideways on a phone. */
export function SectionChips({ view, on }: { view: RouteView; on: SectionId | null }) {
  return (
    <nav aria-label="Sections of this route" className="scroll-row -mx-4 px-4 lg:hidden">
      {view.sections.map((s) => (
        <Link key={s.id} href={s.href} className="chip" aria-current={s.id === on ? "true" : undefined}>
          <SectionIcon id={s.id} />
          {s.chip}
        </Link>
      ))}
      <ShowCurrentChip />
    </nav>
  );
}

/** What the page does not know yet, said plainly, with how it will arrive. */
export function NotHereYet({ view }: { view: RouteView }) {
  const { route, missing, reports } = view;
  if (missing.length === 0) return null;
  const fromRiders = missing.filter((m) => m.id !== "bikes" && m.id !== "costs");
  const fromReports = missing.filter((m) => m.id === "bikes" || m.id === "costs");
  const done = Math.min(reports, REPORTS_NEEDED);
  return (
    <section className="flex flex-col gap-2">
      <h2 className="label">Not here yet</h2>
      {fromRiders.length > 0 ? (
        <div className="card flex flex-col">
          {fromRiders.map((m) => (
            <div key={m.id} className="flex min-h-12 items-center gap-2.5 border-b border-line px-3 py-2.5 text-ink-2 last:border-b-0">
              <span className="grid size-8 shrink-0 place-items-center rounded-md bg-surface-2">
                <SectionIcon id={m.id} />
              </span>
              <b className="min-w-0 flex-1 text-[0.9375rem] leading-5">{m.name}</b>
              <IconLock className="size-4 shrink-0" />
            </div>
          ))}
        </div>
      ) : null}
      <Callout tone="info" title="These come from riders, not from us">
        They appear when riders who have done this route send a trip report. It takes about three minutes.
      </Callout>

      <h3 className="label mt-1">What a trip report asks</h3>
      <div className="card flex flex-col">
        <div className="flex items-center gap-2.5 border-b border-line px-3 py-2.5">
          <b className="min-w-0 flex-1 text-[0.9375rem] leading-5">Route, month and bike</b>
          <Badge tone="fresh">Needed</Badge>
        </div>
        <div className="px-3 py-2.5">
          <b className="block text-[0.9375rem] leading-5">Riding hours, fuel stops, mechanics, gear, cost, a video</b>
          <span className="hint">Optional. Fill in what you remember.</span>
        </div>
      </div>

      {fromReports.length > 0 ? (
        <div className="card flex flex-col gap-1.5 px-3 py-2.5">
          <b className="text-[0.9375rem] leading-5">Bikes, gear and costs show after {REPORTS_NEEDED} trip reports</b>
          <span className="hint">
            With fewer, this would be a handful of opinions, not a pattern.
          </span>
          <div
            role="img"
            aria-label={`${done} of ${REPORTS_NEEDED} trip reports`}
            className="h-2 overflow-hidden rounded-full bg-surface-2"
          >
            <span className="block h-full bg-sign" style={{ width: `${(done / REPORTS_NEEDED) * 100}%` }} />
          </div>
          <span className="hint num">
            {done} of {REPORTS_NEEDED} reports
          </span>
        </div>
      ) : null}
      <p className="hint num text-center">
        {plural(reports, "trip report")} for {route.name} so far
      </p>
    </section>
  );
}

export function fuelWords(view: RouteView): string {
  const { fuel } = view.route;
  const gap = fuel.longest_gaps[0];
  if (fuel.pump_count === 0) return "No pumps on the map";
  return `${plural(fuel.pump_count, "pump")}${gap ? ` · longest gap ${km(gap.gap_km)}` : ""}`;
}
