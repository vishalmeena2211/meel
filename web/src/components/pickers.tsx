"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from "react";

import { indiaDay, indiaMonth, monthName, sayDate } from "@/lib/format";
import { fold } from "@/lib/search";

import { IconBack, IconCalendar, IconCheck, IconDown, IconRight, IconSearch, IconX } from "./icons";

/*
  Meel's own list, day and month pickers, drawn instead of the browser's (wireframes, screen 32).
  A browser draws these its own way on every phone: one shows 19/06/2027, another 06/19/2027.
  These always read the Indian way, "Saturday 19 June 2027", with a week that starts on Sunday.

  Each is a button that looks like a typing box. It opens a sheet from the foot of a phone, or a panel
  under the box on a laptop. What was picked goes to the form in a hidden field, in the same shape the
  browser's own would have sent: 2027-06-19 for a day, 2027-06 for a month.
*/

const WIDE = "(min-width: 768px)";

type Closed = "picked" | "back" | "away";

/**
 * The sheet or panel the three pickers open. It sits in the top layer, so no scrolling box or other
 * sheet can cut it off. Tapping outside closes it; so do Escape and the cross.
 */
function Popup({
  open,
  anchor,
  title,
  onClose,
  children,
  width = 0,
}: {
  open: boolean;
  anchor: RefObject<HTMLElement | null>;
  title: string;
  onClose: (how: Closed) => void;
  children: ReactNode;
  /** On a laptop, the panel is at least this wide, and as wide as its box. */
  width?: number;
}) {
  const pop = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useLayoutEffect(() => {
    const el = pop.current;
    if (!el) return;
    const shown = el.matches(":popover-open");
    if (open && !shown) el.showPopover();
    if (!open && shown) el.hidePopover();
  }, [open]);

  // On a laptop the panel sits under its box, or above it when there is no room below. On a phone the CSS makes it a sheet.
  useLayoutEffect(() => {
    const el = pop.current;
    const box = anchor.current;
    if (!open || !el || !box) return;
    function place() {
      if (!el || !box) return;
      if (!window.matchMedia(WIDE).matches) {
        el.style.top = el.style.left = el.style.width = "";
        return;
      }
      const r = box.getBoundingClientRect();
      const w = Math.min(Math.max(r.width, width), window.innerWidth - 16);
      const h = el.offsetHeight;
      const room = window.innerHeight - r.bottom - 12;
      el.style.width = `${w}px`;
      el.style.left = `${Math.min(Math.max(8, r.left), window.innerWidth - w - 8)}px`;
      el.style.top = `${room >= h || room >= r.top ? r.bottom + 6 : Math.max(8, r.top - 6 - h)}px`;
    }
    place();
    const sized = new ResizeObserver(place);
    sized.observe(el);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      sized.disconnect();
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, anchor, width]);

  // A tap anywhere else closes it with nothing changed. A tap on the box itself is the box's to handle.
  useEffect(() => {
    if (!open) return;
    function down(event: PointerEvent) {
      const el = pop.current;
      const target = event.target as Node | null;
      if (!el || !target || anchor.current?.contains(target)) return;
      if (target === el) {
        // Either the panel's own edge, or the dimmed page behind a phone's sheet, which belongs to the sheet.
        const r = el.getBoundingClientRect();
        const inside = event.clientX >= r.left && event.clientX <= r.right && event.clientY >= r.top && event.clientY <= r.bottom;
        if (!inside) onClose("back");
        return;
      }
      if (!el.contains(target)) onClose("away");
    }
    document.addEventListener("pointerdown", down, true);
    return () => document.removeEventListener("pointerdown", down, true);
  }, [open, anchor, onClose]);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Escape") return;
    // Only this closes. A fact's sheet behind it stays open.
    event.preventDefault();
    event.stopPropagation();
    onClose("back");
  }

  function onBlur(event: FocusEvent<HTMLDivElement>) {
    const next = event.relatedTarget as Node | null;
    if (next && !event.currentTarget.contains(next) && !anchor.current?.contains(next)) onClose("away");
  }

  return (
    <div ref={pop} popover="manual" role="dialog" aria-labelledby={titleId} className="picker" onKeyDown={onKeyDown} onBlur={onBlur}>
      <span className="mx-auto mb-1 block h-1 w-10 shrink-0 rounded-full bg-line md:hidden" aria-hidden="true" />
      <div className="flex shrink-0 items-center justify-between gap-2 pb-2 md:hidden">
        <b id={titleId} className="display text-xl">
          {title}
        </b>
        <button type="button" className="grid size-10 place-items-center rounded-lg border border-line" aria-label="Close" onClick={() => onClose("back")}>
          <IconX className="size-4" />
        </button>
      </div>
      {children}
    </div>
  );
}

