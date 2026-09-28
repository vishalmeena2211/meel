import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { hostOf, hours as sayHours, km, monthName, plural, sayDate } from "@/lib/format";
import { REPORTS_NEEDED } from "@/lib/sections";
import type { LegHours, NetworkReport, SeasonYear, Video } from "@/lib/types";
import type { RouteView } from "@/server/route-view";

import { IconAlert, IconDown, IconExternal, IconFuel, IconPlay, IconPlus } from "../icons";
import { ShowMore } from "../show-more";
import { TripCardView } from "../trips/trip-card";
import { Badge, Callout, Empty, SectionHeading, SourceLine } from "../ui";
import { GapStrip } from "./drawings";
import { FactRow } from "./fact-row";

const GRID = "grid gap-2 lg:grid-cols-2";

function Section({ id, children }: { id: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-name`} className="flex scroll-mt-28 flex-col gap-3">
      {children}
    </section>
  );
}

// ── is it open? ──────────────────────────────────────────────────────────

/** "19 May", from "2027-05-19". "May 2027" stays as it is when the day is not known. */
function shortDay(value: string | null): string | null {
  if (!value) return null;
  const said = sayDate(value);
  if (!said) return null;
  return /^\d{4}-\d{2}-\d{2}/.test(value) ? said.replace(/ \d{4}$/, "") : said.replace(/ \d{4}$/, "");
}

function yearWords(y: SeasonYear): string | null {
  const parts = [
    y.connected ? `Connected ${shortDay(y.connected)}` : null,
    y.open_to_motorcycles ? `open to bikes ${shortDay(y.open_to_motorcycles)}` : null,
    y.closed ? `closed ${shortDay(y.closed)}` : null,
  ].filter(Boolean);
  if (parts.length === 0) return null;
  const words = parts.join(" · ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

interface Happening {
  when: string;
  words: string;
  url: string | null;
}

function happenings(history: SeasonYear[]): Happening[] {
  const out: Happening[] = [];
  for (const y of history) {
    const url = y.sources[0]?.url ?? null;
    if (y.closed) out.push({ when: y.closed, words: "Closed for winter", url });
    if (y.open_to_motorcycles) out.push({ when: y.open_to_motorcycles, words: "Open to motorcycles", url });
    if (y.connected) out.push({ when: y.connected, words: "Connected. Motorcycles not yet allowed, or not named.", url });
  }
  return out.sort((a, b) => b.when.localeCompare(a.when));
}

/** The earliest and latest day of the year on which the road opened to motorcycles, in the years on record. */
function openingPattern(history: SeasonYear[]): { from: string; to: string; years: number } | null {
  const days = history
    .map((y) => y.open_to_motorcycles)
    .filter((d): d is string => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d))
    .map((d) => d.slice(5))
    .sort();
  const first = days[0];
  const last = days[days.length - 1];
  if (!first || !last || days.length < 2) return null;
  const say = (md: string) => (sayDate(`2000-${md}`) ?? md).replace(" 2000", "");
  return { from: say(first), to: say(last), years: days.length };
}

export function OpenSection({ view }: { view: RouteView }) {
  const { route, views } = view;
  const history = route.season.history;
  const events = happenings(history);
  const newest = events[0];
  const shut = newest?.words === "Closed for winter" ? newest : null;
  const pattern = openingPattern(history);
  const sightings = route.sightings ?? [];

  return (
    <Section id="open">
      <SectionHeading id="open-name" title="Is it open?" aside="We link, we do not guess" />

      {shut ? (
        <>
          <Callout tone="warn" title="Last official word: closed for winter">
            Dated {sayDate(shut.when)}. We have seen no opening notice since.
          </Callout>
          {shut.url ? (
            <a className="btn btn-soft self-start" href={shut.url} target="_blank" rel="noreferrer noopener">
              <IconExternal />
              Read the notice
            </a>
          ) : null}
        </>
      ) : (
        <Callout tone="info" title="We do not say open or closed">
          Conditions change by the hour. These are the offices that decide, and where each one announces it.
        </Callout>
      )}

      {views.open.length > 0 ? (
        <ShowMore first={4} noun="offices" className={GRID}>
          {views.open.map((v) => (
            <FactRow key={v.slug} view={v} />
          ))}
        </ShowMore>
      ) : null}

      <div className="flex flex-col gap-2">
        <SectionHeading title="Riders’ sightings" aside="Not official" />
        {sightings.length > 0 ? (
          <div className={GRID}>
            {sightings.map((s) => (
              <article key={s.id} className="fact">
                <h3 className="text-[0.9375rem] leading-5 font-semibold">{s.title}</h3>
                <p className="text-sm leading-5">{s.detail}</p>
                <p className="hint num">
                  Seen by {s.by}
                  {s.bike ? ` on a ${s.bike}` : ""} · {sayDate(s.seen_on)}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <p className="hint">
            No rider has told us what they saw on this road yet. What they send is kept apart from the offices above.
          </p>
        )}
      </div>

      {events.length > 0 ? (
        <div className="flex flex-col gap-1">
          <h3 className="label">Were motorcycles allowed?</h3>
          <ol className="timeline">
            {events.slice(0, 3).map((e) => (
              <li key={`${e.when}-${e.words}`}>
                <span>{sayDate(e.when, true)}</span>
                <span className="font-medium">
                  {e.words}{" "}
                  {e.url ? (
                    <a className="link font-medium" href={e.url} target="_blank" rel="noreferrer noopener">
                      {hostOf(e.url)}
                    </a>
                  ) : null}
                </span>
              </li>
            ))}
          </ol>
          <p className="hint">Each line links to the order or news report it came from.</p>
        </div>
      ) : null}

      {history.length > 0 ? (
        <div className="flex flex-col gap-1">
          <SectionHeading title="When it opened before" aside={plural(history.length, "year")} />
          <ol className="timeline">
            {history.map((y) => (
              <li key={y.year}>
                <span className="font-semibold !text-ink">{y.year}</span>
                <span className={yearWords(y) ? "font-medium" : "text-ink-2"}>{yearWords(y) ?? "Not yet entered"}</span>
              </li>
            ))}
          </ol>
          {route.season.note ? <p className="text-sm">{route.season.note}</p> : null}
          <details className="hint group">
            <summary className="flex cursor-pointer list-none items-center gap-1 text-sm font-medium text-sign [&::-webkit-details-marker]:hidden">
              <span className="link">Notes and sources for each year</span>
              <IconDown className="size-4 shrink-0 transition-transform group-open:rotate-180" />
            </summary>
            <ul className="mt-1 flex flex-col gap-2">
              {history.map((y) => (
                <li key={y.year}>
                  <b className="text-ink">{y.year}.</b> {y.note}{" "}
                  {y.sources.map((s) => (
                    <a key={s.url} className="link font-medium" href={s.url} target="_blank" rel="noreferrer noopener">
                      {hostOf(s.url)}{" "}
                    </a>
                  ))}
                </li>
              ))}
            </ul>
          </details>
          <p className="hint">A date that is missing means no source gave one. It does not mean the road stayed shut.</p>
        </div>
      ) : null}

      {pattern ? (
        <Callout title="Planning for next season?">
          {pattern.from === pattern.to
            ? `The road opened to motorcycles on ${pattern.from} in each of the ${pattern.years} years we have on record.`
            : `In the ${pattern.years} years we have on record, the road opened to motorcycles between ${pattern.from} and ${pattern.to}.`}
        </Callout>
      ) : null}
    </Section>
  );
}

// ── fuel ─────────────────────────────────────────────────────────────────

export function FuelSection({ view }: { view: RouteView }) {
  const { route, views, start, end } = view;
  const distance = route.header.distance_km ?? 0;
  return (
    <Section id="fuel">
      <SectionHeading
        id="fuel-name"
        title="Fuel"
        aside={route.fuel.pump_count > 0 ? plural(route.fuel.pump_count, "pump") : "No pumps on the map"}
      />
      {route.fuel.pump_count > 0 && distance > 0 ? (
        <GapStrip fuel={route.fuel} distanceKm={distance} from={start} to={end} />
      ) : (
        <Callout title="The open map shows no pumps near this road">
          That is a gap in the map, not a promise about the road. Ask before you leave.
        </Callout>
      )}
      {route.fuel.longest_gaps.length > 0 ? (
        <Link className="btn btn-primary btn-block lg:hidden" href={`/routes/${route.slug}/fuel-check`}>
          <IconFuel />
          Check fuel for your bike
        </Link>
      ) : null}
      {route.fuel.listed ? (
        <ShowMore first={8} noun="pumps" className={GRID}>
          {views.fuel.map((v) => (
            <FactRow key={v.slug} view={v} />
          ))}
        </ShowMore>
      ) : route.fuel.pump_count > 0 ? (
        <p className="hint">
          This road is long and has {route.fuel.pump_count.toLocaleString("en-IN")} pumps on the map, so they are
          counted and not listed.
        </p>
      ) : null}
    </Section>
  );
}

// ── facts in a plain list ────────────────────────────────────────────────

export function RulesSection({ view }: { view: RouteView }) {
  return (
    <Section id="rules">
      <SectionHeading id="rules-name" title="Rules for motorcycles" aside={plural(view.views.rules.length, "fact")} />
      <div className={GRID}>
        {view.views.rules.map((v) => (
          <FactRow key={v.slug} view={v} />
        ))}
      </div>
    </Section>
  );
}

export function RoadSection({ view }: { view: RouteView }) {
  return (
    <Section id="road">
      <SectionHeading id="road-name" title="Trouble on the road" aside={plural(view.views.road.length, "warning")} />
      <Callout title="From published guides, not from riders">
        Each warning names the months it applies to. None has been seen by a rider this season unless it says so.
      </Callout>
      <div className={GRID}>
        {view.views.road.map((v) => (
          <FactRow key={v.slug} view={v} />
        ))}
      </div>
    </Section>
  );
}

export function MechanicsSection({ view }: { view: RouteView }) {
  return (
    <Section id="mechanics">
      <SectionHeading id="mechanics-name" title="Mechanics" aside={plural(view.views.mechanics.length, "shop")} />
      <div className={GRID}>
        {view.views.mechanics.map((v) => (
          <FactRow key={v.slug} view={v} full />
        ))}
      </div>
    </Section>
  );
}

export function StaysSection({ view }: { view: RouteView }) {
  return (
    <Section id="stays">
      <SectionHeading id="stays-name" title="Stays" aside={plural(view.views.stays.length, "place")} />
      <div className={GRID}>
        {view.views.stays.map((v) => (
          <FactRow key={v.slug} view={v} full />
        ))}
      </div>
    </Section>
  );
}

// ── mobile network ───────────────────────────────────────────────────────

/** "Jun 2027", from "2027-06". */
function shortMonth(month: string): string {
  const [year, m] = month.split("-");
  return `${monthName(Number(m), true)} ${year}`;
}

export function NetworkSection({ view }: { view: RouteView }) {
  const reports = view.route.network ?? [];
  const halts = [...new Set(reports.map((r) => r.halt))];
  const operators = [...new Set(reports.map((r) => r.operator))];
  const newest = (halt: string, operator: string): NetworkReport | null =>
    reports
      .filter((r) => r.halt === halt && r.operator === operator)
      .sort((a, b) => b.month.localeCompare(a.month))[0] ?? null;
  return (
    <Section id="network">
      <SectionHeading id="network-name" title="Mobile network" aside={plural(halts.length, "halt")} />
      {view.views.road
        .filter((v) => /\b(sim|prepaid|postpaid|mobile|signal|network)\b/i.test(v.title))
        .slice(0, 1)
        .map((v) => (
          <Callout key={v.slug} tone="warn" title={v.title}>
            {v.short} <span className="hint">{v.line}</span>
          </Callout>
        ))}
      <div className="card overflow-x-auto">
        <table className="num w-full border-collapse text-sm">
          <thead>
            <tr className="bg-surface-2 text-left">
              <th className="label px-3 py-2">Halt</th>
              {operators.map((o) => (
                <th key={o} className="label px-2 py-2">
                  {o}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {halts.map((h) => (
              <tr key={h} className="border-t border-line align-top">
                <th scope="row" className="px-3 py-2 text-left font-semibold">
                  {h}
                </th>
                {operators.map((o) => {
                  const r = newest(h, o);
                  return (
                    <td key={o} className="px-2 py-2">
                      {r ? (
                        <>
                          <b className={r.worked ? "text-fresh-fg" : "text-stale-fg"}>{r.worked ? "Worked" : "No signal"}</b>
                          <span className="hint block text-xs">{shortMonth(r.month)}</span>
                        </>
                      ) : (
                        <span className="text-ink-2">No report</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="hint">
        Each cell is the newest report. “No report” is a gap in what we know. “No signal” is what a rider found.
      </p>
    </Section>
  );
}

// ── real riding hours ────────────────────────────────────────────────────

function middle(sorted: number[]): number {
  const mid = Math.floor(sorted.length / 2);
  const a = sorted[mid] ?? 0;
  return sorted.length % 2 === 1 ? a : ((sorted[mid - 1] ?? a) + a) / 2;
}

export function HoursSection({ view }: { view: RouteView }) {
  const { route } = view;
  const all = route.leg_hours ?? [];
  const SCALE = 8;
  const legs = route.stretches
    .map((s) => {
      const mine = all.filter((l: LegHours) => l.from === s.from && l.to === s.to).map((l) => l.hours).sort((a, b) => a - b);
      return { ...s, mine };
    })
    .filter((l) => l.mine.length > 0);
  const pct = (h: number) => `${Math.min(100, (h / SCALE) * 100)}%`;
  return (
    <Section id="hours">
      <SectionHeading id="hours-name" title="Real riding hours" aside={plural(legs.length, "leg")} />
      <Callout title="Map apps are wrong here">
        They assume a car on a good road. These are hours riders took, with stops.
      </Callout>
      <div className="flex flex-col gap-2">
        {legs.map((l) => {
          const lo = l.mine[0] ?? 0;
          const hi = l.mine[l.mine.length - 1] ?? lo;
          const usual = middle(l.mine);
          const few = l.mine.length < 5;
          return (
            <article key={`${l.from}-${l.to}`} className="card flex flex-col gap-1.5 px-3 py-2.5">
              <div className="flex items-baseline justify-between gap-2">
                <b className="text-[0.9375rem]">
                  {l.from} to {l.to}
                </b>
                <span className="hint num">{km(l.distance_km)}</span>
              </div>
              {few ? (
                <p className="text-sm">
                  {l.mine.map((h) => sayHours(h)).join(" · ")}
                  <span className="hint"> · {plural(l.mine.length, "report")}, too few for a usual time</span>
                </p>
              ) : (
                <p className="text-sm">
                  Riders usually took <b>{sayHours(usual)}</b> · quickest {sayHours(lo)}, slowest {sayHours(hi)} ·{" "}
                  {plural(l.mine.length, "report")}
                </p>
              )}
              <div
                role="img"
                aria-label={`On a scale of 0 to ${SCALE} hours: riders took ${sayHours(lo)} to ${sayHours(hi)}. A map app says ${sayHours(l.map_app_hours)}.`}
                className="relative h-4"
              >
                <span className="absolute inset-x-0 top-1.5 h-1 rounded bg-surface-2" />
                <span className="absolute top-1 h-2 rounded bg-sign-line" style={{ left: pct(lo), width: `calc(${pct(hi)} - ${pct(lo)})` }} />
                {few ? null : <span className="absolute top-0 h-4 w-1 rounded bg-sign" style={{ left: pct(usual) }} />}
                <span className="absolute top-0 h-4 border-l-2 border-dashed border-ink-2" style={{ left: pct(l.map_app_hours) }} />
              </div>
              <p className="hint num">A map app says {sayHours(l.map_app_hours)}</p>
            </article>
          );
        })}
      </div>
      <p className="hint num">
        Drawn on one scale, 0 to {SCALE} hours. The band is quickest to slowest, the bar is the usual time, the dashed
        line is the map app.
      </p>
    </Section>
  );
}

// ── videos, by stretch ───────────────────────────────────────────────────

interface Span {
  name: string;
  from: number;
  to: number;
}

export function VideosSection({ view }: { view: RouteView }) {
  const { route } = view;
  const at = (place: string) => route.waypoints.find((w) => w.name.toLowerCase() === place.trim().toLowerCase())?.km_from_start;

  // A video names the stretch it shows, such as "Sarchu to Pang". Videos are grouped under those words.
  const groups = new Map<string, Video[]>();
  for (const v of route.videos) {
    const name = v.stretch ?? "The whole route";
    groups.set(name, [...(groups.get(name) ?? []), v]);
  }
  const spans: Span[] = [...groups.keys()].flatMap((name) => {
    const [a, b] = name.split(/ to /i);
    const x = a ? at(a) : undefined;
    const y = b ? at(b) : undefined;
    return x === undefined || y === undefined ? [] : [{ name, from: Math.min(x, y), to: Math.max(x, y) }];
  });
  const lengthOf = (name: string) => spans.find((s) => s.name === name);

  // Stretches that no video covers, joined where they touch.
  const bare: Array<{ from: string; to: string; km: number }> = [];
  let kmAt = 0;
  for (const s of route.stretches) {
    const from = kmAt;
    const to = kmAt + s.distance_km;
    kmAt = to;
    const covered =
      groups.has("The whole route") || spans.some((sp) => sp.from <= from + 2 && sp.to >= to - 2);
    if (covered) continue;
    const last = bare[bare.length - 1];
    if (last && last.to === s.from) {
      last.to = s.to;
      last.km += s.distance_km;
    } else {
      bare.push({ from: s.from, to: s.to, km: s.distance_km });
    }
  }

  return (
    <Section id="videos">
      <SectionHeading
        id="videos-name"
        title="Videos"
        aside={route.videos.length > 0 ? plural(route.videos.length, "rider video") : undefined}
      />
      <Callout title="Watch the date, not the view">
        Each video shows the road as it was that month. They play on YouTube, under the maker’s own channel.
      </Callout>

      {[...groups.entries()].map(([name, videos]) => {
        const span = lengthOf(name);
        return (
          <div key={name} className="flex flex-col gap-2">
            <SectionHeading title={name} aside={span ? km(span.to - span.from) : undefined} />
            <div className={GRID}>
              {videos.map((v) => (
                <a
                  key={v.id}
                  href={v.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="card grid grid-cols-[120px_1fr] items-center gap-2.5 overflow-hidden hover:border-ink-2"
                >
                  <span className="relative block h-[68px] bg-ink">
                    <Image
                      src={`https://i.ytimg.com/vi/${v.id}/mqdefault.jpg`}
                      alt=""
                      width={320}
                      height={180}
                      sizes="120px"
                      className="size-full object-cover"
                    />
                    <span className="absolute inset-0 grid place-items-center text-surface">
                      <IconPlay className="size-6 drop-shadow" />
                    </span>
                  </span>
                  <span className="min-w-0 py-1.5 pr-2.5">
                    <b className="line-clamp-2 text-sm leading-[1.2rem]">{v.title}</b>
                    <span className="hint block text-xs">
                      {v.channel ?? "YouTube"}
                      {v.bike ? ` · ${v.bike}` : ""}
                    </span>
                    <span className="mt-0.5 inline-block">
                      <Badge>{v.filmed ? `Filmed ${sayDate(v.filmed)}` : "Date filmed not known"}</Badge>
                    </span>
                  </span>
                </a>
              ))}
            </div>
          </div>
        );
      })}

      {bare.map((b) => (
        <div key={`${b.from}-${b.to}`} className="flex flex-col gap-2">
          <SectionHeading title={`${b.from} to ${b.to}`} aside={km(b.km)} />
          <Empty title="No video of this stretch yet">
            <span className="text-sm">Filmed it? Send the link. It plays on YouTube, with your name and the month.</span>
            <Link className="btn btn-soft" href={`/report?route=${route.slug}&add=video`}>
              <IconPlus />
              Add a video
            </Link>
          </Empty>
        </div>
      ))}
    </Section>
  );
}

