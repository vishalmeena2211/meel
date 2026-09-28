"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";

import {
  addPasswordAction,
  changePasswordAction,
  deleteAccountAction,
  finishProfileAction,
  logInAction,
  signUpAction,
  updateProfileAction,
} from "@/app/actions/auth";

import { BLANK, ErrorSummary, Field } from "../form";
import { IconCheck, IconClock, IconRight } from "../icons";
import { ListPicker } from "../pickers";
import { Foot } from "../shell";
import { Callout } from "../ui";

export function SignUpForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(signUpAction, BLANK);
  const v = state.values ?? {};
  return (
    <form action={action} className="flex flex-col gap-3" noValidate>
      <ErrorSummary state={state} />
      <input type="hidden" name="next" value={next} />
      <Field
        label="Your name"
        name="name"
        autoComplete="name"
        defaultValue={v.name}
        error={state.errors.name}
        hint="Shown as first name and one letter, such as “Rahul N.”"
        required
      />
      <Field
        label="Email"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="none"
        defaultValue={v.email}
        error={state.errors.email}
        hint="For logging in. Never shown to anyone."
        required
      />
      {state.errors.email?.startsWith("An account with this email") ? (
        <Callout tone="info" title="Is it yours?">
          <Link className="link" href={`/login?next=${encodeURIComponent(next)}`}>
            Log in
          </Link>{" "}
          with this email, or use a different one here.
        </Callout>
      ) : null}
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        error={state.errors.password}
        hint="At least 10 characters."
        required
      />
      <Field
        label="Home city"
        name="home_city"
        autoComplete="address-level2"
        defaultValue={v.home_city}
        error={state.errors.home_city}
        hint="Shown to the leader of a trip you ask to join."
        required
      />
      <Field
        label="Your bike"
        name="bike"
        optional="optional"
        defaultValue={v.bike}
        error={state.errors.bike}
        hint="Such as Royal Enfield Classic 350."
      />
      <div className="flex flex-col gap-1">
        <label className="flex items-start gap-2.5 text-[0.9375rem]">
          <input
            id="agreed"
            type="checkbox"
            name="agreed"
            value="yes"
            aria-invalid={state.errors.agreed ? true : undefined}
            className="mt-0.5 size-[18px] shrink-0 accent-sign"
          />
          <span>
            I am 18 or older, and I have read the{" "}
            <Link className="link" href="/rules" target="_blank">
              rules for riding together
            </Link>
          </span>
        </label>
        {state.errors.agreed ? <p className="text-sm font-medium text-stale-fg">{state.errors.agreed}</p> : null}
      </div>
      <Foot>
        <button type="submit" className="btn btn-primary btn-block" disabled={pending}>
          {pending ? "Creating your account" : "Create account"}
        </button>
      </Foot>
      <p className="hint text-center">
        Already have one?{" "}
        <Link className="link" href={`/login?next=${encodeURIComponent(next)}`}>
          Log in
        </Link>
      </p>
    </form>
  );
}

export function LogInForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(logInAction, BLANK);
  return (
    <form action={action} className="flex flex-col gap-3" noValidate>
      {state.message && !state.ok ? (
        <div role="alert" className="rounded-lg border border-stale-fg/30 bg-stale-bg px-3 py-2.5 text-sm">
          <b className="block">{state.message.split(". ")[0]}.</b>
          {state.message.split(". ").slice(1).join(". ")}
        </div>
      ) : null}
      <input type="hidden" name="next" value={next} />
      <Field
        label="Email"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="none"
        defaultValue={state.values?.email}
        error={state.errors.email}
        required
      />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        error={state.errors.password}
        required
      />
      <Link className="link self-start text-sm" href="/forgotten-password">
        I have forgotten my password
      </Link>
      <Callout title="New here?">
        <Link className="link" href={`/signup?next=${encodeURIComponent(next)}`}>
          Create an account
        </Link>
      </Callout>
      <Foot>
        <button type="submit" className="btn btn-primary btn-block" disabled={pending}>
          {pending ? "Logging in" : "Log in"}
        </button>
      </Foot>
    </form>
  );
}

