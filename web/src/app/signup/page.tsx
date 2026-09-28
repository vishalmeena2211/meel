import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { GoogleButton, OrWithEmail } from "@/components/account/google";
import { SignUpForm } from "@/components/account/forms";
import { PageTitle } from "@/components/form";
import { Callout } from "@/components/ui";
import { safeNext } from "@/lib/next-page";
import { currentUser, googleIsOn } from "@/server/auth";

export const metadata: Metadata = { title: "Create an account" };

export default async function SignUpPage(props: PageProps<"/signup">) {
  const query = await props.searchParams;
  const next = safeNext(typeof query.next === "string" ? query.next : null);
  if (await currentUser()) redirect("/account");

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4">
      <PageTitle title="Create an account" lede="Takes about a minute." phone={{ sub: "Takes about a minute", back: next.startsWith("/trips/") ? next : "/" }} />
      <Callout tone="info" title="You need an account only to join or post a trip">
        The leader of a trip needs to know who is asking. Reading routes, using the tools and sending reports stay open
        to everyone.
      </Callout>
      {googleIsOn ? (
        <>
          <GoogleButton next={next} />
          <OrWithEmail />
        </>
      ) : null}
      <SignUpForm next={next} />
    </div>
  );
}
