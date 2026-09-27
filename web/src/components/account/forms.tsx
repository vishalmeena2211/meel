"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";

import { deleteAccountAction, logInAction, signUpAction, updateProfileAction } from "@/app/actions/auth";

import { BLANK, ErrorSummary, Field } from "../form";
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
      <button type="submit" className="btn btn-primary btn-block" disabled={pending}>
        {pending ? "Creating your account" : "Create account"}
      </button>
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
      <button type="submit" className="btn btn-primary btn-block" disabled={pending}>
        {pending ? "Logging in" : "Log in"}
      </button>
      <Callout title="New here?">
        <Link className="link" href={`/signup?next=${encodeURIComponent(next)}`}>
          Create an account
        </Link>
      </Callout>
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

export function DeleteAccount({ shownAs, joined, confirmed }: { shownAs: string; joined: number; confirmed: number }) {
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
      <button type="button" className="link self-start !text-danger" onClick={() => setOpen(true)}>
        Delete my account
      </button>
      <dialog
        ref={dialog}
        onClose={() => setOpen(false)}
        aria-labelledby="delete-title"
        className="m-0 mt-auto w-full max-w-none rounded-t-2xl bg-surface p-0 text-ink backdrop:bg-ink/45 md:m-auto md:max-w-md md:rounded-2xl"
      >
        <form action={action} className="flex flex-col gap-3 px-4 pt-4 pb-6">
          <h3 id="delete-title" className="display text-[1.375rem]">
            Delete {shownAs}’s account?
          </h3>
          <p className="hint text-sm">This cannot be undone.</p>
          <ul className="flex flex-col gap-2 text-sm">
            <li>Your name, email, city and bike are removed.</li>
            <li>
              {joined > 0
                ? `You leave the ${joined} ${joined === 1 ? "trip" : "trips"} you have joined or lead. Trips you lead are withdrawn.`
                : "You have no trips to leave."}
            </li>
            <li>
              {confirmed > 0
                ? `The ${confirmed} ${confirmed === 1 ? "fact" : "facts"} you confirmed stay, shown as “confirmed by a rider”.`
                : "Reports you sent stay, with no name on them."}
            </li>
          </ul>
          <Field
            label="Type your password to go ahead"
            name="password"
            type="password"
            autoComplete="current-password"
            error={state.errors.password}
          />
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