/** The first time with Google: what Google does not know. */
export function FinishProfileForm({ name, email, next }: { name: string; email: string; next: string }) {
  const [state, action, pending] = useActionState(finishProfileAction, BLANK);
  const v = state.values ?? { name };
  return (
    <form action={action} className="flex flex-col gap-3" noValidate>
      <Callout tone="info" title="Google gave Meel your name and email">
        Nothing else. Meel still needs what Google does not know.
      </Callout>
      <ErrorSummary state={state} />
      <input type="hidden" name="next" value={next} />
      <Field
        label="Your name"
        name="name"
        autoComplete="name"
        defaultValue={v.name}
        error={state.errors.name}
        hint="From Google. Shown as first name and one letter, such as “Rahul N.” Change it if you like."
        required
      />
      <Field
        label="Email"
        name="email_shown"
        type="email"
        value={email}
        readOnly
        className="field-input bg-surface-2"
        hint="Checked by Google. For logging in. Never shown to anyone."
      />
      <Field
        label="Home city"
        name="home_city"
        autoComplete="address-level2"
        defaultValue={v.home_city}
        error={state.errors.home_city}
        hint="Shown to the leader of a trip you ask to join."
        required
      />
      <Field
        label="Your bike"
        name="bike"
        optional="optional"
        defaultValue={v.bike}
        error={state.errors.bike}
        hint="Such as Royal Enfield Classic 350."
      />
      <div className="flex flex-col gap-1">
        <label className="flex items-start gap-2.5 text-[0.9375rem]">
          <input
            id="agreed"
            type="checkbox"
            name="agreed"
            value="yes"
            aria-invalid={state.errors.agreed ? true : undefined}
            className="mt-0.5 size-[18px] shrink-0 accent-sign"
          />
          <span>
            I am 18 or older, and I have read the{" "}
            <Link className="link" href="/rules" target="_blank">
              rules for riding together
            </Link>
          </span>
        </label>
        {state.errors.agreed ? <p className="text-sm font-medium text-stale-fg">{state.errors.agreed}</p> : null}
      </div>
      <Foot>
        <button type="submit" className="btn btn-primary btn-block" disabled={pending}>
          {pending ? "Saving" : "Finish"}
        </button>
      </Foot>
    </form>
  );
}

export function ProfileForm({ name, homeCity, bike }: { name: string; homeCity: string; bike: string | null }) {
  const [state, action, pending] = useActionState(updateProfileAction, BLANK);
  const v = state.values ?? { name, home_city: homeCity, bike: bike ?? "" };
  return (
    <form action={action} className="flex flex-col gap-3" noValidate>
      <ErrorSummary state={state} />
      {state.ok ? (
        <p role="status" className="rounded-lg border border-sign-line bg-sign-soft px-3 py-2 text-sm font-medium">
          Saved.
        </p>
      ) : null}
      <Field label="Your name" name="name" autoComplete="name" defaultValue={v.name} error={state.errors.name} required />
      <Field label="Home city" name="home_city" defaultValue={v.home_city} error={state.errors.home_city} required />
      <Field label="Your bike" name="bike" optional="optional" defaultValue={v.bike} error={state.errors.bike} />
      <button type="submit" className="btn btn-soft self-start" disabled={pending}>
        {pending ? "Saving" : "Save changes"}
      </button>
    </form>
  );
}

export function ChangePassword({ oneTime }: { oneTime: boolean }) {
  const [state, action, pending] = useActionState(changePasswordAction, BLANK);
  return (
    <form action={action} className="flex flex-col gap-3" noValidate>
      <ErrorSummary state={state} />
      {state.ok ? (
        <p role="status" className="rounded-lg border border-sign-line bg-sign-soft px-3 py-2 text-sm font-medium">
          {state.message}
        </p>
      ) : null}
      <Field
        label={oneTime ? "The one-time password" : "Your password now"}
        name="present"
        type="password"
        autoComplete="current-password"
        error={state.errors.present}
        required
      />
      <Field
        label="New password"
        name="next_password"
        type="password"
        autoComplete="new-password"
        error={state.errors.next_password}
        hint="At least 10 characters."
        required
      />
      <button type="submit" className={`btn self-start ${oneTime ? "btn-primary" : "btn-soft"}`} disabled={pending}>
        {pending ? "Changing" : "Change password"}
      </button>
      <p className="hint">Anywhere else you are logged in will ask for the new password. This phone stays logged in.</p>
    </form>
  );
}

/** A rider who logs in with Google adds a password of their own. Optional. */
export function AddPassword() {
  const [state, action, pending] = useActionState(addPasswordAction, BLANK);
  return (
    <form action={action} className="flex flex-col gap-3" noValidate>
      <ErrorSummary state={state} />
      {state.ok ? (
        <p role="status" className="rounded-lg border border-sign-line bg-sign-soft px-3 py-2 text-sm font-medium">
          {state.message}
        </p>
      ) : null}
      <Field
        label="New password"
        optional="optional"
        name="next_password"
        type="password"
        autoComplete="new-password"
        error={state.errors.next_password}
        hint="Only if you also want to log in without Google. At least 10 characters."
      />
      <button type="submit" className="btn btn-soft self-start" disabled={pending}>
        {pending ? "Adding" : "Add a password"}
      </button>
    </form>
  );
}

