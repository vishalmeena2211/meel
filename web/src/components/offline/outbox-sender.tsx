"use client";

import { useEffect, useState } from "react";

import { track } from "@/lib/analytics";
import { sendWaiting, waitingCount } from "@/lib/outbox";

/** Sends reports kept on this phone as soon as there is a signal, and says so once they have gone. */
export function OutboxSender() {
  const [sent, setSent] = useState(0);
  useEffect(() => {
    let live = true;
    const go = () => {
      if (waitingCount() === 0) return;
      void sendWaiting().then((n) => {
        if (n > 0) track("Offline reports sent", { count: n });
        if (live && n > 0) setSent(n);
      });
    };
    const soon = window.setTimeout(go, 1500);
    window.addEventListener("online", go);
    return () => {
      live = false;
      window.clearTimeout(soon);
      window.removeEventListener("online", go);
    };
  }, []);
  if (sent === 0) return null;
  return (
    <p role="status" className="fixed inset-x-4 bottom-24 z-40 rounded-lg bg-ink px-3 py-2.5 text-sm text-surface md:right-auto md:bottom-6 md:left-6">
      {sent === 1 ? "The report kept on this phone has been sent." : `The ${sent} reports kept on this phone have been sent.`}{" "}
      <button type="button" className="underline" onClick={() => setSent(0)}>
        Close
      </button>
    </p>
  );
}
