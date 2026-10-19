"use client";

import { useSyncExternalStore } from "react";

import { track } from "@/lib/analytics";

import { IconMonitor, IconMoon, IconSun } from "./icons";

/*
  Light, dark, or whatever the phone is set to (the default). The choice is kept in this browser and set as
  data-theme on <html>; THEME_SCRIPT, in the page's head, sets it again before anything is painted, so a page never
  flashes the wrong colours. With no choice, globals.css follows the phone's own setting.
*/

export type Theme = "system" | "light" | "dark";
const KEY = "meel-theme";

/** Runs in <head> before the page is painted. Kept tiny, and safe when storage is blocked. */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("${KEY}");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;

function apply(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
  try {
    if (theme === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, theme);
  } catch {
    // Storage blocked: the choice lasts until the page is left.
  }
}

// Both switches (top bar and foot) read the same value, and move together.
const listeners = new Set<() => void>();
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};
const snapshot = (): Theme => {
  const t = document.documentElement.getAttribute("data-theme");
  return t === "light" || t === "dark" ? t : "system";
};

function useTheme(): [Theme | null, (t: Theme) => void] {
  // Null on the server, so its markup and the first paint agree.
  const theme = useSyncExternalStore(subscribe, snapshot, () => null);
  return [
    theme,
    (t: Theme) => {
      apply(t);
      listeners.forEach((fn) => fn());
      track("Theme picked", { theme: t });
    },
  ];
}

const OPTIONS: Array<{ value: Theme; label: string; Icon: typeof IconSun }> = [
  { value: "system", label: "Phone’s setting", Icon: IconMonitor },
  { value: "light", label: "Light", Icon: IconSun },
  { value: "dark", label: "Dark", Icon: IconMoon },
];

/** One icon in the top bar on wider screens. Each press moves to the next: phone's setting, light, dark. */
export function ThemeButton() {
  const [theme, set] = useTheme();
  const at = OPTIONS.findIndex((o) => o.value === (theme ?? "system"));
  const now = OPTIONS[at]!;
  const next = OPTIONS[(at + 1) % OPTIONS.length]!;
  return (
    <button
      type="button"
      onClick={() => set(next.value)}
      aria-label={`Colours: ${now.label}. Switch to ${next.label.toLowerCase()}`}
      title={`Colours: ${now.label}`}
      className="grid size-10 shrink-0 place-items-center rounded-md text-ink-2 hover:bg-surface-2 hover:text-ink"
    >
      <now.Icon className="size-[18px]" />
    </button>
  );
}

/** Three choices side by side, for the foot of every page. */
export function ThemeChoice() {
  const [theme, set] = useTheme();
  return (
    <div role="radiogroup" aria-label="Colours" className="inline-flex w-fit gap-1 rounded-lg border border-on-tarmac/20 p-1">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={theme === o.value}
          onClick={() => set(o.value)}
          className="flex min-h-9 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-on-tarmac/80 hover:text-on-tarmac aria-checked:bg-on-tarmac/15 aria-checked:text-on-tarmac"
        >
          <o.Icon className="size-3.5" />
          {o.label}
        </button>
      ))}
    </div>
  );
}
