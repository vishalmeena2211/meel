"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";

import { track } from "@/lib/analytics";
import type { AskAnswer, AskPicture, AskSource } from "@/lib/ask/types";
import { km } from "@/lib/format";

import { IconExternal, IconPhone, IconPlay, IconPlus, IconRight, IconShare, IconThumb } from "../icons";
import { StateBadge } from "../ui";

import { AskMark } from "./ask-mark";

/* One answer: its sentences with source numbers, Meel's own pictures, the sources, and what to do next. */

/** Turns "No pump in Chitkul [1]." into words and tappable source numbers. */
export function Cited({ text, onCite, first = true }: { text: string; onCite?: (n: number) => void; first?: boolean }) {
  const sentences = text.split(/(?<=[.!?।](?:\s*\[\d+\])*)\s+/);
  return (
    <>
      {sentences.map((s, si) => {
        const parts = s.split(/(\[\d+\])/g).filter(Boolean);
        const body = parts.map((p, i) => {
          const m = /^\[(\d+)\]$/.exec(p);
          if (!m) return <span key={i}>{p}</span>;
          const n = Number(m[1]);
          return (
            <button
              key={i}
              type="button"
              onClick={() => onCite?.(n)}
              aria-label={`Source ${n}`}
              className="num mx-0.5 inline-grid h-[18px] min-w-[18px] place-items-center rounded border border-line bg-surface-2 px-1 align-[1px] text-[0.6875rem] leading-none font-semibold text-sign hover:border-sign"
            >
              {n}
            </button>
          );
        });
        return (
          <span key={si}>
            {si === 0 && first ? <b className="font-semibold">{body}</b> : body}
            {si < sentences.length - 1 ? " " : ""}
          </span>
        );
      })}
    </>
  );
}

export function AnswerHead({ answer, thinking = false, sub }: { answer?: AskAnswer | null; thinking?: boolean; sub?: string }) {
  const label =
    sub ??
    (answer
      ? [answer.sources.length ? `${answer.sources.length} fact${answer.sources.length === 1 ? "" : "s"}` : null, answer.route?.name.split(":")[0]]
          .filter(Boolean)
          .join(" · ")
      : "");
  return (
    <div className="display flex items-center gap-2 text-[0.75rem] font-semibold tracking-[0.1em] text-ink-2 uppercase">
      <AskMark className="size-[22px]" thinking={thinking} />
      Meel
      {label ? <span className="font-sans text-xs font-normal tracking-normal normal-case">· {label}</span> : null}
    </div>
  );
}

function FuelStrip({ p }: { p: Extract<AskPicture, { kind: "fuel" }> }) {
  const total = Math.max(p.total, 1);
  const share = (v: number) => Math.max(0, Math.min(100, (v / total) * 100));
  const stops: number[] = [];
  for (const x of [...p.pumps].map((q) => q.km).sort((a, b) => a - b)) if (!stops.length || x - stops[stops.length - 1]! > 2) stops.push(x);
  const gap = p.gap && p.gap.to - p.gap.from >= 10 ? p.gap : null;
  const label = `Fuel pumps along ${p.routeName}, drawn to scale.${gap ? ` No pump for ${km(gap.to - gap.from)} from near ${gap.fromName} to near ${gap.toName}.` : ""}`;
  return (
    <figure className="flex flex-col gap-1">
      <div role="img" aria-label={label} className="relative mx-1 h-[5.25rem]">
        <span className="hint num absolute top-0 left-0 text-xs">0 km</span>
        <span className="hint num absolute top-0 right-0 text-xs">{km(total)}</span>
        <div className="absolute inset-x-0 top-[2.625rem] h-1.5 rounded-full bg-sign" />
        {gap ? (
          <>
            <div
              className="absolute top-[2.625rem] h-1.5"
              style={{
                left: `${share(gap.from)}%`,
                width: `${share(gap.to) - share(gap.from)}%`,
                background: "repeating-linear-gradient(90deg, var(--color-stale-fg) 0 6px, var(--color-surface) 6px 10px)",
              }}
            />
            <span
              className="font-display absolute top-[1.25rem] -translate-x-1/2 text-xs font-semibold tracking-wider whitespace-nowrap text-stale-fg uppercase"
              style={{ left: `${Math.max(22, Math.min(78, share((gap.from + gap.to) / 2)))}%` }}
            >
              {km(gap.to - gap.from)} · no pump
            </span>
          </>
        ) : null}
        {stops.map((at) => (
          <span key={at} className="absolute top-[2.125rem] h-5 w-0.5 bg-ink" style={{ left: `${share(at)}%` }} />
        ))}
        {p.place ? (
          <span className="absolute top-[3.6rem] -translate-x-1/2 text-center text-xs leading-4 font-semibold" style={{ left: `${Math.max(8, Math.min(92, share(p.place.km)))}%` }}>
            ▲ {p.place.name}
          </span>
        ) : gap ? (
          <>
            <span className="absolute top-[3.6rem] pr-1 text-right text-xs leading-4 font-semibold" style={{ right: `${100 - share(gap.from)}%` }}>
              {gap.fromName}
            </span>
            <span className="absolute top-[3.6rem] pl-1 text-xs leading-4 font-semibold" style={{ left: `${share(gap.to)}%` }}>
              {gap.toName}
            </span>
          </>
        ) : null}
      </div>
      <figcaption className="hint text-xs">Each mark is a pump Meel lists. A pump missing from the map is missing here, so a gap is a worst case.</figcaption>
    </figure>
  );
}

