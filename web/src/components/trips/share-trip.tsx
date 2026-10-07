"use client";

import { useState, useSyncExternalStore } from "react";

import { track } from "@/lib/analytics";
import { SITE_URL } from "@/lib/site";

import { IconCheck, IconSend } from "../icons";

const noChange = () => () => {};

/**
 * "Share on WhatsApp": opens WhatsApp with the trip's message already written, ending with a link to ask to
 * join. The link uses the address the site is being read on, so it works before and after rideplanner.in.
 * On a laptop, WhatsApp's link opens WhatsApp Web or the desktop app.
 */
export function ShareTrip({
  text,
  path,
  primary = false,
  withCopy = false,
}: {
  text: string;
  path: string;
  /** Straight after publishing, sharing is the next thing to do, so the button is the main one. */
  primary?: boolean;
  withCopy?: boolean;
}) {
  // Before the page wakes up in the browser, the site's own address stands in.
  const origin = useSyncExternalStore(noChange, () => window.location.origin, () => SITE_URL);
  const [copied, setCopied] = useState(false);
  const link = `${origin}${path}`;
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(`${text}\nAsk to join on Meel: ${link}`)}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      track("Trip shared", { via: "copy" });
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      // The browser refused the clipboard. The WhatsApp button still works.
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <a
        href={whatsapp}
        data-track="Trip shared"
        data-track-props='{"via":"WhatsApp"}'
        target="_blank"
        rel="noopener noreferrer"
        className={`btn btn-block ${primary ? "btn-primary" : "btn-outline"}`}
      >
        <IconSend className="size-4" />
        Share on WhatsApp
      </a>
      {withCopy ? (
        <button type="button" onClick={copy} className="btn btn-outline btn-block">
          {copied ? (
            <>
              <IconCheck className="size-4 text-sign" />
              Link copied
            </>
          ) : (
            "Copy the link"
          )}
        </button>
      ) : null}
      <span className="sr-only" role="status">
        {copied ? "Link copied" : ""}
      </span>
    </div>
  );
}
