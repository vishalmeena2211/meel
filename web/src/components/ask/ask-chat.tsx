"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { track } from "@/lib/analytics";
import type { AskAnswer, AskEvent, AskRequest, AskSource } from "@/lib/ask/types";
import { ASK_LIMIT_PHONE, ASK_MAX_QUESTION } from "@/lib/ask/types";

import { IconCheck, IconCloudOff, IconDown, IconPlus, IconRetry, IconUp } from "../icons";

import { AnswerActions, AnswerHead, Cited, NoFactBox, Pictures, SourceRows, SourceSheet } from "./answer-view";
import { AskMark } from "./ask-mark";

/*
  The Ask Meel conversation (wireframes, screens 9 to 23). Each question streams back as JSON lines from /api/ask:
  steps while it looks, each checked sentence as it is written, then the whole answer.
  On a laptop the past questions sit on the left (kept in this browser only) and the sources on the right.
*/

interface Turn {
  key: number;
  question: string;
  route: string | null;
  steps: string[];
  text: string[];
  answer: AskAnswer | null;
  error: string | null;
  limit: { message: string; loggedIn: boolean } | null;
  offline: boolean;
  slow: boolean;
  started: number;
}

const HISTORY = "meel-ask-history";
const INTRO = "meel-ask-intro";

interface Past {
  q: string;
  at: string;
  route: string | null;
}

function readHistory(): Past[] {
  try {
    return (JSON.parse(localStorage.getItem(HISTORY) ?? "[]") as Past[]).slice(0, 30);
  } catch {
    return [];
  }
}

const plain = (text: string) => text.replace(/\s*\[\d+\]/g, "");

