"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { AskMark } from "./ask-mark";

/** The "Ask Meel" button in the site's top bar on wider screens. On a route's pages it asks about that route. */
export function AskHeadButton() {
  const path = usePathname();
  if (path.startsWith("/ask") || path.startsWith("/editor") || path.startsWith("/login") || path.startsWith("/signup")) return null;
  const slug = /^\/routes\/([a-z0-9-]+)/.exec(path)?.[1];
  return (
    <Link href={`/ask?from=top${slug ? `&route=${slug}` : ""}`} className="btn btn-primary !min-h-10 shrink-0 !gap-1.5 !px-3 text-sm">
      <AskMark className="size-5" />
      Ask Meel
    </Link>
  );
}
