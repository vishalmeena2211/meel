import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { rodeThisAction } from "@/app/actions/editor";
import { PageTitle } from "@/components/form";
import { Foot } from "@/components/shell";
import { Callout } from "@/components/ui";
import { getIndex } from "@/lib/content";
import type { FactSection, FactView } from "@/lib/fact-view";
import { indiaDay, plural, sayDate } from "@/lib/format";
import { currentUser } from "@/server/auth";
import { getRouteView } from "@/server/route-view";

/*
  "I rode this": the editor ticks the facts they saw on their own ride, and each is saved as a "still true" in their
  name, dated the day they rode. It is how the first rider confirmations get onto a route.

  Two steps, both plain forms, so it works on a phone without waiting for scripts: pick the route and the day, then
  tick what you saw. "Everything in this section" saves a whole section without ticking each row.
*/

export const metadata: Metadata = { title: "I rode this", robots: { index: false } };
export const dynamic = "force-dynamic";

const SECTION_WORDS: Record<FactSection, string> = {
  open: "Is it open?",
  fuel: "Fuel",
  rules: "Rules for motorcycles",
  road: "Trouble on the road",
  mechanics: "Mechanics",
  stays: "Stays",
};
const ORDER: FactSection[] = ["open", "fuel", "rules", "road", "mechanics", "stays"];

const ERRORS: Record<string, string> = {
  date: "Pick the day you rode it: not in the future, and within the last year.",
  route: "That route is not on Meel.",
  none: "Nothing was ticked, so nothing was saved.",
};

function one(v: string | string[] | undefined): string {
  return typeof v === "string" ? v : "";
}

export default async function RodeThisPage(props: PageProps<"/editor/rode">) {
  const user = await currentUser();
  if (!user) redirect("/login?next=/editor/rode");
  if (!user.is_editor) notFound();

  const query = await props.searchParams;
  const route = one(query.route);
  const seenOn = one(query.seen_on);
  const error = ERRORS[one(query.error)] ?? null;
  const saved = one(query.saved);
  const today = indiaDay();

  const index = await getIndex();
  const routes = index.routes.filter((r) => r.level !== "unwritten").sort((a, b) => a.name.localeCompare(b.name));
  const view = route && /^\d{4}-\d{2}-\d{2}$/.test(seenOn) ? await getRouteView(route) : null;

  const bySection = new Map<FactSection, FactView[]>();
  for (const f of view?.views.all ?? []) bySection.set(f.section, [...(bySection.get(f.section) ?? []), f]);

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
      <PageTitle
        title="I rode this"
        lede="Tick what you saw on your own ride. Each fact you tick is saved as confirmed by you, on the day you rode."
        phone={{ title: "Editor", sub: "I rode this", back: "/editor" }}
      />

      {error ? (
        <Callout tone="warn" title="Not saved">
          {error}
        </Callout>
      ) : null}
      {saved ? (
        <Callout tone="info" title={`${plural(Number(saved) || 0, "fact")} confirmed`}>
          {Number(one(query.asked)) > Number(saved)
            ? `The rest were already confirmed by you for ${sayDate(seenOn)}. `
            : ""}
          The route page shows them as checked within a minute.
        </Callout>
      ) : null}

      <form method="get" className="card flex flex-col gap-3 p-3">
        <label className="flex flex-col gap-1">
          <span className="label">Route</span>
          <select name="route" defaultValue={route} required className="field-input">
            <option value="" disabled>
              Pick a route
            </option>
            {routes.map((r) => (
              <option key={r.slug} value={r.slug}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="label">The day you rode it (or the last day you saw these)</span>
          <input type="date" name="seen_on" defaultValue={seenOn} max={today} required className="field-input" />
        </label>
        <button type="submit" className="btn btn-outline">
          Show its facts
        </button>
      </form>

      {view ? (
        <form action={rodeThisAction} className="flex flex-col gap-4">
          <input type="hidden" name="route" value={route} />
          <input type="hidden" name="seen_on" value={seenOn} />
          <p className="hint">
            {view.route.name} · {plural(view.views.all.length, "fact")} · seen on {sayDate(seenOn)}. Tick only what you saw
            yourself. A pump you didn&rsquo;t stop at, or a rule you didn&rsquo;t meet, stays unticked.
          </p>
          {ORDER.filter((s) => bySection.has(s)).map((s) => {
            const facts = bySection.get(s)!;
            return (
              <fieldset key={s} className="card flex flex-col">
                <legend className="label px-1 pb-1">
                  {SECTION_WORDS[s]} · {facts.length}
                </legend>
                <label className="flex min-h-12 items-center gap-2.5 border-b border-line bg-surface-2 px-3 py-2">
                  <input type="checkbox" name="all" value={s} className="size-5 shrink-0" />
                  <b className="text-[0.9375rem] leading-5">Everything in this section</b>
                </label>
                {facts.map((f) => (
                  <label key={f.id} className="flex min-h-12 items-start gap-2.5 border-b border-line px-3 py-2 last:border-b-0">
                    <input type="checkbox" name="fact" value={f.id} className="mt-0.5 size-5 shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[0.9375rem] leading-5">{f.title}</span>
                      <span className="hint">{f.line}</span>
                    </span>
                  </label>
                ))}
              </fieldset>
            );
          })}
          <Foot>
            <button type="submit" className="btn btn-primary btn-block">
              Save what I saw
            </button>
          </Foot>
        </form>
      ) : null}

      <Link className="btn btn-outline btn-block" href="/editor">
        Back to the inbox
      </Link>
    </div>
  );
}
