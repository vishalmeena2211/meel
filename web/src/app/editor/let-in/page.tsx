import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { LetRiderIn } from "@/components/editor/let-rider-in";
import { PageTitle } from "@/components/form";
import { Foot } from "@/components/shell";
import { currentUser } from "@/server/auth";

export const metadata: Metadata = { title: "A rider cannot get in", robots: { index: false } };

export default async function LetInPage() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/editor/let-in");
  if (!user.is_editor) notFound();
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4">
      <PageTitle
        title="A rider cannot get in"
        lede="Meel sends no email, so a lost password is put right by you."
        phone={{ title: "Editor", sub: "A rider cannot get in", back: "/editor" }}
      />
      <LetRiderIn />
      <Foot>
        <Link className="btn btn-outline btn-block" href="/editor">
          Done
        </Link>
      </Foot>
    </div>
  );
}
