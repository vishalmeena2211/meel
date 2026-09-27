"use client";

import { type FormEvent, useEffect, useId, useRef, useState } from "react";

import { indiaDay } from "@/lib/format";
import { useStored } from "@/lib/use-stored";

import { IconCheck, IconSend } from "../icons";

type Kind = "still-true" | "changed";

interface Asked {
  factId: string;
  title: string;
  kind: Kind;
  /** Goes up each time a sheet is opened, so the form inside starts clean. */
  turn: number;
}

const EVENT = "meel:report-fact";
interface Answer {
  ok: boolean;
  message: string;
  errors: Record<string, string>;
}

const START: Answer = { ok: false, message: "", errors: {} };

function isAnswer(value: unknown): value is Answer {
  if (typeof value !== "object" || value === null) return false;
  const a = value as Partial<Answer>;
  return typeof a.ok === "boolean" && typeof a.message === "string" && typeof a.errors === "object" && a.errors !== null;
}

const CHANGES = [
  ["closed", "It has closed, or is gone"],
  ["moved", "It has moved"],
  ["wrong-detail", "A detail here is wrong"],
  ["rule-changed", "The rule has changed"],
  ["other", "Something else"],
] as const;


/** The two buttons beside a fact. They only ask the page's one sheet to open. */
export function FactActions({ factId, title }: { factId: string; title: string }) {
  const ask = (kind: Kind) =>
    window.dispatchEvent(new CustomEvent<Omit<Asked, "turn">>(EVENT, { detail: { factId, title, kind } }));
  return (
    <div className="mt-1.5 grid grid-cols-2 gap-2">
      <button type="button" className="btn btn-soft" onClick={() => ask("still-true")}>
        <IconCheck />
        Still true
      </button>
      <button type="button" className="btn btn-outline" onClick={() => ask("changed")}>
        This has changed
      </button>
    </div>
  );
}

/**
 * The one sheet on a route page where a rider confirms or corrects a fact. No account is needed.
 * If the site has a chat number, the rider can send through their chat app instead.
 */
export function FactReporter({
  routeSlug,
  routeName,
  chatNumber,
}: {
  routeSlug: string;
  routeName: string;
  chatNumber: string | null;
}) {
  const [asked, setAsked] = useState<Asked | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const turn = useRef(0);

  useEffect(() => {
    function open(event: Event) {
      const detail = (event as CustomEvent<Omit<Asked, "turn">>).detail;
      turn.current += 1;
      setAsked({ ...detail, turn: turn.current });
    }
    window.addEventListener(EVENT, open);
    return () => window.removeEventListener(EVENT, open);
  }, []);

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (asked && !el.open) el.showModal();
    if (!asked && el.open) el.close();
  }, [asked]);

  return (
    <dialog
      ref={dialog}
      onClose={() => setAsked(null)}
      aria-label="Confirm or correct a fact"
      className="m-0 mt-auto max-h-[92dvh] w-full max-w-none overflow-y-auto rounded-t-2xl bg-surface p-0 text-ink backdrop:bg-ink/45 md:m-auto md:max-w-md md:rounded-2xl"
    >
      {asked ? (
        <ReportForm
          key={asked.turn}
          asked={asked}
          routeSlug={routeSlug}
          routeName={routeName}
          chatNumber={chatNumber}
          close={() => setAsked(null)}
        />
      ) : null}
    </dialog>
  );
}

function ReportForm({
  asked,
  routeSlug,
  routeName,
  chatNumber,
  close,
}: {
  asked: Asked;
  routeSlug: string;
  routeName: string;
  chatNumber: string | null;
  close: () => void;
}) {
  const [state, setState] = useState<Answer>(START);
  const [pending, setPending] = useState(false);
  const [seenOn, setSeenOn] = useState(() => indiaDay());
  const [note, setNote] = useState("");
  const [storedName, setStoredName] = useStored("meel:name");
  const [typedName, setTypedName] = useState<string | null>(null);
  const name = typedName ?? storedName ?? "";
  const id = useId();
  const changed = asked.kind === "changed";

  const chatText = [
    changed ? `This has changed: ${asked.title}` : `Still true: ${asked.title}`,
    `Route: ${routeName}`,
    `Seen: ${seenOn}`,
    note ? `What I saw: ${note}` : null,
    name ? `Name: ${name}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  // Sent to a plain address, not a server action: the page behind the sheet must not move.
  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    try {
      const reply = await fetch("/api/fact-report", { method: "POST", body: new FormData(event.currentTarget) });
      const answer: unknown = await reply.json();
      setState(isAnswer(answer) ? answer : { ...START, message: "That did not go through. Try again." });
    } catch {
      setState({
        ...START,
        message: "No network just now. Your report was not sent. Try again when you have a signal.",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={send} className="flex flex-col gap-3 px-4 pt-3 pb-6">
      <span className="mx-auto h-1 w-10 rounded bg-line md:hidden" aria-hidden="true" />
      <h3 className="display text-[1.375rem]">
        {changed ? `What has changed? ${asked.title}` : `${asked.title}: still true?`}
      </h3>

      {state.ok ? (
        <>
          <p className="rounded-lg border border-sign-line bg-sign-soft px-3 py-2.5 text-sm" role="status">
            {state.message}
          </p>
          <button type="button" className="btn btn-primary btn-block" onClick={close}>
            Done
          </button>
        </>
      ) : (
        <>
          <p className="hint text-sm">
            {changed
              ? "The fact is not overwritten. Your report is added above it, with the date."
              : "You are saying you saw this yourself, on the day below."}
          </p>
          <input type="hidden" name="route" value={routeSlug} />
          <input type="hidden" name="fact" value={asked.factId} />
          <input type="hidden" name="title" value={asked.title} />
          <input type="hidden" name="kind" value={asked.kind} />

          {changed ? (
            <>
              <fieldset className="flex flex-col rounded-lg border border-line">
                <legend className="sr-only">What has changed</legend>
                {CHANGES.map(([value, label], i) => (
                  <label
                    key={value}
                    className="flex min-h-[46px] items-center gap-2.5 border-b border-line px-3 text-[0.9375rem] last:border-b-0"
                  >
                    <input type="radio" name="change" value={value} defaultChecked={i === 2} className="size-[18px] accent-sign" />
                    {label}
                  </label>
                ))}
              </fieldset>
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
            </>
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
              max={indiaDay()}
              onChange={(e) => setSeenOn(e.target.value)}
              aria-invalid={state.errors.seen_on ? true : undefined}
              className="field-input num"
              required
            />
            {state.errors.seen_on ? <p className="text-sm font-medium text-stale-fg">{state.errors.seen_on}</p> : null}
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
          <button type="button" className="link self-center text-sm" onClick={close}>
            Cancel
          </button>
        </>
      )}
    </form>
  );
}
