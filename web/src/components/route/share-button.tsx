"use client";

import { useState } from "react";

import { track } from "@/lib/analytics";

import { IconCheck, IconShare } from "../icons";

/** Shares this page's address. Falls back to copying it where the phone has no share sheet. */
export function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = window.location.href;
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title, url });
        track("Page shared", { via: "share sheet" });
        return;
      }
      await navigator.clipboard.writeText(url);
      track("Page shared", { via: "copy" });
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      // The rider closed the share sheet, or the phone refused. Nothing to do.
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      aria-label={copied ? "Link copied" : "Share this page"}
      className="grid size-11 shrink-0 place-items-center rounded-lg border border-line bg-surface hover:border-ink-2"
    >
      {copied ? <IconCheck className="size-5 text-sign" /> : <IconShare className="size-5" />}
      <span className="sr-only" role="status">
        {copied ? "Link copied" : ""}
      </span>
    </button>
  );
}
