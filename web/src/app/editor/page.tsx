import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";

import { decideFactAction, decideTripAction, decideTripReportAction } from "@/app/actions/editor";
import { PageTitle } from "@/components/form";
import { IconCheck, IconClock, IconRight } from "@/components/icons";
import { FactRow } from "@/components/route/fact-row";
import { BackHead } from "@/components/shell";
import { Badge, Callout, Empty, SectionHeading } from "@/components/ui";
import { CHANGE_WORDS } from "@/lib/change-choices";
import { getFactKinds, getIndex, getRoute } from "@/lib/content";
import { factViews, type FactView } from "@/lib/fact-view";
import { dayOf, daysBetween, hours as sayHours, indiaDay, plural, sayAge, sayDate } from "@/lib/format";
import { SECTION_NAMES } from "@/lib/sections";
import { checkTrip } from "@/lib/trip-checks";
import { currentUser } from "@/server/auth";
import {
  confirmationsFor,
  inbox,
  othersSaying,
  recordOf,
  type FactReportRow,
  type TripReportRow,
} from "@/server/reports";
import { flagsOn, getTrip, tripsForEditor, type TripCard } from "@/server/trips";

export const metadata: Metadata = { title: "The editor’s inbox", robots: { index: false } };
export const dynamic = "force-dynamic";

const FLAG_WORDS: Record<string, string> = {
  "money-up-front": "Asks for money up front",
  "unmarked-company": "A tour company, not marked as one",
  "not-real": "Not a real trip",
  other: "Something else",
};

interface Item {
  key: string;
  kind: string;
  title: string;
  who: string;
  at: string;
}

/** "9:12 pm" for today, "27 Sept" for an earlier day. India's time. */
function when(moment: string): string {
  const at = new Date(moment);
  if (Number.isNaN(at.getTime())) return "";
  if (dayOf(moment) === indiaDay()) {
    return new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit", hour12: true })
      .format(at)
      .toLowerCase();
  }
  return (sayDate(dayOf(moment), true) ?? "").replace(/ \d{4}$/, "");
}

function Check({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-sm leading-5">
      {ok ? (
        <IconCheck className="mt-0.5 size-4 shrink-0 text-fresh-fg" />
      ) : (
        <IconClock className="mt-0.5 size-4 shrink-0 text-ageing-fg" />
      )}
      <span>{children}</span>
    </li>
  );
}

function SetAside({ id, action }: { id: string; action: (form: FormData) => Promise<void> }) {
  return (
    <details className="card">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-center px-3 text-[0.9375rem] font-semibold [&::-webkit-details-marker]:hidden">
        Set aside, with a reason
      </summary>
      <form action={action} className="flex flex-col gap-2 border-t border-line px-3 py-3">
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="decision" value="set-aside" />
        <label htmlFor={`reason-${id}`} className="text-sm font-semibold">
          Why <span className="font-normal text-ink-2">kept for you, not shown to the rider</span>
        </label>
        <textarea id={`reason-${id}`} name="reason" rows={2} maxLength={300} className="field-input" />
        <button type="submit" className="btn btn-outline btn-block">
          Set aside
        </button>
      </form>
    </details>
  );
}

// ── one report on a fact ─────────────────────────────────────────────────

