import { feet, km, sayDate } from "./format";
import type { Route } from "./types";

export interface Check {
  id: "season" | "opening" | "altitude" | "fuel";
  tone: "ok" | "warn";
  title: string;
  words: string;
}

const MONTH_NAMES = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

/** Reads "June to October" or "Oct to Feb" into month numbers. Returns null if it cannot. */
export function monthsFrom(text: string): number[] | null {
  const found = [...text.toLowerCase().matchAll(/[a-z]{3,9}/g)]
    .map((m) => MONTH_NAMES.findIndex((name) => name.startsWith(m[0].slice(0, 3)) && m[0].length <= name.length))
    .filter((i) => i >= 0)
    .map((i) => i + 1);
  const first = found[0];
  const last = found[found.length - 1];
  if (first === undefined || last === undefined || found.length < 2) return null;
  const out: number[] = [];
  for (let m = first; ; m = (m % 12) + 1) {
    out.push(m);
    if (m === last || out.length > 12) break;
  }
  return out;
}

export interface NightGain {
  night: number;
  place: string;
  altitude_m: number | null;
  gain_m: number | null;
  verdict: "start" | "fine" | "steep" | "too-steep" | "descends" | "unknown";
}

export function nightGains(route: Route, nights: string[]): NightGain[] {
  const heightOf = (place: string) => route.waypoints.find((w) => w.name === place)?.altitude_m ?? null;
  return nights.map((place, i) => {
    const here = heightOf(place);
    const previous = nights[i - 1];
    const before = previous === undefined ? null : heightOf(previous);
    if (i === 0) return { night: 1, place, altitude_m: here, gain_m: null, verdict: "start" };
    if (here === null || before === null) return { night: i + 1, place, altitude_m: here, gain_m: null, verdict: "unknown" };
    const gain = here - before;
    const verdict = gain < 0 ? "descends" : gain > 1500 ? "too-steep" : gain > 500 ? "steep" : "fine";
    return { night: i + 1, place, altitude_m: here, gain_m: gain, verdict };
  });
}

/** What the route page knows that a trip's leader should hear before publishing. They warn; they never block. */
export function checkTrip(route: Route, leavesOn: string, backOn: string, nights: string[]): Check[] {
  const checks: Check[] = [];

  const season = route.header.usual_season?.value;
  const months = season ? monthsFrom(season) : null;
  if (season && months) {
    const leaves = Number(leavesOn.slice(5, 7));
    const back = Number(backOn.slice(5, 7));
    const inside = months.includes(leaves) && months.includes(back);
    checks.push({
      id: "season",
      tone: inside ? "ok" : "warn",
      title: "Season",
      words: inside
        ? `Your dates fall inside the months this road is usually ridden: ${season}.`
        : `This road is usually ridden ${season}. Your dates fall outside that.`,
    });
  }

  const openings = route.season.history
    .map((y) => y.open_to_motorcycles ?? y.connected)
    .filter((d): d is string => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d));
  if (openings.length > 0) {
    const latest = openings.map((d) => d.slice(5)).sort().at(-1) ?? "";
    const leaves = leavesOn.slice(5);
    const leavesDay = Number(leaves.slice(0, 2)) * 31 + Number(leaves.slice(3));
    const latestDay = Number(latest.slice(0, 2)) * 31 + Number(latest.slice(3));
    if (leavesDay < latestDay + 14 && leavesDay > latestDay - 60) {
      checks.push({
        id: "opening",
        tone: "warn",
        title: "Opening",
        words: `In the years on record the latest this road opened was ${sayDate(`2000-${latest}`)?.replace(" 2000", "")}. Your leaving date gives little room if it opens late.`,
      });
    }
  }

  const gains = nightGains(route, nights);
  const worst = gains.reduce<NightGain | null>(
    (w, g) => (g.gain_m !== null && (w === null || (w.gain_m ?? 0) < g.gain_m) ? g : w),
    null,
  );
  if (worst && worst.gain_m !== null && worst.gain_m > 500) {
    checks.push({
      id: "altitude",
      tone: "warn",
      title: "Altitude",
      words:
        worst.verdict === "too-steep"
          ? `Night ${worst.night} at ${worst.place} climbs ${feet(worst.gain_m)} above the night before. That is too steep. Add a night lower down.`
          : `Night ${worst.night} at ${worst.place} climbs ${feet(worst.gain_m)} above the night before. Steep. Walkers are told about 1,600 feet a night.`,
    });
  } else if (gains.length > 1 && (route.header.highest_point?.altitude_m ?? 0) >= 2500) {
    checks.push({ id: "altitude", tone: "ok", title: "Altitude", words: "No night climbs more than 500 m above the one before." });
  }

  const gap = route.fuel.longest_gaps[0];
  if (gap && gap.gap_km >= 120) {
    checks.push({
      id: "fuel",
      tone: "ok",
      title: "Fuel",
      words: `${km(gap.gap_km)} with no pump, from near ${gap.near_from} to near ${gap.near_to}. Riders will be told to check their bike.`,
    });
  }
  return checks;
}
