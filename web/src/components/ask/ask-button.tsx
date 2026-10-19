"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { AskMark } from "./ask-mark";

/*
  The Ask icon in a phone's top bar (wireframes, screen 8). On a route page it opens Ask Meel with that route set.
  The first time it is on screen, a soft halo pulses and a hint sits under it. "Got it", a tap anywhere, or using the
  icon closes it for good. Not shown to a rider who landed on a shared fact link, until their next page.
*/

const SEEN = "meel-ask-hint";

export function AskButton({ route }: { route?: string }) {
  const path = usePathname();
  const [hint, setHint] = useState(false);

  useEffect(() => {
    let seen = true;
    try {
      seen = localStorage.getItem(SEEN) === "1";
    } catch {
      // No storage: never nag.
    }
    // A fact's own page, opened from a link in a chat group: the fact they came for comes first.
    const fromLink = /^\/routes\/[^/]+\/[^/]+\/[^/]+/.test(path) && document.referrer && !document.referrer.includes(location.host);
    if (seen || fromLink) return;
    const show = setTimeout(() => setHint(true), 900);
    return () => clearTimeout(show);
  }, [path]);

  useEffect(() => {
    if (!hint) return;
    const close = () => done();
    const timer = setTimeout(() => window.addEventListener("pointerdown", close, { once: true }), 50);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("pointerdown", close);
    };
  }, [hint]);

  function done() {
    setHint(false);
    try {
      localStorage.setItem(SEEN, "1");
    } catch {
      // Fine: it shows once more next time.
    }
  }

  const href = `/ask?from=top${route ? `&route=${route}` : ""}`;
  return (
    <span className="relative shrink-0">
      <Link
        href={href}
        onClick={done}
        aria-label="Ask Meel"
        className={`grid size-11 place-items-center rounded-lg border bg-stone-soft hover:border-ink-2 ${hint ? "ask-halo" : ""}`}
        style={{ borderColor: "color-mix(in srgb, var(--color-stone) 55%, var(--color-surface))" }}
      >
        <AskMark className="size-6" />
      </Link>
      {hint ? (
        <span
          role="status"
          className="absolute top-[calc(100%+10px)] right-0 z-40 w-56 rounded-lg border-t-[3px] border-stone bg-tarmac px-3 py-2.5 text-[0.8125rem] leading-[1.125rem] text-on-tarmac shadow-lg"
        >
          <span className="absolute -top-[9px] right-4 size-3 rotate-45 bg-stone" aria-hidden="true" />
          <b className="mb-0.5 block text-[0.8125rem]">New: ask Meel a question</b>
          Fuel, permits, passes, distances. Answers come from Meel’s facts, with their dates.{" "}
          <button type="button" onClick={done} className="font-semibold text-stone">
            Got it
          </button>
        </span>
      ) : null}
    </span>
  );
}
