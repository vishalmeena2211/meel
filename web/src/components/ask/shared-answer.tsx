"use client";

import { useState } from "react";

import type { AskAnswer, AskSource } from "@/lib/ask/types";

import { AnswerHead, Cited, Pictures, SourceRows, SourceSheet } from "./answer-view";

/** A shared answer, read-only: the same answer, its pictures and sources, with no buttons to change it. */
export function SharedAnswer({ answer }: { answer: AskAnswer }) {
  const [source, setSource] = useState<AskSource | null>(null);
  return (
    <div className="flex flex-col gap-2.5 text-sm leading-[1.3125rem]">
      <p className="max-w-[84%] self-end rounded-[14px_14px_4px_14px] border border-sign-line bg-sign-soft px-3 py-2 leading-5">{answer.question}</p>
      <AnswerHead answer={answer} />
      <p>
        <Cited text={answer.text} onCite={(n) => setSource(answer.sources.find((s) => s.n === n) ?? null)} />
      </p>
      <Pictures answer={answer} />
      {answer.sources.length ? (
        <>
          <p className="label">Where this comes from</p>
          <SourceRows sources={answer.sources} onOpen={setSource} />
        </>
      ) : null}
      <SourceSheet source={source} onClose={() => setSource(null)} />
    </div>
  );
}