export interface LedTrip {
  id: string;
  name: string;
  riders: Array<{ id: string; name: string }>;
}

export function DeleteAccount({
  shownAs,
  email,
  hasPassword,
  usesGoogle,
  joined,
  leads,
  confirmed,
}: {
  shownAs: string;
  /** Typed to go ahead by a rider who has no password. */
  email: string;
  hasPassword: boolean;
  usesGoogle: boolean;
  joined: number;
  /** Trips this rider leads that have not been ridden yet, with the riders going on each. */
  leads: LedTrip[];
  confirmed: number;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(deleteAccountAction, BLANK);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="flex min-h-12 w-full items-center gap-2.5 border-b border-line px-3 py-2.5 text-left hover:bg-surface-2"
        onClick={() => setOpen(true)}
      >
        <b className="min-w-0 flex-1 text-[0.9375rem] leading-5 text-danger">Delete my account</b>
        <IconRight className="size-4 shrink-0 text-ink-2" />
      </button>
      <dialog ref={dialog} onClose={() => setOpen(false)} aria-labelledby="delete-title" className="sheet">
        <form action={action} className="flex flex-col gap-3 px-4 pt-4 pb-6">
          <h3 id="delete-title" className="display text-[1.375rem]">
            Delete {shownAs}’s account?
          </h3>
          <p className="hint text-sm">This cannot be undone.</p>
          <ul className="flex flex-col gap-2 text-sm">
            <li className="flex items-start gap-2">
              <IconCheck className="mt-0.5 size-4 shrink-0 text-fresh-fg" />
              Your name, email, city and bike are removed
            </li>
            {usesGoogle ? (
              <li className="flex items-start gap-2">
                <IconCheck className="mt-0.5 size-4 shrink-0 text-fresh-fg" />
                Meel forgets your Google account. Your Google account itself is not touched.
              </li>
            ) : null}
            <li className="flex items-start gap-2">
              <IconCheck className="mt-0.5 size-4 shrink-0 text-fresh-fg" />
              {joined > 0
                ? `You leave the ${joined} ${joined === 1 ? "trip" : "trips"} you have joined. Its leader sees that a place has opened.`
                : "You have joined no trip, so there is none to leave"}
            </li>
            <li className="flex items-start gap-2">
              <IconClock className="mt-0.5 size-4 shrink-0 text-ageing-fg" />
              {confirmed > 0
                ? `The ${confirmed} ${confirmed === 1 ? "fact" : "facts"} you confirmed stay, shown as “confirmed by a rider”`
                : "Reports you sent stay, with no name on them"}
            </li>
          </ul>
          {leads.map((t) => (
            <div key={t.id} className="flex flex-col gap-1">
              <label htmlFor={`hand-${t.id}`} id={`hand-${t.id}-label`} className="text-sm font-semibold">
                You lead {t.name}. What happens to it?
              </label>
              <ListPicker
                id={`hand-${t.id}`}
                labelId={`hand-${t.id}-label`}
                title="What happens to your trip"
                name={`hand:${t.id}`}
                defaultValue="withdraw"
                placeholder="Withdraw the trip"
                groups={[
                  {
                    label: "",
                    choices: [
                      { value: "withdraw", label: "Withdraw the trip" },
                      ...t.riders.map((r) => ({ value: r.id, label: `Hand it to ${r.name}, who is going` })),
                    ],
                  },
                ]}
              />
              {t.riders.length === 0 ? <p className="hint">Nobody else is going yet, so it can only be withdrawn.</p> : null}
            </div>
          ))}
          {hasPassword ? (
            <Field
              label="Type your password to go ahead"
              name="password"
              type="password"
              autoComplete="current-password"
              error={state.errors.password}
            />
          ) : (
            <Field
              label="Type your email to go ahead"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="off"
              autoCapitalize="none"
              error={state.errors.email}
              hint={`Type ${email}. You log in with Google and have no password, so your email stands in for it.`}
            />
          )}
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className="btn btn-outline" onClick={() => setOpen(false)}>
              Keep my account
            </button>
            <button type="submit" className="btn btn-danger" disabled={pending}>
              {pending ? "Deleting" : "Delete account"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
