import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { FinishProfileForm } from "@/components/account/forms";
import { PageTitle } from "@/components/form";
import { safeNext } from "@/lib/next-page";
import { currentUser } from "@/server/auth";

export const metadata: Metadata = { title: "Nearly done", robots: { index: false } };

/**
 * Where Google sends a rider back to. The first time, it asks for what Google does not know.
 * Every time after that it passes straight on to the page the rider came from.
 */
export default async function WelcomePage(props: PageProps<"/welcome">) {
  const query = await props.searchParams;
  const next = safeNext(typeof query.next === "string" ? query.next : null);
  const user = await currentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  if (!user.needs_profile) redirect(next);

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4">
      <PageTitle title="Nearly done" phone={{ sub: "Meel", back: "/" }} />
      <FinishProfileForm name={user.name} email={user.email} next={next} />
    </div>
  );
}