function Picture({ p, slug }: { p: AskPicture; slug: string | null }) {
  switch (p.kind) {
    case "fuel":
      return <FuelStrip p={p} />;
    case "photo":
      return (
        <figure className="overflow-hidden rounded-lg border border-line">
          {/* eslint-disable-next-line @next/next/no-img-element -- the route's own picture, already sized */}
          <img src={p.src} alt={p.caption} className="aspect-[16/9] w-full object-cover" loading="lazy" />
          <figcaption className="hint px-3 py-1.5 text-xs">
            {p.caption}. {p.credit} ·{" "}
            <a className="link" href={p.sourceUrl} target="_blank" rel="noopener noreferrer">
              Wikimedia Commons
            </a>
          </figcaption>
        </figure>
      );
    case "videos":
      return (
        <div className="flex flex-col gap-2">
          <p className="label">Riders’ videos of this stretch</p>
          {p.items.map((v) => (
            <a
              key={v.url}
              href={v.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track("Video opened", { route: slug })}
              className="card grid grid-cols-[112px_1fr] items-center gap-2.5 p-2 hover:border-ink-2"
            >
              <span className="relative grid h-16 place-items-center overflow-hidden rounded-md bg-tarmac">
                {/* eslint-disable-next-line @next/next/no-img-element -- YouTube's own thumbnail */}
                <img src={v.thumb} alt="" className="absolute inset-0 size-full object-cover opacity-80" loading="lazy" />
                <IconPlay className="relative size-5 fill-on-tarmac text-on-tarmac" />
              </span>
              <span className="min-w-0">
                <b className="line-clamp-2 block text-[0.8125rem] leading-[1.125rem]">{v.title}</b>
                <span className="hint block text-xs">
                  {[v.channel, v.stretch, v.filmed ? `filmed ${v.filmed}` : null].filter(Boolean).join(" · ")}
                </span>
              </span>
            </a>
          ))}
        </div>
      );
    case "stretches":
      return (
        <div className="overflow-x-auto rounded-lg border border-line">
          <table className="num w-full text-[0.8125rem]">
            <thead className="bg-surface-2 text-left">
              <tr>
                <th className="label px-2.5 py-1.5">Stretch</th>
                <th className="label px-2.5 py-1.5 text-right">km</th>
                <th className="label px-2.5 py-1.5 text-right">Map app</th>
              </tr>
            </thead>
            <tbody>
              {p.rows.map((r) => (
                <tr key={`${r.from}-${r.to}`} className="border-t border-line">
                  <td className="px-2.5 py-1.5">
                    {r.from} to {r.to}
                  </td>
                  <td className="px-2.5 py-1.5 text-right">{r.km.toLocaleString("en-IN", { maximumFractionDigits: 1 })}</td>
                  <td className="px-2.5 py-1.5 text-right whitespace-nowrap">
                    {Math.floor(r.hours)} h {Math.round((r.hours % 1) * 60)} min
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "offices":
      return (
        <div className="card flex flex-col">
          {p.rows.map((r) => {
            const inner = (
              <>
                <span className="min-w-0 flex-1">
                  <b className="block text-sm leading-5">{r.title}</b>
                  <span className="hint block text-xs">{r.line}</span>
                </span>
                {r.url ? <IconExternal className="size-4 shrink-0 text-ink-2" /> : null}
              </>
            );
            return r.url ? (
              <a
                key={r.title}
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => track("Office page opened", { route: slug })}
                className="flex min-h-12 items-center gap-2.5 border-b border-line px-3 py-2 last:border-b-0 hover:bg-surface-2"
              >
                {inner}
              </a>
            ) : (
              <div key={r.title} className="flex min-h-12 items-center gap-2.5 border-b border-line px-3 py-2 last:border-b-0">
                {inner}
              </div>
            );
          })}
        </div>
      );
    case "call":
      return (
        <div className="card flex flex-col">
          <div className="flex min-h-12 items-center gap-2.5 border-b border-line px-3 py-2 last:border-b-0">
            <span className="grid size-8 place-items-center rounded-md bg-surface-2">
              <IconPhone className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <b className="num block text-base leading-5 select-all">{p.number}</b>
              <span className="hint block text-xs">{p.words}</span>
            </span>
          </div>
          {p.href ? (
            <Link href={p.href} className="flex min-h-12 items-center gap-2.5 px-3 py-2 hover:bg-surface-2">
              <span className="min-w-0 flex-1">
                <b className="block text-sm leading-5">Emergency card for this route</b>
                <span className="hint block text-xs">Nearest hospitals and police</span>
              </span>
              <IconRight className="size-4 shrink-0 text-ink-2" />
            </Link>
          ) : null}
        </div>
      );
    case "tool":
      return (
        <Link href={p.href} className="btn btn-soft self-start">
          {p.title}
          <IconRight className="size-4" />
        </Link>
      );
  }
}

export function SourceRows({ sources, onOpen, hi }: { sources: AskSource[]; onOpen: (s: AskSource) => void; hi?: number | null }) {
  if (sources.length === 0) return null;
  return (
    <div className="card flex flex-col">
      {sources.map((s) => (
        <button
          key={`${s.n}-${s.id}`}
          type="button"
          onClick={() => onOpen(s)}
          className={`flex min-h-12 items-center gap-2.5 border-b border-line px-3 py-2 text-left last:border-b-0 hover:bg-surface-2 ${hi === s.n ? "bg-sign-soft" : ""}`}
        >
          <span className="num grid h-[18px] min-w-[18px] place-items-center rounded border border-line bg-surface-2 px-1 text-[0.6875rem] font-semibold text-sign">
            {s.n}
          </span>
          <span className="min-w-0 flex-1">
            <b className="block text-[0.8125rem] leading-[1.125rem]">{s.title}</b>
            <span className="hint line-clamp-2 text-xs">{s.line}</span>
          </span>
          {s.state ? <StateBadge state={s.state} /> : null}
          <IconRight className="size-4 shrink-0 text-ink-2" />
        </button>
      ))}
    </div>
  );
}

/** The sheet a source number opens: the fact as the route page shows it, and the way to it. */
export function SourceSheet({ source, onClose }: { source: AskSource | null; onClose: () => void }) {
  return (
    <dialog
      ref={(el) => {
        if (el && source && !el.open) el.showModal();
      }}
      className="sheet"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) e.currentTarget.close();
      }}
    >
      {source ? (
        <div className="flex flex-col gap-3 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <span className="mx-auto h-1 w-10 rounded-full bg-line md:hidden" aria-hidden="true" />
          <span className="hint text-xs">
            Source {source.n} · {source.routeName}
          </span>
          <div className="fact flex flex-col gap-1.5" data-hi="true">
            <div className="flex items-start justify-between gap-2">
              <b className="text-[0.9375rem] leading-5">{source.title}</b>
              {source.state ? <StateBadge state={source.state} /> : null}
            </div>
            <p className="text-sm leading-5">{source.line}</p>
          </div>
          <Link href={source.href} className="btn btn-outline btn-block" onClick={() => track("Ask Meel source opened", { kind: source.id.split(":")[0] ?? "fact" })}>
            Open on the route page
          </Link>
          <form method="dialog">
            <button className="btn btn-block">Close</button>
          </form>
        </div>
      ) : null}
    </dialog>
  );
}