async function FactDetail({ report, nameOf }: { report: FactReportRow; nameOf: (slug: string) => string }) {
  const [route, kinds] = await Promise.all([getRoute(report.route_slug), getFactKinds()]);
  const today = new Date();
  const changed = report.kind === "changed";
  let now: FactView | null = null;
  let after: FactView | null = null;
  if (route) {
    const said = await confirmationsFor(report.route_slug);
    now = factViews(route, said, kinds, today).all.find((v) => v.id === report.fact_id) ?? null;
    const applied = [
      ...said.filter((c) => !(c.fact_id === report.fact_id && c.read === false && c.seen_on === report.seen_on)),
      {
        fact_id: report.fact_id,
        route_slug: report.route_slug,
        seen_on: report.seen_on,
        by: report.name ?? "a rider",
        kind: report.kind,
        note: changed ? report.note : null,
        read: true,
        applied_on: today.toISOString(),
      },
    ];
    after = factViews(route, applied, kinds, today).all.find((v) => v.id === report.fact_id) ?? null;
  }
  const [record, others] = await Promise.all([recordOf(report.user_id, report.name), othersSaying(report)]);
  const age = daysBetween(report.seen_on, today);
  const who = report.name ?? "a rider with no name given";
  const first = (report.name ?? "the rider").split(" ")[0] ?? "the rider";

  return {
    head: `${report.fact_title}: ${changed ? "this has changed" : "still true"}`,
    mid: (
      <>
        <SectionHeading
          title={changed ? `${report.fact_title} has changed` : `${report.fact_title} is still true`}
          aside={`${nameOf(report.route_slug)}${now ? ` · ${SECTION_NAMES[now.section].name}` : ""}`}
        />
        <blockquote className="border-l-[3px] border-line py-0.5 pl-2.5 text-sm whitespace-pre-line">
          {report.note ? `“${report.note}”\n` : ""}
          <span className="hint num">
            {who} · seen {sayDate(report.seen_on)} · sent {when(report.created_at)}
            {report.change_kind ? ` · ${CHANGE_WORDS[report.change_kind] ?? report.change_kind}` : ""}
          </span>
        </blockquote>

        {now && after ? (
          <div className="grid gap-3 md:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <span className="label">On the page now</span>
              <FactRow view={{ ...now, href: now.href }} full />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="label">After you apply</span>
              <FactRow view={after} hi full />
            </div>
          </div>
        ) : (
          <Callout tone="warn" title="This fact is no longer on the page">
            It may have been renamed or removed from the data files. Applying the report keeps it, but there is nothing
            to show it on.
          </Callout>
        )}

        {now && now.history.length > 0 ? (
          <div className="flex flex-col gap-1">
            <span className="label">This fact’s history</span>
            <ol className="timeline">
              {now.history.map((h) => (
                <li key={`${h.when}-${h.what}`}>
                  <span>{h.when}</span>
                  <span className="font-medium">{h.what}</span>
                </li>
              ))}
            </ol>
          </div>
        ) : null}
      </>
    ),
    side: (
      <>
        <SectionHeading title="Before you apply" />
        <ul className="flex flex-col gap-2">
          <Check ok={age <= 7}>
            {age <= 3 ? "Seen within the last 3 days" : `Seen ${sayAge(age)}`}
          </Check>
          <Check ok={record.applied > 0}>
            {record.sent <= 1
              ? `This is ${first}’s first report`
              : `${first} has sent ${plural(record.sent - 1, "report")} before. ${record.applied === record.sent - 1 ? `All ${record.applied}` : record.applied} ${record.applied === 1 ? "was" : "were"} applied.`}
          </Check>
          <Check ok={others > 0}>
            {others > 0
              ? `${plural(others, "other rider")} ${others === 1 ? "has" : "have"} said the same`
              : changed
                ? "No other rider has reported this yet"
                : "No other rider has confirmed this lately"}
          </Check>
          <Check ok={report.user_id !== null}>{report.user_id ? "Sent from an account" : "Sent with no account"}</Check>
        </ul>
        <Callout tone="info" title="Nothing is lost">
          {changed
            ? "Applying puts your wording on the fact and moves the old words into its history. The page is made again within the minute."
            : "Applying adds this to the fact’s history and changes its date. The page is made again within the minute."}
        </Callout>
        <form action={decideFactAction} className="flex flex-col gap-2">
          <input type="hidden" name="id" value={report.id} />
          <input type="hidden" name="decision" value="apply" />
          {changed ? (
            <div className="flex flex-col gap-1">
              <label htmlFor="wording" className="text-sm font-semibold">
                Wording on the page <span className="font-normal text-ink-2">you can edit this before applying</span>
              </label>
              <textarea id="wording" name="wording" rows={3} maxLength={400} defaultValue={report.note ?? ""} className="field-input" />
            </div>
          ) : null}
          <button type="submit" className="btn btn-primary btn-block">
            <IconCheck />
            Apply to the page
          </button>
        </form>
        <SetAside id={report.id} action={decideFactAction} />
      </>
    ),
  };
}

// ── one trip report ──────────────────────────────────────────────────────

