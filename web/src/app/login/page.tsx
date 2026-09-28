import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { GoogleButton, OrWithEmail } from "@/components/account/google";
import { LogInForm } from "@/components/account/forms";
import { PageTitle } from "@/components/form";
import { Callout } from "@/components/ui";
import { safeNext } from "@/lib/next-page";
import { currentUser, googleIsOn } from "@/server/auth";

export const metadata: Metadata = { title: "Log in" };

export default async function LogInPage(props: PageProps<"/login">) {
  const query = await props.searchParams;
  const next = safeNext(typeof query.next === "string" ? query.next : null);
  // Auth.js sends a rider back here with ?error= when Google says no, or the rider pressed Cancel there.
  // Its own words are written for developers, so they are not shown.
  const googleSaidNo = typeof query.error === "string";
  if (await currentUser()) redirect("/account");

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4">
      <PageTitle title="Log in" phone={{ sub: "Meel", back: "/" }} />
      {googleSaidNo ? (
        <Callout tone="danger" title="Google did not let you in">
          You pressed Cancel, or Google could not say this email is yours. Nothing was saved.
        </Callout>
      ) : null}
      {googleIsOn ? (
        <>
          <GoogleButton next={next} words={googleSaidNo ? "Try Google again" : undefined} />
          <OrWithEmail />
        </>
      ) : null}
      <LogInForm next={next} />
    </div>
  );
}
