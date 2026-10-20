import "server-only";

import { googleToken } from "../ask/vertex";

/* Google Search Console for rideplanner.in, read as the service account meel-ask (a Restricted user on the property). */

const SITE = "sc-domain:rideplanner.in";

export interface SearchWeek {
  from: string;
  to: string;
  clicks: number;
  shown: number;
  position: number;
  queries: Array<{ q: string; clicks: number; shown: number; position: number }>;
}

/** The 7 days ending two days ago (Google's newest data is about two days old). */
export async function searchWeek(today: string): Promise<SearchWeek> {
  const day = (offset: number) => {
    const d = new Date(`${today}T12:00:00+05:30`);
    d.setUTCDate(d.getUTCDate() + offset);
    return d.toISOString().slice(0, 10);
  };
  const [from, to] = [day(-8), day(-2)];
  const tok = await googleToken();
  const ask = async (body: object) => {
    const res = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE)}/searchAnalytics/query`, {
      method: "POST",
      headers: { Authorization: `Bearer ${tok}`, "Content-Type": "application/json" },
      body: JSON.stringify({ startDate: from, endDate: to, ...body }),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) throw new Error(`Search Console ${res.status}`);
    return (await res.json()) as { rows?: Array<{ keys?: string[]; clicks: number; impressions: number; position: number }> };
  };
  const [total, top] = await Promise.all([ask({}), ask({ dimensions: ["query"], rowLimit: 5 })]);
  const t = total.rows?.[0];
  return {
    from,
    to,
    clicks: t?.clicks ?? 0,
    shown: t?.impressions ?? 0,
    position: t?.position ?? 0,
    queries: (top.rows ?? []).map((r) => ({ q: r.keys?.[0] ?? "", clicks: r.clicks, shown: r.impressions, position: r.position })),
  };
}
