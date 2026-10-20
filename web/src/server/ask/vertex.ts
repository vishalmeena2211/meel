import { getVercelOidcToken } from "@vercel/oidc";
import { GoogleAuth, IdentityPoolClient } from "google-auth-library";

/*
  Ask Meel's two calls to Google, on Vertex AI in the personal Google Cloud project "meel-rideplanner":
  turning text into numbers (embeddings), and writing an answer (Gemini 2.5 Flash-Lite).

  How it signs in:
  - On Vercel, with no key at all: Vercel gives each function a short-lived token that Google Cloud trusts through a
    workload identity pool. Set GCP_PROJECT_NUMBER, GCP_WORKLOAD_IDENTITY_POOL_ID, GCP_WORKLOAD_IDENTITY_PROVIDER_ID
    and GCP_SERVICE_ACCOUNT_EMAIL. None of them is a secret.
  - On your own machine: your own gcloud login (`gcloud auth application-default login`).

  This file has no "server-only" line so that scripts/ask-index.ts can use it outside Next.js. Never import it from a
  component that runs in the browser.
*/

export const PROJECT = process.env.GCP_PROJECT_ID ?? "meel-rideplanner";
/** Gemini 2.5 Flash-Lite is served from Google's global endpoint, not from Mumbai. */
export const ANSWER_MODEL = process.env.ASK_ANSWER_MODEL ?? "gemini-2.5-flash-lite";
/** gemini-embedding-2 allows 300,000 requests a minute on this project; gemini-embedding-001 allowed 5. */
export const EMBED_MODEL = "gemini-embedding-2";
export const EMBED_DIMS = 768;

const SCOPE = "https://www.googleapis.com/auth/cloud-platform";
// The daily report reads Search Console with the same service account (it is a Restricted user on the property).
const SEARCH_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";

type TokenSource = { getAccessToken(): Promise<{ token?: string | null } | string | null | undefined> };
let source: TokenSource | null = null;

function tokenSource(): TokenSource {
  if (source) return source;
  const num = process.env.GCP_PROJECT_NUMBER;
  const pool = process.env.GCP_WORKLOAD_IDENTITY_POOL_ID;
  const provider = process.env.GCP_WORKLOAD_IDENTITY_PROVIDER_ID;
  const account = process.env.GCP_SERVICE_ACCOUNT_EMAIL;
  if (num && pool && provider && account) {
    source = new IdentityPoolClient({
      audience: `//iam.googleapis.com/projects/${num}/locations/global/workloadIdentityPools/${pool}/providers/${provider}`,
      subject_token_type: "urn:ietf:params:oauth:token-type:jwt",
      token_url: "https://sts.googleapis.com/v1/token",
      service_account_impersonation_url: `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${account}:generateAccessToken`,
      subject_token_supplier: { getSubjectToken: () => getVercelOidcToken() },
      scopes: [SCOPE, SEARCH_SCOPE],
    });
  } else {
    source = new GoogleAuth({ scopes: [SCOPE, SEARCH_SCOPE] });
  }
  return source;
}

/** An access token for Google APIs, signed in as described at the top of this file. */
export async function googleToken(): Promise<string> {
  return token();
}

async function token(): Promise<string> {
  const t = await tokenSource().getAccessToken();
  const value = typeof t === "string" ? t : t?.token;
  if (!value) throw new Error("Ask Meel could not sign in to Google Cloud.");
  return value;
}

function base(location: string): string {
  const host = location === "global" ? "aiplatform.googleapis.com" : `${location}-aiplatform.googleapis.com`;
  return `https://${host}/v1/projects/${PROJECT}/locations/${location}/publishers/google/models`;
}

export type EmbedTask = "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY" | "SEMANTIC_SIMILARITY";

