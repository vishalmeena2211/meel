import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { logOutAction } from "@/app/actions/auth";
import { ChangePassword, DeleteAccount, ProfileForm } from "@/components/account/forms";
import { PageTitle } from "@/components/form";
import { TripCardView } from "@/components/trips/trip-card";
import { Badge, Callout, Empty, KeyFacts } from "@/components/ui";
import { getIndex } from "@/lib/content";
import { dayOf, sayDate } from "@/lib/format";
import { currentUser } from "@/server/auth";
import { all } from "@/server/db";
import { tripsOf } from "@/server/trips";

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

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <PageTitle title="Your account" lede={`${user.shown_as} · on Meel since ${sayDate(dayOf(user.created_at).slice(0, 7))}`} />

      {user.must_change_password ? (
        <>
          <Callout tone="warn" title="Choose your own password now">
            You logged in with a one-time password. The person who set it has seen it.
          </Callout>
          {password}
        </>
      ) : null}

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

      <section className="flex flex-col gap-2">
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

      <section className="flex flex-col gap-3">
        <h2 className="label">Your details</h2>
        <p className="hint">
          Other riders see “{user.shown_as}”, your home city and your bike. Nobody sees your email, {user.email}.
        </p>
        <ProfileForm name={user.name} homeCity={user.home_city} bike={user.bike} />
      </section>

      {user.must_change_password ? null : password}

      <section className="flex flex-col gap-3">
        <h2 className="label">What Meel holds about you</h2>
        <p className="hint">Your details, your trips and the reports you sent. Nothing else, and none of it is given to anyone.</p>
        <a className="btn btn-outline self-start" href="/account/copy">
          Get a copy of everything
        </a>
        <form action={logOutAction}>
          <button type="submit" className="btn btn-outline">
            Log out
          </button>
        </form>
        <DeleteAccount shownAs={user.shown_as} joined={live} confirmed={confirmed} />
      </section>
    </div>
  );
}
