"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { IconFlag, IconFuel, IconMap, IconUser } from "./icons";

const TABS = [
  { href: "/", label: "Routes", match: (p: string) => p === "/" || p.startsWith("/routes"), Icon: IconMap },
  { href: "/trips", label: "Trips", match: (p: string) => p.startsWith("/trips"), Icon: IconFlag },
  { href: "/tools", label: "Tools", match: (p: string) => p.startsWith("/tools"), Icon: IconFuel },
  {
    href: "/account",
    label: "You",
    match: (p: string) => p.startsWith("/account") || p.startsWith("/login") || p.startsWith("/signup"),
    Icon: IconUser,
  },
] as const;

interface Me {
  name: string;
  initials: string;
}

/** Who is logged in, asked of the server once the page has loaded, so pages themselves can be cached. */
function useMe(): Me | null {
  const [me, setMe] = useState<Me | null>(null);
  const pathname = usePathname();
  useEffect(() => {
    let live = true;
    fetch("/api/me", { credentials: "same-origin" })
      .then((r) => (r.ok ? (r.json() as Promise<{ me: Me | null }>) : { me: null }))
      .then((d) => {
        if (live) setMe(d.me);
      })
      .catch(() => {
        if (live) setMe(null);
      });
    return () => {
      live = false;
    };
  }, [pathname]);
  return me;
}

export function SiteNav() {
  const pathname = usePathname();
  const me = useMe();
  return (
    <nav aria-label="Main" className="ml-auto flex items-center gap-1">
      <div className="hidden items-center gap-1 md:flex">
        {TABS.slice(0, 3).map((t) => (
          <Link
            key={t.href}
            href={t.href}
            aria-current={t.match(pathname) ? "page" : undefined}
            className="rounded-md px-3 py-2 text-[0.9375rem] font-medium text-ink-2 hover:bg-surface-2 aria-[current=page]:bg-sign-soft aria-[current=page]:font-semibold aria-[current=page]:text-sign"
          >
            {t.label}
          </Link>
        ))}
        <Link
          href="/about"
          aria-current={pathname.startsWith("/about") ? "page" : undefined}
          className="rounded-md px-3 py-2 text-[0.9375rem] font-medium text-ink-2 hover:bg-surface-2 aria-[current=page]:bg-sign-soft aria-[current=page]:font-semibold aria-[current=page]:text-sign"
        >
          About
        </Link>
      </div>
      {me ? (
        <Link
          href="/account"
          aria-label={`Your account, ${me.name}`}
          className="font-display ml-1 grid size-9 place-items-center rounded-full border-[1.5px] border-ink bg-stone text-sm font-bold"
        >
          {me.initials}
        </Link>
      ) : (
        <Link href="/login" className="btn btn-outline ml-1 !min-h-9 px-3 text-sm">
          Log in
        </Link>
      )}
    </nav>
  );
}

export function TabBar() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Sections"
      className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-line bg-surface px-1 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:hidden"
    >
      {TABS.map(({ href, label, match, Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={match(pathname) ? "page" : undefined}
          className="flex min-h-11 flex-col items-center justify-center gap-0.5 text-xs text-ink-2 aria-[current=page]:font-semibold aria-[current=page]:text-sign"
        >
          <Icon className="size-5" />
          {label}
        </Link>
      ))}
    </nav>
  );
}
