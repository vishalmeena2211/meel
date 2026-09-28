"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export interface NavItem {
  href: string;
  name: string;
  icon: ReactNode;
  warn?: { words: string; tone: "ageing" | "stale" } | null;
}

/** The list of a route's sections, down the left of a wider screen. */
export function RouteNav({
  routeName,
  top,
  sections,
  fromReports,
  more,
}: {
  routeName: string;
  top: string;
  sections: NavItem[];
  fromReports: NavItem[];
  more: NavItem[];
}) {
  const pathname = usePathname();
  const item = (it: NavItem) => {
    const on = pathname === it.href || pathname.startsWith(`${it.href}/`);
    return (
      <Link
        key={it.href}
        href={it.href}
        aria-current={on ? "page" : undefined}
        className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[0.84375rem] font-medium hover:bg-surface-2 aria-[current=page]:bg-sign-soft aria-[current=page]:font-semibold aria-[current=page]:text-sign"
      >
        {it.icon}
        <span className="min-w-0 flex-1">{it.name}</span>
        {it.warn ? (
          <span
            className={`font-display rounded px-1.5 py-0.5 text-[0.6875rem] leading-4 font-semibold tracking-[0.08em] whitespace-nowrap uppercase ${
              it.warn.tone === "stale" ? "bg-stale-bg text-stale-fg" : "bg-ageing-bg text-ageing-fg"
            }`}
          >
            {it.warn.words}
          </span>
        ) : null}
      </Link>
    );
  };
  return (
    <nav
      aria-label={`Sections of ${routeName}`}
      className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] flex-col gap-0.5 overflow-y-auto border-r border-line bg-surface px-3 py-4 lg:flex"
    >
      <Link href={top} className="label px-2.5 pb-2 hover:text-ink">
        {routeName}
      </Link>
      {sections.map(item)}
      {fromReports.length > 0 ? <span className="label px-2.5 pt-4 pb-2">From trip reports</span> : null}
      {fromReports.map(item)}
      <span className="label px-2.5 pt-4 pb-2">Also</span>
      {more.map(item)}
    </nav>
  );
}

/** Puts a route's own buttons into the site's top bar, on a wider screen. */
export function HeadSlot({ children }: { children: ReactNode }) {
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const el = document.getElementById("head-slot");
    const soon = window.setTimeout(() => setSlot(el), 0);
    return () => window.clearTimeout(soon);
  }, []);
  return slot ? createPortal(children, slot) : null;
}
