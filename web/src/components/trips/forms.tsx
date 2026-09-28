"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";

import { askAction, flagAction, postTripAction, type TripFormState } from "@/app/actions/trips";
import { sayDate } from "@/lib/format";
import type { Check } from "@/lib/trip-checks";

import { Area, BLANK, ErrorSummary, Field, Select } from "../form";
import { IconCheck, IconClock } from "../icons";
import { BackHead, Foot } from "../shell";
import { Callout } from "../ui";

interface RouteChoice {
  slug: string;
  name: string;
  region_name: string;
  halts: string[];
}

const START: TripFormState = { ok: false, message: "", errors: {}, step: "form" };

const FIRST_STEP = ["route", "leaves_on", "back_on", "from_city", "places"] as const;

/** Which of the two steps holds the first thing that needs fixing. */
function stepOf(errors: Record<string, string>): 1 | 2 {
  if (Object.keys(errors).length === 0) return 2;
  return FIRST_STEP.some((name) => errors[name]) ? 1 : 2;
}

export function PostTripForm({
  routes,
  startRoute,
  checksFor,
}: {
  routes: RouteChoice[];
  startRoute: string;
  /** Works out the checks on the server, for the review step. */
  checksFor: (route: string, leaves: string, back: string, nights: string[]) => Promise<Check[]>;
}) {
  const [state, action, pending] = useActionState(postTripAction, START);
  const v = state.values ?? {};
  const [route, setRoute] = useState(v.route ?? startRoute);
  const [checks, setChecks] = useState<Check[] | null>(null);
  // The step the rider has moved to, since the form last came back from the server.
  const [moved, setMoved] = useState<{ since: TripFormState; step: 1 | 2 } | null>(null);
  const [missing, setMissing] = useState<Record<string, string>>({});
  const form = useRef<HTMLFormElement>(null);
  const reviewing = state.step === "review";
  const chosen = routes.find((r) => r.slug === route);
  const regions = [...new Set(routes.map((r) => r.region_name))];
  const untouched = state === START;
  const step: 1 | 2 = moved && moved.since === state ? moved.step : untouched ? 1 : stepOf(state.errors);
  const errors = { ...state.errors, ...missing };

  useEffect(() => {
    if (!reviewing || !v.route || !v.leaves_on || !v.back_on) return;
    let live = true;
    checksFor(v.route, v.leaves_on, v.back_on, state.nights ?? []).then((c) => {
      if (live) setChecks(c);
    });
    return () => {
      live = false;
    };
  }, [reviewing, v.route, v.leaves_on, v.back_on, state.nights, checksFor]);

  /** The first step is looked over before the second is shown. The server looks over everything again. */
  function next() {
    const data = new FormData(form.current ?? undefined);
    const text = (name: string) => String(data.get(name) ?? "").trim();
    const found: Record<string, string> = {};
    if (!text("route")) found.route = "Pick a route.";
    if (!text("leaves_on")) found.leaves_on = "Pick the day you leave.";
    if (!text("back_on")) found.back_on = "Pick the day you are back.";
    else if (text("leaves_on") && text("back_on") < text("leaves_on")) found.back_on = "The trip cannot end before it starts.";
    if (text("from_city").length < 2) found.from_city = "Say which city the trip starts from.";
    const places = Number(text("places"));
    if (!Number.isInteger(places) || places < 2) found.places = "At least 2, counting you.";
    else if (places > 12) found.places = "At most 12, counting you.";
    setMissing(found);
    if (Object.keys(found).length === 0) {
      setMoved({ since: state, step: 2 });
      window.scrollTo({ top: 0 });
    }
  }

  if (reviewing) {
    return (
      <form key="review" action={action} className="flex flex-col gap-4">
        <BackHead title="Post a trip" sub="Step 3 of 3" back="/trips" />
        {Object.entries(v).map(([k, val]) => (
          <input key={k} type="hidden" name={k} value={val} />
        ))}
        {(state.nights ?? []).map((n) => (
          <input key={n} type="hidden" name="nights" value={n} />
        ))}
        <h2 className="display text-2xl">Before you publish</h2>
        <dl className="card grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 px-3 py-3 text-sm">
          <dt className="hint">Route</dt>
          <dd className="font-semibold">{chosen?.name}</dd>
          <dt className="hint">Dates</dt>
          <dd className="num">
            {sayDate(v.leaves_on)} to {sayDate(v.back_on)}
          </dd>
          <dt className="hint">From</dt>
          <dd>{v.from_city}</dd>
          <dt className="hint">Places</dt>
          <dd className="num">{v.places}, counting you</dd>
          <dt className="hint">Nights</dt>
          <dd>{(state.nights ?? []).join(", ") || "Not chosen"}</dd>
        </dl>

        <div className="flex flex-col gap-2">
          <h3 className="label">Checked against the route</h3>
          {checks === null ? (
            <p className="hint">Checking.</p>
          ) : checks.length === 0 ? (
            <p className="hint">Nothing on the route page speaks against this plan.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {checks.map((c) => (
                <li key={c.id} className="flex items-start gap-2 text-sm leading-5">
                  {c.tone === "ok" ? (
                    <IconCheck className="mt-0.5 size-4 shrink-0 text-fresh-fg" />
                  ) : (
                    <IconClock className="mt-0.5 size-4 shrink-0 text-ageing-fg" />
                  )}
                  <span>
                    <b>{c.title}.</b> {c.words}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="hint">These warn. They never stop you from publishing.</p>
        </div>

        <Callout tone="info" title="Publishing puts this on the board">
          Anyone can read it. Only riders you accept see the chat group link. You can withdraw the trip at any time.
          Your first trip is read by the editor before it appears.
        </Callout>
        <Foot>
          <div className="grid grid-cols-[1fr_1.3fr] gap-2">
            <button type="submit" name="intent" value="edit" className="btn btn-outline" disabled={pending}>
              Back
            </button>
            <button type="submit" name="intent" value="publish" className="btn btn-primary" disabled={pending}>
              {pending ? "Publishing" : "Publish trip"}
            </button>
          </div>
        </Foot>
      </form>
    );
  }

  return (
    <form key="form" ref={form} action={action} className="flex flex-col gap-3" noValidate>
      <BackHead title="Post a trip" sub={`Step ${step} of 3`} back="/trips" />
      <p className="hint hidden md:block">Step {step} of 3</p>
      <ErrorSummary state={{ ...state, errors }} />

      {/* Both steps stay in the form, so nothing typed is lost when the rider moves between them. */}
      <div hidden={step !== 1} className="flex flex-col gap-3">
        {/* Not a controlled box: a form is reset after it is sent, and a reset must land on the route picked. */}
        <Select
          label="Route"
          name="route"
          defaultValue={route}
          onChange={(e) => setRoute(e.target.value)}
          error={errors.route}
        >
          <option value="">Pick a route</option>
          {regions.map((region) => (
            <optgroup key={region} label={region}>
              {routes
                .filter((r) => r.region_name === region)
                .map((r) => (
                  <option key={r.slug} value={r.slug}>
                    {r.name}
                  </option>
                ))}
            </optgroup>
          ))}
        </Select>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Leaving" name="leaves_on" type="date" defaultValue={v.leaves_on} error={errors.leaves_on} />
          <Field label="Back" name="back_on" type="date" defaultValue={v.back_on} error={errors.back_on} />
        </div>
        <Field label="Starting from" name="from_city" defaultValue={v.from_city} error={errors.from_city} hint="The city riders gather in." />
        <Field
          label="Places, counting you"
          name="places"
          inputMode="numeric"
          defaultValue={v.places ?? "6"}
          error={errors.places}
          hint="Between 2 and 12."
        />

        {chosen && chosen.halts.length > 1 ? (
          <fieldset className="flex flex-col gap-1">
            <legend className="text-sm font-semibold">
              Where you will sleep <span className="font-normal text-ink-2">optional</span>
            </legend>
            <p className="hint">Tick each night halt. The heights are then checked for you.</p>
            <div className="card mt-1 grid sm:grid-cols-2">
              {chosen.halts.map((h) => (
                <label key={h} className="flex min-h-11 items-center gap-2.5 border-b border-line px-3 text-[0.9375rem] last:border-b-0">
                  <input
                    type="checkbox"
                    name="nights"
                    value={h}
                    defaultChecked={(state.nights ?? []).includes(h)}
                    className="size-[18px] accent-sign"
                  />
                  {h}
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}
      </div>

      <div hidden={step !== 2} className="flex flex-col gap-3">
        <fieldset id="pace" className="flex scroll-mt-24 flex-col gap-1">
          <legend className="text-sm font-semibold">Pace</legend>
          <div className="card flex flex-col">
            {(
              [
                ["relaxed", "Relaxed", "Many stops. Nobody left behind."],
                ["steady", "Steady", "Regular stops. Riders keep up."],
                ["fast", "Fast", "Few stops. For experienced riders."],
              ] as const
            ).map(([value, label, words]) => (
              <label key={value} className="flex min-h-[46px] items-center gap-2.5 border-b border-line px-3 py-2 last:border-b-0">
                <input
                  type="radio"
                  name="pace"
                  value={value}
                  defaultChecked={(v.pace ?? "relaxed") === value}
                  className="size-[18px] accent-sign"
                />
                <span>
                  <b className="block text-[0.9375rem] leading-5">{label}</b>
                  <span className="hint">{words}</span>
                </span>
              </label>
            ))}
          </div>
          {errors.pace ? <p className="text-sm font-medium text-stale-fg">{errors.pace}</p> : null}
        </fieldset>
        <Field
          label="Who can join"
          name="who_can_join"
          defaultValue={v.who_can_join ?? "Any bike"}
          error={errors.who_can_join}
          hint="Such as “Any bike”, or “350 cc and above”."
        />
        <Area
          label="What you ask of riders"
          name="asks"
          optional="optional"
          defaultValue={v.asks}
          error={errors.asks}
          hint="Such as “Full riding gear. No riding after dark.”"
          maxLength={300}
        />
        <Field
          label="Chat group link"
          name="chat_link"
          optional="shown only to riders you accept"
          inputMode="url"
          defaultValue={v.chat_link}
          error={errors.chat_link}
        />
        <label className="flex items-start gap-2.5 text-[0.9375rem]">
          <input
            type="checkbox"
            name="is_company"
            value="yes"
            defaultChecked={v.is_company === "yes"}
            className="mt-0.5 size-[18px] shrink-0 accent-sign"
          />
          <span>
            This trip is run by a tour company, or riders pay to join
            <span className="hint block">It is then marked as such, and listed after riders’ own trips.</span>
          </span>
        </label>
      </div>

      <Foot>
        {step === 1 ? (
          <div className="grid grid-cols-[1fr_1.3fr] gap-2">
            <Link className="btn btn-outline" href="/trips">
              Cancel
            </Link>
            <button type="button" className="btn btn-primary" onClick={next}>
              Next
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-[1fr_1.3fr] gap-2">
            <button type="button" className="btn btn-outline" onClick={() => setMoved({ since: state, step: 1 })}>
              Back
            </button>
            <button type="submit" name="intent" value="review" className="btn btn-primary" disabled={pending}>
              {pending ? "Checking" : "Next"}
            </button>
          </div>
        )}
      </Foot>
    </form>
  );
}

export function AskToJoin({ tripId, leader, full }: { tripId: string; leader: string; full: boolean }) {
  const [state, action, pending] = useActionState(askAction, BLANK);
  if (state.ok) {
    return (
      <p role="status" className="rounded-lg border border-sign-line bg-sign-soft px-3 py-2.5 text-sm font-medium">
        {state.message}
      </p>
    );
  }
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="trip" value={tripId} />
      <Area
        label={`A note for ${leader}`}
        name="note"
        optional="optional"
        hint="Such as how long you have ridden, and where. Your name, home city and bike are sent with it."
        error={state.errors.note}
        maxLength={300}
      />
      {state.message ? (
        <p role="alert" className="text-sm font-medium text-stale-fg">
          {state.message}
        </p>
      ) : null}
      <Foot>
        <button type="submit" className={`btn btn-block ${full ? "btn-soft" : "btn-primary"}`} disabled={pending}>
          {pending ? "Sending" : full ? "Tell me if a place opens" : "Ask to join"}
        </button>
      </Foot>
    </form>
  );
}

export function ReportTrip({ tripId }: { tripId: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(flagAction, BLANK);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <>
      <button type="button" className="link self-start text-sm" onClick={() => setOpen(true)}>
        Report this trip
      </button>
      <dialog
        ref={dialog}
        onClose={() => setOpen(false)}
        aria-labelledby="flag-title"
        className="sheet"
      >
        <form action={action} className="flex flex-col gap-3 px-4 pt-4 pb-6">
          <h3 id="flag-title" className="display text-[1.375rem]">
            Report this trip
          </h3>
          {state.ok ? (
            <>
              <p role="status" className="rounded-lg border border-sign-line bg-sign-soft px-3 py-2.5 text-sm">
                {state.message}
              </p>
              <button type="button" className="btn btn-primary btn-block" onClick={() => setOpen(false)}>
                Done
              </button>
            </>
          ) : (
            <>
              <p className="hint text-sm">Reports go to the person who keeps Meel, not to the leader.</p>
              <input type="hidden" name="trip" value={tripId} />
              <fieldset className="card flex flex-col">
                <legend className="sr-only">What is wrong</legend>
                {(
                  [
                    ["money-up-front", "It asks for money up front"],
                    ["unmarked-company", "It is a tour company, not marked as one"],
                    ["not-real", "It is not a real trip"],
                    ["other", "Something else"],
                  ] as const
                ).map(([value, label]) => (
                  <label key={value} className="flex min-h-[46px] items-center gap-2.5 border-b border-line px-3 text-[0.9375rem] last:border-b-0">
                    <input type="radio" name="reason" value={value} className="size-[18px] accent-sign" />
                    {label}
                  </label>
                ))}
              </fieldset>
              {state.errors.reason ? <p className="text-sm font-medium text-stale-fg">{state.errors.reason}</p> : null}
              <Area label="Anything to add" name="note" id="flag-note" optional="optional" maxLength={300} />
              <div className="grid grid-cols-2 gap-2">
                <button type="button" className="btn btn-outline" onClick={() => setOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={pending}>
                  {pending ? "Sending" : "Send report"}
                </button>
              </div>
            </>
          )}
        </form>
      </dialog>
    </>
  );
}
