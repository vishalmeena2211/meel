import type { FactView } from "@/lib/fact-view";

import { IconExternal } from "../icons";
import { Callout, StateBadge } from "../ui";

/**
 * One fact, opened. Used in the sheet that rises from a list, and on the fact's own page.
 * It shows what the fact says, why it carries the label it does, what changed and when,
 * who confirmed it, and where it came from.
 */
export function FactBody({ view, as: Title = "h3" }: { view: FactView; as?: "h1" | "h2" | "h3" }) {
  // The parts of a fact sit one level under its name.
  const Part = Title === "h1" ? "h2" : Title === "h2" ? "h3" : "h4";
  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <Title className="display text-[1.375rem]">{view.title}</Title>
        <span className="mt-0.5">
          <StateBadge state={view.state} />
        </span>
      </div>
      {view.long ? <p className="text-sm leading-5">{view.long}</p> : null}
      {view.meta ? <p className="hint">{view.meta}</p> : null}
      {view.caution ? <p className="text-sm font-medium text-ageing-fg">{view.caution}</p> : null}
      {view.quote ? (
        <blockquote className="border-l-[3px] border-line py-0.5 pl-2.5 text-sm">
          “{view.quote.words}”{" "}
          <span className="hint">
            {view.quote.by}, {view.quote.when}
          </span>
        </blockquote>
      ) : null}
      {view.explain ? (
        <Callout tone={view.explain.tone} title={view.explain.title}>
          {view.explain.words}
        </Callout>
      ) : null}
      {view.link ? (
        <a className="btn btn-soft self-start" href={view.link.url} target="_blank" rel="noreferrer noopener">
          <IconExternal />
          {view.link.label}
        </a>
      ) : null}

      {view.changes.length > 0 ? (
        <section className="flex flex-col gap-1">
          <Part className="label">What changed, and when</Part>
          <ol className="timeline">
            {view.changes.map((c) => (
              <li key={`${c.when}-${c.what}`}>
                <span>{c.when}</span>
                <span className="font-medium">
                  {c.what}{" "}
                  {c.url ? (
                    <a className="link font-medium" href={c.url} target="_blank" rel="noreferrer noopener">
                      {c.host}
                    </a>
                  ) : null}
                </span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {view.history.length > 0 ? (
        <section className="flex flex-col gap-1">
          <Part className="label">History</Part>
          <ol className="timeline">
            {view.history.map((h) => (
              <li key={`${h.when}-${h.what}`}>
                <span>{h.when}</span>
                <span className="font-medium">{h.what}</span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {view.sources.length > 0 ? (
        <section className="flex flex-col gap-1.5">
          <Part className="label">Where this came from</Part>
          <ul className="card flex flex-col">
            {view.sources.map((s) => (
              <li key={s.url} className="border-b border-line last:border-b-0">
                <a
                  href={s.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="flex min-h-12 items-center gap-2.5 px-3 py-2 hover:bg-surface-2"
                >
                  <span className="min-w-0 flex-1">
                    <b className="block text-sm leading-5">{s.title}</b>
                    <span className="hint num block">{s.words}</span>
                  </span>
                  <IconExternal className="size-4 shrink-0 text-ink-2" />
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {view.ask ? <p className="hint">{view.ask}</p> : null}
    </>
  );
}
