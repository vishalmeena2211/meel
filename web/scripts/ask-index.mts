// Builds Ask Meel's search index: every fact on every route as a row of numbers that captures its meaning.
//
//   pnpm ask:index
//
// Reads ../data/routes, writes ../data/computed/ask/index.json and vectors.bin, which sync-data copies into content/.
// Only facts whose words changed since the last run are sent to Google, so a rebuild usually costs paise.
// Needs a Google Cloud login: `gcloud auth application-default login` on the account that owns meel-rideplanner.
//
// vectors.bin holds one row of 768 signed bytes per chunk, in the order of index.json: each row is the embedding
// scaled to length 1 and multiplied by 127. A dot product of two rows, divided by 127², is their cosine similarity.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chunksOf, hashOf, type AskChunk } from "../src/lib/ask/chunks";
import type { Route, RouteIndex } from "../src/lib/types";
import { EMBED_DIMS, EMBED_MODEL, embed } from "../src/server/ask/vertex";

const here = path.dirname(fileURLToPath(import.meta.url));
const data = path.resolve(here, "..", "..", "data");
const out = path.join(data, "computed", "ask");

interface IndexFile {
  model: string;
  dims: number;
  built: string;
  chunks: Array<{ id: string; slug: string; kind: AskChunk["kind"]; hash: string }>;
}

function quantise(v: Float32Array): Int8Array {
  let len = 0;
  for (const x of v) len += x * x;
  len = Math.sqrt(len) || 1;
  const q = new Int8Array(v.length);
  for (let i = 0; i < v.length; i++) q[i] = Math.max(-127, Math.min(127, Math.round((v[i]! / len) * 127)));
  return q;
}

async function readOld(): Promise<Map<string, Int8Array>> {
  const kept = new Map<string, Int8Array>();
  try {
    const index = JSON.parse(await readFile(path.join(out, "index.json"), "utf8")) as IndexFile;
    if (index.model !== EMBED_MODEL || index.dims !== EMBED_DIMS) return kept;
    const bytes = new Int8Array((await readFile(path.join(out, "vectors.bin"))).buffer);
    index.chunks.forEach((c, i) => kept.set(c.hash, bytes.slice(i * EMBED_DIMS, (i + 1) * EMBED_DIMS)));
  } catch {
    // No index yet: everything is new.
  }
  return kept;
}

const index = JSON.parse(await readFile(path.join(data, "routes", "index.json"), "utf8")) as RouteIndex;
const chunks: AskChunk[] = [];
for (const r of index.routes) {
  const route = JSON.parse(await readFile(path.join(data, "routes", `${r.slug}.json`), "utf8")) as Route;
  chunks.push(...chunksOf(route));
}

const old = await readOld();
const hashes = chunks.map((c) => hashOf(`${c.kind}|${c.text}`));
const todo = [...new Set(hashes.filter((h) => !old.has(h)))];
const textOf = new Map(chunks.map((c, i) => [hashes[i]!, c.text]));
console.log(`ask-index: ${chunks.length} chunks on ${index.routes.length} routes; ${chunks.length - hashes.filter((h) => todo.includes(h)).length} kept, ${todo.length} to embed`);

let chars = 0;
const BATCH = 50;
for (let i = 0; i < todo.length; i += BATCH) {
  const part = todo.slice(i, i + BATCH);
  const texts = part.map((h) => textOf.get(h)!);
  chars += texts.reduce((a, t) => a + t.length, 0);
  let vectors: Float32Array[] | null = null;
  for (let attempt = 1; attempt <= 4 && !vectors; attempt++) {
    try {
      vectors = await embed(texts, "RETRIEVAL_DOCUMENT");
    } catch (error) {
      if (attempt === 4) throw error;
      await new Promise((r) => setTimeout(r, attempt * 3000));
    }
  }
  part.forEach((h, j) => old.set(h, quantise(vectors![j]!)));
  process.stdout.write(`\rask-index: embedded ${Math.min(i + BATCH, todo.length)} of ${todo.length}`);
}
if (todo.length) process.stdout.write("\n");

const bytes = new Int8Array(chunks.length * EMBED_DIMS);
hashes.forEach((h, i) => bytes.set(old.get(h)!, i * EMBED_DIMS));
const file: IndexFile = {
  model: EMBED_MODEL,
  dims: EMBED_DIMS,
  built: new Date().toISOString(),
  chunks: chunks.map((c, i) => ({ id: c.id, slug: c.slug, kind: c.kind, hash: hashes[i]! })),
};
await mkdir(out, { recursive: true });
await writeFile(path.join(out, "index.json"), JSON.stringify(file));
await writeFile(path.join(out, "vectors.bin"), bytes);
// About four characters to a token; $0.20 per million tokens for gemini-embedding-2.
console.log(`ask-index: wrote ${chunks.length} rows (${(bytes.length / 1e6).toFixed(1)} MB). Sent about ${Math.round(chars / 4).toLocaleString("en-IN")} tokens.`);
