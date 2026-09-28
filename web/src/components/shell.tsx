import Link from "next/link";
import type { ReactNode } from "react";

import { IconBack } from "./icons";
import { MeBadge } from "./site-nav";
import { KmStone } from "./ui";

const BAR = "sticky top-0 z-30 -mx-4 -mt-4 mb-1 flex min-h-14 items-center gap-2.5 border-b border-line bg-surface px-4 py-2 md:hidden";

/**
 * The header of one of the four top-level screens, on a phone:
 * the mark, the name of the screen, and who is logged in.
 */
export function TopHead({ title, sub, right }: { title: string; sub?: string; right?: ReactNode }) {
  return (
    <header data-head="top" className={BAR}>
      <Link href="/" aria-label="Meel, all routes" className="shrink-0">
        <KmStone cap="" value="M" unit="" size="sm" />
      </Link>
      <div className="min-w-0 flex-1">
        <h1 className="display truncate text-[1.1875rem] leading-6">{title}</h1>
        {sub ? <p className="hint num truncate text-xs leading-4">{sub}</p> : null}
      </div>
      {right}
      <MeBadge />
    </header>
  );
}

/** The header of every other screen, on a phone: a way back, the name, and one line under it. */
export function BackHead({
  title,
  sub,
  back,
  right,
}: {
  title: string;
  sub?: string;
  /** Where the arrow leads. */
  back: string;
  right?: ReactNode;
}) {
  return (
    <header data-head="back" data-inner className={BAR}>
      <Link
        href={back}
        aria-label="Back"
        className="grid size-9 shrink-0 place-items-center rounded-lg border border-line bg-surface hover:border-ink-2"
      >
        <IconBack className="size-[18px]" />
      </Link>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[1rem] leading-5 font-semibold">{title}</h1>
        {sub ? <p className="hint num truncate text-xs leading-4">{sub}</p> : null}
      </div>
      {right}
    </header>
  );
}

/**
 * The one thing to do next, fixed to the foot of a phone.
 * On a wider screen it sits where it falls in the page.
 */
export function Foot({ children, tabs = false }: { children: ReactNode; tabs?: boolean }) {
  return (
    <div
      data-foot={tabs ? "with-tabs" : "alone"}
      className={`fixed inset-x-0 z-20 flex flex-col gap-2 border-t border-line bg-surface px-4 pt-2.5 md:static md:z-auto md:border-0 md:bg-transparent md:p-0 ${
        tabs
          ? "bottom-[calc(3.75rem+env(safe-area-inset-bottom))] pb-2.5"
          : "bottom-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      }`}
    >
      {children}
    </div>
  );
}

/** A heading for wider screens, where the phone's own header is not shown. */
export function WideTitle({ title, lede }: { title: string; lede?: string }) {
  return (
    <header className="hidden flex-col gap-1 md:flex">
      <p className="display text-4xl" role="heading" aria-level={1}>
        {title}
      </p>
      {lede ? <p className="hint max-w-[60ch] text-[0.9375rem]">{lede}</p> : null}
    </header>
  );
}
