import type { Metadata } from "next";
import Link from "next/link";

import { PageTitle } from "@/components/form";
import { Callout } from "@/components/ui";

export const metadata: Metadata = { title: "Forgotten password" };

export default function ForgottenPasswordPage() {
  const chat = process.env.NEXT_PUBLIC_MEEL_CHAT_NUMBER?.replace(/\D/g, "") || null;
  const message = "I have forgotten my Meel password. The email on my account is: ";
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4">
      <PageTitle title="Forgotten password" />
      <Callout tone="warn" title="Meel cannot send email yet">
        So a password cannot be reset by a link. This is being built.
      </Callout>
      <h2 className="label">For now</h2>
      <p className="text-[0.9375rem]">
        Write to the person who keeps Meel. Say which email the account uses. They will check it is you and give you
        a one-time password. You choose your own again as soon as you log in.
      </p>
      {chat ? (
        <a
          className="btn btn-primary btn-block"
          href={`https://wa.me/${chat}?text=${encodeURIComponent(message)}`}
          target="_blank"
          rel="noreferrer noopener"
        >
          Open chat app
        </a>
      ) : (
        <Callout title="No way to write to the editor has been set up yet">
          This page will show how, once it has.
        </Callout>
      )}
      <p className="hint">Your trips and reports are not lost.</p>
      <Link className="link self-start" href="/login">
        Back to log in
      </Link>
    </div>
  );
}