const BODY_WORDS: Record<string, string> = {
  fuel: "Fuel stops and mechanics",
  gear: "Gear that helped, gear that failed",
  problems: "What went wrong with the bike",
  hours: "Riding hours",
  cost: "What the trip cost",
  video: "Video link",
  nights: "Nights",
  cost_total: "Cost, all of it",
  cost_fuel: "Cost of fuel",
  cost_stays: "Cost of stays",
  cost_food: "Cost of food",
  cost_permits: "Cost of permits and fees",
  cost_repairs: "Cost of repairs",
};

function TripReportDetail({ report, nameOf }: { report: TripReportRow; nameOf: (slug: string) => string }) {
  let body: Record<string, unknown> = {};
  try {
    const parsed = JSON.parse(report.body) as unknown;
    if (parsed && typeof parsed === "object") body = parsed as Record<string, unknown>;
  } catch {
    body = {};
  }
  const legs = Array.isArray(body.legs) ? (body.legs as Array<{ from?: string; to?: string; hours?: number }>) : [];
  const rest = Object.entries(body).filter(([k, v]) => k !== "legs" && (typeof v === "string" || typeof v === "number") && v !== "");
  return {
    head: `${nameOf(report.route_slug)}, ${report.bike}`,
    mid: (
      <>
        <SectionHeading title={`${nameOf(report.route_slug)} · ${report.bike}`} aside={`Ridden ${sayDate(report.month)}`} />
        <p className="hint num">
          From {report.name ?? "a rider with no name given"} · sent {when(report.created_at)}
        </p>
        {legs.length > 0 ? (
          <div className="flex flex-col gap-1">
            <span className="label">Riding hours</span>
            <ol className="card flex flex-col text-sm">
              {legs.map((l) => (
                <li key={`${l.from}-${l.to}`} className="flex justify-between gap-3 border-b border-line px-3 py-2 last:border-b-0">
                  <span>
                    {l.from} to {l.to}
                  </span>
                  <b className="num">{typeof l.hours === "number" ? sayHours(l.hours) : ""}</b>
                </li>
              ))}
            </ol>
          </div>
        ) : null}
        <dl className="flex flex-col gap-2 text-sm">
          {rest.map(([k, v]) => (
            <div key={k}>
              <dt className="label">{BODY_WORDS[k] ?? k}</dt>
              <dd className="whitespace-pre-line">
                {typeof v === "number" && k.startsWith("cost") ? `₹${v.toLocaleString("en-IN")}` : String(v)}
              </dd>
            </div>
          ))}
        </dl>
        {legs.length === 0 && rest.length === 0 ? (
          <p className="hint">Route, month and bike only. That is enough to count.</p>
        ) : null}
      </>
    ),
    side: (
      <>
        <SectionHeading title="Before you use it" />
        <ul className="flex flex-col gap-2">
          <Check ok={report.user_id !== null}>{report.user_id ? "Sent from an account" : "Sent with no account"}</Check>
          <Check ok={legs.length > 0}>
            {legs.length > 0 ? `Gives hours for ${plural(legs.length, "leg")}` : "Gives no riding hours"}
          </Check>
        </ul>
        <Callout tone="info" title="What using it does">
          It counts towards the bikes riders took, the riding hours and the costs for this route. Mechanics, pumps and
          stays it names are carried into the data files by hand.
        </Callout>
        <form action={decideTripReportAction} className="flex flex-col gap-2">
          <input type="hidden" name="id" value={report.id} />
          <input type="hidden" name="decision" value="apply" />
          <button type="submit" className="btn btn-primary btn-block">
            <IconCheck />
            Mark as read and used
          </button>
        </form>
        <SetAside id={report.id} action={decideTripReportAction} />
      </>
    ),
  };
}

// ── one trip that waits, or that riders reported ─────────────────────────

