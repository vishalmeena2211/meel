import Link from "next/link";

import { IconRight } from "../icons";

import { AskMark } from "./ask-mark";

/** One row under a route's key figures (wireframes, screen 8, frame 2). Never a floating button: it must not cover facts. */
export function AskRouteRow({ slug, example }: { slug: string; example: string | null }) {
  return (
    <Link href={`/ask?from=route&route=${slug}`} className="card flex min-h-12 items-center gap-2.5 px-3 py-2 hover:border-ink-2">
      <span className="grid size-8 shrink-0 place-items-center rounded-md bg-stone-soft">
        <AskMark className="size-[22px]" />
      </span>
      <span className="min-w-0 flex-1">
        <b className="block text-[0.9375rem] leading-5">Ask about this route</b>
        {example ? <span className="hint block truncate text-xs">“{example}”</span> : null}
      </span>
      <IconRight className="size-4 shrink-0 text-ink-2" />
    </Link>
  );
}
