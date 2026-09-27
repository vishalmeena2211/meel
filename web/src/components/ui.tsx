import Link from "next/link";
import type { ReactNode } from "react";

import { STATE_WORDS } from "@/lib/facts";
import { hostOf, sayDate, sourceKindName } from "@/lib/format";
import type { FactState, Source } from "@/lib/types";

import { IconExternal } from "./icons";

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

const STATE_CLASS: Record<FactState, string> = {
  fresh: "bg-fresh-bg text-fresh-fg",
  ageing: "bg-ageing-bg text-ageing-fg",
  stale: "bg-stale-bg text-stale-fg",
  unchecked: "bg-unchecked-bg text-unchecked-fg outline-1 -outline-offset-1 outline-dashed outline-rule",
  conflict: "bg-conflict-bg text-conflict-fg",
  pending: "bg-ageing-bg text-ageing-fg",
};

const TONE_CLASS = {
  plain: "bg-surface-2 text-ink-2",
  full: "bg-sign text-surface",
  stone: "bg-stone text-ink",
  fresh: STATE_CLASS.fresh,
  ageing: STATE_CLASS.ageing,
  stale: STATE_CLASS.stale,
  unchecked: STATE_CLASS.unchecked,
} as const;

export function Badge({
  tone = "plain",
  children,
}: {
  tone?: keyof typeof TONE_CLASS;
  children: ReactNode;
}) {
  return (
    <span
      className={cx(
        "font-display inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[0.75rem] leading-4 font-semibold tracking-[0.08em] whitespace-nowrap uppercase",
        TONE_CLASS[tone],
      )}
    >
      {children}
    </span>
  );
}

export function StateBadge({ state }: { state: FactState }) {
  return (
    <span
      className={cx(
        "font-display inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[0.75rem] leading-4 font-semibold tracking-[0.08em] whitespace-nowrap uppercase",
        STATE_CLASS[state],
      )}
    >
      {STATE_WORDS[state]}
    </span>
  );
}

const CALLOUT_CLASS = {
  plain: "bg-surface-2 border-line",
  info: "bg-sign-soft border-sign-line",
  warn: "bg-ageing-bg border-ageing-fg/30",
  stone: "bg-stone-soft border-stone/60",
  danger: "bg-stale-bg border-stale-fg/30",
} as const;

export function Callout({
  tone = "plain",
  title,
  children,
}: {
  tone?: keyof typeof CALLOUT_CLASS;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className={cx("rounded-lg border px-3 py-2.5 text-sm leading-5", CALLOUT_CLASS[tone])}>
      <b className="block">{title}</b>
      {children ? <div className="mt-0.5">{children}</div> : null}
    </div>
  );
}

export function SectionHeading({
  id,
  title,
  aside,
}: {
  id?: string;
  title: string;
  aside?: ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 id={id} className="display text-2xl">
        {title}
      </h2>
      {aside ? <span className="hint text-right">{aside}</span> : null}
    </div>
  );
}

/** The kilometre stone: highway number on the yellow cap, a number on the body. */
export function KmStone({
  cap,
  value,
  unit,
  size = "lg",
}: {
  cap: string;
  value: string;
  unit: string;
  size?: "sm" | "lg";
}) {
  const big = size === "lg";
  return (
    <div
      className={cx(
        "flex shrink-0 flex-col overflow-hidden border-2 border-ink bg-surface",
        big ? "h-[86px] w-[70px] rounded-t-[34px] rounded-b-md" : "h-10 w-9 rounded-t-[16px] rounded-b",
      )}
    >
      <div
        className={cx(
          "font-display grid place-items-end justify-center border-b-2 border-ink bg-stone font-bold tracking-wider",
          big ? "h-7 pb-0.5 text-[0.8125rem] leading-none" : "h-3",
        )}
      >
        {big ? cap : null}
      </div>
      <div
        className={cx(
          "font-display num grid flex-1 place-content-center text-center leading-none font-bold",
          big ? "text-[1.375rem]" : "text-xs",
        )}
      >
        {value}
        {big ? <small className="block text-[0.6875rem] font-semibold tracking-widest">{unit}</small> : null}
      </div>
    </div>
  );
}

/** Where a fact came from. Always shown; never hidden behind a footer. */
export function SourceLine({ source, prefix = "From" }: { source: Source; prefix?: string }) {
  const date = sayDate(source.source_date);
  return (
    <p className="hint num">
      {prefix}{" "}
      <a className="link font-medium" href={source.url} target="_blank" rel="noreferrer noopener">
        {hostOf(source.url)}
        <IconExternal className="ml-0.5 inline size-3 align-[-1px]" />
      </a>{" "}
      · {sourceKindName(source.kind)}
      {date ? ` · dated ${date}` : ""}
      {source.opened ? "" : " · seen in search results only"}
    </p>
  );
}

export function KeyFacts({ items }: { items: Array<{ label: string; value: string }> }) {
  if (items.length === 0) return null;
  return (
    <dl
      className="card grid overflow-hidden"
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
    >
      {items.map((item, i) => (
        <div key={item.label} className={cx("px-2.5 py-2", i > 0 && "border-l border-line")}>
          <dt className="hint text-xs">{item.label}</dt>
          <dd className="display num text-lg leading-tight">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function RowLink({
  href,
  icon,
  title,
  hint,
  aside,
}: {
  href: string;
  icon?: ReactNode;
  title: string;
  hint?: string;
  aside?: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-12 items-center gap-2.5 border-b border-line px-3 py-2.5 last:border-b-0 hover:bg-surface-2"
    >
      {icon ? (
        <span className="grid size-8 shrink-0 place-items-center rounded-md bg-surface-2 text-ink">{icon}</span>
      ) : null}
      <span className="min-w-0 flex-1">
        <b className="block text-[0.9375rem] leading-5">{title}</b>
        {hint ? <span className="hint block">{hint}</span> : null}
      </span>
      {aside}
      <svg
        viewBox="0 0 24 24"
        className="size-4 shrink-0 text-ink-2"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="m9 18 6-6-6-6" />
      </svg>
    </Link>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-rule px-4 py-5 text-center text-ink-2">
      <b className="text-[0.9375rem] text-ink">{title}</b>
      {children}
    </div>
  );
}

export { cx };
