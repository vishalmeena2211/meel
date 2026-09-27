"use client";

import { useCallback, useSyncExternalStore } from "react";

// Small things kept on the rider's own phone: their bike, their name, their ticks.
// Nothing here is sent anywhere.

const listeners = new Set<() => void>();

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    // Private windows and locked-down phones refuse. The page works without it.
    return null;
  }
}

export function useStored(key: string): [string | null, (value: string | null) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => read(key),
    () => null,
  );
  const set = useCallback(
    (next: string | null) => {
      try {
        if (next === null) window.localStorage.removeItem(key);
        else window.localStorage.setItem(key, next);
      } catch {
        // Not remembered. Nothing else is affected.
      }
      for (const listener of listeners) listener();
    },
    [key],
  );
  return [value, set];
}

export function parseStored<T>(raw: string | null, check: (value: unknown) => value is T): T | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as unknown;
    return check(value) ? value : null;
  } catch {
    return null;
  }
}
