"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";

import { reportFact, type FormState } from "@/app/actions/reports";
import { useStored } from "@/lib/use-stored";

import { IconCheck, IconSend } from "../icons";

const START: FormState = { ok: false, message: "", errors: {} };

const CHANGES = [
  ["closed", "It has closed, or is gone"],
  ["moved", "It has moved"],
  ["wrong-detail", "A detail here is wrong"],
  ["rule-changed", "The rule has changed"],
  ["other", "Something else"],
] as const;

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * The two buttons beside a fact. No account is needed.
 * If the site has a chat number, the rider can send through their chat app instead.
 */
export function FactActions({
  routeSlug,
  routeName,
  factId,
  title,
  chatNumber,
}: {
  routeSlug: string;
  routeName: string;
  factId: string;
  title: string;
  chatNumber: string | null;
}) {
  const [open, setOpen] = useState<"still-true" | "changed" | null>(null);
  const [state, action, pending] = useActionState(reportFact, START);
  const [seenOn, setSeenOn] = useState(today);
  const [note, setNote] = useState("");
  const [storedName, setStoredName] = useStored("meel:name");
  const [typedName, setTypedName] = useState<string | null>(null);
  const name = typedName ?? storedName ?? "";
  const dialog = useRef<HTMLDialogElement>(null);
  const id = useId();

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  const chatText = [
    open === "changed" ? `This has changed: ${title}` : `Still true: ${title}`,
    `Route: ${routeName}`,
    `Seen: ${seenOn}`,
    note ? `What I saw: ${note}` : null,
    name ? `Name: ${name}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <>
      <div className="mt-1.5 grid grid-cols-2 gap-2">
        <button type="button" className="btn btn-soft" onClick={() => setOpen("still-true")}>
          <IconCheck />
          Still true
        </button>
        <button type="button" className="btn btn-outline" onClick={() => setOpen("changed")}>
          This has changed
        </button>
      </div>

      <dialog
        ref={dialog}
        onClose={() => setOpen(null)}
        aria-labelledby={`${id}-title`}
        className="m-0 mt-auto w-full max-w-none rounded-t-2xl bg-surface p-0 text-ink backdrop:bg-ink/45 md:m-auto md:max-w-md md:rounded-2xl"
      >
        <form action={action} className="flex flex-col gap-3 px-4 pt-3 pb-6">
          <span className="mx-auto h-1 w-10 rounded bg-line md:hidden" aria-hidden="true" />
          <h3 id={`${id}-title`} className="display text-[1.375rem]">
            {open === "changed" ? `What has changed? ${title}` : `${title}: still true?`}
          </h3>

          {state.ok ? (
            <>
              <p className="rounded-lg border border-sign-line bg-sign-soft px-3 py-2.5 text-sm" role="status">
                {state.message}
              </p>
              <button type="button" className="btn btn-primary btn-block" onClick={() => setOpen(null)}>
                Done
              </button>
            </>
          ) : (
            <>
              <p className="hint text-sm">
                {open === "changed"
                  ? "The fact is not overwritten. Your report is added above it, with the date."
                  : "You are saying you saw this yourself, on the day below."}
              </p>
              <input type="hidden" name="route" value={routeSlug} />
              <input type="hidden" name="fact" value={factId} />
              <input type="hidden" name="title" value={title} />
              <input type="hidden" name="kind" value={open ?? "still-true"} />

              {open === "changed" ? (
                <fieldset className="flex flex-col rounded-lg border border-line">
                  <legend className="sr-only">What has changed</legend>
                  {CHANGES.map(([value, label], i) => (
                    <label
                      key={value}
                      className="flex min-h-[46px] items-center gap-2.5 border-b border-line px-3 text-[0.9375rem] last:border-b-0"
                    >
                      <input
                        type="radio"
                        name="change"
                        value={value}
                        defaultChecked={i === 2}
                        className="size-[18px] accent-sign"
                      />
                      {label}
                    </label>
                  ))}
                </fieldset>
              ) : null}

              {open === "changed" ? (
                <div className="flex flex-col gap-1">
                  <label htmlFor={`${id}-note`} className="text-sm font-semibold">
                    Tell us what you saw
                  </label>
                  <textarea
                    id={`${id}-note`}
                    name="note"
                    rows={3}
                    maxLength={400}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    aria-invalid={state.errors.note ? true : undefined}
                    aria-describedby={state.errors.note ? `${id}-note-error` : undefined}
                    className="field-input"
                  />
                  {state.errors.note ? (
                    <p id={`${id}-note-error`} className="text-sm font-medium text-stale-fg">
                      {state.errors.note}
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div className="flex flex-col gap-1">
                <label htmlFor={`${id}-seen`} className="text-sm font-semibold">
                  When were you there?
                </label>
                <input
                  id={`${id}-seen`}
                  type="date"
                  name="seen_on"
                  value={seenOn}
                  max={today()}
                  onChange={(e) => setSeenOn(e.target.value)}
                  aria-invalid={state.errors.seen_on ? true : undefined}
                  className="field-input num"
                  required
                />
                {state.errors.seen_on ? (
                  <p className="text-sm font-medium text-stale-fg">{state.errors.seen_on}</p>
                ) : null}
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor={`${id}-name`} className="text-sm font-semibold">
                  Your name <span className="font-normal text-ink-2">optional, shown beside the fact</span>
                </label>
                <input
                  id={`${id}-name`}
                  name="name"
                  value={name}
                  maxLength={60}
                  autoComplete="name"
                  onChange={(e) => {
                    setTypedName(e.target.value);
                    setStoredName(e.target.value || null);
                  }}
                  className="field-input"
                />
                <p className="hint">Shown as first name and one letter, such as “Rahul N.”</p>
              </div>

              {state.message && !state.ok ? (
                <p className="text-sm font-medium text-stale-fg" role="alert">
                  {state.message}
                </p>
              ) : null}

              <button type="submit" className="btn btn-primary btn-block" disabled={pending}>
                <IconSend />
                {pending ? "Sending" : "Send to Meel"}
              </button>
              {chatNumber ? (
                <a
                  className="btn btn-outline btn-block"
                  href={`https://wa.me/${chatNumber}?text=${encodeURIComponent(chatText)}`}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  Send from my chat app instead
                </a>
              ) : null}
              <button type="button" className="link self-center text-sm" onClick={() => setOpen(null)}>
                Cancel
              </button>
            </>
          )}
        </form>
      </dialog>
    </>
  );
}