/** Numbers for each text, in order. One request per text, a few at a time. */
export async function embed(texts: string[], task: EmbedTask, signal?: AbortSignal): Promise<Float32Array[]> {
  if (texts.length === 0) return [];
  // ASK_EMBED_OFF=1: Ask Meel searches by words only. For when Google's embedding limit is the problem.
  if (process.env.ASK_EMBED_OFF === "1") throw new Error("Embedding switched off (ASK_EMBED_OFF)");
  // A new project gets few embedding requests a minute. "Too many" is tried again twice, briefly, before giving up.
  for (const wait of [0, 700, 2000]) {
    if (wait) await new Promise((r) => setTimeout(r, wait));
    try {
      return await embedOnce(texts, task, signal);
    } catch (error) {
      if (!(error instanceof Error) || !/429|Quota exceeded|RESOURCE_EXHAUSTED/i.test(error.message) || wait === 2000) throw error;
    }
  }
  throw new Error("Embedding failed");
}

async function embedOnce(texts: string[], task: EmbedTask, signal?: AbortSignal): Promise<Float32Array[]> {
  const auth = await token();
  const one = async (text: string): Promise<Float32Array> => {
    const res = await fetch(`${base("global")}/${EMBED_MODEL}:embedContent`, {
      method: "POST",
      headers: { Authorization: `Bearer ${auth}`, "Content-Type": "application/json" },
      body: JSON.stringify({ content: { parts: [{ text }] }, taskType: task, outputDimensionality: EMBED_DIMS }),
      signal,
    });
    const body = (await res.json()) as { embedding?: { values: number[] }; error?: { message: string } };
    if (!res.ok || !body.embedding) throw new Error(`Embedding failed: ${res.status} ${body.error?.message ?? ""}`);
    return Float32Array.from(body.embedding.values);
  };
  const out: Float32Array[] = [];
  for (let i = 0; i < texts.length; i += 10) out.push(...(await Promise.all(texts.slice(i, i + 10).map(one))));
  return out;
}

export interface Usage {
  promptTokens: number;
  outputTokens: number;
}

/**
 * Writes an answer, handing over the text as it arrives. Resolves with the token counts.
 * `onText` gets each new piece of text, never the whole.
 */
export async function generate(
  system: string,
  user: string,
  onText: (piece: string) => void,
  { maxTokens = 260, signal }: { maxTokens?: number; signal?: AbortSignal } = {},
): Promise<Usage> {
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: "user", parts: [{ text: user }] }],
    generationConfig: { maxOutputTokens: maxTokens, temperature: 0.2 },
  });
  // Gemini on Vertex shares Google's capacity: a "too many" (429) is brief. Before any text has arrived, it is tried
  // again on the US endpoint, then once more after a pause. Nothing has been shown to the rider yet.
  let res: Response | null = null;
  for (const [where, wait] of [["global", 0], ["us-central1", 300], ["global", 1500]] as const) {
    if (wait) await new Promise((r) => setTimeout(r, wait));
    res = await fetch(`${base(where)}/${ANSWER_MODEL}:streamGenerateContent?alt=sse`, {
      method: "POST",
      headers: { Authorization: `Bearer ${await token()}`, "Content-Type": "application/json" },
      body,
      signal,
    });
    if (res.status !== 429 && res.status !== 503) break;
    await res.body?.cancel().catch(() => {});
  }
  if (!res || !res.ok || !res.body) {
    const text = res ? await res.text().catch(() => "") : "";
    throw new Error(`Answer failed: ${res?.status ?? "no reply"} ${text.slice(0, 200)}`);
  }
  const usage: Usage = { promptTokens: 0, outputTokens: 0 };
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let cut: number;
    while ((cut = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, cut).trim();
      buffer = buffer.slice(cut + 1);
      if (!line.startsWith("data:")) continue;
      try {
        const event = JSON.parse(line.slice(5)) as {
          candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
          usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
        };
        const piece = event.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
        if (piece) onText(piece);
        if (event.usageMetadata) {
          usage.promptTokens = event.usageMetadata.promptTokenCount ?? usage.promptTokens;
          usage.outputTokens = event.usageMetadata.candidatesTokenCount ?? usage.outputTokens;
        }
      } catch {
        // A line that is not whole JSON is skipped; the next one carries on.
      }
    }
  }
  return usage;
}
