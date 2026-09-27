"use client";

import { useEffect, useRef } from "react";

import type { FormState } from "./form";

/**
 * Says what needs fixing, at the top of a form, and brings itself into view.
 * On a phone the keyboard and a long form can hide the one box that is wrong.
 */
export function ErrorSummary({ state }: { state: FormState }) {
  const box = useRef<HTMLDivElement>(null);
  const errors = Object.entries(state.errors);
  const shown = !state.ok && (state.message !== "" || errors.length > 0);

  // The state is a new object after every attempt, so this runs each time the form is sent.
  useEffect(() => {
    if (!shown || !box.current) return;
    box.current.scrollIntoView({ block: "center" });
    box.current.focus({ preventScroll: true });
  }, [state, shown]);

  if (!shown) return null;
  return (
    <div
      ref={box}
      role="alert"
      tabIndex={-1}
      className="scroll-mt-24 rounded-lg border border-stale-fg/30 bg-stale-bg px-3 py-2.5 text-sm outline-none"
    >
      <b className="block">
        {errors.length > 0
          ? `${errors.length} ${errors.length === 1 ? "thing needs" : "things need"} fixing`
          : state.message}
      </b>
      {errors.length > 0 ? (
        <ul className="mt-1 flex flex-col gap-0.5">
          {errors.map(([name, message]) => (
            <li key={name}>
              <a className="link !text-stale-fg" href={`#${name}`}>
                {message}
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
