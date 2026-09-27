import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SignUpForm } from "@/components/account/forms";
import { PageTitle } from "@/components/form";
import { Callout } from "@/components/ui";
import { currentUser } from "@/server/auth";

export const metadata: Metadata = { title: "Create an account" };

export default async function SignUpPage(props: PageProps<"/signup">) {
  const query = await props.searchParams;
  const next = typeof query.next === "string" ? query.next : "/account";
  if (await currentUser()) redirect("/account");

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4">
      <PageTitle title="Create an account" lede="Takes about a minute." />
      <Callout tone="info" title="You need an account only to join or post a trip">
        The leader of a trip needs to know who is asking. Reading routes, using the tools and sending reports stay open
        to everyone.
      </Callout>
      <SignUpForm next={next} />
    </div>
  );
}
