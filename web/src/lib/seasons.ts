/*
  The months a route is usually ridden, from data/site/seasons.json, said short for a route card: "Jun–Oct",
  "Mar–Jun, Sep–Nov", "All year". The file is read by hand from each route's own "usual season" fact, because that
  wording ("late May to early October", "spring, and October to November") is too varied to read automatically.
*/

export interface SeasonFile {
  routes: Record<string, { months: number[]; from: "route" | "general"; said: string | null }>;
}

const SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Runs of months in season, each as [first, last]. A run may wrap past December: [10, 3] is October to March. */
function runs(months: number[]): Array<[number, number]> {
  const on = new Set(months);
  if (on.size === 0) return [];
  const out: Array<[number, number]> = [];
  // Start each run at a month whose month before is not in season, so October to March stays one run.
  for (let m = 1; m <= 12; m++) {
    const before = m === 1 ? 12 : m - 1;
    if (!on.has(m) || on.has(before)) continue;
    let last = m;
    while (on.has(last === 12 ? 1 : last + 1) && (last === 12 ? 1 : last + 1) !== m) last = last === 12 ? 1 : last + 1;
    out.push([m, last]);
  }
  return out;
}

/** "Jun–Oct", "Mar–Jun, Sep–Nov", "All year". Null when nothing is known. */
export function seasonWords(months: number[] | null | undefined): string | null {
  if (!months || months.length === 0) return null;
  if (new Set(months).size >= 12) return "All year";
  return runs(months)
    .map(([a, b]) => (a === b ? SHORT[a - 1] : `${SHORT[a - 1]}–${SHORT[b - 1]}`))
    .join(", ");
}

export function inSeason(months: number[] | null | undefined, month: number): boolean {
  return !!months && months.includes(month);
}

/**
 * How many months in a row, starting with this one, a route stays in season. Sorts the "In season now" list so a road
 * that is good for months yet comes before one whose season ends this month.
 */
export function monthsLeft(months: number[] | null | undefined, month: number): number {
  if (!months) return 0;
  let n = 0;
  for (let m = month; n < 12 && months.includes(m); m = (m % 12) + 1) n++;
  return n;
}
