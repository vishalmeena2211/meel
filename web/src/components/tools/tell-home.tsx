"use client";

import { useState, useSyncExternalStore } from "react";

import { track } from "@/lib/analytics";
import { indiaDay, sayDate } from "@/lib/format";
import { SITE_URL } from "@/lib/site";

import { DayField, Field, ListField } from "../form";
import { IconCheck, IconSend } from "../icons";

const noChange = () => () => {};

const HOURS = ["6 pm", "7 pm", "8 pm", "9 pm", "10 pm"];

/** "19 June" or "19 June 2027". */
function day(value: string, withYear: boolean): string {
  const words = sayDate(value) ?? value;
  return withYear ? words : words.replace(/ \d{4}$/, "");
}

/**
 * The rider's plan, in one message for someone at home. It is written in the page from what the rider picks,
 * and goes nowhere until the rider sends it. Nothing is stored: leaving the page forgets it.
 */
export function TellHome({
  routeName,
  path,
  places,
  gap,
  highest,
}: {
  routeName: string;
  path: string;
  /** The places on the way, in order. */
  places: string[];
  /** "No fuel for 323 km after Keylong." */
  gap: string | null;
  /** "Highest point 17,480 ft." */
  highest: string | null;
}) {
  const origin = useSyncExternalStore(noChange, () => window.location.origin, () => SITE_URL);
  const today = indiaDay();
  const [leaving, setLeaving] = useState("");
  const [back, setBack] = useState("");
  const [partner, setPartner] = useState("");
  const [hour, setHour] = useState("8 pm");
  const [copied, setCopied] = useState(false);

  const sameYear = !leaving || !back || leaving.slice(0, 4) === back.slice(0, 4);
  const when =
    leaving && back
      ? `, ${day(leaving, !sameYear)} to ${day(back, true)}`
      : leaving
        ? `, leaving ${day(leaving, true)}`
        : "";
  const who = partner.trim();
  const message = [
    `Riding ${routeName}${when}.`,
    places.length > 0 ? `${places.join(", ")}.` : null,
    [gap, highest].filter(Boolean).join(" ") || null,
    `I will message every evening by ${hour}. If no word by ${hour}: ${who ? `call ${who}, then 112` : "call 112 and read them this message"}.`,
    `${origin}${path}`,
  ]
    .filter(Boolean)
    .join("\n");
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(message)}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(message);
      track("Message for home sent", { via: "copy" });
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      // The browser refused the clipboard. The WhatsApp button still works.
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <DayField label="Leaving" name="leaving" min="today" onValueChange={setLeaving} />
      <DayField label="Back by" name="back" min={leaving || today} onValueChange={setBack} />
      <Field
        label="Riding with"
        optional="optional"
        name="partner"
        autoComplete="off"
        placeholder="A name and a phone number"
        value={partner}
        onChange={(e) => setPartner(e.target.value)}
      />
      <ListField
        label="I will message every evening by"
        name="hour"
        groups={[{ label: "", choices: HOURS.map((h) => ({ value: h, label: h })) }]}
        defaultValue="8 pm"
        onValueChange={setHour}
        placeholder="Pick an hour"
      />
      <section className="flex flex-col gap-1.5">
        <h2 className="label">The message</h2>
        <p
          className="rounded-lg border border-line bg-surface-2 px-3 py-2.5 text-sm leading-5 whitespace-pre-line"
          data-private
        >
          {message}
        </p>
      </section>
      {/* Pinned to the foot of the screen on a phone, as every page's main buttons are. */}
      <div
        data-foot="alone"
        className="fixed inset-x-0 bottom-0 z-20 flex flex-col gap-2 border-t border-line bg-surface px-4 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:static md:z-auto md:border-0 md:bg-transparent md:p-0"
      >
        <div className="grid grid-cols-[1fr_1.3fr] gap-2 md:max-w-md">
          <button type="button" onClick={copy} className="btn btn-outline">
            {copied ? (
              <>
                <IconCheck className="size-4 text-sign" />
                Copied
              </>
            ) : (
              "Copy"
            )}
          </button>
          <a
            href={whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
            data-private-block
            data-track="Message for home sent"
            data-track-props='{"via":"WhatsApp"}'
          >
            <IconSend className="size-4" />
            Send on WhatsApp
          </a>
        </div>
        <p className="hint text-center md:text-left">Nothing you type here is sent to Meel.</p>
      </div>
      <span className="sr-only" role="status">
        {copied ? "Message copied" : ""}
      </span>
    </div>
  );
}