// ── from trip reports: bikes and costs ───────────────────────────────────

export function BikesSection({ view }: { view: RouteView }) {
  const { used } = view;
  const counts = new Map<string, number>();
  for (const r of used) counts.set(r.bike, (counts.get(r.bike) ?? 0) + 1);
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, 4);
  const rest = sorted.slice(4).reduce((n, [, c]) => n + c, 0);
  const most = top[0]?.[1] ?? 1;
  const problems = used.flatMap((r) => {
    const words = typeof r.body.problems === "string" ? r.body.problems.trim() : "";
    return words ? [{ bike: r.bike, words, by: r.by, month: r.month }] : [];
  });
  return (
    <Section id="bikes">
      <SectionHeading id="bikes-name" title="Bikes on this route" aside={`From ${plural(used.length, "trip report")}`} />
      <div className="card flex flex-col gap-2 px-3 py-3">
        {[...top, ...(rest > 0 ? [["Others", rest] as [string, number]] : [])].map(([bike, n]) => (
          <div key={bike} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1">
            <span className="text-sm font-medium">{bike}</span>
            <b className="num text-sm">{n}</b>
            <span className="col-span-2 h-2 overflow-hidden rounded-full bg-surface-2">
              <span className="block h-full bg-sign" style={{ width: `${(n / most) * 100}%` }} />
            </span>
          </div>
        ))}
      </div>

      {problems.length > 0 ? (
        <>
          <SectionHeading title="What went wrong" aside={`${problems.length} of ${used.length} reports`} />
          <div className={GRID}>
            {problems.slice(0, 8).map((p) => (
              <article key={`${p.bike}-${p.month}-${p.words}`} className="fact">
                <h3 className="text-[0.9375rem] leading-5 font-semibold">{p.bike}</h3>
                <p className="text-sm leading-5">{p.words}</p>
                <p className="hint num">
                  {p.by ?? "A rider"} · {sayDate(p.month)}
                </p>
              </article>
            ))}
          </div>
        </>
      ) : null}
      <Callout title="This is what riders reported, not a ranking">
        More of one bike on the list means more riders took one. It does not mean it is the better bike.
      </Callout>
    </Section>
  );
}

