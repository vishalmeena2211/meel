"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from "react";

import { reportTrip, suggest } from "@/app/actions/reports";
import type { FormState } from "@/components/form";
import { track } from "@/lib/analytics";
import { indiaMonth, km, sayDate } from "@/lib/format";

import { Area, BLANK, ErrorSummary, Field, ListField, MonthField, routeGroups } from "../form";
import { IconSend } from "../icons";
import { BackHead, Foot } from "../shell";
import { Callout } from "../ui";

interface Leg {
  from: string;
  to: string;
  km: number;
}

interface Choice {
  slug: string;
  name: string;
  region_name: string;
  legs: Leg[];
}

type Values = Record<string, string>;

const DRAFT = "meel:report-draft";
const COSTS: Array<[string, string]> = [
  ["cost_fuel", "Fuel"],
  ["cost_stays", "Stays"],
  ["cost_food", "Food"],
  ["cost_permits", "Permits and fees"],
  ["cost_repairs", "Repairs"],
];

function isValues(v: unknown): v is Values {
  return typeof v === "object" && v !== null && Object.values(v).every((x) => typeof x === "string");
}

/** A report half written is kept on the rider's own phone, so closing the page does not lose it. */
function readDraft(): Values | null {
  try {
    const value = JSON.parse(window.localStorage.getItem(DRAFT) ?? "null") as unknown;
    return isValues(value) ? value : null;
  } catch {
    return null;
  }
}

function writeDraft(values: Values | null): void {
  try {
    if (values) window.localStorage.setItem(DRAFT, JSON.stringify(values));
    else window.localStorage.removeItem(DRAFT);
  } catch {
    // Not kept. The form still works.
  }
}

const never = () => () => {};

function read(form: HTMLFormElement | null): Values {
  const out: Values = {};
  if (!form) return out;
  for (const [key, value] of new FormData(form).entries()) {
    if (typeof value === "string" && !key.startsWith("$")) out[key] = value;
  }
  return out;
}

function Fold({ title, state, children }: { title: string; state: string; children: React.ReactNode }) {
  return (
    <details className="card group">
      <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 px-3 py-2.5 [&::-webkit-details-marker]:hidden">
        <b className="min-w-0 flex-1 text-[0.9375rem] leading-5">{title}</b>
        <span className="hint num">{state}</span>
      </summary>
      <div className="flex flex-col gap-3 border-t border-line px-3 py-3">{children}</div>
    </details>
  );
}

interface Props {
  routes: Choice[];
  startRoute: string;
  loggedInAs: string | null;
  chatNumber: string | null;
  /** A part of the second step to open at once, as when the rider came to add a video. */
  openAt: "video" | null;
}

/** The form is drawn on the phone itself, once it knows whether a half-written report is waiting there. */
export function TripReportForm(props: Props) {
  const onPhone = useSyncExternalStore(
    never,
    () => true,
    () => false,
  );
  if (!onPhone) return <p className="hint">Opening the form.</p>;
  return <ReportSteps {...props} />;
}