const REASONS = [
  ["out-of-date", "A fact is out of date"],
  ["not-in-sources", "It said something the sources don’t"],
  ["wrong-question", "It answered a different question"],
  ["other", "Something else"],
] as const;

/** "This answer is wrong": one tap, an optional line, to the editor. */
export function WrongSheet({ id, kind, open, onClose }: { id: string; kind: string; open: boolean; onClose: (sent: boolean) => void }) {
  const [reason, setReason] = useState<(typeof REASONS)[number][0]>("out-of-date");
  const [note, setNote] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "failed">("idle");
  return (
    <dialog
      ref={(el) => {
        if (el && open && !el.open) el.showModal();
        if (el && !open && el.open) el.close();
      }}
      className="sheet"
      onClose={() => onClose(false)}
    >
      <form
        className="flex flex-col gap-3 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
        onSubmit={async (e) => {
          e.preventDefault();
          setState("sending");
          try {
            const r = await fetch("/api/ask/answer", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "report", id, reason, note: note.trim() || undefined }),
            });
            if (!r.ok) throw new Error();
            track("Ask Meel marked wrong", { kind, reason });
            onClose(true);
          } catch {
            setState("failed");
          }
        }}
      >
        <span className="mx-auto h-1 w-10 rounded-full bg-line md:hidden" aria-hidden="true" />
        <h2 className="display text-2xl">What was wrong?</h2>
        <fieldset className="flex flex-col gap-1">
          {REASONS.map(([value, words]) => (
            <label key={value} className="flex min-h-11 items-center gap-2.5 rounded-lg px-1 text-sm">
              <input type="radio" name="reason" value={value} checked={reason === value} onChange={() => setReason(value)} className="size-4 accent-[var(--color-sign)]" />
              {words}
            </label>
          ))}
        </fieldset>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          <span>
            What did you see? <em className="hint font-normal not-italic">optional</em>
          </span>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={600} rows={3} className="field-input" />
        </label>
        <p className="rounded-lg border border-line bg-surface-2 px-3 py-2.5 text-sm leading-5">
          <b className="block">Goes to the editor</b>
          With the question, the answer and the facts it used. Your name only if you’re logged in.
        </p>
        {state === "failed" ? <p className="text-sm text-danger">That didn’t send. Try again in a minute.</p> : null}
        <button type="submit" className="btn btn-primary btn-block" disabled={state === "sending"}>
          {state === "sending" ? "Sending…" : "Send to the editor"}
        </button>
        <button type="button" className="btn btn-block" onClick={() => onClose(false)}>
          Cancel
        </button>
      </form>
    </dialog>
  );
}

