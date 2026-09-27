"use client";

import Link from "next/link";
import { useActionState } from "react";

import { reportTrip, suggest } from "@/app/actions/reports";
import { indiaMonth } from "@/lib/format";

import { Area, BLANK, ErrorSummary, Field, Select } from "../form";

interface Choice {
  slug: string;
  name: string;
  region_name: string;
}

export function TripReportForm({ routes, startRoute, loggedInAs }: { routes: Choice[]; startRoute: string; loggedInAs: string | null }) {
  const [state, action, pending] = useActionState(reportTrip, BLANK);
  const v = state.values ?? {};
  const regions = [...new Set(routes.map((r) => r.region_name))];
  const thisMonth = indiaMonth();

  if (state.ok) {
    return (
      <div className="flex flex-col gap-3">
        <p role="status" className="rounded-lg border border-sign-line bg-sign-soft px-3 py-2.5 text-[0.9375rem] font-medium">
          {state.message}
        </p>
        <Link className="btn btn-soft self-start" href="/">
          Back to all routes
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-3" noValidate>
      <ErrorSummary state={state} />

      <h2 className="label">The three things we need</h2>
      <Select label="Route" name="route" defaultValue={v.route ?? startRoute} error={state.errors.route}>
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
      <Field
        label="Month you rode"
        name="month"
        type="month"
        max={thisMonth}
        defaultValue={v.month}
        error={state.errors.month}
      />
      <Field
        label="Bike"
        name="bike"
        defaultValue={v.bike}
        error={state.errors.bike}
        hint="Such as Royal Enfield Classic 350."
      />

      <div className="rounded-lg border border-sign-line bg-sign-soft px-3 py-2.5 text-sm">
        <b className="block">That is enough to send</b>
        Everything below is optional. Fill in what you remember.
      </div>

      <h2 className="label mt-1">Optional</h2>
      <Area
        label="Riding hours, leg by leg"
        name="hours"
        optional="optional"
        defaultValue={v.hours}
        error={state.errors.hours}
        hint="Such as “Manali to Jispa, 3 hours 30. Jispa to Sarchu, 4 hours 30.”"
        maxLength={1200}
      />
      <Area
        label="Fuel stops and mechanics you used"
        name="fuel"
        optional="optional"
        defaultValue={v.fuel}
        error={state.errors.fuel}
        hint="Which pumps had fuel. Which shops fixed what. Do not give anyone’s phone number."
        maxLength={800}
      />
      <Area
        label="Gear that helped, and gear that failed"
        name="gear"
        optional="optional"
        defaultValue={v.gear}
        error={state.errors.gear}
        maxLength={800}
      />
      <Area
        label="What the trip cost"
        name="cost"
        optional="optional"
        defaultValue={v.cost}
        error={state.errors.cost}
        hint="For one rider. A total is enough; fuel, stays and food apart is better."
        maxLength={400}
      />
      <div>
        <Field
          label="Video link"
          name="video"
          optional="optional"
          defaultValue={v.video}
          inputMode="url"
          error={state.errors.video}
          hint="From YouTube. It plays there, under your channel’s name."
        />
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
          error={state.errors.name}
          hint="Shown as first name and one letter."
        />
      )}
      <button type="submit" className="btn btn-primary btn-block" disabled={pending}>
        {pending ? "Sending" : "Send trip report"}
      </button>
      <p className="hint">The person who keeps Meel reads it. Nothing else about you is kept.</p>
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
