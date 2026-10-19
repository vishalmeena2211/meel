import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

import { chunksOf, type AskChunk, type ChunkKind } from "@/lib/ask/chunks";
import { gazetteerOf, type Gazetteer } from "@/lib/ask/understand";
import { getAllRoutes, getIndex } from "@/lib/content";
import type { Route } from "@/lib/types";

/*
  The search index, held in memory: 4,650 rows of 768 signed bytes (about 3.6 MB), built by scripts/ask-index.mts.
  Comparing a question with every row takes a few milliseconds, so no vector database is needed.
*/

interface Loaded {
  dims: number;
  ids: string[];
  slugs: string[];
  kinds: ChunkKind[];
  vectors: Int8Array;
  chunks: Map<string, AskChunk>;
  routes: Map<string, Route>;
  gazetteer: Gazetteer;
  /** One chunk by its route and id. */
  chunk(slug: string, id: string): AskChunk | undefined;
  /** Every chunk on one route, in order. */
  chunksOf(slug: string): AskChunk[];
}

let loading: Promise<Loaded | null> | null = null;

async function load(): Promise<Loaded | null> {
  const dir = path.join(process.cwd(), "content", "ask");
  try {
    const index = JSON.parse(await readFile(path.join(dir, "index.json"), "utf8")) as {
      dims: number;
      chunks: Array<{ id: string; slug: string; kind: ChunkKind }>;
    };
    const buf = await readFile(path.join(dir, "vectors.bin"));
    const vectors = new Int8Array(buf.buffer, buf.byteOffset, buf.byteLength);
    const [all, summary] = await Promise.all([getAllRoutes(), getIndex()]);
    const routes = new Map(all.map((r) => [r.slug, r]));
    const chunks = new Map<string, AskChunk>();
    const bySlug = new Map<string, AskChunk[]>();
    for (const r of all) {
      const list = chunksOf(r);
      bySlug.set(r.slug, list);
      for (const c of list) chunks.set(`${c.slug}|${c.id}`, c);
    }
    return {
      dims: index.dims,
      ids: index.chunks.map((c) => c.id),
      slugs: index.chunks.map((c) => c.slug),
      kinds: index.chunks.map((c) => c.kind),
      vectors,
      chunks,
      routes,
      gazetteer: gazetteerOf(all, summary.routes),
      chunk: (slug, id) => chunks.get(`${slug}|${id}`),
      chunksOf: (slug) => bySlug.get(slug) ?? [],
    };
  } catch {
    return null;
  }
}

/** The index, or null when it has not been built (Ask Meel then says it is not ready). */
export function askIndex(): Promise<Loaded | null> {
  loading ??= load();
  return loading;
}

export interface Hit {
  chunk: AskChunk;
  score: number;
}

/** The rows closest in meaning to a question, best first. */
export async function search(
  query: Float32Array,
  { slugs, kinds, limit = 8 }: { slugs?: string[] | null; kinds?: ChunkKind[] | null; limit?: number } = {},
): Promise<Hit[]> {
  const ix = await askIndex();
  if (!ix) return [];
  const d = ix.dims;
  let len = 0;
  for (const x of query) len += x * x;
  len = Math.sqrt(len) || 1;
  const q = new Float32Array(d);
  for (let i = 0; i < d; i++) q[i] = query[i]! / len;

  const onlySlugs = slugs?.length ? new Set(slugs) : null;
  const onlyKinds = kinds?.length ? new Set(kinds) : null;
  const top: Array<{ i: number; score: number }> = [];
  for (let row = 0; row < ix.ids.length; row++) {
    if (onlySlugs && !onlySlugs.has(ix.slugs[row]!)) continue;
    if (onlyKinds && !onlyKinds.has(ix.kinds[row]!)) continue;
    let dot = 0;
    const off = row * d;
    for (let i = 0; i < d; i++) dot += q[i]! * ix.vectors[off + i]!;
    const score = dot / 127;
    if (top.length < limit) {
      top.push({ i: row, score });
      top.sort((a, b) => b.score - a.score);
    } else if (score > top[top.length - 1]!.score) {
      top[top.length - 1] = { i: row, score };
      top.sort((a, b) => b.score - a.score);
    }
  }
  return top
    .map(({ i, score }) => ({ chunk: ix.chunks.get(`${ix.slugs[i]}|${ix.ids[i]}`), score }))
    .filter((h): h is Hit => h.chunk !== undefined);
}

const STOP = new Set("the a an is are was to of in on at for from and or by with how what where when which do does can i my me it this that there any much many far km kya hai hain ka ki ke se me mein ko par aur tak kitna kitni kahan kab".split(" "));

/**
 * The same search by words, for when the question cannot be turned into numbers (Google's limit reached).
 * Scores sit between 0.5 and 0.9 so the rest of the answer works the same way.
 */
export async function searchWords(
  question: string,
  { slugs, kinds, limit = 8 }: { slugs?: string[] | null; kinds?: ChunkKind[] | null; limit?: number } = {},
): Promise<Hit[]> {
  const ix = await askIndex();
  if (!ix) return [];
  const words = [...new Set(question.toLowerCase().replace(/[^a-z0-9\u0900-\u097F]+/g, " ").split(" "))].filter((w) => w.length >= 3 && !STOP.has(w));
  if (words.length === 0) return [];
  const onlySlugs = slugs?.length ? new Set(slugs) : null;
  const onlyKinds = kinds?.length ? new Set(kinds) : null;
  const scored: Hit[] = [];
  for (const chunk of ix.chunks.values()) {
    if (onlySlugs && !onlySlugs.has(chunk.slug)) continue;
    if (onlyKinds && !onlyKinds.has(chunk.kind)) continue;
    const text = chunk.text.toLowerCase();
    const found = words.filter((w) => text.includes(w)).length;
    if (found === 0) continue;
    scored.push({ chunk, score: 0.5 + (0.4 * found) / words.length - Math.min(0.05, text.length / 40000) });
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}

/** Cosine similarity of two embeddings. */
export function similarity(a: Float32Array, b: Float32Array): number {
  let dot = 0;
  let la = 0;
  let lb = 0;
  for (let i = 0; i < a.length && i < b.length; i++) {
    dot += a[i]! * b[i]!;
    la += a[i]! * a[i]!;
    lb += b[i]! * b[i]!;
  }
  return dot / (Math.sqrt(la * lb) || 1);
}
