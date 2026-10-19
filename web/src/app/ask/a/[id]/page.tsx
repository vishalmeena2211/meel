import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AskMark } from "@/components/ask/ask-mark";
import { SharedAnswer } from "@/components/ask/shared-answer";
import { BackHead } from "@/components/shell";
import { sayDate } from "@/lib/format";
import { answerById } from "@/server/ask/store";

/* A shared answer (wireframes, screen 20): frozen as it was written, with its date and a way to the live facts. */

const first = (text: string) => (text.split(/(?<=[.!?।](?:\s*\[\d+\])*)\s+/)[0] ?? text).replace(/\s*\[\d+\]/g, "");

export async function generateMetadata(props: PageProps<"/ask/a/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const found = await answerById(id);
  if (!found?.shared) return { title: "Ask Meel" };
  const a = found.answer;
  return {
    title: `${first(a.text)} · Ask Meel`,
    description: `Answered ${sayDate(a.at.slice(0, 10))} from ${a.sources.length} Meel fact${a.sources.length === 1 ? "" : "s"}${a.route ? ` on ${a.route.name}` : ""}, with their dates.`,
    // Thin copies of route pages: kept out of search results.
    robots: { index: false, follow: true },
  };
}

export default async function SharedAnswerPage(props: PageProps<"/ask/a/[id]">) {
  const { id } = await props.params;
  const found = await answerById(id);
  if (!found || !found.shared) notFound();
  const a = found.answer;
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-3">
      <BackHead title="Ask Meel" sub="A shared answer" back="/" />
      <div className="rounded-lg border border-stone/60 bg-stone-soft px-3 py-2.5 text-sm leading-5">
        <b className="block">Answered on {sayDate(a.at.slice(0, 10))}</b>
        Frozen as it was written. The facts may have changed since:{" "}
        {a.route ? (
          <Link className="link" href={`/routes/${a.route.slug}`}>
            see them now
          </Link>
        ) : (
          "open each source to see it now"
        )}
        .
      </div>
      <SharedAnswer answer={a} />
      <Link href="/ask?from=shared" className="btn btn-primary btn-block" style={{ minHeight: 46 }}>
        <AskMark className="size-5" />
        Ask your own question
      </Link>
    </div>
  );
}
