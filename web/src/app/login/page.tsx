import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LogInForm } from "@/components/account/forms";
import { PageTitle } from "@/components/form";
import { currentUser } from "@/server/auth";

export const metadata: Metadata = { title: "Log in" };

export default async function LogInPage(props: PageProps<"/login">) {
  const query = await props.searchParams;
  const next = typeof query.next === "string" ? query.next : "/account";
  if (await currentUser()) redirect("/account");

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4">
      <PageTitle title="Log in" />
      <LogInForm next={next} />
    </div>
  );
}