async function TripDetail({ card, nameOf }: { card: TripCard; nameOf: (slug: string) => string }) {
  const [trip, flags] = await Promise.all([getTrip(card.id), flagsOn(card.id)]);
  const route = trip ? await getRoute(trip.route_slug) : null;
  const checks = trip && route ? checkTrip(route, trip.leaves_on, trip.back_on, trip.nights) : [];
  return {
    head: `${nameOf(card.route_slug)}, ${sayDate(card.leaves_on)}`,
    mid: (
      <>
        <SectionHeading title={nameOf(card.route_slug)} aside={card.status === "hidden" ? "Reported by riders" : "A first trip"} />
        <dl className="card grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 px-3 py-3 text-sm">
          <dt className="hint">Dates</dt>
          <dd className="num">
            {sayDate(card.leaves_on)} to {sayDate(card.back_on)}
          </dd>
          <dt className="hint">From</dt>
          <dd>{card.from_city}</dd>
          <dt className="hint">Led by</dt>
          <dd>{card.leader_name}</dd>
          <dt className="hint">Places</dt>
          <dd className="num">{card.places}</dd>
          {trip ? (
            <>
              <dt className="hint">Who can join</dt>
              <dd>{trip.who_can_join}</dd>
              <dt className="hint">Asks</dt>
              <dd>{trip.asks ?? "Nothing"}</dd>
              <dt className="hint">Chat link</dt>
              <dd className="break-all">{trip.chat_link ?? "None given"}</dd>
            </>
          ) : null}
        </dl>
        {flags.length > 0 ? (
          <div className="flex flex-col gap-1">
            <span className="label">What riders reported</span>
            <ul className="card flex flex-col text-sm">
              {flags.map((f) => (
                <li key={f.at} className="border-b border-line px-3 py-2 last:border-b-0">
                  <b>{FLAG_WORDS[f.reason] ?? f.reason}</b>
                  {f.note ? `: “${f.note}”` : ""} <span className="hint">{sayDate(dayOf(f.at))}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <Link className="link self-start text-sm" href={`/trips/${card.id}`}>
          Open the trip as riders will see it
        </Link>
      </>
    ),
    side: (
      <>
        <SectionHeading title="Checked against the route" />
        <ul className="flex flex-col gap-2">
          {checks.length === 0 ? <Check ok>Nothing on the route page speaks against this plan</Check> : null}
          {checks.map((c) => (
            <Check key={c.id} ok={c.tone === "ok"}>
              <b>{c.title}.</b> {c.words}
            </Check>
          ))}
          <Check ok={!card.is_company}>{card.is_company ? "Marked as run by a tour company" : "A rider’s own trip"}</Check>
        </ul>
        <form action={decideTripAction} className="flex flex-col gap-2">
          <input type="hidden" name="id" value={card.id} />
          <button type="submit" name="decision" value="show" className="btn btn-primary btn-block">
            <IconCheck />
            Show on the board
          </button>
          <button type="submit" name="decision" value="remove" className="btn btn-outline btn-block">
            Remove from the board
          </button>
        </form>
      </>
    ),
  };
}

export default async function EditorPage(props: PageProps<"/editor">) {
  const user = await currentUser();
  if (!user) redirect("/login?next=/editor");
  if (!user.is_editor) notFound();

  const query = await props.searchParams;
  const [index, box, trips] = await Promise.all([getIndex(), inbox(), tripsForEditor()]);
  const nameOf = (slug: string) => index.routes.find((r) => r.slug === slug)?.name ?? slug;

  const items: Item[] = [
    ...box.facts.map((r) => ({
      key: `fact-${r.id}`,
      kind: r.kind === "changed" ? "This has changed" : "Still true",
      title: r.fact_title,
      who: r.name ?? "No name given",
      at: r.created_at,
    })),
    ...box.trips.map((r) => ({
      key: `report-${r.id}`,
      kind: "Trip report",
      title: `${nameOf(r.route_slug)} · ${r.bike}`,
      who: r.name ?? "No name given",
      at: r.created_at,
    })),
    ...trips.map((t) => ({
      key: `trip-${t.id}`,
      kind: t.status === "hidden" ? "Trip reported by riders" : "A first trip",
      title: `${nameOf(t.route_slug)} · ${sayDate(t.leaves_on.slice(0, 7))}`,
      who: t.leader_name,
      at: `${t.leaves_on}T00:00:00Z`,
    })),
  ].sort((a, b) => (a.key.startsWith("trip-") || b.key.startsWith("trip-") ? 0 : b.at.localeCompare(a.at)));

  const asked = typeof query.read === "string" ? query.read : null;
  const on = items.find((i) => i.key === asked) ?? null;
  const shown = on ?? items[0] ?? null;

  let detail: { head: string; mid: ReactNode; side: ReactNode } | null = null;
  if (shown) {
    const id = shown.key.slice(shown.key.indexOf("-") + 1);
    const fact = box.facts.find((r) => r.id === id);
    const report = box.trips.find((r) => r.id === id);
    const trip = trips.find((t) => t.id === id);
    if (shown.key.startsWith("fact-") && fact) detail = await FactDetail({ report: fact, nameOf });
    else if (shown.key.startsWith("report-") && report) detail = TripReportDetail({ report, nameOf });
    else if (shown.key.startsWith("trip-") && trip) detail = await TripDetail({ card: trip, nameOf });
  }

  const today = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date());

  return (
    <div data-desk className="lg:grid lg:min-h-[calc(100dvh-3.5rem)] lg:grid-cols-[330px_minmax(0,1fr)_340px] lg:bg-surface">
      {/* ── the list of what has come in ───────────────────────────────── */}
      <nav
        aria-label="To read"
        className={`flex-col gap-1 lg:sticky lg:top-14 lg:flex lg:h-[calc(100dvh-3.5rem)] lg:overflow-y-auto lg:border-r lg:border-line lg:px-3 lg:py-4 ${on ? "hidden" : "flex"}`}
      >
        <PageTitle
          title="The editor’s inbox"
          phone={{ title: "Editor", sub: `${items.length} to read`, back: "/account" }}
        />
        <p className="hint num px-1 pb-1">{today}</p>
        <span className="label px-1 pt-2 pb-1">To read · {items.length}</span>
        {items.length === 0 ? <Empty title="Nothing to read" /> : null}
        {items.map((i) => (
          <Link
            key={i.key}
            href={`/editor?read=${i.key}`}
            aria-current={shown?.key === i.key ? "true" : undefined}
            className="flex flex-col gap-0.5 rounded-md border border-line bg-surface px-3 py-2.5 hover:border-ink-2 lg:border-transparent lg:aria-[current=true]:border-sign-line lg:aria-[current=true]:bg-sign-soft"
          >
            <span className="flex items-baseline justify-between gap-2">
              <b className="text-[0.84375rem] leading-5">{i.title}</b>
              <span className="hint num shrink-0 text-xs">{when(i.at)}</span>
            </span>
            <span className="hint">
              {i.kind} · {i.who}
            </span>
          </Link>
        ))}

        {box.places.length > 0 ? (
          <>
            <span className="label px-1 pt-4 pb-1">Places riders suggested · {box.places.length}</span>
            <ul className="card flex flex-col text-sm">
              {box.places.map((p) => (
                <li key={p.id} className="border-b border-line px-3 py-2 last:border-b-0">
                  <b>{p.place}</b>
                  {p.note ? ` · ${p.note}` : ""} <span className="hint">{p.name ?? ""}</span>
                </li>
              ))}
            </ul>
          </>
        ) : null}

        <span className="label px-1 pt-4 pb-1">Also</span>
        <Link
          href="/editor/let-in"
          className="card flex min-h-12 items-center gap-2.5 px-3 py-2.5 hover:border-ink-2"
        >
          <span className="min-w-0 flex-1">
            <b className="block text-[0.9375rem] leading-5">A rider cannot get in</b>
            <span className="hint">Set a one-time password</span>
          </span>
          <IconRight className="size-4 shrink-0 text-ink-2" />
        </Link>
      </nav>

      {/* ── the one being read ─────────────────────────────────────────── */}
      <section className={`min-w-0 flex-col gap-4 lg:flex lg:px-7 lg:py-5 ${on ? "flex" : "hidden"}`}>
        {detail && shown ? (
          <>
            <BackHead title="Editor" sub={shown.kind} back="/editor" />
            <span className="self-start">
              <Badge tone={shown.kind === "This has changed" ? "ageing" : "plain"}>{shown.kind}</Badge>
            </span>
            {detail.mid}
          </>
        ) : (
          <Empty title="Nothing to read">
            <span className="text-sm">Reports, first trips and suggestions appear here as riders send them.</span>
          </Empty>
        )}
      </section>

      {/* What to weigh, and what to do. Beside the report on a wider screen, beneath it on a phone. */}
      <aside
        className={`mt-4 flex-col gap-3.5 lg:sticky lg:top-14 lg:mt-0 lg:flex lg:h-[calc(100dvh-3.5rem)] lg:overflow-y-auto lg:border-l lg:border-line lg:bg-surface-2 lg:p-5 ${on ? "flex" : "hidden"}`}
      >
        {detail ? detail.side : null}
      </aside>
    </div>
  );
}
