"use client";

import { useEffect, useRef } from "react";

/** In a row of chips that scrolls sideways, brings the chip of the section being read into view. */
export function ShowCurrentChip() {
  const mark = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const row = mark.current?.parentElement;
    const chip = row?.querySelector<HTMLElement>("[aria-current=true]");
    if (!row || !chip) return;
    row.scrollLeft = Math.max(0, chip.offsetLeft - row.clientWidth / 2 + chip.clientWidth / 2);
  }, []);
  return <span ref={mark} hidden />;
}
