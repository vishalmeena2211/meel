"use client";

/*
  Reports made where there is no network wait here, on the rider's own phone, and are sent when the signal returns.
  The day the rider saw the thing travels with the report, so a report sent two days late still carries the right day.
*/

const KEY = "meel:outbox";

export interface Waiting {
  fields: Record<string, string>;
  kept_at: string;
}

function read(): Waiting[] {
  try {
    const value = JSON.parse(window.localStorage.getItem(KEY) ?? "[]") as unknown;
    return Array.isArray(value) ? (value as Waiting[]).filter((w) => w && typeof w.fields === "object") : [];
  } catch {
    return [];
  }
}

function write(items: Waiting[]): void {
  try {
    if (items.length === 0) window.localStorage.removeItem(KEY);
    else window.localStorage.setItem(KEY, JSON.stringify(items.slice(-50)));
  } catch {
    // Not kept. The rider was told the report is waiting; the worst case is that it is lost with the phone's storage.
  }
}

export function keep(fields: Record<string, string>): boolean {
  try {
    write([...read(), { fields, kept_at: new Date().toISOString() }]);
    return true;
  } catch {
    return false;
  }
}

export function waitingCount(): number {
  return read().length;
}

let sending = false;

/** Sends what is waiting. A report the site refuses is dropped; one that meets no network stays for next time. */
export async function sendWaiting(): Promise<number> {
  if (sending || !navigator.onLine) return 0;
  sending = true;
  let sent = 0;
  try {
    const left: Waiting[] = [];
    for (const item of read()) {
      const body = new FormData();
      for (const [k, v] of Object.entries(item.fields)) body.append(k, v);
      try {
        const reply = await fetch("/api/fact-report", { method: "POST", body });
        if (reply.ok) sent += 1;
        else if (reply.status >= 500) left.push(item);
      } catch {
        left.push(item);
      }
    }
    write(left);
  } finally {
    sending = false;
  }
  return sent;
}
