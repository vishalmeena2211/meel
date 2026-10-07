"use client";

import { type FormEvent, useEffect, useId, useRef, useState, useSyncExternalStore } from "react";

import { track } from "@/lib/analytics";
import { CHANGE_CHOICES, MIN_REASON, REASON_WORDS } from "@/lib/change-choices";
import type { FactView } from "@/lib/fact-view";
import { indiaDay, sayDate } from "@/lib/format";
import { keep } from "@/lib/outbox";
import { useStored } from "@/lib/use-stored";

import { IconCheck, IconSend } from "../icons";
import { DayPicker } from "../pickers";
import { FactBody } from "./fact-body";

type Mode = "fact" | "still-true" | "changed";

interface Asked {
  key: string;
  mode: Mode;
  /** Goes up each time the sheet opens, so a form inside starts clean. */
  turn: number;
}

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

function isFacts(value: unknown): value is { facts: Record<string, FactView> } {
  return typeof value === "object" && value !== null && typeof (value as { facts?: unknown }).facts === "object";
}

function onNetwork(changed: () => void): () => void {
  window.addEventListener("online", changed);
  window.addEventListener("offline", changed);
  return () => {
    window.removeEventListener("online", changed);
    window.removeEventListener("offline", changed);
  };
}

/** "28 September", from "2026-09-28". */
function dayWords(day: string): string {
  return (sayDate(day) ?? day).replace(/ \d{4}$/, "");
}

/**
 * The one sheet on a route's screens. It opens a fact, with its history and its source,
 * and it takes a rider's word that the fact is still true or has changed. No account is needed.
 *
 * Rows and buttons ask for it by carrying data-fact or data-report. Nothing else is wired to them.
 */
export function FactSheet({
  routeSlug,
  routeName,
  chatNumber,
}: {
  routeSlug: string;
  routeName: string;
  chatNumber: string | null;
}) {
  const [facts, setFacts] = useState<Record<string, FactView> | null>(null);
  const [failed, setFailed] = useState(false);
  const [asked, setAsked] = useState<Asked | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const turn = useRef(0);
  const asking = useRef(false);

  // The details of every fact on the route are fetched once, shortly after the page has settled.
  useEffect(() => {
    let live = true;
    function load() {
      if (asking.current) return;
      asking.current = true;
      fetch(`/routes/${routeSlug}/facts.json`)
        .then((r) => r.json() as Promise<unknown>)
        .then((data) => {
          if (!live) return;
          if (isFacts(data)) setFacts(data.facts);
          else setFailed(true);
        })
        .catch(() => {
          if (live) setFailed(true);
        })
        .finally(() => {
          asking.current = false;
        });
    }
    const soon = window.setTimeout(load, 1200);
    window.addEventListener("meel:load-facts", load);
    return () => {
      live = false;
      window.clearTimeout(soon);
      window.removeEventListener("meel:load-facts", load);
    };
  }, [routeSlug]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target instanceof Element ? event.target : null;
      const el = target?.closest<HTMLElement>("[data-report], [data-fact]");
      if (!el) return;
      const report = el.dataset.report;
      const key = report ? el.dataset.key : el.dataset.fact;
      if (!key) return;
      event.preventDefault();
      turn.current += 1;
      window.dispatchEvent(new Event("meel:load-facts"));
      setAsked({ key, mode: report === "still-true" || report === "changed" ? report : "fact", turn: turn.current });
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (asked && !el.open) el.showModal();
    if (!asked && el.open) el.close();
  }, [asked]);

  const view = asked && facts ? (facts[asked.key] ?? null) : null;
  const close = () => setAsked(null);

  return (
    <dialog ref={dialog} onClose={close} aria-label="One fact" className="sheet">
      {asked ? (
        <div className="flex flex-col gap-3 px-4 pt-2 pb-6">
          <span className="mx-auto h-1 w-10 shrink-0 rounded bg-line md:hidden" aria-hidden="true" />
          {view === null ? (
            <>
              <p className="text-sm" role="status">
                {failed && !facts
                  ? "No network just now, and this fact was not saved on this phone. Try again when you have a signal."
                  : facts
                    ? "This fact is no longer on the page. It may have been renamed."
                    : "Opening."}
              </p>
              <button type="button" className="btn btn-outline btn-block" onClick={close}>
                Close
              </button>
            </>
          ) : asked.mode === "fact" ? (
            <>
              <FactBody view={view} />
              {view.report ? (
                <div className="mt-1 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className="btn btn-soft"
                    onClick={() => setAsked({ ...asked, mode: "still-true", turn: asked.turn + 1000 })}
                  >
                    <IconCheck />
                    Still true
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => setAsked({ ...asked, mode: "changed", turn: asked.turn + 2000 })}
                  >
                    This has changed
                  </button>
                </div>
              ) : null}
              <button type="button" className="link self-center text-sm" onClick={close}>
                Close
              </button>
            </>
          ) : (
            <ReportForm
              key={asked.turn}
              view={view}
              changed={asked.mode === "changed"}
              routeSlug={routeSlug}
              routeName={routeName}
              chatNumber={chatNumber}
              close={close}
            />
          )}
        </div>
      ) : null}
    </dialog>
  );
}

