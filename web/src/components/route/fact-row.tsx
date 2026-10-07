import type { FactView } from "@/lib/fact-view";
import { hostOf } from "@/lib/format";

import { IconCheck, IconExternal } from "../icons";
import { Badge, StateBadge } from "../ui";

export function factKey(view: Pick<FactView, "section" | "slug">): string {
  return `${view.section}/${view.slug}`;
}

/** The two things a rider can say about a fact. They ask the page's one sheet to open. */
export function FactButtons({ view }: { view: Pick<FactView, "section" | "slug"> }) {
  return (
    <div className="fact-over mt-1.5 grid grid-cols-2 gap-2">
      <button type="button" className="btn btn-soft" data-report="still-true" data-key={factKey(view)}>
        <IconCheck />
        Still true
      </button>
      <button type="button" className="btn btn-outline" data-report="changed" data-key={factKey(view)}>
        This has changed
      </button>
    </div>
  );
}

/**
 * One fact in a list. It is short: what it says, how far to trust it, and one line on where that comes from.
 * Tapping it opens the fact, with its history, its source and the two buttons.
 */
export function FactRow({
  view,
  open = false,
  hi = false,
  full = false,
  short = false,
  mark,
}: {
  view: FactView;
  /** Show the two buttons on the row itself. */
  open?: boolean;
  /** Outline it, as the one fact a link pointed at. */
  hi?: boolean;
  /** Show all of the words, not the first two lines. */
  full?: boolean;
  /** Leave out the state and the line on where it came from, when the list above has said them once for all. */
  short?: boolean;
  /** Said in place of the state, such as "Last fuel for 329 km". */
  mark?: { words: string; tone: "stale" | "plain" };
}) {
  return (
    <article
      id={`f-${view.section}-${view.slug}`}
      className="fact"
      data-hi={hi ? "true" : undefined}
      data-touched={view.touched}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-[0.9375rem] leading-5 font-semibold">
          <a href={view.href} data-fact={factKey(view)} className="fact-open">
            {view.title}
          </a>
        </h3>
        {mark ? (
          <Badge tone={mark.tone}>{mark.words}</Badge>
        ) : view.aside ? (
          <Badge>{view.aside}</Badge>
        ) : short ? null : (
          <StateBadge state={view.state} />
        )}
      </div>
      {view.short ? <p className={`text-sm leading-5 ${full ? "" : "line-clamp-2"}`}>{view.short}</p> : null}
      {short ? null : <p className="hint num">{view.line}</p>}
      {view.rowLink ? (
        <a
          className="btn btn-soft fact-over mt-1.5 self-start"
          href={view.rowLink.url}
          data-track={view.section === "open" ? "Office page opened" : undefined}
          data-track-props={view.section === "open" ? JSON.stringify({ host: hostOf(view.rowLink.url) }) : undefined}
          target="_blank"
          rel="noreferrer noopener"
        >
          <IconExternal />
          {view.rowLink.label}
        </a>
      ) : null}
      {open && view.report ? <FactButtons view={view} /> : null}
    </article>
  );
}

export function FactList({ views, two = true }: { views: FactView[]; two?: boolean }) {
  return (
    <div className={`grid gap-2 ${two ? "lg:grid-cols-2" : ""}`}>
      {views.map((v) => (
        <FactRow key={`${v.section}/${v.slug}`} view={v} />
      ))}
    </div>
  );
}
