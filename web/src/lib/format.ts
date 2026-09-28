// Words and numbers the way a rider would say them.

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "June",
  "July", "Aug", "Sept", "Oct", "Nov", "Dec",
] as const;

export function monthName(month: number, short = false): string {
  const list = short ? MONTHS_SHORT : MONTHS;
  return list[month - 1] ?? "";
}

/**
 * "2026-06-01" becomes "1 June 2026". "2026-06" becomes "June 2026". "2026" stays.
 * In a narrow column, ask for the short form: "1 June 2026", "11 Oct 2026".
 */
export function sayDate(value: string | null | undefined, short = false): string | null {
  if (!value) return null;
  const match = /^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?/.exec(value);
  if (!match) return value;
  const [, year, month, day] = match;
  if (!month) return year ?? value;
  const name = monthName(Number(month), short);
  if (!day) return `${name} ${year}`;
  return `${Number(day)} ${name} ${year}`;
}

/**
 * The few letters painted on the cap of a kilometre stone: "NH 5", "SH 49".
 * The first road number in the words wins. No number found gives a plain stone.
 */
export function stoneCap(road: string | null | undefined): string {
  const found = /\b(NH|SH|National Highway|State Highway)[\s-]?(\d+[A-Z]?)\b/i.exec(road ?? "");
  if (!found) return "";
  const kind = /^(SH|State)/i.test(found[1] ?? "") ? "SH" : "NH";
  return `${kind} ${(found[2] ?? "").toUpperCase()}`;
}

export function km(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return `${Math.round(value).toLocaleString("en-IN")} km`;
}

export const FEET_PER_METRE = 3.28084;

/**
 * A height, given in metres, said in feet, as riders and pass signboards say it: 5328 becomes "17,480 ft".
 * Rounded to the nearest 10 feet, as the metres behind it are rounded too, so it can differ from a signboard by a few feet.
 */
export function feet(metresValue: number | null | undefined): string {
  if (metresValue === null || metresValue === undefined) return "—";
  return `${(Math.round((metresValue * FEET_PER_METRE) / 10) * 10).toLocaleString("en-IN")} ft`;
}

/** 4.5 becomes "4 h 30 min". */
export function hours(value: number): string {
  const minutes = Math.round(value * 60);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

const INDIA_DAY = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/**
 * India's calendar day, as "2026-09-28". Every "today" on the site is this one,
 * on the server and on the phone, so a rider at 2 in the morning is not told that today has not happened yet.
 */
export function indiaDay(at: Date = new Date()): string {
  const parts = INDIA_DAY.formatToParts(at);
  const pick = (type: "year" | "month" | "day") => parts.find((p) => p.type === type)?.value ?? "";
  return `${pick("year")}-${pick("month")}-${pick("day")}`;
}

/** The India day on which a stored moment fell. Moments are stored in world time. */
export function dayOf(moment: string): string {
  const at = new Date(moment);
  return Number.isNaN(at.getTime()) ? moment.slice(0, 10) : indiaDay(at);
}

/** India's calendar month, as "2026-09". */
export function indiaMonth(at: Date = new Date()): string {
  return indiaDay(at).slice(0, 7);
}

/** Whole days between two dates, counted in India's calendar. */
export function daysBetween(from: string, to: Date): number {
  const then = new Date(`${from.slice(0, 10)}T00:00:00Z`).getTime();
  const now = new Date(`${indiaDay(to)}T00:00:00Z`).getTime();
  return Math.max(0, Math.round((now - then) / 86_400_000));
}

export function sayAge(days: number): string {
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 60) return `${days} days ago`;
  const months = Math.round(days / 30.4);
  if (months < 24) return `${months} months ago`;
  return `${Math.round(days / 365)} years ago`;
}

/** "Rahul Negi" becomes "Rahul N." */
export function shortName(full: string): string {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  const first = parts[0];
  if (!first) return "A rider";
  const last = parts.length > 1 ? parts[parts.length - 1] : undefined;
  return last ? `${first} ${last.charAt(0).toUpperCase()}.` : first;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const SOURCE_WORDS: Record<string, string> = {
  official: "Official page",
  news: "News report",
  encyclopedia: "Encyclopedia",
  blog: "Published guide",
  forum: "Riders' forum",
  operator: "Tour company's page",
  map: "Open map",
};

export function sourceKindName(kind: string): string {
  return SOURCE_WORDS[kind] ?? "Web page";
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function plural(count: number, one: string, many = `${one}s`): string {
  return `${count.toLocaleString("en-IN")} ${count === 1 ? one : many}`;
}

/** A list of month numbers as words: [6,7,8] becomes "June to August". */
export function sayMonths(months: number[]): string {
  if (months.length === 0) return "All year";
  const sorted = [...new Set(months)].sort((a, b) => a - b);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  if (first === undefined || last === undefined) return "All year";
  const unbroken = sorted.every((m, i) => i === 0 || m === (sorted[i - 1] ?? 0) + 1);
  if (unbroken && sorted.length > 1) return `${monthName(first)} to ${monthName(last)}`;
  // A run that wraps over the new year, such as November to February.
  const wraps = sorted.includes(12) && sorted.includes(1);
  if (wraps) {
    const gapAt = sorted.findIndex((m, i) => i > 0 && m !== (sorted[i - 1] ?? 0) + 1);
    const start = sorted[gapAt];
    const end = sorted[gapAt - 1];
    if (start !== undefined && end !== undefined) {
      return `${monthName(start)} to ${monthName(end)}`;
    }
  }
  return sorted.map((m) => monthName(m, true)).join(", ");
}
