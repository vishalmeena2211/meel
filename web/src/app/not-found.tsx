import Link from "next/link";

import { IconMap, IconSearch } from "@/components/icons";
import { SearchSuggest } from "@/components/search-suggest";
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
      <form action="/" role="search">
        <SearchSuggest name="q" inputClassName="field-input !pr-10 !pl-9">
          <IconSearch className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-2" />
        </SearchSuggest>
      </form>
    </div>
  );
}