export function AskChat({
  initial,
  route,
  fact,
  starters,
  from,
  loggedIn,
}: {
  initial: string | null;
  route: { slug: string; name: string } | null;
  fact: { id: string; title: string } | null;
  starters: string[];
  from: string;
  loggedIn: boolean;
}) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [scope, setScope] = useState<string | null>(route?.slug ?? null);
  const [online, setOnline] = useState(true);
  const [left, setLeft] = useState<number | null>(null);
  const [intro, setIntro] = useState(false);
  const [source, setSource] = useState<AskSource | null>(null);
  const [hi, setHi] = useState<number | null>(null);
  const [history, setHistory] = useState<Past[]>([]);
  const counter = useRef(0);
  const end = useRef<HTMLDivElement>(null);
  const busy = turns.some((t) => !t.answer && !t.error && !t.limit && !t.offline);

  const patch = useCallback((key: number, change: (t: Turn) => Partial<Turn>) => {
    setTurns((all) => all.map((t) => (t.key === key ? { ...t, ...change(t) } : t)));
  }, []);

  const send = useCallback(
    async (raw: string, opts: { route?: string | null; retryOf?: number } = {}) => {
      const question = raw.replace(/\s+/g, " ").trim().slice(0, ASK_MAX_QUESTION);
      if (question.length < 2) return;
      const routeSlug = opts.route !== undefined ? opts.route : scope;
      const key = opts.retryOf ?? ++counter.current;
      const fresh: Turn = { key, question, route: routeSlug, steps: [], text: [], answer: null, error: null, limit: null, offline: false, slow: false, started: Date.now() };
      setTurns((all) => (opts.retryOf ? all.map((t) => (t.key === key ? fresh : t)) : [...all, fresh]));
      setInput("");

      if (!navigator.onLine) {
        patch(key, () => ({ offline: true }));
        track("Ask Meel failed", { why: "offline" });
        return;
      }

      const previousTurn = [...turns].reverse().find((t) => t.answer && !t.answer.noFact);
      const body: AskRequest = {
        question,
        route: routeSlug ?? undefined,
        fact: fact?.id,
        previous: previousTurn?.answer
          ? { question: previousTurn.question, answer: plain(previousTurn.answer.text).slice(0, 1000), route: previousTurn.answer.route?.slug ?? null }
          : undefined,
      };
      track("Ask Meel asked", { kind: "unknown", lang: /[ऀ-ॿ]/.test(question) ? "hi" : "en", route: routeSlug, follow_up: Boolean(previousTurn) });

      const slowTimer = setTimeout(() => patch(key, (t) => (t.text.length || t.answer ? {} : { slow: true })), 15000);
      try {
        const reply = await fetch("/api/ask", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        if (!reply.ok || !reply.body) {
          const message = reply.status === 503 ? "Ask Meel is switched off for now. Every route page is still open to read." : "Ask Meel couldn’t answer just now. This didn’t count towards your questions today.";
          patch(key, () => ({ error: message }));
          track("Ask Meel failed", { why: "error" });
          return;
        }
        const reader = reply.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let cut: number;
          while ((cut = buffer.indexOf("\n")) >= 0) {
            const line = buffer.slice(0, cut);
            buffer = buffer.slice(cut + 1);
            if (!line.trim()) continue;
            const e = JSON.parse(line) as AskEvent;
            if (e.t === "step") patch(key, (t) => ({ steps: [...t.steps, e.text] }));
            else if (e.t === "text") patch(key, (t) => ({ text: [...t.text, e.text] }));
            else if (e.t === "done") {
              patch(key, () => ({ answer: e.answer, slow: false }));
              if (e.left !== null) setLeft(e.left);
              setHi(null);
              track("Ask Meel answered", {
                kind: e.answer.kind,
                lang: e.answer.lang,
                seconds: Math.round((Date.now() - fresh.started) / 100) / 10,
                sources: e.answer.sources.length,
                no_fact: e.answer.noFact,
                copied: e.answer.copied,
                pictures: e.answer.pictures.map((p) => p.kind).join(",") || null,
              });
              const past: Past = { q: question, at: new Date().toISOString(), route: e.answer.route?.slug ?? null };
              setHistory((h) => {
                const next = [past, ...h.filter((x) => x.q !== question)].slice(0, 30);
                try {
                  localStorage.setItem(HISTORY, JSON.stringify(next));
                } catch {
                  // Fine: history is a convenience.
                }
                return next;
              });
            } else if (e.t === "error") {
              patch(key, () => ({ error: e.message, slow: false }));
              track("Ask Meel failed", { why: "error" });
            } else if (e.t === "limit") {
              patch(key, () => ({ limit: { message: e.message, loggedIn: e.loggedIn }, slow: false }));
              setLeft(0);
              track("Ask Meel limit reached", { logged_in: e.loggedIn });
            }
          }
        }
      } catch {
        patch(key, (t) => (t.answer ? {} : { error: "Ask Meel couldn’t answer just now. This didn’t count towards your questions today." }));
        track("Ask Meel failed", { why: "error" });
      } finally {
        clearTimeout(slowTimer);
      }
    },
    [scope, turns, fact, patch],
  );

  // First visit: how answers work. Then the question that came with the link, if any.
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    track("Ask Meel opened", { from });
    setHistory(readHistory());
    setOnline(navigator.onLine);
    let seen = true;
    try {
      seen = localStorage.getItem(INTRO) === "1";
    } catch {
      // No storage: no intro.
    }
    if (!seen && !initial) setIntro(true);
    if (initial) void send(initial);
  }, [from, initial, send]);

  // Offline and back: a question that waited is sent once the signal returns, while this page is open.
  useEffect(() => {
    const up = () => {
      setOnline(true);
      const waiting = turns.find((t) => t.offline);
      if (waiting) void send(waiting.question, { route: waiting.route, retryOf: waiting.key });
    };
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, [turns, send]);

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns]);

  const lastDone = [...turns].reverse().find((t) => t.answer);
  const openSource = (turn: Turn, n: number) => {
    const s = turn.answer?.sources.find((x) => x.n === n);
    if (!s) return;
    track("Fact opened", { route: s.slug, section: "ask" });
    // On a laptop the source is already in the right-hand column: it is marked there. On a phone it opens as a sheet.
    if (window.matchMedia("(min-width: 1024px)").matches && turn === lastDone) {
      setHi(n);
      document.getElementById(`ask-src-${n}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    } else setSource(s);
  };

  const closeIntro = () => {
    setIntro(false);
    try {
      localStorage.setItem(INTRO, "1");
    } catch {
      // Fine.
    }
  };

  return (
    <div className="flex flex-col gap-4 lg:grid lg:h-[calc(100dvh-3.5rem-1px)] lg:grid-cols-[280px_minmax(0,1fr)_360px] lg:gap-0">
      {/* Laptop: past questions, kept in this browser only. */}
      <nav aria-label="Your questions" className="hidden min-h-0 flex-col gap-1 overflow-y-auto border-r border-line bg-surface-2 p-3 lg:flex">
        <div className="flex items-center gap-2 px-1 pt-1 pb-3">
          <AskMark className="size-7" />
          <span className="display text-2xl leading-none">Ask Meel</span>
        </div>
        <button
          type="button"
          className="btn btn-outline btn-block"
          onClick={() => {
            setTurns([]);
            setHi(null);
          }}
        >
          <IconPlus className="size-4" />
          New question
        </button>
        {history.length ? <p className="label px-2 pt-3 pb-1">Asked before</p> : null}
        {history.map((h) => (
          <button
            key={h.at + h.q}
            type="button"
            onClick={() => void send(h.q, { route: h.route })}
            className="flex items-start gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-surface-2"
          >
            <span className="mt-0.5">
              <AskMark className="size-4" />
            </span>
            <span className="line-clamp-2">{h.q}</span>
          </button>
        ))}
        {history.length ? (
          <span className="hint px-2 pt-2 text-xs">
            Kept in this browser only.{" "}
            <button
              type="button"
              className="link"
              onClick={() => {
                setHistory([]);
                try {
                  localStorage.removeItem(HISTORY);
                } catch {
                  // Fine.
                }
              }}
            >
              Clear
            </button>
          </span>
        ) : null}
        <p className="hint mt-auto px-2 pt-6 text-xs leading-5">
          Answers only from Meel’s facts, each with its source and its date. It never says a road is open or closed.
        </p>
      </nav>

      <div className="flex min-w-0 flex-col lg:min-h-0">
      <section aria-label="Conversation" className="flex min-w-0 flex-col pb-28 md:pb-4 lg:flex-1 lg:overflow-y-auto lg:pb-0">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 lg:min-h-full lg:px-6 lg:py-6">
        {!online ? (
          <p className="flex items-center gap-2 rounded-lg bg-tarmac px-3 py-2 text-[0.8125rem] text-on-tarmac">
            <IconCloudOff className="size-4 shrink-0 text-stone" />
            No network. Ask Meel needs signal. Saved route pages still open.
          </p>
        ) : null}

        {turns.length === 0 ? (
          <div className="flex flex-col gap-3 py-2 lg:my-auto">
            {fact ? (
              <div className="rounded-lg border border-stone/60 bg-stone-soft px-3 py-2.5 text-sm leading-5">
                <b className="block">Asking about one fact</b>
                {fact.title}
              </div>
            ) : null}
            {route ? (
              <div className="rounded-lg border border-stone/60 bg-stone-soft px-3 py-2.5 text-sm leading-5">
                <b className="block">Asking about {route.name}</b>
                Answers come from this route first.{" "}
                {scope ? (
                  <button type="button" className="link" onClick={() => setScope(null)}>
                    Ask about all routes
                  </button>
                ) : (
                  <button type="button" className="link" onClick={() => setScope(route.slug)}>
                    Back to this route
                  </button>
                )}
              </div>
            ) : (
              <>
                <AskMark className="size-16" />
                <h2 className="display text-[1.75rem] leading-none uppercase">Ask about a road</h2>
                <p className="max-w-[60ch] text-[0.9375rem] text-ink-2">
                  Fuel, permits, check posts, passes, distances and seasons on Meel’s routes. Every answer shows where it came from, and how old it is.
                </p>
              </>
            )}
            <p className="label">Riders often ask</p>
            <div className="flex flex-col gap-2">
              {starters.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => void send(s)}
                  className="chip !h-auto min-h-10 justify-start !rounded-xl py-2 text-left leading-[1.125rem] !whitespace-normal"
                >
                  <AskMark className="size-4" />
                  {s}
                </button>
              ))}
            </div>
            {!loggedIn ? <p className="hint text-xs">{ASK_LIMIT_PHONE} questions a day without logging in.</p> : null}
          </div>
        ) : null}

        {turns.map((t) => (
          <div key={t.key} className="flex flex-col gap-2.5">
            <p className="max-w-[84%] self-end rounded-[14px_14px_4px_14px] border border-sign-line bg-sign-soft px-3 py-2 text-sm leading-5">{t.question}</p>
            <div className="flex flex-col gap-2.5 text-sm leading-[1.3125rem]">
              {t.answer ? (
                <AnswerHead answer={t.answer} />
              ) : t.error || t.limit || t.offline ? (
                <AnswerHead sub="" />
              ) : (
                <AnswerHead thinking sub={t.text.length ? t.steps.at(-1) : ""} />
              )}

              {!t.answer && !t.error && !t.limit && !t.offline ? (
                t.text.length === 0 ? (
                  <>
                    {t.steps.map((s, i) => (
                      <p key={i} className="flex items-center gap-2 text-[0.8125rem] text-ink-2">
                        <IconCheck className="size-3.5 shrink-0 text-fresh-fg" />
                        <span>{s}</span>
                      </p>
                    ))}
                    <p className="flex items-center gap-2 text-[0.8125rem]">
                      <span className="ask-dash shrink-0" />
                      <span className="ask-shimmer">{t.steps.length ? "Writing the answer" : "Reading your question"}</span>
                    </p>
                    <div className="ask-skel w-[92%]" />
                    <div className="ask-skel w-[78%]" />
                    <div className="ask-skel w-[55%]" />
                    {t.slow ? (
                      <div className="rounded-lg border border-line bg-surface-2 px-3 py-2.5 text-sm leading-5">
                        <b className="block">Taking longer than usual</b>
                        {t.route ? (
                          <>
                            The facts are on the{" "}
                            <Link className="link" href={`/routes/${t.route}`}>
                              route page
                            </Link>{" "}
                            while this finishes.
                          </>
                        ) : (
                          "It is still looking. You can wait, or try again."
                        )}
                      </div>
                    ) : null}
                  </>
                ) : (
                  <p>
                    <Cited text={t.text.join(" ")} />
                    <span className="ask-caret" aria-hidden="true" />
                  </p>
                )
              ) : null}

              {t.answer ? (
                <>
                  <p>
                    <Cited text={t.answer.text} onCite={(n) => openSource(t, n)} first={!t.answer.choices.length} />
                  </p>
                  {t.answer.choices.length ? (
                    <div className="flex flex-col gap-2">
                      {t.answer.choices.map((c) => (
                        <button key={c.slug} type="button" onClick={() => void send(t.question, { route: c.slug })} className="chip !h-auto min-h-10 justify-start !rounded-xl py-2 text-left !whitespace-normal">
                          {c.label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                  <Pictures answer={t.answer} />
                  {t.answer.noFact ? <NoFactBox question={t.question} /> : null}
                  {/* Sources fold into one line on a phone; on a laptop they are in the right-hand column. */}
                  {t.answer.sources.length ? (
                    <details className={`group flex flex-col gap-1.5 ${t === lastDone ? "lg:hidden" : ""}`}>
                      <summary className="flex w-fit cursor-pointer list-none items-center gap-1.5 text-[0.8125rem] font-semibold text-sign [&::-webkit-details-marker]:hidden">
                        {t.answer.noFact
                          ? "The closest facts Meel has"
                          : `${t.answer.sources.length} source${t.answer.sources.length === 1 ? "" : "s"}, with their dates`}
                        <IconDown className="size-4 transition-transform group-open:rotate-180" />
                      </summary>
                      <SourceRows sources={t.answer.sources} onOpen={setSource} />
                    </details>
                  ) : null}
                  {!t.answer.choices.length ? <AnswerActions answer={t.answer} /> : null}
                  {t === lastDone ? <NextRow answer={t.answer} onAsk={(n) => void send(n)} /> : null}
                </>
              ) : null}

              {t.error ? (
                <div className="flex flex-col gap-2">
                  <div className="rounded-lg border border-ageing-fg/30 bg-ageing-bg px-3 py-2.5 text-sm leading-5">
                    <b className="block">Ask Meel couldn’t answer just now</b>
                    {t.error}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className="btn btn-primary" onClick={() => void send(t.question, { route: t.route, retryOf: t.key })}>
                      <IconRetry className="size-4" />
                      Try again
                    </button>
                    {t.route ? (
                      <Link href={`/routes/${t.route}`} className="btn btn-outline">
                        Open the route page
                      </Link>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {t.offline ? (
                <div className="rounded-lg border border-line bg-surface-2 px-3 py-2.5 text-sm leading-5">
                  <b className="block">Not sent yet</b>
                  Your question is kept and sent when signal returns, if this page is still open.{" "}
                  <Link className="link" href="/tools">
                    Saved routes
                  </Link>
                </div>
              ) : null}

              {t.limit ? (
                <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-rule px-3.5 py-4 text-center text-ink-2">
                  <b className="text-[0.9375rem] text-ink">{t.limit.message.split(".")[0]}.</b>
                  <span className="text-sm">{t.limit.message.split(".").slice(1).join(".").trim()}</span>
                  {!t.limit.loggedIn ? (
                    <Link href="/login?next=/ask" className="btn btn-soft">
                      Log in
                    </Link>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        ))}
          <div ref={end} />
        </div>
      </section>
      {/* The box to ask in: fixed to the foot of a phone; on a laptop, pinned under the conversation as in other chat apps. */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!busy) void send(input);
        }}
        className="fixed inset-x-0 bottom-0 z-20 flex flex-col gap-1 border-t border-line bg-surface px-4 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:static md:border-0 md:bg-transparent md:p-0 lg:border-t lg:border-line lg:bg-surface lg:px-6 lg:py-4 lg:[&>*]:mx-auto lg:[&>*]:w-full lg:[&>*]:max-w-3xl"
      >
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="ask-input">
            Your question
          </label>
          <input
            id="ask-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            maxLength={ASK_MAX_QUESTION}
            placeholder={turns.length ? "Ask a follow-up" : scope && route ? `Ask about ${route.name.split(":")[0]}` : "Ask about a road, a pass, a pump or a rule"}
            enterKeyHint="send"
            autoComplete="off"
            className="field-input flex-1 focus:shadow-[0_0_0_3px_var(--color-sign-soft)]"
          />
          <button
            type="submit"
            aria-label="Ask"
            disabled={busy || input.trim().length < 2}
            className="grid size-11 shrink-0 place-items-center rounded-lg bg-sign text-surface disabled:border disabled:border-line disabled:bg-surface-2 disabled:text-rule"
          >
            <IconUp className="size-[18px]" />
          </button>
        </div>
        {left !== null && left <= 3 && left > 0 ? <p className="hint text-xs">{left} question{left === 1 ? "" : "s"} left today.</p> : null}
      </form>
      </div>

      {/* Laptop: the sources of the latest answer, beside it. */}
      <aside aria-label="Sources" className="hidden min-h-0 flex-col gap-2 overflow-y-auto border-l border-line p-4 lg:flex">
        {lastDone?.answer?.sources.length ? (
          <>
            <div className="flex items-baseline justify-between">
              <h2 className="display text-2xl">Sources</h2>
              <span className="hint">
                {lastDone.answer.sources.length} fact{lastDone.answer.sources.length === 1 ? "" : "s"}
              </span>
            </div>
            {lastDone.answer.sources.map((s) => (
              <div key={s.n} id={`ask-src-${s.n}`} className="fact flex flex-col gap-1.5" data-hi={hi === s.n ? "true" : undefined}>
                <div className="flex items-start justify-between gap-2">
                  <b className="text-sm leading-5">
                    <span className="num mr-1.5 inline-grid h-[18px] min-w-[18px] place-items-center rounded border border-line bg-surface-2 px-1 text-[0.6875rem] text-sign">{s.n}</span>
                    {s.title}
                  </b>
                </div>
                <p className="text-[0.8125rem] leading-5 text-ink-2">{s.line}</p>
                <Link href={s.href} className="link text-[0.8125rem]">
                  Open on {s.routeName.split(":")[0]}
                </Link>
              </div>
            ))}
            {lastDone.answer.route ? (
              <Link href={`/routes/${lastDone.answer.route.slug}`} className="btn btn-outline btn-block">
                Open {lastDone.answer.route.name.split(":")[0]}
              </Link>
            ) : null}
          </>
        ) : (
          <p className="hint text-sm">The sources of each answer show here, with their dates.</p>
        )}
      </aside>


      <SourceSheet source={source} onClose={() => setSource(null)} />

      <dialog
        ref={(el) => {
          if (el && intro && !el.open) el.showModal();
          if (el && !intro && el.open) el.close();
        }}
        className="sheet"
        onClose={closeIntro}
      >
        <div className="flex flex-col gap-3 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <span className="mx-auto h-1 w-10 rounded-full bg-line md:hidden" aria-hidden="true" />
          <h2 className="display text-2xl">How Ask Meel answers</h2>
          <ul className="card flex flex-col">
            {[
              ["Only from Meel’s facts", "Never from the open web. If Meel has no fact, it says so."],
              ["Every fact has a date", "The number after a sentence opens the fact, its source and when it was checked."],
              ["Never “open” or “closed”", "For roads and passes it gives the offices that announce it."],
              ["Pictures are Meel’s own", "Route photos with their credit, riders’ videos, Meel’s drawings."],
            ].map(([t, s]) => (
              <li key={t} className="flex flex-col border-b border-line px-3 py-2.5 last:border-b-0">
                <b className="text-sm leading-5">{t}</b>
                <span className="hint text-xs">{s}</span>
              </li>
            ))}
          </ul>
          <p className="rounded-lg border border-line bg-surface-2 px-3 py-2.5 text-sm leading-5">
            <b className="block">Your questions</b>
            Kept for 30 days to see what Meel is missing, without your phone number or account.
          </p>
          <button type="button" className="btn btn-primary btn-block" onClick={closeIntro}>
            Got it
          </button>
        </div>
      </dialog>
    </div>
  );
}

/** At most three things to do next: the route's own tool, if the answer has one, then two questions. */
function NextRow({ answer, onAsk }: { answer: AskAnswer; onAsk: (question: string) => void }) {
  const tool = answer.pictures.find((p) => p.kind === "tool");
  const questions = answer.next.filter((n) => !(tool && /fuel for my bike|altitude check/i.test(n))).slice(0, tool ? 2 : 3);
  if (!tool && questions.length === 0) return null;
  return (
    <div className="scroll-row -mx-4 px-4 md:mx-0 md:flex-wrap md:px-0">
      {tool && tool.kind === "tool" ? (
        <Link href={tool.href} className="chip !border-sign-line !bg-sign-soft font-semibold !text-sign">
          {tool.title}
        </Link>
      ) : null}
      {questions.map((n) => (
        <button key={n} type="button" className="chip" onClick={() => onAsk(n)}>
          {n}
        </button>
      ))}
    </div>
  );
}
