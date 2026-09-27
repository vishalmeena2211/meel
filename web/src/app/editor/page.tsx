import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { decideFactAction, decideTripAction, decideTripReportAction } from "@/app/actions/editor";
import { LetRiderIn } from "@/components/editor/let-rider-in";
import { PageTitle } from "@/components/form";
import { IconCheck, IconClock } from "@/components/icons";
import { Badge, Callout, Empty } from "@/components/ui";
import { getIndex } from "@/lib/content";
import { dayOf, daysBetween, plural, sayDate } from "@/lib/format";
import { currentUser } from "@/server/auth";
import { inbox, recordOf } from "@/server/reports";
import { flagsOn, tripsForEditor } from "@/server/trips";

export const metadata: Metadata = { title: "The editor’s inbox", robots: { index: false } };

const FLAG_WORDS: Record<string, string> = {
  "money-up-front": "Asks for money up front",
  "unmarked-company": "A tour company, not marked as one",
  "not-real": "Not a real trip",
  other: "Something else",
};

const CHANGE_WORDS: Record<string, string> = {
  closed: "It has closed, or is gone",
  moved: "It has moved",
  "wrong-detail": "A detail is wrong",
  "rule-changed": "The rule has changed",
  other: "Something else",
};

export default async function EditorPage() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/editor");
  if (!user.is_editor) notFound();

  const index = await getIndex();
  const nameOf = (slug: string) => index.routes.find((r) => r.slug === slug)?.name ?? slug;
  const box = inbox();
  const trips = tripsForEditor();
  const total = box.facts.length + box.trips.length + trips.length;
  const today = new Date();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <PageTitle title="The editor’s inbox" lede={`${plural(total, "thing")} to read. Each is weighed against what is already known, then applied or set aside.`} />

      <section className="flex flex-col gap-2">
        <h2 className="display text-2xl">Reports on facts · {box.facts.length}</h2>
        {box.facts.length === 0 ? (
          <Empty title="No reports to read" />
        ) : (
          <ul className="flex flex-col gap-2">
            {box.facts.map((r) => {
              const record = recordOf(r.user_id, r.name);
              const age = daysBetween(r.seen_on, today);
              return (
                <li key={r.id} className="card flex flex-col gap-2 px-3 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <b className="text-[0.9375rem]">{r.fact_title}</b>
                    <Badge tone={r.kind === "changed" ? "ageing" : "fresh"}>
                      {r.kind === "changed" ? "This has changed" : "Still true"}
                    </Badge>
                  </div>
                  <span className="hint">
                    <Link className="link font-medium" href={`/routes/${r.route_slug}#${r.fact_id.replace(/[^a-z0-9-]/gi, "-")}`}>
                      {nameOf(r.route_slug)}
                    </Link>{" "}
                    · from {r.name ?? "a rider with no name given"} · seen {sayDate(r.seen_on)}
                    {r.change_kind ? ` · ${CHANGE_WORDS[r.change_kind] ?? r.change_kind}` : ""}
                  </span>
                  {r.note ? <p className="border-l-[3px] border-line py-0.5 pl-2.5 text-sm whitespace-pre-line">“{r.note}”</p> : null}
                  <ul className="flex flex-col gap-1 text-sm">
                    <li className="flex items-start gap-2">
                      {age <= 7 ? <IconCheck className="mt-0.5 size-4 shrink-0 text-fresh-fg" /> : <IconClock className="mt-0.5 size-4 shrink-0 text-ageing-fg" />}
                      Seen {age === 0 ? "today" : `${plural(age, "day")} ago`}
                    </li>
                    <li className="flex items-start gap-2">
                      {record.applied > 0 ? <IconCheck className="mt-0.5 size-4 shrink-0 text-fresh-fg" /> : <IconClock className="mt-0.5 size-4 shrink-0 text-ageing-fg" />}
                      {record.sent <= 1
                        ? "This rider’s first report"
                        : `This rider has sent ${plural(record.sent - 1, "report")} before. ${record.applied} applied.`}
                    </li>
                    <li className="flex items-start gap-2">
                      {r.user_id ? <IconCheck className="mt-0.5 size-4 shrink-0 text-fresh-fg" /> : <IconClock className="mt-0.5 size-4 shrink-0 text-ageing-fg" />}
                      {r.user_id ? "Sent from an account" : "Sent with no account"}
                    </li>
                  </ul>
                  <form action={decideFactAction} className="flex flex-col gap-2">
                    <input type="hidden" name="id" value={r.id} />
                    {r.kind === "changed" ? (
                      <div className="flex flex-col gap-1">
                        <label htmlFor={`wording-${r.id}`} className="text-sm font-semibold">
                          Wording shown on the page <span className="font-normal text-ink-2">edit before applying</span>
                        </label>
                        <textarea id={`wording-${r.id}`} name="wording" rows={2} maxLength={400} defaultValue={r.note ?? ""} className="field-input" />
                      </div>
                    ) : null}
                    <div className="grid grid-cols-2 gap-2">
                      <button type="submit" name="decision" value="set-aside" className="btn btn-outline">
                        Set aside
                      </button>
                      <button type="submit" name="decision" value="apply" className="btn btn-primary">
                        <IconCheck />
                        Apply to the page
                      </button>
                    </div>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
        <Callout tone="info" title="Nothing is lost">
          Applying adds the report to the fact’s history and changes its date. The fact’s own text lives in the data
          files; change it there and rebuild when a report means the text is wrong.
        </Callout>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="display text-2xl">Trips to look at · {trips.length}</h2>
        {trips.length === 0 ? (
          <Empty title="No trips waiting" />
        ) : (
          <ul className="flex flex-col gap-2">
            {trips.map((t) => {
              const flags = flagsOn(t.id);
              return (
                <li key={t.id} className="card flex flex-col gap-2 px-3 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <Link className="link text-[0.9375rem]" href={`/trips/${t.id}`}>
                      {nameOf(t.route_slug)} · {sayDate(t.leaves_on)}
                    </Link>
                    <Badge tone={t.status === "hidden" ? "stale" : "unchecked"}>
                      {t.status === "hidden" ? "Hidden by reports" : "A first trip"}
                    </Badge>
                  </div>
                  <span className="hint">
                    From {t.from_city} · led by {t.leader_name} · {t.places} places
                    {t.is_company ? " · marked as a tour company" : ""}
                  </span>
                  {flags.length > 0 ? (
                    <ul className="flex flex-col text-sm">
                      {flags.map((f) => (
                        <li key={f.at} className="border-b border-dashed border-line py-1 last:border-b-0">
                          {FLAG_WORDS[f.reason] ?? f.reason}
                          {f.note ? `: “${f.note}”` : ""} <span className="hint">{sayDate(dayOf(f.at))}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <form action={decideTripAction} className="grid grid-cols-2 gap-2">
                    <input type="hidden" name="id" value={t.id} />
                    <button type="submit" name="decision" value="remove" className="btn btn-outline">
                      Remove from the board
                    </button>
                    <button type="submit" name="decision" value="show" className="btn btn-primary">
                      Show on the board
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="display text-2xl">Trip reports · {box.trips.length}</h2>
        {box.trips.length === 0 ? (
          <Empty title="No trip reports to read" />
        ) : (
          <ul className="flex flex-col gap-2">
            {box.trips.map((r) => {
              let body: Record<string, string> = {};
              try {
                body = JSON.parse(r.body) as Record<string, string>;
              } catch {
                body = {};
              }
              return (
                <li key={r.id} className="card flex flex-col gap-2 px-3 py-3">
                  <b className="text-[0.9375rem]">
                    {nameOf(r.route_slug)} · {sayDate(r.month)} · {r.bike}
                  </b>
                  <span className="hint">
                    From {r.name ?? "a rider with no name given"} · sent {sayDate(dayOf(r.created_at))}
                  </span>
                  <dl className="flex flex-col gap-1.5 text-sm">
                    {Object.entries(body)
                      .filter(([, v]) => typeof v === "string" && v)
                      .map(([k, v]) => (
                        <div key={k}>
                          <dt className="label">{k}</dt>
                          <dd className="whitespace-pre-line">{v}</dd>
                        </div>
                      ))}
                  </dl>
                  <form action={decideTripReportAction} className="grid grid-cols-2 gap-2">
                    <input type="hidden" name="id" value={r.id} />
                    <button type="submit" name="decision" value="set-aside" className="btn btn-outline">
                      Set aside
                    </button>
                    <button type="submit" name="decision" value="apply" className="btn btn-primary">
                      Mark as read and used
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
        <p className="hint">
          A trip report is free text. Reading it and carrying its facts into the data files is done by hand for now.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="display text-2xl">Places riders suggested · {box.places.length}</h2>
        {box.places.length === 0 ? (
          <Empty title="No suggestions yet" />
        ) : (
          <ul className="card flex flex-col text-sm">
            {box.places.map((p) => (
              <li key={p.id} className="border-b border-line px-3 py-2 last:border-b-0">
                <b>{p.place}</b>
                {p.note ? ` · ${p.note}` : ""} <span className="hint">{p.name ?? ""}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section id="let-in" className="flex scroll-mt-24 flex-col gap-2">
        <h2 className="display text-2xl">A rider cannot get in</h2>
        <LetRiderIn />
      </section>
    </div>
  );
}