export function Pictures({ answer }: { answer: AskAnswer }) {
  if (answer.pictures.length === 0) return null;
  return (
    <div className="flex flex-col gap-2.5">
      {answer.pictures.map((p, i) => (
        <Picture key={i} p={p} slug={answer.route?.slug ?? null} />
      ))}
    </div>
  );
}

/** Useful, This answer is wrong, Share. */
export function AnswerActions({ answer, extra }: { answer: AskAnswer; extra?: ReactNode }) {
  const [useful, setUseful] = useState(false);
  const [wrong, setWrong] = useState(false);
  const [sent, setSent] = useState(false);
  const [shared, setShared] = useState<string | null>(null);

  async function share() {
    try {
      const r = await fetch("/api/ask/answer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "share", id: answer.id }) });
      const body = (await r.json()) as { ok: boolean; path?: string };
      if (!body.ok || !body.path) throw new Error();
      const url = `${location.origin}${body.path}`;
      const first = answer.text.split(/(?<=[.!?।])\s/)[0]?.replace(/\s*\[\d+\]/g, "") ?? "";
      if (navigator.share) {
        await navigator.share({ title: "Ask Meel", text: first, url });
        track("Ask Meel shared", { via: "share sheet" });
      } else {
        await navigator.clipboard.writeText(url);
        track("Ask Meel shared", { via: "copy" });
        setShared("Link copied");
      }
    } catch {
      // Closing the share sheet lands here too. Nothing to say.
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          aria-pressed={useful}
          disabled={useful}
          onClick={() => {
            setUseful(true);
            track("Ask Meel marked useful", { kind: answer.kind });
            void fetch("/api/ask/answer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "useful", id: answer.id, useful: true }) });
          }}
          className="btn btn-outline !min-h-8 !px-2.5 text-[0.8125rem]"
        >
          <IconThumb className="size-3.5" />
          {useful ? "Thanks" : "Useful"}
        </button>
        <button type="button" disabled={sent} onClick={() => setWrong(true)} className="btn btn-outline !min-h-8 !px-2.5 text-[0.8125rem]">
          {sent ? "Sent to the editor" : "This answer is wrong"}
        </button>
        <button type="button" onClick={share} className="btn btn-outline !min-h-8 !px-2.5 text-[0.8125rem]">
          <IconShare className="size-3.5" />
          {shared ?? "Share"}
        </button>
        {extra}
      </div>
      {sent ? (
        <p className="rounded-lg border border-sign-line bg-sign-soft px-3 py-2.5 text-sm leading-5">
          <b className="block">Thanks. Sent to the editor.</b>A fact changed by your report shows your name and date on the route page.
        </p>
      ) : null}
      <WrongSheet
        id={answer.id}
        kind={answer.kind}
        open={wrong}
        onClose={(ok) => {
          setWrong(false);
          if (ok) setSent(true);
        }}
      />
    </div>
  );
}

export function NoFactBox({ question }: { question: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-rule px-3.5 py-4 text-center text-ink-2">
      <b className="text-[0.9375rem] text-ink">Been there?</b>
      <span className="text-sm">Tell Meel and it goes to the editor with your name and date.</span>
      <Link href={`/report?suggest=${encodeURIComponent(question.slice(0, 120))}`} className="btn btn-soft">
        <IconPlus className="size-4" />
        Add what you know
      </Link>
    </div>
  );
}
