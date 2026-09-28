"use client";

import { useEffect, useRef, useState } from "react";

import { plural } from "@/lib/format";
import { useStored } from "@/lib/use-stored";

import { IconCheck, IconCloudOff, IconRight, IconSave } from "../icons";
import { Callout } from "../ui";

interface Saved {
  at: string;
  bytes: number;
  pages: number;
}

function isSaved(v: unknown): v is Saved {
  if (typeof v !== "object" || v === null) return false;
  const s = v as Partial<Saved>;
  return typeof s.at === "string" && typeof s.bytes === "number";
}

function readSaved(raw: string | null): Saved | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as unknown;
    return isSaved(v) ? v : null;
  } catch {
    return null;
  }
}

/** "Thursday 17 June, 6:40 am", in India's time. */
export function sayMoment(iso: string): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return iso;
  const day = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", weekday: "long", day: "numeric", month: "long" }).format(at);
  const time = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit", hour12: true })
    .format(at)
    .replace(/\s?(AM|PM)$/i, (m) => ` ${m.trim().toLowerCase()}`);
  return `${day}, ${time}`;
}

function megabytes(bytes: number): string {
  return bytes >= 1_000_000 ? `${(bytes / 1_000_000).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1000))} KB`;
}

function ask(worker: ServiceWorker, message: unknown): Promise<{ ok: boolean; saved?: number; bytes?: number }> {
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    const giveUp = window.setTimeout(() => resolve({ ok: false }), 60_000);
    channel.port1.onmessage = (event: MessageEvent<{ ok: boolean; saved?: number; bytes?: number }>) => {
      window.clearTimeout(giveUp);
      resolve(event.data);
    };
    worker.postMessage(message, [channel.port2]);
  });
}

async function workerReady(): Promise<ServiceWorker | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    await navigator.serviceWorker.register("/sw.js");
    const reg = await navigator.serviceWorker.ready;
    return reg.active;
  } catch {
    return null;
  }
}

/**
 * Keeps one route on the rider's phone, so it opens where there is no network.
 * Saving is the rider's choice, one route at a time. Nothing is saved without asking.
 */
export function SaveRoute({
  routeSlug,
  routeName,
  facts,
  tools,
  pages,
  extras,
  as = "row",
}: {
  routeSlug: string;
  routeName: string;
  facts: number;
  tools: number;
  /** Every address that makes up this route. */
  pages: string[];
  /** Pictures and the like that the pages show. */
  extras: string[];
  as?: "row" | "button";
}) {
  const [raw, setRaw] = useStored(`meel:saved:${routeSlug}`);
  const saved = readSaved(raw);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  async function save() {
    setBusy(true);
    setFailed(null);
    const worker = await workerReady();
    if (!worker) {
      setBusy(false);
      setFailed("This phone’s browser cannot keep pages for later. Open the page once while you still have signal; most phones keep what they last showed.");
      return;
    }
    const result = await ask(worker, { type: "save", route: routeSlug, pages, extras });
    setBusy(false);
    if (!result.ok) {
      setFailed("That did not save. Check you have a network, then try again.");
      return;
    }
    setRaw(JSON.stringify({ at: new Date().toISOString(), bytes: result.bytes ?? 0, pages: result.saved ?? 0 }));
  }

  async function remove() {
    const worker = await workerReady();
    if (worker) await ask(worker, { type: "remove", route: routeSlug });
    setRaw(null);
  }

  return (
    <>
      {as === "row" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex min-h-12 w-full items-center gap-2.5 px-3 py-2.5 text-left hover:bg-surface-2"
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-md bg-surface-2 text-ink">
            <IconSave />
          </span>
          <span className="min-w-0 flex-1">
            <b className="block text-[0.9375rem] leading-5">{saved ? "Saved for the road" : "Save for the road"}</b>
            <span className="hint num block">{saved ? `On this phone since ${sayMoment(saved.at)}` : "Works with no network"}</span>
          </span>
          <IconRight className="size-4 shrink-0 text-ink-2" />
        </button>
      ) : (
        <button type="button" className="btn btn-outline" onClick={() => setOpen(true)}>
          <IconSave />
          {saved ? "Saved for the road" : "Save for the road"}
        </button>
      )}

      <dialog ref={dialog} onClose={() => setOpen(false)} aria-labelledby="save-title" className="sheet">
        <div className="flex flex-col gap-3 px-4 pt-2 pb-6">
          <span className="mx-auto h-1 w-10 shrink-0 rounded bg-line md:hidden" aria-hidden="true" />
          <h3 id="save-title" className="display text-[1.375rem]">
            {saved ? `${routeName} is on this phone` : `Save ${routeName} to this phone?`}
          </h3>
          <p className="hint text-sm">
            It will open with no network. You get every fact with its date, the fuel check, the altitude plan and the
            packing list.
          </p>
          <ul className="flex flex-col gap-2 text-sm">
            <li className="flex items-start gap-2">
              <IconCheck className="mt-0.5 size-4 shrink-0 text-fresh-fg" />
              <span>
                <b>Saved</b> {plural(facts, "fact")} and {plural(tools, "tool")}
                {saved ? <span className="hint num block">{megabytes(saved.bytes)}</span> : null}
              </span>
            </li>
            <li className="flex items-start gap-2">
              <IconCloudOff className="mt-0.5 size-4 shrink-0 text-ink-2" />
              <span>
                <b>Not saved</b> The videos need a network
              </span>
            </li>
          </ul>
          <Callout title="Saved facts do not update themselves">
            Open this page once more while you still have signal, on the morning you leave.
          </Callout>
          {saved ? (
            <p className="text-sm" role="status">
              Saved on {sayMoment(saved.at)}.
            </p>
          ) : null}
          {failed ? (
            <p className="text-sm font-medium text-stale-fg" role="alert">
              {failed}
            </p>
          ) : null}
          <button type="button" className="btn btn-primary btn-block" onClick={save} disabled={busy}>
            <IconSave />
            {busy ? "Saving" : saved ? "Save again, with today’s facts" : "Save to this phone"}
          </button>
          {saved ? (
            <button type="button" className="link self-center text-sm" onClick={remove}>
              Remove from this phone
            </button>
          ) : null}
          <button type="button" className="link self-center text-sm" onClick={() => setOpen(false)}>
            Close
          </button>
        </div>
      </dialog>
    </>
  );
}

/**
 * Shown across the top of a route when the phone has no network.
 * It says when the copy on the phone was made. Ages of facts are still worked out from today.
 */
export function OfflineBar({ routeSlug }: { routeSlug: string }) {
  const [raw] = useStored(`meel:saved:${routeSlug}`);
  const saved = readSaved(raw);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (!offline) return null;
  return (
    <p role="status" className="-mx-4 flex items-start gap-2 bg-ink px-4 py-2 text-sm text-surface lg:mx-0">
      <IconCloudOff className="mt-0.5 size-4 shrink-0" />
      <span>
        {saved
          ? `No network. Showing what this phone saved on ${sayMoment(saved.at)}.`
          : "No network. This route was not saved on this phone, so some of it may not open."}
      </span>
    </p>
  );
}
