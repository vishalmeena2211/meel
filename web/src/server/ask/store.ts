import "server-only";

import type { AskAnswer, AskKind, AskLang } from "@/lib/ask/types";
import { ASK_LIMIT_PHONE, ASK_LIMIT_SITE, ASK_LIMIT_USER } from "@/lib/ask/types";

import { db, newId } from "../db";

import { similarity } from "./search";

/** The calendar day in India, such as "2026-10-19". Limits reset at midnight there. */
export function indiaDay(now = new Date()): string {
  return now.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

export interface Allowance {
  ok: boolean;
  /** Questions left today for this phone or account, after this one. */
  left: number;
  why: "phone" | "user" | "site" | null;
}

/** Whether one more question may be asked today. Counts nothing. */
export async function allowance(who: string, loggedIn: boolean): Promise<Allowance> {
  const day = indiaDay();
  const rows = await db().askUse.findMany({ where: { day, who: { in: [who, "site"] } } });
  const mine = rows.find((r) => r.who === who)?.count ?? 0;
  const site = rows.find((r) => r.who === "site")?.count ?? 0;
  const cap = loggedIn ? ASK_LIMIT_USER : ASK_LIMIT_PHONE;
  if (site >= ASK_LIMIT_SITE) return { ok: false, left: 0, why: "site" };
  if (mine >= cap) return { ok: false, left: 0, why: loggedIn ? "user" : "phone" };
  return { ok: true, left: cap - mine - 1, why: null };
}

/** Counts one answered question. A question that failed is never counted. */
export async function countOne(who: string): Promise<void> {
  const day = indiaDay();
  await db().$transaction([
    db().askUse.upsert({ where: { day_who: { day, who } }, create: { day, who, count: 1 }, update: { count: { increment: 1 } } }),
    db().askUse.upsert({ where: { day_who: { day, who: "site" } }, create: { day, who: "site", count: 1 }, update: { count: { increment: 1 } } }),
  ]);
}

const toBytes = (v: Float32Array): Uint8Array<ArrayBuffer> => new Uint8Array(Float32Array.from(v).buffer);
const fromBytes = (b: Uint8Array) => new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));

export type Fingerprints = Record<string, string>;

/**
 * An earlier answer to a question that means nearly the same, on the same route, in the same language, whose facts
 * all read today exactly as they did then. `current` gives today's fingerprint of a fact, or null if it is gone.
 */
export async function reusable(
  { route, kind, lang, embedding, question }: { route: string | null; kind: AskKind; lang: AskLang; embedding: Float32Array | null; question: string },
  current: (factKey: string) => string | null,
): Promise<AskAnswer | null> {
  const since = new Date(Date.now() - 30 * 86400_000);
  // Without numbers for the question, only the very same words can be matched: no call to Google is needed for that.
  const rows = await db().askAnswer.findMany({
    where: {
      routeSlug: route,
      kind,
      lang,
      copiedFrom: null,
      embedding: { not: null },
      createdAt: { gte: since },
      ...(embedding ? {} : { question: { equals: question, mode: "insensitive" as const } }),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: { id: true, embedding: true, facts: true, answer: true },
  });
  let best: { score: number; answer: AskAnswer } | null = null;
  for (const r of rows) {
    const score = embedding ? similarity(embedding, fromBytes(r.embedding!)) : 1;
    if (score < 0.95 || (best && score <= best.score)) continue;
    const facts = r.facts as Fingerprints;
    const same = Object.entries(facts).every(([key, print]) => current(key) === print);
    const answer = r.answer as unknown as AskAnswer;
    if (same && !answer.noFact) best = { score, answer };
  }
  return best?.answer ?? null;
}

export async function save(
  answer: Omit<AskAnswer, "id">,
  extra: { facts: Fingerprints; embedding: Float32Array | null; copiedFrom: string | null; promptTokens: number; outputTokens: number },
): Promise<string> {
  const id = newId().slice(0, 10);
  const full: AskAnswer = { ...answer, id };
  await db().askAnswer.create({
    data: {
      id,
      routeSlug: answer.route?.slug ?? null,
      kind: answer.kind,
      lang: answer.lang,
      question: answer.question,
      answer: full as object,
      facts: extra.facts,
      embedding: extra.embedding ? toBytes(extra.embedding) : null,
      copiedFrom: extra.copiedFrom,
      promptTokens: extra.promptTokens,
      outputTokens: extra.outputTokens,
    },
  });
  // Now and then, forget questions older than 30 days. A shared answer stays while its link may be in use.
  if (Math.random() < 0.02) {
    await db().askAnswer.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 30 * 86400_000) }, shared: false } });
  }
  return id;
}

export async function answerById(id: string): Promise<{ answer: AskAnswer; shared: boolean } | null> {
  if (!/^[a-f0-9]{6,16}$/.test(id)) return null;
  const row = await db().askAnswer.findUnique({ where: { id }, select: { answer: true, shared: true } });
  return row ? { answer: row.answer as unknown as AskAnswer, shared: row.shared } : null;
}

export async function markShared(id: string): Promise<boolean> {
  const r = await db().askAnswer.updateMany({ where: { id }, data: { shared: true } });
  return r.count > 0;
}

export async function markUseful(id: string, useful: boolean): Promise<void> {
  await db().askAnswer.updateMany({ where: { id }, data: { useful } });
}

export async function reportAnswer(id: string, reason: string, note: string | null, userId: string | null): Promise<boolean> {
  const exists = await db().askAnswer.findUnique({ where: { id }, select: { id: true } });
  if (!exists) return false;
  // At most 30 unread reports an hour, so the inbox cannot be flooded.
  const recent = await db().askReport.count({ where: { status: "new", createdAt: { gte: new Date(Date.now() - 3600_000) } } });
  if (recent >= 30) return false;
  await db().askReport.create({ data: { id: newId(), answerId: id, reason, note, userId } });
  // A reported answer is never given again.
  await db().askAnswer.updateMany({ where: { OR: [{ id }, { copiedFrom: id }] }, data: { embedding: null } });
  return true;
}

export async function askInbox() {
  return db().askReport.findMany({
    where: { status: "new" },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { answer: { select: { question: true, answer: true, routeSlug: true, createdAt: true } } },
  });
}

export async function decideAskReport(id: string, status: "applied" | "set-aside"): Promise<void> {
  await db().askReport.updateMany({ where: { id }, data: { status, decidedAt: new Date() } });
}
