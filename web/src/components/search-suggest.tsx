"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

import { track } from "@/lib/analytics";
import { suggest, type SearchRoute, type Suggestion } from "@/lib/search";

import { IconFlag, IconMap, IconSearch, IconX } from "./icons";

/*
  A search box that suggests routes and places as a rider types (wireframes, screen 2, frames 4 and 5).
  It follows the combobox pattern a screen reader expects: the typing stays in the box, the arrow keys move
  through the suggestions, Enter opens the one picked, and Escape closes the list.
*/

let fetched: Promise<SearchRoute[]> | null = null;

/** The header's box has no routes of its own. It asks for them once per visit, the first time it is used. */
function loadRoutes(): Promise<SearchRoute[]> {
  fetched ??= fetch("/search-index.json")
    .then((reply) => (reply.ok ? (reply.json() as Promise<{ routes: SearchRoute[] }>) : { routes: [] }))
    .then((body) => body.routes)
    .catch(() => {
      // No network. Try again the next time the box is used.
      fetched = null;
      return [];
    });
  return fetched;
}

function Marked({ text, hit }: { text: string; hit: Suggestion["hit"] }) {
  if (!hit) return <>{text}</>;
  return (
    <>
      {text.slice(0, hit[0])}
      <u className="decoration-2 underline-offset-2">{text.slice(hit[0], hit[1])}</u>
      {text.slice(hit[1])}
    </>
  );
}

const HEADINGS: Record<Suggestion["kind"], (typed: string) => string> = {
  route: () => "Routes",
  place: () => "Places on a route",
  like: (typed) => `No route called “${typed}”. Spelt like it`,
};

