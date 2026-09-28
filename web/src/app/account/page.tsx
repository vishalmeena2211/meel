import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { logOutAction } from "@/app/actions/auth";
import { ChangePassword, DeleteAccount, ProfileForm, type LedTrip } from "@/components/account/forms";
import { PageTitle } from "@/components/form";
import { IconRight } from "@/components/icons";
import { TripCardView } from "@/components/trips/trip-card";
import { Badge, Callout, Empty, KeyFacts } from "@/components/ui";
import { getIndex } from "@/lib/content";
import { dayOf, indiaDay, sayDate } from "@/lib/format";
import { currentUser } from "@/server/auth";
import { all } from "@/server/db";
import { membersOf, tripsOf } from "@/server/trips";

export const metadata: Metadata = { title: "Your account" };

const MINE_WORDS: Record<string, { label: string; tone: "fresh" | "ageing" | "plain" | "stone" }> = {
  leading: { label: "You lead this", tone: "stone" },
  accepted: { label: "You are in", tone: "fresh" },
  asked: { label: "Waiting for an answer", tone: "ageing" },
  "waiting-for-place": { label: "Waiting for a place", tone: "ageing" },
  declined: { label: "Could not take you", tone: "plain" },
};

export default async function AccountPage() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/account");

  const index = await getIndex();
  const nameOf = (slug: string) => index.routes.find((r) => r.slug === slug)?.name ?? slug;
  const trips = tripsOf(user.id);
  const confirmed = all<{ n: number }>(
    "SELECT COUNT(*) AS n FROM fact_reports WHERE user_id = ? AND status = 'applied'",
    user.id,
  )[0]?.n ?? 0;
  const reports = all<{ n: number }>("SELECT COUNT(*) AS n FROM trip_reports WHERE user_id = ?", user.id)[0]?.n ?? 0;
  const live = trips.filter((t) => t.mine === "leading" || t.mine === "accepted").length;

  // After a one-time password this comes first on the page. Otherwise it sits with the rest of the details.
  const password = (
    <section id="password" className="flex scroll-mt-24 flex-col gap-3">
      <h2 className="label">Your password</h2>
      <ChangePassword oneTime={user.must_change_password} />
    </section>
  );

  const joined = trips.filter((t) => t.mine === "accepted").length;
  const leads: LedTrip[] = trips
    .filter((t) => t.mine === "leading" && t.back_on >= indiaDay())
    .map((t) => ({
      id: t.id,
      name: `${nameOf(t.route_slug)}, ${sayDate(t.leaves_on)}`,
      riders: membersOf(t.id)
        .filter((m) => m.status === "accepted")
        .map((m) => ({ id: m.user_id, name: m.name })),
    }));

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <PageTitle
        title="Your account"
        lede={`${user.shown_as} · on Meel since ${sayDate(dayOf(user.created_at).slice(0, 7))}`}
        phone={{ sub: user.shown_as }}
      />

      {user.must_change_password ? (
        <>
          <Callout tone="warn" title="Choose your own password now">
            You logged in with a one-time password. The person who set it has seen it.
          </Callout>
          {password}
        </>
      ) : null}

      {/* Who you are to other riders, on one row. "Change" opens the form beneath it. */}
      <details className="card group">
        <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2.5 px-3 py-2.5 [&::-webkit-details-marker]:hidden">
          <span className="min-w-0 flex-1">
            <b className="block text-[0.9375rem] leading-5">{user.shown_as}</b>
            <span className="hint block">
              {user.home_city}
              {user.bike ? ` · ${user.bike}` : ""}
            </span>
          </span>
          <span className="link text-sm group-open:hidden">Change</span>
          <span className="link hidden text-sm group-open:inline">Close</span>
        </summary>
        <div className="flex flex-col gap-3 border-t border-line px-3 py-3">
          <p className="hint">
            Other riders see “{user.shown_as}”, your home city and your bike. Nobody sees your email, {user.email}.
          </p>
          <ProfileForm name={user.name} homeCity={user.home_city} bike={user.bike} />
        </div>
      </details>

      <KeyFacts
        items={[
          { label: "Trips", value: String(live) },
          { label: "Facts confirmed", value: String(confirmed) },
          { label: "Trip reports", value: String(reports) },
        ]}
      />

      {user.is_editor ? (
        <Link className="btn btn-soft self-start" href="/editor">
          Open the editor’s inbox
        </Link>
      ) : null}

      <section className="flex flex-col gap-1.5">
        <h2 className="label">Your trips</h2>
        {trips.length === 0 ? (
          <Empty title="You have not joined or posted a trip yet">
            <Link className="btn btn-soft" href="/trips">
              See trips riders are planning
            </Link>
          </Empty>
        ) : (
          trips.map((t) => {
            const words = MINE_WORDS[t.mine] ?? { label: t.mine, tone: "plain" as const };
            return (
              <TripCardView
                key={`${t.id}-${t.mine}`}
                trip={t}
                routeName={nameOf(t.route_slug)}
                state={<Badge tone={words.tone}>{words.label}</Badge>}
              />
            );
          })
        )}
      </section>

      {user.must_change_password ? null : password}

      <section className="flex flex-col gap-1.5">
        <h2 className="label">What Meel holds about you</h2>
        <div className="card flex flex-col">
          <a
            className="flex min-h-12 items-center gap-2.5 border-b border-line px-3 py-2.5 hover:bg-surface-2"
            href="/account/copy"
          >
            <span className="min-w-0 flex-1">
              <b className="block text-[0.9375rem] leading-5">Get a copy of everything</b>
              <span className="hint block">Your details, trips and reports</span>
            </span>
            <IconRight className="size-4 shrink-0 text-ink-2" />
          </a>
          <DeleteAccount shownAs={user.shown_as} joined={joined} leads={leads} confirmed={confirmed} />
          <form action={logOutAction}>
            <button
              type="submit"
              className="flex min-h-12 w-full items-center gap-2.5 px-3 py-2.5 text-left hover:bg-surface-2"
            >
              <b className="min-w-0 flex-1 text-[0.9375rem] leading-5">Log out</b>
              <IconRight className="size-4 shrink-0 text-ink-2" />
            </button>
          </form>
        </div>
        <p className="hint">Kept on Meel’s own server. None of it is given to anyone.</p>
      </section>
    </div>
  );
}