function ReportForm({
  view,
  changed,
  routeSlug,
  routeName,
  chatNumber,
  close,
}: {
  view: FactView;
  changed: boolean;
  routeSlug: string;
  routeName: string;
  chatNumber: string | null;
  close: () => void;
}) {
  const [state, setState] = useState<Answer>(START);
  const [pending, setPending] = useState(false);
  const [days] = useState(() => ({ today: indiaDay(), yesterday: indiaDay(new Date(Date.now() - 86_400_000)) }));
  const [when, setWhen] = useState<"today" | "yesterday" | "other">("today");
  const [other, setOther] = useState(days.today);
  const [note, setNote] = useState("");
  const [storedName, setStoredName] = useStored("meel:name");
  const [typedName, setTypedName] = useState<string | null>(null);
  const name = typedName ?? storedName ?? "";
  const id = useId();
  const choices = CHANGE_CHOICES[view.choices];
  const offline = useSyncExternalStore(onNetwork, () => !navigator.onLine, () => false);

  // A change is dated by typing the day. A confirmation is dated by one of three taps.
  const seenOn = changed || when === "other" ? other : days[when];

  const chatText = [
    changed ? `This has changed: ${view.title}` : `Still true: ${view.title}`,
    `Route: ${routeName}`,
    `Seen: ${sayDate(seenOn) ?? seenOn}`,
    note ? `What I saw: ${note}` : null,
    name ? `Name: ${name}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  // Sent to a plain address, not a server action: the page behind the sheet must not move.
  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    // A change needs a reason, in a few words, before it can be sent or kept for later.
    if (changed && note.trim().length < MIN_REASON) {
      setState({ ...START, message: "Something needs fixing.", errors: { note: REASON_WORDS } });
      return;
    }
    const body = new FormData(event.currentTarget);
    const fields = Object.fromEntries([...body.entries()].filter((e): e is [string, string] => typeof e[1] === "string"));
    // With no network the report waits on this phone, with the day the rider saw it.
    const sent = (keptOffline: boolean) =>
      track("Fact report sent", {
        route: routeSlug,
        section: view.section,
        kind: changed ? "changed" : "still-true",
        kept_offline: keptOffline,
      });
    const hold = () => {
      const kept = keep(fields);
      if (kept) sent(true);
      setState(
        kept
          ? {
              ok: true,
              errors: {},
              message: `Kept on this phone. It is sent by itself when you have a signal. The day you saw it, ${dayWords(seenOn)}, is what counts, even if it is sent days from now.`,
            }
          : { ...START, message: "No network, and this phone would not keep the report. Try again when you have a signal." },
      );
    };
    if (!navigator.onLine) {
      hold();
      return;
    }
    setPending(true);
    try {
      const reply = await fetch("/api/fact-report", { method: "POST", body });
      const answer: unknown = await reply.json();
      setState(isAnswer(answer) ? answer : { ...START, message: "That did not go through. Try again." });
      if (isAnswer(answer) && answer.ok) sent(false);
    } catch {
      hold();
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={send} className="flex flex-col gap-3">
      <h3 className="display text-[1.375rem]">
        {changed ? `What has changed at ${view.title}?` : `${view.title} ${view.question}`}
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
            {offline
              ? "You have no network. Your report is kept on this phone and sent by itself when the signal returns."
              : changed
                ? "The fact is not overwritten. Your report is added above it, with the date."
                : "You are saying you saw this yourself. It goes to the person who keeps Meel, and the fact’s date changes once they have read it."}
          </p>
          <input type="hidden" name="route" value={routeSlug} />
          <input type="hidden" name="fact" value={view.id} />
          <input type="hidden" name="title" value={view.title} />
          <input type="hidden" name="kind" value={changed ? "changed" : "still-true"} />
          <input type="hidden" name="seen_on" value={seenOn} />

          {changed ? (
            <>
              <fieldset className="flex flex-col rounded-lg border border-line">
                <legend className="sr-only">What has changed</legend>
                {choices.map(([value, label], i) => (
                  <label
                    key={value}
                    className="flex min-h-[46px] items-center gap-2.5 border-b border-line px-3 text-[0.9375rem] last:border-b-0"
                  >
                    <input
                      type="radio"
                      name="change"
                      value={value}
                      defaultChecked={i === choices.length - 1}
                      className="size-[18px] accent-sign"
                    />
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
              <div className="flex flex-col gap-1">
                <label htmlFor={`${id}-seen`} id={`${id}-seen-label`} className="text-sm font-semibold">
                  When were you there?
                </label>
                <DayPicker
                  id={`${id}-seen`}
                  labelId={`${id}-seen-label`}
                  title="When were you there?"
                  value={other}
                  onValueChange={setOther}
                  max={days.today}
                  invalid={!!state.errors.seen_on}
                />
              </div>
            </>
          ) : (
            <fieldset className="flex flex-col gap-1">
              <legend className="mb-1 text-sm font-semibold">When were you there?</legend>
              <div className="flex flex-col rounded-lg border border-line">
                {(
                  [
                    ["today", `Today, ${dayWords(days.today)}`],
                    ["yesterday", `Yesterday, ${dayWords(days.yesterday)}`],
                    ["other", "Another day"],
                  ] as const
                ).map(([value, label]) => (
                  <label
                    key={value}
                    className="flex min-h-[46px] items-center gap-2.5 border-b border-line px-3 text-[0.9375rem] last:border-b-0"
                  >
                    <input
                      type="radio"
                      name="when"
                      value={value}
                      checked={when === value}
                      onChange={() => setWhen(value)}
                      className="size-[18px] accent-sign"
                    />
                    {label}
                  </label>
                ))}
              </div>
              {when === "other" ? (
                <div className="mt-1">
                  <span id={`${id}-other-label`} className="sr-only">
                    The day you were there
                  </span>
                  <DayPicker
                    id={`${id}-other`}
                    labelId={`${id}-other-label`}
                    title="The day you were there"
                    value={other}
                    onValueChange={setOther}
                    max={days.today}
                    invalid={!!state.errors.seen_on}
                  />
                </div>
              ) : null}
            </fieldset>
          )}
          {state.errors.seen_on ? <p className="text-sm font-medium text-stale-fg">{state.errors.seen_on}</p> : null}

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
            {pending ? "Sending" : offline ? "Keep it and send later" : "Send to Meel"}
          </button>
          {chatNumber && !offline ? (
            <a
              className="link self-center text-sm"
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