/** The part of each picker that looks like a typing box. */
function Face({
  id,
  labelId,
  open,
  shown,
  empty,
  icon,
  invalid,
  describedBy,
  onOpen,
  onClose,
  box,
}: {
  id: string;
  labelId: string;
  open: boolean;
  shown: string;
  empty: boolean;
  icon: ReactNode;
  invalid?: boolean;
  describedBy?: string;
  onOpen: () => void;
  onClose: () => void;
  box: RefObject<HTMLButtonElement | null>;
}) {
  return (
    <button
      ref={box}
      type="button"
      id={id}
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-labelledby={`${labelId} ${id}-shown`}
      aria-describedby={describedBy}
      onClick={() => (open ? onClose() : onOpen())}
      onKeyDown={(event) => {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          if (!open) onOpen();
        }
      }}
      // A button cannot be marked invalid for a screen reader. The reason is read out through aria-describedby.
      className={`field-input flex cursor-pointer items-center gap-2 text-left ${invalid ? "!border-stale-fg" : ""}`}
    >
      <span id={`${id}-shown`} className={`min-w-0 flex-1 truncate ${empty ? "text-ink-2" : ""}`}>
        {shown}
      </span>
      {icon}
    </button>
  );
}

/** Hands a picked value to the form at once, so a form that reads itself on change sees it straight away. */
function useHidden(name: string | undefined, value: string) {
  const hidden = useRef<HTMLInputElement>(null);
  const field = name ? <input ref={hidden} type="hidden" name={name} value={value} /> : null;
  function set(next: string) {
    if (hidden.current) hidden.current.value = next;
  }
  return { field, set };
}

function touchFirst(): boolean {
  return window.matchMedia("(pointer: coarse)").matches;
}

// ── A list ───────────────────────────────────────────────────────────

export interface Choice {
  value: string;
  label: string;
}

export interface ChoiceGroup {
  /** Shown above its choices. Leave empty for a list with no groups. */
  label: string;
  choices: Choice[];
}

interface Common {
  id: string;
  /** The id of the label above the box. */
  labelId: string;
  /** Said at the top of a phone's sheet: the box's own label. */
  title: string;
  /** Set when the pick goes to a form. */
  name?: string;
  invalid?: boolean;
  describedBy?: string;
}

