import "server-only";

import { randomUUID } from "node:crypto";

import { headers } from "next/headers";
import { after } from "next/server";

import { ANALYTICS_ON, MIXPANEL_API_HOST, MIXPANEL_TOKEN } from "@/lib/analytics-config";
import type { EventName, EventProps } from "@/lib/analytics-events";

/**
 * Sends one event from the server, for the few things only the server sees finish: an account made, a trip posted.
 * It goes after the page has answered, so no rider waits for it, and it never fails a request.
 *
 * No rider is attached: Mixpanel counts how many, not who. A browser that asks not to be tracked
 * ("Do Not Track", or Global Privacy Control) is not counted here either.
 */
export async function trackOnServer(event: EventName, props: EventProps = {}): Promise<void> {
  if (!ANALYTICS_ON) return;
  let asksNot = false;
  try {
    const h = await headers();
    asksNot = h.get("dnt") === "1" || h.get("sec-gpc") === "1";
  } catch {
    // Called outside a request: there is no browser to ask.
  }
  if (asksNot) return;
  const send = async () => {
    try {
      await fetch(`${MIXPANEL_API_HOST}/track`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/plain" },
        body: JSON.stringify([
          {
            event,
            properties: {
              ...props,
              token: MIXPANEL_TOKEN,
              time: Date.now(),
              distinct_id: "",
              $insert_id: randomUUID(),
              sent_from: "server",
            },
          },
        ]),
        signal: AbortSignal.timeout(5_000),
      });
    } catch {
      // Counting must never break a rider's request.
    }
  };
  try {
    after(send);
  } catch {
    void send();
  }
}
