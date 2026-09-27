import type { ReactNode } from "react";

import { kindIdOf, standingOf } from "@/lib/facts";
import { sayAge, sayDate } from "@/lib/format";
import type { Confirmation, FactKind, Source } from "@/lib/types";

import { SourceLine, StateBadge } from "../ui";
import { FactActions } from "./fact-actions";

export interface FactContext {
  routeSlug: string;
  routeName: string;
  confirmations: Confirmation[];
  kinds: FactKind[];
  today: Date;
  chatNumber: string | null;
}

/**
 * One fact. It always shows three things: what it says, how far to trust it, and where it came from.
 */
export function FactCard({
  id,
  title,
  children,
  source,
  context,
  actions = true,
  extra,
}: {
  id: string;
  title: string;
  children?: ReactNode;
  source: Source | null;
  context: FactContext;
  actions?: boolean;
  extra?: ReactNode;
}) {
  const mine = context.confirmations.filter((c) => c.fact_id === id);
  const kind = context.kinds.find((k) => k.id === kindIdOf(id));
  const standing = standingOf(mine, kind, context.today);
  const latest = standing.latest;

  return (
    <article id={id.replace(/[^a-z0-9-]/gi, "-")} className="card flex scroll-mt-24 flex-col gap-1 px-3 py-2.5 target:border-ink target:shadow-[0_0_0_3px_var(--color-stone-soft)]">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-[0.9375rem] leading-5 font-semibold">{title}</h3>
        <StateBadge state={standing.state} />
      </div>
      {children ? <div className="text-sm leading-5">{children}</div> : null}

      {latest && standing.daysOld !== null ? (
        <p className="hint num">
          {standing.state === "pending"
            ? `A rider reported a change on ${sayDate(latest.seen_on)}. Being checked.`
            : standing.state === "conflict"
              ? `Riders saw different things. Newest report: ${sayDate(latest.seen_on)}, from ${latest.by}.`
              : `Confirmed by ${latest.by} · ${sayDate(latest.seen_on)} · ${sayAge(standing.daysOld)}`}
        </p>
      ) : (
        <p className="hint">No rider has confirmed this yet.</p>
      )}
      {latest?.note ? (
        <p className="border-l-[3px] border-line py-0.5 pl-2.5 text-sm">
          “{latest.note}” <span className="hint">{latest.by}</span>
        </p>
      ) : null}

      {source ? <SourceLine source={source} /> : null}
      {extra}

      {mine.length > 1 ? (
        <details className="hint">
          <summary className="link cursor-pointer text-sm font-medium">History, {mine.length} reports</summary>
          <ul className="num mt-1 flex flex-col">
            {mine.map((c) => (
              <li key={`${c.seen_on}-${c.by}-${c.kind}`} className="border-b border-dashed border-line py-1 last:border-b-0">
                {sayDate(c.seen_on)} · {c.kind === "changed" ? "change reported" : "confirmed"} by {c.by}
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {actions ? <FactActions factId={id} title={title} /> : null}
    </article>
  );
}