export function ListPicker({
  id,
  labelId,
  title,
  name,
  invalid,
  describedBy,
  groups,
  value,
  defaultValue = "",
  onValueChange,
  placeholder,
}: Common & {
  groups: ChoiceGroup[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  placeholder: string;
}) {
  const [own, setOwn] = useState(defaultValue);
  const chosen = value ?? own;
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [active, setActive] = useState(0);
  const box = useRef<HTMLButtonElement>(null);
  const narrow = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const hunt = useRef({ letters: "", at: 0 });
  const listId = useId();
  const { field, set } = useHidden(name, chosen);

  const all = groups.flatMap((g) => g.choices);
  const long = all.length > 10;
  const q = fold(typed.trim());
  const shownGroups = groups
    .map((g) => ({ ...g, choices: q && !fold(g.label).includes(q) ? g.choices.filter((c) => fold(c.label).includes(q)) : g.choices }))
    .filter((g) => g.choices.length > 0);
  const flat = shownGroups.flatMap((g) => g.choices);
  const current = all.find((c) => c.value === chosen);
  const activeId = flat[active] ? `${listId}-${flat[active].value}` : undefined;

  function show() {
    setTyped("");
    // The shaded row is the keyboard's. On a phone nothing is shaded until the rider types to narrow the list.
    setActive(touchFirst() ? -1 : Math.max(0, all.findIndex((c) => c.value === chosen)));
    setOpen(true);
  }

  function close(how: Closed) {
    setOpen(false);
    if (how !== "away") box.current?.focus();
  }

  function pick(choice: Choice) {
    set(choice.value);
    if (value === undefined) setOwn(choice.value);
    onValueChange?.(choice.value);
    close("picked");
  }

  // On opening: the box to narrow the list on a laptop; the list itself on a phone, so no keyboard jumps up.
  useEffect(() => {
    if (!open) return;
    if (long && !touchFirst()) narrow.current?.focus();
    else list.current?.focus();
  }, [open, long]);

  useEffect(() => {
    if (open && activeId) document.getElementById(activeId)?.scrollIntoView({ block: "nearest" });
  }, [open, activeId]);

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    const last = flat.length - 1;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setActive((a) => Math.min(last, Math.max(0, a + (event.key === "ArrowDown" ? 1 : -1))));
    } else if (event.key === "Home" || event.key === "End") {
      if (event.currentTarget === narrow.current) return;
      event.preventDefault();
      setActive(event.key === "Home" ? 0 : last);
    } else if (event.key === "Enter" || (event.key === " " && event.currentTarget === list.current)) {
      event.preventDefault();
      const c = flat[active];
      if (c) pick(c);
    } else if (event.currentTarget === list.current && event.key.length === 1 && !event.metaKey && !event.ctrlKey) {
      // Typing on the list jumps to the next choice that starts with those letters.
      const at = event.timeStamp;
      hunt.current = { letters: (at - hunt.current.at < 700 ? hunt.current.letters : "") + fold(event.key), at };
      const from = hunt.current.letters.length === 1 ? active + 1 : active;
      const order = [...flat.slice(from), ...flat.slice(0, from)];
      const hit = order.find((c) => fold(c.label).startsWith(hunt.current.letters));
      if (hit) setActive(flat.indexOf(hit));
    }
  }

  return (
    <>
      <Face
        id={id}
        labelId={labelId}
        open={open}
        shown={current?.label ?? placeholder}
        empty={!current}
        icon={<IconDown className="size-4 shrink-0 text-ink-2" />}
        invalid={invalid}
        describedBy={describedBy}
        onOpen={show}
        onClose={() => close("back")}
        box={box}
      />
      {field}
      <Popup open={open} anchor={box} title={title} onClose={close} width={288}>
        {long ? (
          <label className="field-input mb-1 flex shrink-0 items-center gap-2 !min-h-11 !py-0 focus-within:border-sign focus-within:shadow-[0_0_0_3px_var(--color-sign-soft)]">
            <IconSearch className="size-4 shrink-0 text-ink-2" />
            <span className="sr-only">Narrow the list</span>
            <input
              ref={narrow}
              type="text"
              value={typed}
              onChange={(e) => {
                setTyped(e.target.value);
                setActive(0);
              }}
              onKeyDown={onKeyDown}
              role="combobox"
              aria-expanded="true"
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={activeId}
              placeholder="Type to narrow the list"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              className="min-h-10 w-full bg-transparent outline-none"
            />
          </label>
        ) : null}
        <div
          ref={list}
          id={listId}
          role="listbox"
          aria-labelledby={labelId}
          tabIndex={-1}
          aria-activedescendant={activeId}
          onKeyDown={onKeyDown}
          className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1 outline-none md:max-h-72"
        >
          {shownGroups.length === 0 ? <p className="hint px-2 py-3">Nothing in the list matches “{typed.trim()}”.</p> : null}
          {shownGroups.map((g) => (
            <div key={g.label || "all"} role="group" aria-label={g.label || undefined}>
              {g.label ? (
                <div aria-hidden="true" className="display px-2 pt-3 pb-1 text-[0.75rem] font-semibold tracking-widest text-ink-2 uppercase">
                  {g.label}
                </div>
              ) : null}
              {g.choices.map((c) => {
                const at = flat.indexOf(c);
                const on = c.value === chosen;
                return (
                  <div
                    key={c.value}
                    id={`${listId}-${c.value}`}
                    role="option"
                    aria-selected={on}
                    onClick={() => pick(c)}
                    onPointerMove={() => setActive(at)}
                    className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-[0.9375rem] ${
                      at === active ? "bg-sign-soft" : ""
                    } ${on ? "font-semibold" : ""}`}
                  >
                    <span className="min-w-0 flex-1">{c.label}</span>
                    {on ? <IconCheck className="size-4 shrink-0 text-sign" /> : null}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </Popup>
    </>
  );
}

// ── Days and months ──────────────────────────────────────────────────

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function parts(day: string): [number, number, number] {
  const [y = 1970, m = 1, d = 1] = day.split("-").map(Number);
  return [y, m, d];
}

function utc(day: string): Date {
  const [y, m, d] = parts(day);
  return new Date(Date.UTC(y, m - 1, d));
}

function isoOf(date: Date): string {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

function addDays(day: string, n: number): string {
  const at = utc(day);
  at.setUTCDate(at.getUTCDate() + n);
  return isoOf(at);
}

function daysIn(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

function addMonths(day: string, n: number): string {
  const [y, m, d] = parts(day);
  const first = new Date(Date.UTC(y, m - 1 + n, 1));
  const ny = first.getUTCFullYear();
  const nm = first.getUTCMonth() + 1;
  return `${ny}-${pad(nm)}-${pad(Math.min(d, daysIn(ny, nm)))}`;
}

/** "Saturday 19 June 2027", from "2027-06-19". */
export function sayDay(day: string): string {
  const [y, m, d] = parts(day);
  return `${WEEKDAYS[utc(day).getUTCDay()]} ${d} ${monthName(m)} ${y}`;
}

function within(value: string, min?: string, max?: string): boolean {
  return (!min || value >= min) && (!max || value <= max);
}

function clamp(value: string, min?: string, max?: string): string {
  if (min && value < min) return min;
  if (max && value > max) return max;
  return value;
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const MONTH = /^\d{4}-\d{2}$/;

export function DayPicker({
  id,
  labelId,
  title,
  name,
  invalid,
  describedBy,
  value,
  defaultValue = "",
  onValueChange,
  min,
  max,
  placeholder = "Pick a day",
}: Common & {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** The first day that can be picked, such as "2027-06-14", or "today": India's day when the calendar opens. */
  min?: string;
  /** The last day that can be picked, or "today". */
  max?: string;
  placeholder?: string;
}) {
  const [own, setOwn] = useState(DAY.test(defaultValue) ? defaultValue : "");
  const chosen = value ?? own;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("");
  const [today, setToday] = useState("");
  const box = useRef<HTMLButtonElement>(null);
  const grid = useRef<HTMLTableElement>(null);
  const moved = useRef(false);
  const headId = useId();
  const { field, set } = useHidden(name, chosen);
  const lo = min === "today" ? today || undefined : min;
  const hi = max === "today" ? today || undefined : max;

  function show() {
    // Today is India's calendar day, worked out when the calendar opens.
    const now = indiaDay();
    setToday(now);
    setActive(clamp(DAY.test(chosen) ? chosen : now, min === "today" ? now : min, max === "today" ? now : max));
    moved.current = true;
    setOpen(true);
  }

  function close(how: Closed) {
    setOpen(false);
    if (how !== "away") box.current?.focus();
  }

  function pick(day: string) {
    if (!within(day, lo, hi)) return;
    set(day);
    if (value === undefined) setOwn(day);
    onValueChange?.(day);
    close("picked");
  }

  // The day in reach of the keyboard has the focus, once the calendar opens and after each arrow key.
  useEffect(() => {
    if (!open || !moved.current) return;
    moved.current = false;
    grid.current?.querySelector<HTMLButtonElement>(`[data-day="${active}"]`)?.focus();
  }, [open, active]);

  function onKeyDown(event: KeyboardEvent<HTMLTableElement>) {
    const weekday = utc(active).getUTCDay();
    const step: Record<string, () => string> = {
      ArrowLeft: () => addDays(active, -1),
      ArrowRight: () => addDays(active, 1),
      ArrowUp: () => addDays(active, -7),
      ArrowDown: () => addDays(active, 7),
      Home: () => addDays(active, -weekday),
      End: () => addDays(active, 6 - weekday),
      PageUp: () => addMonths(active, event.shiftKey ? -12 : -1),
      PageDown: () => addMonths(active, event.shiftKey ? 12 : 1),
    };
    const go = step[event.key];
    if (go) {
      event.preventDefault();
      moved.current = true;
      setActive(clamp(go(), lo, hi));
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      pick(active);
    }
  }

  const [y, m] = active ? parts(active) : [1970, 1];
  const first = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const count = daysIn(y, m);
  const cells: Array<string | null> = [...Array<null>(first).fill(null)];
  for (let d = 1; d <= count; d += 1) cells.push(`${y}-${pad(m)}-${pad(d)}`);
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks = Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));
  // The arrows beside the month stop where no day could be picked.
  const noEarlier = !!lo && addDays(`${y}-${pad(m)}-01`, -1) < lo;
  const noLater = !!hi && addMonths(`${y}-${pad(m)}-01`, 1) > hi;
  const why = [
    lo ? (lo === today ? "Days before today cannot be picked." : `Days before ${sayDay(lo)} cannot be picked.`) : null,
    hi ? (hi === today ? "Days still to come cannot be picked." : `Days after ${sayDay(hi)} cannot be picked.`) : null,
  ]
    .filter(Boolean)
    .join(" ");

  function turn(to: string) {
    setActive(clamp(to, lo, hi));
  }

  return (
    <>
      <Face
        id={id}
        labelId={labelId}
        open={open}
        shown={chosen ? sayDay(chosen) : placeholder}
        empty={!chosen}
        icon={<IconCalendar className="size-4 shrink-0 text-ink-2" />}
        invalid={invalid}
        describedBy={describedBy}
        onOpen={show}
        onClose={() => close("back")}
        box={box}
      />
      {field}
      <Popup open={open} anchor={box} title={title} onClose={close} width={320}>
        {open ? (
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between pb-1">
              <button type="button" className="grid size-10 place-items-center rounded-lg border border-line disabled:opacity-40" aria-label="The month before" disabled={noEarlier} onClick={() => turn(addMonths(active, -1))}>
                <IconBack className="size-4" />
              </button>
              <b id={headId} className="display text-lg tracking-wide" aria-live="polite">
                {monthName(m)} {y}
              </b>
              <button type="button" className="grid size-10 place-items-center rounded-lg border border-line disabled:opacity-40" aria-label="The month after" disabled={noLater} onClick={() => turn(addMonths(active, 1))}>
                <IconRight className="size-4" />
              </button>
            </div>
            <table ref={grid} role="grid" aria-labelledby={headId} className="w-full table-fixed border-collapse text-center" onKeyDown={onKeyDown}>
              <thead>
                <tr>
                  {WEEKDAYS.map((w) => (
                    <th key={w} scope="col" abbr={w} className="py-1 text-[0.75rem] font-semibold text-ink-2">
                      {w.slice(0, 2)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {weeks.map((week, wi) => (
                  <tr key={wi}>
                    {week.map((day, di) =>
                      day ? (
                        <td key={day} className="p-0.5">
                          <button
                            type="button"
                            data-day={day}
                            tabIndex={day === active ? 0 : -1}
                            aria-label={sayDay(day)}
                            aria-pressed={day === chosen}
                            aria-current={day === today ? "date" : undefined}
                            aria-disabled={within(day, lo, hi) ? undefined : true}
                            onClick={() => pick(day)}
                            className={`num mx-auto grid size-10 place-items-center rounded-full text-[0.9375rem] ${
                              day === chosen
                                ? "bg-sign font-semibold text-surface"
                                : within(day, lo, hi)
                                  ? "hover:bg-sign-soft"
                                  : "cursor-not-allowed text-rule opacity-60"
                            } ${day === today && day !== chosen ? "font-semibold shadow-[inset_0_0_0_1.5px_var(--color-ink-2)]" : ""}`}
                          >
                            {Number(day.slice(8))}
                          </button>
                        </td>
                      ) : (
                        <td key={`blank-${di}`} />
                      ),
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {why ? <p className="hint pt-1 text-center">{why}</p> : null}
          </div>
        ) : null}
      </Popup>
    </>
  );
}

const MONTH_ORDER = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export function MonthPicker({
  id,
  labelId,
  title,
  name,
  invalid,
  describedBy,
  value,
  defaultValue = "",
  onValueChange,
  min,
  max,
  placeholder = "Pick a month",
}: Common & {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Such as "2027-06". */
  min?: string;
  max?: string;
  placeholder?: string;
}) {
  const [own, setOwn] = useState(MONTH.test(defaultValue) ? defaultValue : "");
  const chosen = value ?? own;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("");
  const [thisMonth, setThisMonth] = useState("");
  const box = useRef<HTMLButtonElement>(null);
  const grid = useRef<HTMLDivElement>(null);
  const moved = useRef(false);
  const headId = useId();
  const { field, set } = useHidden(name, chosen);

  function show() {
    const now = indiaMonth();
    setThisMonth(now);
    setActive(clamp(MONTH.test(chosen) ? chosen : now, min, max));
    moved.current = true;
    setOpen(true);
  }

  function close(how: Closed) {
    setOpen(false);
    if (how !== "away") box.current?.focus();
  }

  function pick(month: string) {
    if (!within(month, min, max)) return;
    set(month);
    if (value === undefined) setOwn(month);
    onValueChange?.(month);
    close("picked");
  }

  useEffect(() => {
    if (!open || !moved.current) return;
    moved.current = false;
    grid.current?.querySelector<HTMLButtonElement>(`[data-month="${active}"]`)?.focus();
  }, [open, active]);

  const year = Number(active.slice(0, 4)) || 1970;
  const shift = (month: string, n: number) => addMonths(`${month}-01`, n).slice(0, 7);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const by: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -3, ArrowDown: 3, PageUp: -12, PageDown: 12 };
    const n = by[event.key];
    if (n !== undefined) {
      event.preventDefault();
      moved.current = true;
      setActive(clamp(shift(active, n), min, max));
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      pick(active);
    }
  }

  const why = [
    min ? `Months before ${sayDate(min)} cannot be picked.` : null,
    max ? (max === thisMonth ? "Months still to come cannot be picked." : `Months after ${sayDate(max)} cannot be picked.`) : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <Face
        id={id}
        labelId={labelId}
        open={open}
        shown={chosen ? (sayDate(chosen) ?? chosen) : placeholder}
        empty={!chosen}
        icon={<IconCalendar className="size-4 shrink-0 text-ink-2" />}
        invalid={invalid}
        describedBy={describedBy}
        onOpen={show}
        onClose={() => close("back")}
        box={box}
      />
      {field}
      <Popup open={open} anchor={box} title={title} onClose={close} width={300}>
        {open ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <button
                type="button"
                className="grid size-10 place-items-center rounded-lg border border-line disabled:opacity-40"
                aria-label="The year before"
                disabled={!!min && `${year - 1}-12` < min}
                onClick={() => setActive(clamp(shift(active, -12), min, max))}
              >
                <IconBack className="size-4" />
              </button>
              <b id={headId} className="display text-lg tracking-wide" aria-live="polite">
                {year}
              </b>
              <button
                type="button"
                className="grid size-10 place-items-center rounded-lg border border-line disabled:opacity-40"
                aria-label="The year after"
                disabled={!!max && `${year + 1}-01` > max}
                onClick={() => setActive(clamp(shift(active, 12), min, max))}
              >
                <IconRight className="size-4" />
              </button>
            </div>
            <div ref={grid} role="group" aria-labelledby={headId} className="grid grid-cols-3 gap-2" onKeyDown={onKeyDown}>
              {MONTH_ORDER.map((n) => {
                const month = `${year}-${pad(n)}`;
                const allowed = within(month, min, max);
                const on = month === chosen;
                return (
                  <button
                    key={month}
                    type="button"
                    data-month={month}
                    tabIndex={month === active ? 0 : -1}
                    aria-label={`${monthName(n)} ${year}`}
                    aria-pressed={on}
                    aria-current={month === thisMonth ? "date" : undefined}
                    aria-disabled={allowed ? undefined : true}
                    onClick={() => pick(month)}
                    className={`grid h-11 place-items-center rounded-lg border text-[0.9375rem] ${
                      on
                        ? "border-sign bg-sign font-semibold text-surface"
                        : allowed
                          ? "border-line hover:bg-sign-soft"
                          : "cursor-not-allowed border-line bg-surface-2 text-rule"
                    }`}
                  >
                    {monthName(n, true)}
                  </button>
                );
              })}
            </div>
            {why ? <p className="hint text-center">{why}</p> : null}
          </div>
        ) : null}
      </Popup>
    </>
  );
}