export function SearchSuggest({
  routes: given,
  value: controlled,
  onValueChange,
  name,
  placement = "page",
  inputClassName,
  className,
  children,
}: {
  /** The routes to suggest from. Without them the box fetches its own, the first time it is used. */
  routes?: SearchRoute[];
  value?: string;
  onValueChange?: (value: string) => void;
  /**
   * Set when the box sits in a search form. Enter with nothing picked then searches every route, as it does with
   * no JavaScript, and the list ends with a row that does the same.
   */
  name?: string;
  /** In the header, the list is wider than the box. */
  placement?: "header" | "page";
  inputClassName?: string;
  className?: string;
  /** Drawn inside the box's frame, before the typing: the magnifying glass. */
  children?: ReactNode;
}) {
  const router = useRouter();
  const id = useId();
  const listId = `${id}-list`;
  const [own, setOwn] = useState("");
  const value = controlled ?? own;
  const [fetchedRoutes, setFetchedRoutes] = useState<SearchRoute[]>([]);
  const routes = given ?? fetchedRoutes;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const input = useRef<HTMLInputElement>(null);

  const typed = value.trim();
  const found = useMemo(() => suggest(typed, routes), [typed, routes]);
  const header = placement === "header";
  // A box in a search form ends its list with a row that searches every route: the front page, narrowed to it.
  const everywhere = name && typed.length >= 2 ? `/?q=${encodeURIComponent(typed)}` : null;
  const rows = found.length + (everywhere ? 1 : 0);
  const shown = open && rows > 0;

  function setValue(next: string) {
    if (controlled === undefined) setOwn(next);
    onValueChange?.(next);
    setOpen(true);
    setActive(-1);
  }

  function wake() {
    if (given || fetchedRoutes.length > 0) return;
    void loadRoutes().then(setFetchedRoutes);
  }

  function hrefOf(row: number): string | null {
    const s = found[row];
    if (s) return `/routes/${s.slug}`;
    return row === found.length ? everywhere : null;
  }

  function chosen() {
    setOpen(false);
    setActive(-1);
    // In the header, the box empties once the rider is on their way, ready for the next search.
    if (header) {
      if (controlled === undefined) setOwn("");
      onValueChange?.("");
    }
    input.current?.blur();
  }

  function go(row: number) {
    const href = hrefOf(row);
    if (!href) return;
    track("Search suggestion picked", { kind: href.startsWith("/?") ? "all routes" : (found[row]?.kind ?? "route") });
    chosen();
    // Searching every route loads the front page afresh, so it reads the search from the address.
    if (href.startsWith("/?")) window.location.assign(href);
    else router.push(href);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (rows === 0) return;
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      if (!shown) {
        setOpen(true);
        setActive(step === 1 ? 0 : rows - 1);
        return;
      }
      // Past either end, back to the box itself, with nothing picked.
      setActive((a) => (a === -1 ? (step === 1 ? 0 : rows - 1) : a + step >= rows || a + step < 0 ? -1 : a + step));
    } else if (event.key === "Enter") {
      if (shown && active >= 0) {
        event.preventDefault();
        go(active);
      } else if (!name) {
        // On the front page the routes below are already narrowed. Close the list, and the phone's keyboard, to show them.
        event.preventDefault();
        setOpen(false);
        input.current?.blur();
      }
      // In a search form with nothing picked, the form searches every route.
    } else if (event.key === "Escape") {
      if (shown) {
        // Only close the list. A search box would otherwise empty itself too.
        event.preventDefault();
        setOpen(false);
        setActive(-1);
      }
    }
  }

  const activeId = shown && active >= 0 ? `${id}-${active}` : undefined;
  useEffect(() => {
    if (activeId) document.getElementById(activeId)?.scrollIntoView({ block: "nearest" });
  }, [activeId]);

  const said =
    typed.length < 2 || !open
      ? ""
      : found.length === 0
        ? "No suggestions."
        : `${found.length} ${found.length === 1 ? "suggestion" : "suggestions"}. Use the up and down keys to pick one.`;

  // Suggestions of one kind sit under one heading. Each keeps its place in the whole list, for the arrow keys.
  const groups: Array<{ kind: Suggestion["kind"]; items: Array<{ s: Suggestion; at: number }> }> = [];
  found.forEach((s, at) => {
    const last = groups.at(-1);
    if (last?.kind === s.kind) last.items.push({ s, at });
    else groups.push({ kind: s.kind, items: [{ s, at }] });
  });

  return (
    <div className={`relative ${className ?? ""}`}>
      {children}
      <input
        ref={input}
        type="search"
        name={name}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => {
          wake();
          setOpen(true);
        }}
        onPointerEnter={wake}
        onBlur={() => {
          setOpen(false);
          setActive(-1);
        }}
        onKeyDown={onKeyDown}
        role="combobox"
        aria-label="Search a route or place"
        aria-autocomplete="list"
        aria-expanded={shown}
        aria-controls={listId}
        aria-activedescendant={activeId}
        placeholder="Search a route or place"
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        enterKeyHint="search"
        className={inputClassName}
      />
      {value ? (
        <button
          type="button"
          aria-label="Empty the search box"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            setValue("");
            input.current?.focus();
          }}
          className="absolute top-1/2 right-2 grid size-7 -translate-y-1/2 place-items-center rounded-full bg-surface-2 text-ink-2 hover:text-ink"
        >
          <IconX className="size-3.5" />
        </button>
      ) : null}
      <div
        id={listId}
        role="listbox"
        aria-label="Suggestions"
        hidden={!shown}
        className={`absolute top-full left-0 z-40 mt-1.5 max-h-[min(62vh,30rem)] overflow-y-auto rounded-lg border border-line bg-surface shadow-[0_10px_28px_rgb(22_32_28/0.16)] ${
          header ? "w-[26rem] max-w-[calc(100vw-2rem)]" : "right-0"
        }`}
      >
        {groups.map((g, gi) => (
          <div key={`${g.kind}-${gi}`} role="group" aria-labelledby={`${id}-g${gi}`}>
            <div
              id={`${id}-g${gi}`}
              role="presentation"
              className="display px-3 pt-2.5 pb-1 text-[0.75rem] font-semibold tracking-widest text-ink-2 uppercase"
            >
              {HEADINGS[g.kind](typed)}
            </div>
            {g.items.map(({ s, at }) => (
              <Link
                key={`${s.kind}-${s.slug}-${s.label}`}
                id={`${id}-${at}`}
                href={`/routes/${s.slug}`}
                role="option"
                aria-selected={active === at}
                tabIndex={-1}
                onMouseDown={(e) => e.preventDefault()}
                onMouseMove={() => setActive(at)}
                onClick={chosen}
                data-track="Search suggestion picked"
                data-track-props={JSON.stringify({ kind: s.kind })}
                className={`flex min-h-11 items-center gap-2.5 px-3 py-1.5 ${active === at ? "bg-sign-soft" : ""}`}
              >
                {s.kind === "place" ? (
                  <IconFlag className="size-4 shrink-0 text-ink-2" />
                ) : (
                  <IconMap className="size-4 shrink-0 text-ink-2" />
                )}
                <span className="flex min-w-0 flex-1 flex-col">
                  <b className="truncate text-sm leading-5 font-semibold">
                    <Marked text={s.label} hit={s.hit} />
                  </b>
                  <span className="hint truncate">{s.hint}</span>
                </span>
              </Link>
          ))}
          </div>
        ))}
        {everywhere ? (
          <a
            id={`${id}-${found.length}`}
            href={everywhere}
            role="option"
            aria-selected={active === found.length}
            tabIndex={-1}
            onMouseDown={(e) => e.preventDefault()}
            onMouseMove={() => setActive(found.length)}
            onClick={chosen}
            data-track="Search suggestion picked"
            data-track-props='{"kind":"all routes"}'
            className={`flex min-h-11 items-center gap-2.5 px-3 py-1.5 text-sm font-semibold text-sign ${
              found.length > 0 ? "border-t border-line" : ""
            } ${active === found.length ? "bg-sign-soft" : ""}`}
          >
            <IconSearch className="size-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate">Search all routes for “{typed}”</span>
          </a>
        ) : null}
      </div>
      <p className="sr-only" role="status">
        {said}
      </p>
    </div>
  );
}
