"use client";

import { useActionState } from "react";

import { letRiderInAction, type LetInState } from "@/app/actions/editor";
import { dayOf, plural, sayDate } from "@/lib/format";

import { Field } from "../form";
import { IconCheck } from "../icons";
import { Callout } from "../ui";

const START: LetInState = { email: "", error: "", rider: null, password: null };

/**
 * For a rider who has forgotten their password. Meel sends no email, so the editor sets a one-time password
 * and passes it on by hand. It is shown once, here, and cannot be read again.
 */
export function LetRiderIn() {
  const [state, action, pending] = useActionState(letRiderInAction, START);
  const { rider, password } = state;

  return (
    <form action={action} className="flex flex-col gap-3" noValidate>
      <Callout tone="info" title="Check it is them first">
        Ask something only they would know: a trip they joined, or their bike and home city.
      </Callout>
      <Field
        label="The email on their account"
        name="email"
        id="let-in-email"
        type="email"
        inputMode="email"
        autoCapitalize="none"
        autoComplete="off"
        defaultValue={state.email}
        error={state.error || undefined}
      />

      {rider ? (
        <div className="card flex flex-col gap-0.5 px-3 py-2.5">
          <div className="flex items-start justify-between gap-2">
            <b className="text-[0.9375rem]">{rider.shown_as}</b>
            <span className="hint">{rider.home_city ?? "No home city yet"}</span>
          </div>
          <span className="text-sm">{rider.bike ?? "No bike given"}</span>
          <span className="hint">
            On Meel since {sayDate(dayOf(rider.since).slice(0, 7))} · {plural(rider.trips, "trip")} ·{" "}
            {plural(rider.facts, "fact")} confirmed
          </span>
        </div>
      ) : null}

      {rider?.uses_google && !password ? (
        <>
          <Callout tone="info" title={`${rider.shown_as.split(" ")[0] ?? rider.shown_as} logs in with Google`}>
            Ask them to press “Continue with Google” on the log-in page. That is usually all they need.
          </Callout>
          <p className="text-sm">
            If they have lost their Google account, a one-time password still works. It adds a password to this account.
          </p>
        </>
      ) : null}

      {password ? (
        <>
          <div role="status" className="flex flex-col gap-1 rounded-xl border border-stone/60 bg-stone-soft px-3 py-3">
            <span className="label">One-time password</span>
            <code className="font-display num text-2xl font-bold tracking-wide select-all">{password}</code>
            <span className="text-sm">
              Shown once. Give it to {rider?.shown_as ?? "the rider"} yourself. It is not kept anywhere you can read it
              again.
            </span>
          </div>
          <ul className="flex flex-col gap-1.5 text-sm">
            <li className="flex items-start gap-2">
              <IconCheck className="mt-0.5 size-4 shrink-0 text-fresh-fg" />
              They are logged out everywhere.
            </li>
            <li className="flex items-start gap-2">
              <IconCheck className="mt-0.5 size-4 shrink-0 text-fresh-fg" />
              They are asked to choose their own password when they log in.
            </li>
          </ul>
        </>
      ) : rider ? (
        <button
          type="submit"
          name="intent"
          value="set"
          className={`btn self-start ${rider.uses_google ? "btn-soft" : "btn-primary"}`}
          disabled={pending}
        >
          {pending ? "Setting" : "Set a one-time password"}
        </button>
      ) : (
        <button type="submit" name="intent" value="find" className="btn btn-soft self-start" disabled={pending}>
          {pending ? "Looking" : "Find the account"}
        </button>
      )}
    </form>
  );
}