function ReportSteps({ routes, startRoute, loggedInAs, chatNumber, openAt }: Props) {
  const [state, action, pending] = useActionState(reportTrip, BLANK);
  // What the form starts with: what came back from the server, else what this phone kept, else nothing.
  const [kept] = useState<Values | null>(readDraft);
  const v: Values = state.values ?? kept ?? {};
  const form = useRef<HTMLFormElement>(null);
  const [now, setNow] = useState<Values>({});
  const [moved, setMoved] = useState<{ since: FormState; step: 1 | 2 | 3 } | null>(null);
  const [missing, setMissing] = useState<Record<string, string>>({});

  const live: Values = { ...v, ...now };
  const counted = useRef<FormState | null>(null);
  const sentRoute = live.route ?? startRoute ?? null;
  const sentMonth = live.month ?? null;
  useEffect(() => {
    // Counted once for each report the server accepted.
    if (!state.ok || counted.current === state) return;
    counted.current = state;
    track("Trip report sent", { route: sentRoute, month: sentMonth });
  }, [state, sentRoute, sentMonth]);
  const routeSlug = live.route ?? startRoute;
  const route = routes.find((r) => r.slug === routeSlug) ?? null;
  const groups = routeGroups(routes);
  const thisMonth = indiaMonth();
  const errors = { ...state.errors, ...missing };
  const firstStep = ["route", "month", "bike"].some((n) => errors[n]);
  const untouched = state === BLANK;
  const step: 1 | 2 | 3 =
    moved && moved.since === state ? moved.step : untouched ? (openAt ? 2 : 1) : firstStep ? 1 : Object.keys(state.errors).length > 0 ? 2 : 3;

  function changed(event: FormEvent<HTMLFormElement>) {
    const values = read(event.currentTarget);
    setNow(values);
    writeDraft(values);
  }

  // A pick from a list or a month is not a typed change, so it asks for the form to be read again itself.
  function reread() {
    const values = read(form.current);
    setNow(values);
    writeDraft(values);
  }

  function go(to: 1 | 2 | 3) {
    const values = read(form.current);
    if (to > 1) {
      const found: Record<string, string> = {};
      if (!values.route) found.route = "Pick a route.";
      if (!values.month) found.month = "Pick the month you rode.";
      if ((values.bike ?? "").trim().length < 2) found.bike = "Say which bike you rode.";
      setMissing(found);
      if (Object.keys(found).length > 0) {
        setMoved({ since: state, step: 1 });
        return;
      }
    }
    setMoved({ since: state, step: to });
    // Moving forward is counted, so Mixpanel can show where riders give up on the form.
    if (to > 1) track("Trip report step reached", { step: to });
    window.scrollTo({ top: 0 });
  }

  if (state.ok) {
    writeDraft(null);
    return (
      <div className="flex flex-col gap-3">
        <BackHead title="Trip report" sub="Sent" back={route ? `/routes/${route.slug}` : "/"} />
        <p role="status" className="rounded-lg border border-sign-line bg-sign-soft px-3 py-2.5 text-[0.9375rem] font-medium">
          {state.message}
        </p>
        <Link className="btn btn-soft self-start" href={route ? `/routes/${route.slug}` : "/"}>
          {route ? `Back to ${route.name}` : "Back to all routes"}
        </Link>
      </div>
    );
  }

  const legs = route?.legs ?? [];
  const legsFilled = legs.filter((_, i) => (live[`leg:${i}`] ?? "").trim()).length;
  const filled = (names: string[]) => names.some((n) => (live[n] ?? "").trim());
  const costFilled = filled(["cost_total", ...COSTS.map(([n]) => n)]);
  const said = (done: boolean) => (done ? "filled" : "not filled");
  const parts = [
    legsFilled > 0 ? ["Riding hours", `${legsFilled} ${legsFilled === 1 ? "leg" : "legs"}`] : null,
    filled(["fuel"]) ? ["Fuel stops and mechanics", "filled"] : null,
    filled(["gear", "problems"]) ? ["Gear, and what went wrong", "filled"] : null,
    costFilled ? ["What the trip cost", live.cost_total ? `₹${live.cost_total}` : "in parts"] : null,
    filled(["video"]) ? ["Video link", "filled"] : null,
  ].filter((x): x is [string, string] => x !== null);

  const chatText = [
    "Trip report",
    `Route: ${route?.name ?? ""}`,
    `Month: ${sayDate(live.month) ?? ""}`,
    `Bike: ${live.bike ?? ""}`,
    ...legs.flatMap((l, i) => ((live[`leg:${i}`] ?? "").trim() ? [`${l.from} to ${l.to}: ${live[`leg:${i}`]}`] : [])),
    live.fuel ? `Fuel and mechanics: ${live.fuel}` : null,
    live.gear ? `Gear: ${live.gear}` : null,
    live.problems ? `What went wrong: ${live.problems}` : null,
    live.cost_total ? `Cost: ₹${live.cost_total}` : null,
    live.video ? `Video: ${live.video}` : null,
    live.name ? `Name: ${live.name}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <form
      ref={form}
      action={action}
      onChange={changed}
      className="flex flex-col gap-3"
      noValidate
    >
      <BackHead title="Trip report" sub={`Step ${step} of 3`} back={route ? `/routes/${route.slug}` : "/"} />
      <p className="hint hidden md:block">Step {step} of 3</p>
      <ErrorSummary state={{ ...state, errors }} />

      {/* ── step 1: the three things we need ─────────────────────────── */}
      <div hidden={step !== 1} className="flex flex-col gap-3">
        <h2 className="label">Your trip</h2>
        <ListField
          label="Route"
          name="route"
          groups={groups}
          defaultValue={v.route ?? startRoute}
          onValueChange={reread}
          placeholder="Pick a route"
          error={errors.route}
        />
        <MonthField label="Month" title="Month you rode" name="month" max={thisMonth} defaultValue={v.month} onValueChange={reread} error={errors.month} />
        <Field label="Bike" name="bike" defaultValue={v.bike} error={errors.bike} hint="Such as Royal Enfield Classic 350." />
        <Callout tone="info" title="That is enough to send">
          Everything on the next step is optional. Fill in what you remember.
        </Callout>
      </div>

      {/* ── step 2: optional details, folded ─────────────────────────── */}
      <div hidden={step !== 2} className="flex flex-col gap-2">
        <Fold title="Riding hours" state={legs.length > 0 ? `${legsFilled} of ${legs.length} legs filled` : "pick a route first"}>
          <p className="hint">With stops. Type them as you would say them, such as “3 hours 30 min”.</p>
          {legs.map((l, i) => (
            <div key={`${l.from}-${l.to}`} className="flex flex-col gap-1">
              <label htmlFor={`leg-${i}`} className="flex items-baseline justify-between gap-2 text-sm font-semibold">
                {l.from} to {l.to} <span className="hint num font-normal">{km(l.km)}</span>
              </label>
              <input
                id={`leg-${i}`}
                name={`leg:${i}`}
                className="field-input num"
                placeholder="Hours"
                defaultValue={v[`leg:${i}`]}
                aria-invalid={errors[`leg:${i}`] ? true : undefined}
              />
              {errors[`leg:${i}`] ? <p className="text-sm font-medium text-stale-fg">{errors[`leg:${i}`]}</p> : null}
            </div>
          ))}
        </Fold>
        <Fold title="Fuel stops and mechanics" state={said(filled(["fuel"]))}>
          <Area
            label="Which pumps had fuel, which shops fixed what"
            name="fuel"
            optional="optional"
            defaultValue={v.fuel}
            error={errors.fuel}
            hint="Do not give anyone’s phone number."
            maxLength={800}
          />
        </Fold>
        <Fold title="Gear that helped, gear that failed" state={said(filled(["gear", "problems"]))}>
          <Area label="Gear" name="gear" optional="optional" defaultValue={v.gear} error={errors.gear} maxLength={800} />
          <Area
            label="What went wrong with the bike, if anything"
            name="problems"
            optional="optional"
            defaultValue={v.problems}
            error={errors.problems}
            hint="Such as “Clutch cable snapped near Pang. Carried a spare.”"
            maxLength={800}
          />
        </Fold>
        <Fold title="What the trip cost" state={said(costFilled)}>
          <Field
            label="All of it, for one rider, in rupees"
            name="cost_total"
            inputMode="numeric"
            optional="optional"
            defaultValue={v.cost_total}
            error={errors.cost_total}
            hint="On your own bike. A total is enough. The parts below are better."
          />
          <div className="grid grid-cols-2 gap-3">
            {COSTS.map(([name, label]) => (
              <Field
                key={name}
                label={label}
                name={name}
                inputMode="numeric"
                optional="optional"
                defaultValue={v[name]}
                error={errors[name]}
              />
            ))}
            <Field label="Nights" name="nights" inputMode="numeric" optional="optional" defaultValue={v.nights} error={errors.nights} />
          </div>
        </Fold>
        <details className="card group" open={openAt === "video" || filled(["video"])}>
          <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 px-3 py-2.5 [&::-webkit-details-marker]:hidden">
            <b className="min-w-0 flex-1 text-[0.9375rem] leading-5">Video link</b>
            <span className="hint num">{said(filled(["video"]))}</span>
          </summary>
          <div className="flex flex-col gap-3 border-t border-line px-3 py-3">
            <Field
              label="Video link"
              name="video"
              optional="optional"
              inputMode="url"
              defaultValue={v.video}
              error={errors.video}
              hint="From YouTube. It plays there, under your channel’s name."
            />
          </div>
        </details>
        <p className="hint">What you type is kept on this phone until you send it.</p>
      </div>

      {/* ── step 3: review, then send ────────────────────────────────── */}
      <div hidden={step !== 3} className="flex flex-col gap-3">
        <h2 className="label">Your report</h2>
        <div className="card flex flex-col">
          <div className="border-b border-line px-3 py-2.5 last:border-b-0">
            <b className="block text-[0.9375rem] leading-5">{route?.name ?? "No route picked"}</b>
            <span className="hint num">
              {sayDate(live.month) ?? "No month"} · {live.bike || "No bike"}
            </span>
          </div>
          {parts.map(([title, words]) => (
            <div key={title} className="flex items-center gap-2 border-b border-line px-3 py-2.5 last:border-b-0">
              <span className="min-w-0 flex-1">
                <b className="block text-[0.9375rem] leading-5">{title}</b>
                <span className="hint num">{words}</span>
              </span>
              <button type="button" className="link text-sm" onClick={() => go(2)}>
                Change
              </button>
            </div>
          ))}
        </div>
        {loggedInAs ? (
          <p className="hint">Sent as {loggedInAs}.</p>
        ) : (
          <Field
            label="Your name"
            name="name"
            optional="optional, shown beside what you reported"
            autoComplete="name"
            defaultValue={v.name}
            error={errors.name}
            hint="Shown as first name and one letter."
          />
        )}
        <Callout tone="info" title="What happens next">
          The person who keeps Meel reads it. Your riding hours join the others for this route. Nothing else about you
          is kept.
        </Callout>
      </div>

      <Foot>
        {step === 1 ? (
          <div className="grid grid-cols-2 gap-2">
            <button type="submit" className="btn btn-outline" disabled={pending}>
              {pending ? "Sending" : "Send now"}
            </button>
            <button type="button" className="btn btn-primary" onClick={() => go(2)}>
              Add details
            </button>
          </div>
        ) : step === 2 ? (
          <div className="grid grid-cols-[1fr_1.3fr] gap-2">
            <button type="button" className="btn btn-outline" onClick={() => go(1)}>
              Back
            </button>
            <button type="button" className="btn btn-primary" onClick={() => go(3)}>
              Review
            </button>
          </div>
        ) : (
          <>
            <button type="submit" className="btn btn-primary btn-block" disabled={pending}>
              <IconSend />
              {pending ? "Sending" : "Send to Meel"}
            </button>
            {chatNumber ? (
              <a
                className="link self-center text-sm"
                href={`https://wa.me/${chatNumber}?text=${encodeURIComponent(chatText)}`}
                target="_blank"
                rel="noreferrer noopener"
              >
                Send from my chat app instead
              </a>
            ) : null}
            <button type="button" className="link self-center text-sm" onClick={() => go(2)}>
              Back
            </button>
          </>
        )}
      </Foot>
    </form>
  );
}

export function SuggestForm({ place }: { place: string }) {
  const [state, action, pending] = useActionState(suggest, BLANK);
  const v = state.values ?? {};
  if (state.ok) {
    return (
      <p role="status" className="rounded-lg border border-sign-line bg-sign-soft px-3 py-2.5 text-[0.9375rem] font-medium">
        {state.message}
      </p>
    );
  }
  return (
    <form action={action} className="flex flex-col gap-3" noValidate>
      <Field label="Place or route" name="place" defaultValue={v.place ?? place} error={state.errors.place} />
      <Area
        label="Why riders go there"
        name="note"
        optional="optional"
        defaultValue={v.note}
        error={state.errors.note}
        maxLength={400}
      />
      <Field label="Your name" name="name" optional="optional" defaultValue={v.name} error={state.errors.name} />
      <button type="submit" className="btn btn-soft self-start" disabled={pending}>
        {pending ? "Sending" : "Suggest this place"}
      </button>
    </form>
  );
}