function rupees(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

function numberAt(body: Record<string, unknown>, key: string): number | null {
  const v = body[key];
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null;
}

export function CostsSection({ view }: { view: RouteView }) {
  const { used, route } = view;
  // Prices from more than two years back say little about today.
  const since = `${new Date().getFullYear() - 1}-01`;
  const recent = used.filter((r) => r.month >= since);
  const totals = recent.map((r) => numberAt(r.body, "cost_total")).filter((n): n is number => n !== null).sort((a, b) => a - b);
  const quarter = (f: number) => totals[Math.min(totals.length - 1, Math.floor(totals.length * f))] ?? 0;
  const parts: Array<[string, string]> = [
    ["cost_fuel", "Fuel"],
    ["cost_stays", "Stays"],
    ["cost_food", "Food"],
    ["cost_permits", "Permits and fees"],
    ["cost_repairs", "Repairs"],
  ];
  return (
    <Section id="costs">
      <SectionHeading id="costs-name" title={route.name} aside={`From ${plural(totals.length, "trip report")}`} />
      {totals.length < REPORTS_NEEDED ? (
        <Callout title={`Shows after ${REPORTS_NEEDED} reports that give a cost`}>
          {plural(totals.length, "report")} so far give one. With fewer, this would be a few riders’ bills, not a
          pattern.
        </Callout>
      ) : (
        <>
          <div className="card flex flex-col gap-1 px-3 py-3">
            <span className="label">Most riders spent</span>
            <p className="display num text-[2rem]">
              {rupees(quarter(0.25))} to {rupees(quarter(0.75))}
            </p>
            <span className="text-sm">for one rider, on their own bike</span>
            <span className="hint num">
              The middle half of {totals.length} reports. Lowest {rupees(totals[0] ?? 0)}, highest{" "}
              {rupees(totals[totals.length - 1] ?? 0)}.
            </span>
          </div>
          <div className="card flex flex-col">
            {parts.map(([key, label]) => {
              const values = recent.map((r) => numberAt(r.body, key)).filter((n): n is number => n !== null).sort((a, b) => a - b);
              if (values.length === 0) return null;
              return (
                <div key={key} className="flex items-center justify-between border-b border-line px-3 py-2.5 last:border-b-0">
                  <span className="text-[0.9375rem]">{label}</span>
                  <b className="num">{rupees(middle(values))}</b>
                </div>
              );
            })}
          </div>
          <p className="hint">
            Usual figures from reports since {sayDate(since)}. Older prices are left out.
          </p>
        </>
      )}
    </Section>
  );
}

// ── trips on this route ──────────────────────────────────────────────────

export function TripsOnRoute({ view, nearbyTrips }: { view: RouteView; nearbyTrips: ReactNode }) {
  const { route, trips, pastTrips, seasonMonths } = view;
  const inside =
    seasonMonths !== null &&
    trips.every((t) => seasonMonths.includes(Number(t.leaves_on.slice(5, 7))) && seasonMonths.includes(Number(t.back_on.slice(5, 7))));
  return (
    <Section id="trips">
      <SectionHeading id="trips-name" title="Trips on this route" aside={trips.length > 0 ? plural(trips.length, "trip") : undefined} />
      {trips.length > 0 ? (
        <>
          <Callout tone="info" title={`${plural(trips.length, "trip")} ${trips.length === 1 ? "is" : "are"} planned on this route`}>
            {seasonMonths === null
              ? "Check each one’s dates against the season."
              : inside
                ? trips.length === 1
                  ? "It falls inside the months the road is usually ridden."
                  : "All fall inside the months it is usually ridden."
                : "Not all fall inside the months it is usually ridden. Look at the dates."}
          </Callout>
          <div className="flex flex-col gap-2">
            {trips.map((t) => (
              <TripCardView key={t.id} trip={t} routeName={route.name} />
            ))}
          </div>
        </>
      ) : (
        <Empty title="Nobody has posted a trip here yet">
          <span className="text-sm">Planning one? Post it, and riders who want this road will find you.</span>
        </Empty>
      )}

      {pastTrips.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <h3 className="label">Already ridden</h3>
          <div className="card flex flex-col">
            {pastTrips.map((t) => (
              <Link
                key={t.id}
                href={`/trips/${t.id}`}
                className="border-b border-line px-3 py-2.5 last:border-b-0 hover:bg-surface-2"
              >
                <b className="block text-[0.9375rem] leading-5">
                  {route.name} · {sayDate(t.leaves_on.slice(0, 7))}
                </b>
                <span className="hint num">
                  {plural(t.going, "rider")} · led by {t.leader_name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      ) : null}
      {trips.length === 0 ? nearbyTrips : null}
    </Section>
  );
}

// ── where the page came from, and what it could not find ─────────────────

export function SourcesScreen({ view, sources }: { view: RouteView; sources: Parameters<typeof SourceLine>[0]["source"][] }) {
  const { route } = view;
  return (
    <Section id="sources">
      <SectionHeading id="sources-name" title="Sources for this route" aside={plural(sources.length + 2, "source")} />
      <ul className="card flex flex-col">
        <li className="hint border-b border-line px-3 py-2.5">
          Distances, the line of the road and fuel pumps: ©{" "}
          <a className="link font-medium" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer noopener">
            OpenStreetMap contributors
          </a>
          , Open Database Licence. Routes worked out with the Open Source Routing Machine.
        </li>
        <li className="hint border-b border-line px-3 py-2.5">
          Heights: NASA Shuttle Radar Topography Mission, public domain, served by Open Topo Data.
        </li>
        {sources.map((s) => (
          <li key={s.url} className="border-b border-line px-3 py-2.5 last:border-b-0">
            <span className="text-sm font-medium">{s.title}</span>
            <SourceLine source={s} prefix="" />
          </li>
        ))}
      </ul>

      {route.gaps.length > 0 ? (
        <>
          <SectionHeading title="What we could not find" aside={plural(route.gaps.length, "gap")} />
          <p className="hint">A gap is not a fact. It means we looked and found no source.</p>
          <ul className="card flex flex-col text-sm">
            {route.gaps.map((g) => (
              <li key={g} className="flex gap-2 border-b border-line px-3 py-2 last:border-b-0">
                <IconAlert className="mt-0.5 size-4 shrink-0 text-ageing-fg" />
                <span>{g}</span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      <Link className="link self-start text-sm" href="/credits">
        Credits for the whole site
      </Link>
    </Section>
  );
}
