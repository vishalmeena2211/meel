import type { Metadata } from "next";

import { AskChat } from "@/components/ask/ask-chat";
import { BackHead } from "@/components/shell";
import { STARTERS, startersFor } from "@/lib/ask/starters";
import { getRoute } from "@/lib/content";
import { currentUser } from "@/server/auth";

export async function generateMetadata(props: PageProps<"/ask">): Promise<Metadata> {
  const query = await props.searchParams;
  return {
    title: "Ask Meel",
    description: "Ask about fuel, permits, passes, distances and seasons on Meel’s routes. Every answer shows where it came from, and how old it is.",
    alternates: { canonical: "/ask" },
    // A question in the address is one rider's question, not a page for search engines.
    robots: query.q ? { index: false, follow: true } : undefined,
  };
}

export default async function AskPage(props: PageProps<"/ask">) {
  const query = await props.searchParams;
  const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : null);
  const slug = one(query.route);
  const route = slug ? await getRoute(slug) : null;
  const factId = one(query.fact);
  const factTitle = one(query.title);
  const user = await currentUser();
  const from = one(query.from) ?? "direct";

  return (
    <div className="flex flex-col gap-3">
      <BackHead title="Ask Meel" sub="Answers only from Meel’s facts" back={route ? `/routes/${route.slug}` : "/"} />
      <header className="hidden flex-col gap-1 md:flex">
        <p className="display text-4xl" role="heading" aria-level={1}>
          Ask Meel
        </p>
        <p className="hint max-w-[60ch] text-[0.9375rem]">Answers only from Meel’s facts, each with its source and its date. It never says a road is open or closed.</p>
      </header>
      <AskChat
        initial={one(query.q)?.slice(0, 300) ?? null}
        route={route ? { slug: route.slug, name: route.name } : null}
        fact={factId && factTitle ? { id: factId.slice(0, 200), title: factTitle.slice(0, 200) } : null}
        starters={route ? startersFor(route) : STARTERS}
        from={from}
        loggedIn={Boolean(user)}
      />
    </div>
  );
}
