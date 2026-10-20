import "server-only";

/*
  Real riders from Mixpanel (project "Meel", EU), read with a service account: MIXPANEL_SA_USER, MIXPANEL_SA_SECRET.
  A rider is one device that opened a page. Robots never reach Mixpanel (the site stops them loading it). The
  editor's own devices are left out by REPORT_IGNORE_DEVICES, a comma-separated list of device id beginnings.
*/

const PROJECT = process.env.MIXPANEL_PROJECT_ID ?? "4071039";

export interface Rider {
  id: string;
  day: string;
  city: string | null;
  device: string;
  source: string;
  first: string;
  pages: number;
  seconds: number;
  asked: number;
  tools: string[];
}

interface MpEvent {
  event: string;
  properties: Record<string, unknown> & { time: number; distinct_id?: string };
}

export function mixpanelReady(): boolean {
  return Boolean(process.env.MIXPANEL_SA_USER && process.env.MIXPANEL_SA_SECRET);
}

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

function sourceOf(p: Record<string, unknown>): string {
  const utm = str(p.utm_source)?.toLowerCase() ?? "";
  const ref = (str(p.$referring_domain) ?? str(p.$initial_referring_domain) ?? "").toLowerCase();
  const all = `${utm} ${ref}`;
  if (all.includes("chatgpt")) return "ChatGPT";
  if (all.includes("google")) return "Google";
  if (all.includes("bing")) return "Bing";
  if (all.includes("facebook") || all.includes("instagram")) return "Facebook or Instagram";
  if (all.includes("reddit")) return "Reddit";
  if (all.includes("t.co") || all.includes("twitter") || all.includes("x.com")) return "X";
  if (!ref || ref === "$direct" || ref.includes("rideplanner.in")) return "Typed or saved link";
  return ref.replace(/^www\./, "");
}

function pageOf(p: Record<string, unknown>): string {
  const title = str(p.current_page_title) ?? str(p.$current_page_title) ?? str(p.title);
  if (title) return title.replace(/\s*·\s*Meel\s*$/, "").split(" · ")[0]!;
  const url = str(p.$current_url) ?? "";
  try {
    return new URL(url).pathname;
  } catch {
    return url || "a page";
  }
}

const TOOL_EVENTS: Record<string, string> = {
  "Fuel check run": "fuel check",
  "Night halts checked": "altitude check",
  "Packing month picked": "packing list",
  "Route saved for no network": "saved a route",
  "Route file downloaded": "route file",
  "Page shared": "shared a page",
};

/** Riders for each India day from `from` to `to` (inclusive, "2026-10-19"). Mixpanel's days are India days. */
export async function riders(from: string, to: string): Promise<Rider[]> {
  const auth = Buffer.from(`${process.env.MIXPANEL_SA_USER}:${process.env.MIXPANEL_SA_SECRET}`).toString("base64");
  const res = await fetch(`https://data-eu.mixpanel.com/api/2.0/export?project_id=${PROJECT}&from_date=${from}&to_date=${to}`, {
    headers: { Authorization: `Basic ${auth}`, Accept: "text/plain" },
    signal: AbortSignal.timeout(25000),
  });
  if (!res.ok) throw new Error(`Mixpanel ${res.status}`);
  const ignore = (process.env.REPORT_IGNORE_DEVICES ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const events: MpEvent[] = (await res.text())
    .split("\n")
    .filter(Boolean)
    .map((l) => {
      try {
        return JSON.parse(l) as MpEvent;
      } catch {
        return null;
      }
    })
    .filter((e): e is MpEvent => e !== null);

  const byDevice = new Map<string, MpEvent[]>();
  for (const e of events) {
    const id = String(e.properties.distinct_id ?? e.properties.$device_id ?? "");
    if (!id || ignore.some((p) => id.includes(p))) continue;
    if (!byDevice.has(id)) byDevice.set(id, []);
    byDevice.get(id)!.push(e);
  }

  const out: Rider[] = [];
  for (const [id, list] of byDevice) {
    list.sort((a, b) => a.properties.time - b.properties.time);
    const views = list.filter((e) => e.event === "$mp_web_page_view");
    if (views.length === 0) continue;
    const first = views[0]!.properties;
    const lastTime = list[list.length - 1]!.properties.time;
    out.push({
      id,
      day: new Date(first.time * 1000).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }),
      city: str(first.$city),
      device: str(first.$device) ?? str(first.$os) ?? "a device",
      source: sourceOf(first),
      first: pageOf(first),
      pages: views.length,
      seconds: Math.max(0, lastTime - first.time),
      asked: list.filter((e) => e.event === "Ask Meel asked").length,
      tools: [...new Set(list.map((e) => TOOL_EVENTS[e.event]).filter((t): t is string => Boolean(t)))],
    });
  }
  return out.sort((a, b) => a.day.localeCompare(b.day));
}
