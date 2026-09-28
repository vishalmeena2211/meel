import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { logOutAction } from "@/app/actions/auth";
import { AddPassword, ChangePassword, DeleteAccount, ProfileForm, type LedTrip } from "@/components/account/forms";
import { GoogleMark } from "@/components/account/google";
import { PageTitle } from "@/components/form";
import { IconCheck, IconRight } from "@/components/icons";
import { TripCardView } from "@/components/trips/trip-card";
import { Badge, Callout, Empty, KeyFacts } from "@/components/ui";
import { getIndex } from "@/lib/content";
import { dayOf, indiaDay, sayDate } from "@/lib/format";
import { currentUser } from "@/server/auth";
import { db } from "@/server/db";
import { membersOf, tripsOf } from "@/server/trips";

export const metadata: Metadata = { title: "Your account", robots: { index: false } };

const MINE_WORDS: Record<string, { label: string; tone: "fresh" | "ageing" | "plain" | "stone" }> = {
  leading: { label: "You lead this", tone: "stone" },
  accepted: { label: "You are in", tone: "fresh" },
  asked: { label: "Waiting for an answer", tone: "ageing" },
  "waiting-for-place": { label: "Waiting for a place", tone: "ageing" },
  declined: { label: "Could not take you", tone: "plain" },
};

export default async function AccountPage(props: PageProps<"/account">) {
  const query = await props.searchParams;
  const user = await currentUser();
  if (!user) redirect("/login?next=/account");
  // A rider who came in through Google gives a home city first. It is shown on this page and to leaders.
  if (user.needs_profile) redirect("/welcome?next=/account");

  const [index, trips, confirmed, reports] = await Promise.all([
    getIndex(),
    tripsOf(user.id),
    db().factReport.count({ where: { userId: user.id, status: "applied" } }),
    db().tripReport.count({ where: { userId: user.id } }),
  ]);
  const nameOf = (slug: string) => index.routes.find((r) => r.slug === slug)?.name ?? slug;
  const live = trips.filter((t) => t.mine === "leading" || t.mine === "accepted").length;
  // Google took over this account's password lately. Said for two weeks, or until the rider adds a new one.
  const tookOver = user.google_took_over;

  // After a one-time password, or when Google has just taken over, this comes first on the page.
  // Otherwise it sits with the rest of the details.
  const password = (
    <section id="password" className="flex scroll-mt-24 flex-col gap-3">
      {user.uses_google ? (
        <>
          <h2 className="label">How you log in</h2>
          <div className="card flex min-h-12 items-center gap-2.5 px-3 py-2.5">
            <GoogleMark className="size-5 shrink-0" />
            <span className="min-w-0 flex-1">
              <b className="block text-[0.9375rem] leading-5">Google</b>
              <span className="hint block">{user.email}</span>
            </span>
            <Badge tone="fresh">In use</Badge>
          </div>
        </>
      ) : null}
      <h2 className="label">Your password</h2>
      {query.password === "added" && user.has_password ? (
        <p role="status" className="rounded-lg border border-sign-line bg-sign-soft px-3 py-2 text-sm font-medium">
          Added. You can now log in with Google, or with your email and this password.
        </p>
      ) : null}
      {user.has_password ? (
        <ChangePassword oneTime={user.must_change_password} />
      ) : (
        <>
          <p className="text-sm">
            {tookOver
              ? "Add a new one if you want to log in without Google too."
              : "You have no Meel password, and you do not need one."}
          </p>
          <AddPassword />
        </>
      )}
    </section>
  );

  const joined = trips.filter((t) => t.mine === "accepted").length;
  const leads: LedTrip[] = await Promise.all(
    trips
      .filter((t) => t.mine === "leading" && t.back_on >= indiaDay())
      .map(async (t) => ({
        id: t.id,
        name: `${nameOf(t.route_slug)}, ${sayDate(t.leaves_on)}`,
        riders: (await membersOf(t.id))
          .filter((m) => m.status === "accepted")
          .map((m) => ({ id: m.user_id, name: m.name })),
      })),
  );

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
      ) : tookOver ? (
        <>
          <Callout tone="info" title="You now log in with Google">
            This account had a password. Google has checked that this email is yours, so the password was removed and
            every other phone was logged out.
          </Callout>
          <ul className="flex flex-col gap-2 text-sm">
            <li className="flex items-start gap-2">
              <IconCheck className="mt-0.5 size-4 shrink-0 text-fresh-fg" />
              Your trips and reports are as you left them
            </li>
            <li className="flex items-start gap-2">
              <IconCheck className="mt-0.5 size-4 shrink-0 text-fresh-fg" />
              Anyone who knew the old password can no longer get in
            </li>
          </ul>
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
          <ProfileForm name={user.name} homeCity={user.home_city ?? ""} bike={user.bike} />
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

      {user.must_change_password || tookOver ? null : password}

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
          <DeleteAccount
            shownAs={user.shown_as}
            email={user.email}
            hasPassword={user.has_password}
            usesGoogle={user.uses_google}
            joined={joined}
            leads={leads}
            confirmed={confirmed}
          />
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
