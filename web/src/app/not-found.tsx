import Link from "next/link";

import { IconMap, IconSearch } from "@/components/icons";
import { TopHead } from "@/components/shell";
import { Callout } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-3">
      <TopHead title="Meel" sub="rideplanner.in" />
      <Callout title="There is no page at this address">
        The link may be old, or mistyped. Nothing is wrong with your phone.
      </Callout>
      <Link className="btn btn-primary btn-block" href="/">
        <IconMap />
        See all routes
      </Link>
      <form action="/" role="search" className="relative">
        <IconSearch className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-2" />
        <input
          type="search"
          name="q"
          aria-label="Search a route or place"
          placeholder="Search a route or place"
          className="field-input !pl-9"
        />
      </form>
    </div>
  );
}
