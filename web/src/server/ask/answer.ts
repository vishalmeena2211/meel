import "server-only";

import { hashOf, type AskChunk, type ChunkKind } from "@/lib/ask/chunks";
import type { AskAnswer, AskEvent, AskKind, AskLang, AskPicture, AskRequest, AskSource } from "@/lib/ask/types";
import { ASK_MAX_QUESTION } from "@/lib/ask/types";
import { comparing, kindOf, languageOf, placesIn, routesOf, type PlaceHit } from "@/lib/ask/understand";
import { getFactKinds } from "@/lib/content";
import { factViews, type FactView } from "@/lib/fact-view";
import type { Route } from "@/lib/types";

import { confirmationsFor } from "../reports";

import { askIndex, search, searchWords, type Hit } from "./search";
import { allowance, countOne, reusable, save, type Fingerprints } from "./store";
import { embed, generate } from "./vertex";

/*
  How one question is answered (the plan, screen 4):
  1. Read it: language, kind, places, route.        No model.
  2. Fixed replies: is it open, feeling unwell, costs and bikes, which road.   No model.
  3. An earlier answer that means the same, with unchanged facts?   No model.
  4. Find 6 to 8 facts by meaning. Work out distances in code.
  5. Gemini 2.5 Flash-Lite writes from those facts only. A sentence without a source number is dropped.
  6. Pictures by rule, next questions from a fixed list, saved for 30 days.
*/

export interface AskContext {
  /** "phone:<id>" or "user:<id>". */
  who: string;
  loggedIn: boolean;
  signal?: AbortSignal;
  /** Answering the starter questions in advance (scripts/ask-warm.mts): no limits, nothing counted. */
  warm?: boolean;
}

type Emit = (e: AskEvent) => void;

/** Raised whenever the way answers are made changes, so answers made the old way are not given again. */
const ASK_VERSION = "2026-10-19.6";

const one = (n: number) => (Math.round(n * 10) / 10).toLocaleString("en-IN");
const hm = (h: number) => {
  const m = Math.round(h * 60);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`;
};

/* ── Words that never come from a model ─────────────────────────── */

const W = {
  notReady: {
    en: "Ask Meel isn’t ready yet. Every route page is still open to read.",
    hinglish: "Ask Meel abhi tayyar nahi hai. Har route ka page padh sakte hain.",
    hi: "Ask Meel अभी तैयार नहीं है। हर रास्ते का पेज पढ़ सकते हैं।",
  },
  failed: {
    en: "Ask Meel couldn’t answer just now. This didn’t count towards your questions today.",
    hinglish: "Ask Meel abhi jawab nahi de paya. Yeh aaj ke sawalon mein nahi gina gaya.",
    hi: "Ask Meel अभी जवाब नहीं दे पाया। यह आज के सवालों में नहीं गिना गया।",
  },
  noFact: {
    en: "Meel has no fact on this.",
    hinglish: "Meel ke paas iska koi fact nahi hai.",
    hi: "Meel के पास इसका कोई तथ्य नहीं है।",
  },
  open: {
    en: "Meel doesn’t say whether a road or pass is open: it changes by the hour, and no office publishes it in one reliable place. These offices do announce it.",
    hinglish: "Meel yeh nahi batata ki rasta ya pass khula hai ya band: yeh har ghante badalta hai. Yeh offices iski khabar dete hain.",
    hi: "Meel यह नहीं बताता कि रास्ता या दर्रा खुला है या बंद: यह हर घंटे बदलता है। ये दफ़्तर इसकी ख़बर देते हैं।",
  },
  openWhich: {
    en: "Meel doesn’t say whether a road is open. Name the route or pass, and it will show the offices that announce it.",
    hinglish: "Meel yeh nahi batata ki rasta khula hai ya nahi. Route ya pass ka naam likhiye, Meel woh offices dikhayega jo iski khabar dete hain.",
    hi: "Meel यह नहीं बताता कि रास्ता खुला है या नहीं। रास्ते या दर्रे का नाम लिखिए, Meel वे दफ़्तर दिखाएगा जो इसकी ख़बर देते हैं।",
  },
  health: {
    en: "Call 112 if it is getting worse. Headache or vomiting at height can be serious, and going down is what helps most. Meel is not medical advice: rest, don’t go higher, and see a doctor.",
    hinglish: "Haalat bigad rahi ho to 112 par call karein. Oonchai par sar dard ya ulti serious ho sakti hai, aur neeche utarna sabse zyada madad karta hai. Meel doctor nahi hai: aaram karein, aur upar na jaayein.",
    hi: "हालत बिगड़ रही हो तो 112 पर कॉल करें। ऊँचाई पर सिर दर्द या उल्टी गंभीर हो सकती है, और नीचे उतरना सबसे ज़्यादा मदद करता है। Meel डॉक्टर नहीं है: आराम करें और ऊपर न जाएँ।",
  },
  offTopic: {
    en: "Meel doesn’t rank bikes, give trip costs or list hotels. It can tell you whether your bike’s tank covers the fuel gaps, and the rules, passes and seasons on each route.",
    hinglish: "Meel bikes ki ranking, trip ka kharcha ya hotels nahi batata. Yeh bata sakta hai ki aapki bike ka tank fuel gap cover karega ya nahi, aur har route ke rules, passes aur season.",
    hi: "Meel बाइक की रैंकिंग, यात्रा का ख़र्च या होटल नहीं बताता। यह बता सकता है कि आपकी बाइक का टैंक फ़्यूल गैप पूरा करेगा या नहीं, और हर रास्ते के नियम, दर्रे और मौसम।",
  },
  which: {
    en: (place: string, n: number) => `${place} is on ${n} Meel routes. Which way are you going?`,
    hinglish: (place: string, n: number) => `${place} Meel ke ${n} routes par hai. Aap kis raste se ja rahe hain?`,
    hi: (place: string, n: number) => `${place} Meel के ${n} रास्तों पर है। आप किस रास्ते से जा रहे हैं?`,
  },
} as const;

const NEXT: Record<AskKind, (route: string | null) => string[]> = {
  fuel: (r) => ["Check fuel for my bike", r ? `Longest fuel gap on ${r}` : "Longest fuel gap on Manali to Leh", "Rules for motorcycles"],
  distance: (r) => [r ? `Fuel stops on ${r}` : "Fuel stops on this route", "Where to stop the night?"],
  rule: (r) => [r ? `Other rules on ${r}` : "Other rules on this route", "Who announces changes?"],
  season: (r) => [r ? `Is ${r} open today?` : "Who announces closures?", "Rules for motorcycles"],
  altitude: (r) => [r ? `Fuel stops on ${r}` : "Fuel stops on this route", "Emergency card"],
  road: (r) => [r ? `Fuel stops on ${r}` : "Fuel stops on this route", "Rules for motorcycles"],
  video: (r) => [r ? `What is the road like on ${r}?` : "What is the road like?"],
  open: (r) => [r ? `When does ${r} usually close?` : "When do the passes close?", "Rules for motorcycles"],
  health: () => ["Emergency card", "Where to stop the night?"],
  "off-topic": () => ["Check fuel for my bike", "Longest fuel gap to Leh"],
  general: (r) => [r ? `Fuel stops on ${r}` : "Petrol pump in Chitkul?", "Rules for motorcycles"],
};

/** One line for the model about what a good answer of this kind says. */
const HINT: Partial<Record<AskKind, string>> = {
  altitude: "For where to sleep: name the climbs from one halt to the next that are above Meel's limit, and say the altitude check tests the rider's own halts.",
  fuel: "For fuel: say where the pumps are and the longest stretch with none, with the distances given.",
  season: "For seasons: give dates as past years' dates, never as a promise for this year.",
};

const KINDS_FOR: Partial<Record<AskKind, ChunkKind[]>> = {
  fuel: ["pump", "route", "gaps", "hazard"],
  rule: ["rule", "office", "gaps"],
  season: ["season", "route", "office", "rule", "gaps"],
  distance: ["stretch", "route", "places"],
  altitude: ["places", "route", "hazard", "rule"],
  road: ["hazard", "route", "stretch", "gaps", "video"],
  video: ["video"],
};

const WHAT: Record<AskKind, string> = {
  fuel: "Fuel",
  distance: "Distance",
  rule: "Rules",
  season: "Season",
  altitude: "Heights and halts",
  road: "The road",
  video: "Videos",
  open: "Is it open",
  health: "Feeling unwell",
  "off-topic": "Off topic",
  general: "Your question",
};

/* ── One numbered fact, as the model reads it and the rider sees it ── */

interface Fact {
  key: string;
  chunk: AskChunk;
  title: string;
  /** What the model reads: the computed words when there are some, else the chunk. */
  words: string;
  view: FactView | null;
}

class Facts {
  list: Fact[] = [];
  add(chunk: AskChunk, view: FactView | null, words?: string, title?: string) {
    const key = `${chunk.slug}|${chunk.id}`;
    if (this.list.some((f) => f.key === key && !words)) return;
    // The same rule on two routes (e-Aagman on Manali to Leh and on Spiti) is one fact to the rider.
    const shown = title ?? view?.title ?? chunk.title;
    if (!words && this.list.some((f) => f.title === shown && f.chunk.kind === chunk.kind)) return;
    this.list.push({ key, chunk, title: shown, words: words ?? chunk.text, view });
  }
}

/* ── The pipeline ─────────────────────────────────────────────────── */

export async function runAsk(req: AskRequest, ctx: AskContext, emit: Emit): Promise<void> {
  const question = req.question.replace(/\s+/g, " ").trim().slice(0, ASK_MAX_QUESTION);
  const lang = languageOf(question);
  const ix = await askIndex();
  if (!ix) {
    emit({ t: "error", message: W.notReady[lang], counted: false });
    return;
  }

  const allowed = ctx.warm ? { ok: true, left: 0, why: null } : await allowance(ctx.who, ctx.loggedIn);
  if (!allowed.ok) {
    emit({
      t: "limit",
      loggedIn: ctx.loggedIn,
      message:
        allowed.why === "site"
          ? "Ask Meel has had too many questions today. It is back at midnight. Every route page is still open to read."
          : ctx.loggedIn
            ? "That’s 40 questions today. More tomorrow. Every route page is still open to read."
            : "That’s 10 questions today. More tomorrow, or log in for 40 a day. Every route page is still open to read.",
    });
    return;
  }

  // Views of a route's facts, read live, so ages and confirmations are today's.
  const kinds = await getFactKinds();
  const viewCache = new Map<string, Map<string, FactView>>();
  const viewsOf = async (slug: string) => {
    let m = viewCache.get(slug);
    if (!m) {
      const route = ix.routes.get(slug)!;
      const v = factViews(route, await confirmationsFor(slug), kinds, new Date());
      m = new Map(v.all.map((f) => [f.id, f]));
      viewCache.set(slug, m);
    }
    return m;
  };

  const kind = kindOf(question);
  const hits = placesIn(question, ix.gazetteer);
  const onRoutes = routesOf(hits);

  // Which route.
  let slug: string | null = req.route && ix.routes.has(req.route) ? req.route : null;
  if (!slug && req.previous?.route && hits.length === 0 && ix.routes.has(req.previous.route)) slug = req.previous.route;
  if (!slug && onRoutes.length === 1) slug = onRoutes[0]!;
  // Two routes named to compare: both are searched, neither is picked.
  const compare = !req.route && onRoutes.length >= 2 && comparing(question) ? onRoutes.slice(0, 2) : null;
  if (!slug && !compare && onRoutes.length > 1) {
    const count = (s: string) => new Set(hits.filter((h) => h.slug === s).map((h) => h.name)).size;
    if (count(onRoutes[0]!) > count(onRoutes[1]!)) slug = onRoutes[0]!;
  }
  const route: Route | null = slug ? ix.routes.get(slug)! : null;
  const shortName = route ? route.name.split(":")[0]! : null;

  const finish = async (
    a: Omit<AskAnswer, "id" | "question" | "lang" | "at" | "copied" | "choices"> & { choices?: AskAnswer["choices"]; copied?: boolean },
    extra: { facts?: Fingerprints; embedding?: Float32Array | null; copiedFrom?: string | null; promptTokens?: number; outputTokens?: number; count?: boolean } = {},
  ) => {
    const full: Omit<AskAnswer, "id"> = {
      ...a,
      question,
      lang,
      at: new Date().toISOString(),
      copied: a.copied ?? false,
      choices: a.choices ?? [],
    };
    const id = await save(full, {
      facts: extra.facts ?? {},
      embedding: extra.embedding ?? null,
      copiedFrom: extra.copiedFrom ?? null,
      promptTokens: extra.promptTokens ?? 0,
      outputTokens: extra.outputTokens ?? 0,
    });
    if (extra.count !== false && !ctx.warm) await countOne(ctx.who);
    emit({ t: "done", answer: { ...full, id }, left: extra.count === false ? allowed.left + 1 : allowed.left });
  };

  // ── Which road, when it matters and isn't clear.
  const first = hits.find((h) => h.km !== null);
  if (!slug && !compare && first && onRoutes.length > 1 && kind !== "health" && kind !== "off-topic") {
    const sameName = hits.filter((h) => h.km !== null && h.name.toLowerCase() === first.name.toLowerCase());
    const choices = [...new Set(sameName.map((h) => h.slug))].slice(0, 4).map((s) => ({ slug: s, label: ix.routes.get(s)!.name }));
    if (choices.length > 1) {
      emit({ t: "step", text: `${first.name} is on ${choices.length} routes` });
      await finish(
        { kind, route: null, text: W.which[lang](first.name, choices.length), sources: [], pictures: [], next: [], noFact: false, choices },
        { count: false },
      );
      return;
    }
  }

  // ── Fixed replies.
  if (kind === "health") {
    const call: AskPicture = { kind: "call", number: "112", words: "Emergency, on any network with signal", href: slug ? `/routes/${slug}/emergency` : null };
    await finish({ kind, route: route ? { slug: route.slug, name: route.name } : null, text: W.health[lang], sources: [], pictures: [call], next: NEXT.health(shortName), noFact: false });
    return;
  }
  if (kind === "off-topic") {
    await finish({ kind, route: null, text: W.offTopic[lang], sources: [], pictures: [], next: NEXT["off-topic"](shortName), noFact: false });
    return;
  }
  if (kind === "open") {
    if (!route) {
      await finish({ kind, route: null, text: W.openWhich[lang], sources: [], pictures: [], next: ["Is Zoji La open?", "Is Manali to Leh open?"], noFact: false });
      return;
    }
    emit({ t: "step", text: `The offices for ${shortName}` });
    const views = await viewsOf(route.slug);
    const facts = new Facts();
    const offices = ix.chunksOf(route.slug).filter((c) => c.kind === "office").slice(0, 4);
    for (const c of offices) facts.add(c, views.get(c.id) ?? null);
    const year = [...route.season.history].sort((a, b) => b.year - a.year)[0];
    const yearChunk = year ? ix.chunksOf(route.slug).find((c) => c.id === `season:${route.slug}:${year.year}`) : undefined;
    if (yearChunk) facts.add(yearChunk, null);
    const sources = sourcesOf(facts.list, ix.routes);
    const cites = offices.map((_, i) => `[${i + 1}]`).join("");
    const lastSeen = year && yearChunk ? ` ${lang === "en" ? `What Meel last read, for ${year.year}` : lang === "hi" ? `${year.year} के लिए Meel ने आख़िरी बार यह पढ़ा` : `${year.year} ke liye Meel ne aakhri baar yeh padha`}: ${firstSentences(year.note, 2)} [${offices.length + 1}]` : "";
    await finish({
      kind,
      route: { slug: route.slug, name: route.name },
      text: `${W.open[lang].replace(/[.।]$/, "")} ${cites}${lang === "hi" ? "।" : "."}${lastSeen ? `${lastSeen}.` : ""}`.trim(),
      sources,
      pictures: [{ kind: "offices", rows: offices.map((c) => ({ title: c.title, line: views.get(c.id)?.short ?? "", url: views.get(c.id)?.link?.url ?? null })) }],
      next: NEXT.open(shortName),
      noFact: false,
    }, { facts: fingerprints(facts.list) });
    return;
  }

  // ── Steps the rider sees while it works.
  const placeHere = (s: string | null) => hits.find((h) => h.slug === s && h.km !== null) ?? null;
  const place = placeHere(slug);
  const two = dedupe(hits.filter((h) => !slug || h.slug === slug));
  emit({
    t: "step",
    text:
      (kind === "distance" || kind === "fuel" || kind === "altitude") && two.filter((h) => h.km !== null).length >= 2
        ? `${WHAT[kind]}, ${two.filter((h) => h.km !== null)[0]!.name} to ${two.filter((h) => h.km !== null)[1]!.name}${shortName ? `, on ${shortName}` : ""}`
        : `${WHAT[kind]}${place ? ` near ${place.name}` : ""}${shortName ? `, on ${shortName}` : ""}`,
  });

  // ── Given before, and nothing has changed?
  const currentPrint = (key: string): string | null => {
    if (key === "_v") return ASK_VERSION;
    const [s, id] = key.split("|") as [string, string];
    const chunk = ix.chunk(s, id);
    if (!chunk) return null;
    const view = viewCache.get(s)?.get(id);
    return hashOf(view ? `${view.snippet}|${view.state}` : chunk.text);
  };
  if (slug) await viewsOf(slug);
  // The very same question, asked before: no call to Google at all.
  let before = await reusable({ route: slug, kind, lang, embedding: null, question }, currentPrint);
  let embedding: Float32Array | null = null;
  if (!before) {
    try {
      [embedding] = (await embed([question], "RETRIEVAL_QUERY", ctx.signal)) as [Float32Array];
    } catch (error) {
      // Google's limit reached, or a fault: carry on, searching by words instead of meaning.
      console.error("ask: embedding failed, searching by words", error);
    }
    if (embedding) before = await reusable({ route: slug, kind, lang, embedding, question }, currentPrint);
  }
  if (before) {
    emit({ t: "step", text: "Asked before, and its facts haven’t changed" });
    for (const s of splitSentences(before.text)) emit({ t: "text", text: s });
    await finish(
      { kind: before.kind, route: before.route, text: before.text, sources: before.sources, pictures: before.pictures, next: before.next, noFact: false, choices: before.choices, copied: true },
      { copiedFrom: before.id, facts: {} },
    );
    return;
  }

  // ── Find the facts.
  const facts = new Facts();
  const pictures: AskPicture[] = [];
  const searchSlugs = slug ? [slug] : compare ?? (onRoutes.length ? onRoutes : null);
  if (compare) {
    for (const s of compare) {
      facts.add(ix.chunk(s, `route:${s}`)!, null);
      const r = ix.routes.get(s)!;
      const latest = [...r.season.history].sort((a, b) => b.year - a.year)[0];
      const c = latest ? ix.chunk(s, `season:${s}:${latest.year}`) : undefined;
      if (c) facts.add(c, null);
    }
  }
  const find = (o: Parameters<typeof search>[1]) => (embedding ? search(embedding, o) : searchWords(question, o));
  let found: Hit[] = await find({ slugs: searchSlugs, kinds: KINDS_FOR[kind] ?? null, limit: 12 });
  if (found.length === 0 && searchSlugs) found = await find({ kinds: KINDS_FOR[kind] ?? null, limit: 12 });
  const top = found[0]?.score ?? 0;
  const good = found.filter((h) => h.score >= Math.max(0.5, top - 0.12));

  // Worked out in code, never by the model: distances to pumps, and between places.
  if (route && kind === "fuel") {
    const views = await viewsOf(route.slug);
    const pumps = [...route.fuel.pumps].sort((a, b) => a.km_from_start - b.km_from_start);
    const chunkOf = (id: string) => ix.chunk(route.slug, id);
    const between = dedupe(hits.filter((h) => h.slug === route.slug && h.km !== null));
    if (between.length >= 2) {
      // From one place to another: how many pumps on the way, and the longest stretch without one.
      const lo = Math.min(between[0]!.km!, between[1]!.km!);
      const hi = Math.max(between[0]!.km!, between[1]!.km!);
      const [from, to] = between[0]!.km! <= between[1]!.km! ? [between[0]!, between[1]!] : [between[1]!, between[0]!];
      const onWay = pumps.filter((p) => p.km_from_start >= lo - 1.5 && p.km_from_start <= hi + 1.5);
      const stops = [lo, ...onWay.map((p) => p.km_from_start), hi];
      let gap = { a: lo, b: hi };
      for (let i = 1; i < stops.length; i++) if (stops[i]! - stops[i - 1]! > gap.b - gap.a || i === 1) gap = stops[i]! - stops[i - 1]! > (i === 1 ? -1 : gap.b - gap.a) ? { a: stops[i - 1]!, b: stops[i]! } : gap;
      const nameAt = (k: number) => onWay.find((p) => Math.abs(p.km_from_start - k) < 0.01) ?? null;
      const ga = nameAt(gap.a);
      const gb = nameAt(gap.b);
      const routeChunk = ix.chunk(route.slug, `route:${route.slug}`)!;
      facts.add(routeChunk, null, `${from.name} to ${to.name}: ${one(hi - lo)} km, with ${onWay.length} pump${onWay.length === 1 ? "" : "s"} on the way.`, `Fuel from ${from.name} to ${to.name}`);
      if (ga && gb) {
        facts.add(chunkOf(ga.id)!, views.get(ga.id) ?? null, `${chunkOf(ga.id)!.title}: the last pump before the longest stretch with no pump, ${one(gap.b - gap.a)} km to the next one near ${gb.near ?? gb.name}. Fill up here.`);
        facts.add(chunkOf(gb.id)!, views.get(gb.id) ?? null, `${chunkOf(gb.id)!.title}: the first pump after that ${one(gap.b - gap.a)} km stretch.`);
      }
      pictures.push({
        kind: "fuel",
        routeName: route.name,
        total: route.header.distance_km ?? pumps.at(-1)?.km_from_start ?? hi,
        pumps: pumps.map((p) => ({ km: p.km_from_start, name: p.near ?? p.name })),
        gap: ga && gb ? { from: gap.a, to: gap.b, fromName: ga.near ?? ga.name, toName: gb.near ?? gb.name } : null,
        place: null,
      });
    } else if (place && place.km !== null) {
      const at = place.km;
      const here = pumps.filter((p) => Math.abs(p.km_from_start - at) <= 1.5);
      const behind = pumps.filter((p) => p.km_from_start < at - 1.5).slice(-2).reverse();
      const ahead = pumps.filter((p) => p.km_from_start > at + 1.5).slice(0, 1);
      const routeChunk = ix.chunk(route.slug, `route:${route.slug}`)!;
      if (here.length) {
        for (const p of here) facts.add(chunkOf(p.id)!, views.get(p.id) ?? null, `${chunkOf(p.id)!.title}: a pump in ${place.name} itself.`);
      } else {
        facts.add(routeChunk, null, `Meel lists no pump in ${place.name} (km ${one(at)} on ${route.name}).`);
      }
      behind.forEach((p, i) =>
        facts.add(chunkOf(p.id)!, views.get(p.id) ?? null, `${chunkOf(p.id)!.title}: ${one(at - p.km_from_start)} km before ${place.name}${i === 0 ? `, the nearest pump before it` : ""}.`),
      );
      for (const p of ahead) facts.add(chunkOf(p.id)!, views.get(p.id) ?? null, `${chunkOf(p.id)!.title}: ${one(p.km_from_start - at)} km after ${place.name} along the route, the next pump after it.`);
      if (!behind.length && !here.length) facts.add(routeChunk, null, `No pump before ${place.name} on this route.`);
      const prev = behind[0];
      const next = ahead[0];
      pictures.push({
        kind: "fuel",
        routeName: route.name,
        total: route.header.distance_km ?? pumps.at(-1)?.km_from_start ?? at,
        pumps: pumps.map((p) => ({ km: p.km_from_start, name: p.near ?? p.name })),
        gap: prev && next ? { from: prev.km_from_start, to: next.km_from_start, fromName: prev.near ?? prev.name, toName: next.near ?? next.name } : null,
        place: { km: at, name: place.name },
      });
    } else {
      for (const g of route.fuel.longest_gaps.slice(0, 2)) {
        facts.add(ix.chunk(route.slug, `route:${route.slug}`)!, null, `A gap of ${one(g.gap_km)} km with no pump on ${route.name}: from near ${g.near_from} (km ${one(g.from_km)}) to near ${g.near_to} (km ${one(g.to_km)}).`);
      }
      const g = route.fuel.longest_gaps[0];
      pictures.push({
        kind: "fuel",
        routeName: route.name,
        total: route.header.distance_km ?? pumps.at(-1)?.km_from_start ?? 0,
        pumps: pumps.map((p) => ({ km: p.km_from_start, name: p.near ?? p.name })),
        gap: g ? { from: g.from_km, to: g.to_km, fromName: g.near_from, toName: g.near_to } : null,
        place: null,
      });
    }
  }

  if (route && kind === "distance") {
    const named = dedupe(hits.filter((h) => h.slug === route.slug && h.km !== null));
    if (named.length >= 2) {
      const [a, b] = [named[0]!, named[1]!];
      const lo = Math.min(a.km!, b.km!);
      const hi = Math.max(a.km!, b.km!);
      const kmOf = (name: string) => route.waypoints.find((w) => w.name === name)?.km_from_start;
      const rows = route.stretches
        .map((s, i) => ({ s, i, from: kmOf(s.from), to: kmOf(s.to) }))
        .filter((r) => r.from !== undefined && r.to !== undefined && Math.min(r.from, r.to) >= lo - 0.5 && Math.max(r.from, r.to) <= hi + 0.5);
      const covered = rows.reduce((t, r) => t + r.s.distance_km, 0);
      const hours = rows.reduce((t, r) => t + r.s.map_app_hours, 0);
      const total = Math.abs(covered - (hi - lo)) < 2 && rows.length ? covered : hi - lo;
      const anchor = rows[0] ? ix.chunk(route.slug, `stretch:${route.slug}:${rows[0].i}`)! : ix.chunk(route.slug, `route:${route.slug}`)!;
      facts.add(
        anchor,
        null,
        `${a.name} to ${b.name} along ${route.name}: ${one(total)} km${rows.length && hours ? `; a map app says ${hm(hours)} of riding` : ""}${rows.length > 1 ? `, through ${rows.slice(0, -1).map((r) => r.s.to).join(", ")}` : ""}.`,
        `Stretches of ${route.name.split(":")[0]}`,
      );
      if (rows.length) pictures.push({ kind: "stretches", rows: rows.map((r) => ({ from: r.s.from, to: r.s.to, km: r.s.distance_km, hours: r.s.map_app_hours })), total });
    }
  }

  if (route && kind === "altitude") {
    // The same rule as the route's altitude check (components/tools/night-halts.tsx).
    const seen = new Set<string>();
    const halts = route.waypoints.filter((w) => w.kind === "place" && w.altitude_m !== null && !seen.has(w.name) && seen.add(w.name));
    const named = dedupe(hits.filter((h) => h.slug === route.slug && h.km !== null));
    const lo = named.length >= 2 ? Math.min(named[0]!.km!, named[1]!.km!) : -1;
    const hi = named.length >= 2 ? Math.max(named[0]!.km!, named[1]!.km!) : Infinity;
    const inside = halts.filter((w) => w.km_from_start >= lo - 0.5 && w.km_from_start <= hi + 0.5);
    const places = ix.chunk(route.slug, `places:${route.slug}`);
    if (places && inside.length >= 2) {
      const ft = (m: number) => Math.round(m * 3.28084).toLocaleString("en-IN");
      facts.add(places, null, `Places riders sleep on ${route.name}, in order: ${inside.map((w) => `${w.name} ${ft(w.altitude_m!)} ft (km ${one(w.km_from_start)})`).join("; ")}.`, `Halts and heights on ${route.name.split(":")[0]}`);
      const steep = inside.slice(1).map((w, i) => ({ from: inside[i]!, to: w, gain: w.altitude_m! - inside[i]!.altitude_m! })).filter((x) => x.gain > 500);
      facts.add(
        places,
        null,
        `Meel’s altitude check: walkers are told to sleep no more than about 1,600 ft (500 m) higher than the night before; it is a proposal, not medical advice.${
          steep.length ? ` Climbs above that between one halt and the next: ${steep.map((x) => `${x.from.name} to ${x.to.name} +${ft(x.gain)} ft`).join("; ")}.` : " No climb from one halt to the next is above that."
        } The highest halt is ${inside.reduce((a, b) => (b.altitude_m! > a.altitude_m! ? b : a)).name}.`,
        "Meel’s altitude check",
      );
    }
  }

  if (route && kind === "fuel") {
    pictures.push({ kind: "tool", title: "Check fuel for your bike", sub: `Your tank against every gap on ${route.name.split(":")[0]}`, href: `/routes/${route.slug}/fuel-check` });
  }
  if (route && kind === "altitude") {
    pictures.push({ kind: "tool", title: "Altitude check", sub: "Tick your night halts; it checks each climb", href: `/routes/${route.slug}/altitude` });
  }

  // With worked-out facts in hand, the search only adds what they don't cover.
  const computed = facts.list.length;
  if (computed && kind === "fuel") good.splice(0, good.length, ...good.filter((h) => h.chunk.kind !== "pump"));
  const limit = computed ? 8 - computed : 8;
  let gapsTaken = 0;
  for (const h of good.slice(0, Math.max(computed ? 2 : 3, limit))) {
    // "What Meel could not find" helps only when it is about the question; one is enough.
    if (h.chunk.kind === "gaps" && (gapsTaken++ > 0 || h.score < top - 0.04)) continue;
    facts.add(h.chunk, (await viewsOf(h.chunk.slug)).get(h.chunk.id) ?? null);
  }

  // Pictures by rule.
  if (route && (kind === "road" || kind === "video" || (kind === "general" && /\b(like|kaisa|kaisi|road|route|scenery|view)\b/i.test(question)))) {
    if (route.image && kind !== "video") {
      pictures.push({ kind: "photo", src: `/route-images/${route.image.file}`, caption: route.image.shows, credit: `Photo: ${route.image.author} · ${route.image.licence}`, sourceUrl: route.image.source_page });
    }
    const names = hits.map((h) => h.name.toLowerCase());
    const vids = route.videos
      .filter((v) => !names.length || names.some((n) => (v.stretch ?? v.title).toLowerCase().includes(n)))
      .slice(0, 2);
    const pick = vids.length ? vids : route.videos.slice(0, 2);
    if (pick.length) {
      pictures.push({ kind: "videos", items: pick.map((v) => ({ title: v.title, url: v.url, channel: v.channel, stretch: v.stretch, filmed: v.filmed, thumb: `https://i.ytimg.com/vi/${v.id}/mqdefault.jpg` })) });
    }
  }

  if (facts.list.length === 0) {
    await finish({ kind, route: route ? { slug: route.slug, name: route.name } : null, text: W.noFact[lang], sources: [], pictures: [], next: NEXT[kind](shortName), noFact: true }, { embedding });
    return;
  }

  emit({ t: "step", text: `Found ${facts.list.length} fact${facts.list.length === 1 ? "" : "s"}` });

  // ── Write only from them.
  const numbered = facts.list.map((f, i) => {
    const trust = f.view ? ` (${f.view.line})` : "";
    return `[${i + 1}] ${f.title}: ${f.words}${trust}`.slice(0, 420);
  });
  const previous = req.previous ? `Previous question: ${req.previous.question.slice(0, 200)}\nPrevious answer: ${req.previous.answer.slice(0, 300)}\n\n` : "";
  // The place names in these facts, spelt out, so a Hindi answer does not turn "Lahaul" into "Ladakh".
  const names = [...new Set(ix.gazetteer.entries.filter((e) => facts.list.some((f) => f.words.includes(e.name))).map((e) => e.name))].slice(0, 20);
  const spelt = names.length ? `Place names, to copy exactly in Latin letters: ${names.join(", ")}.\n\n` : "";
  const hint = HINT[kind] ? `${HINT[kind]}\n\n` : "";
  const user = `Facts:\n${numbered.join("\n")}\n\n${spelt}${hint}${previous}Question: ${question}`;

  const writer = new SentenceWriter(facts.list.length, (s) => emit({ t: "text", text: s }));
  let usage = { promptTokens: 0, outputTokens: 0 };
  try {
    usage = await generate(systemPrompt(lang), user, (piece) => writer.push(piece), { maxTokens: 220, signal: ctx.signal });
  } catch (error) {
    console.error("ask: answer failed", error);
    emit({ t: "error", message: W.failed[lang], counted: false });
    return;
  }
  writer.end();

  if (writer.noFact || writer.kept.length === 0) {
    // Show what it found, plainly, without claiming it answers the question.
    const sources = sourcesOf(facts.list.slice(0, 3), ix.routes);
    await finish(
      { kind, route: route ? { slug: route.slug, name: route.name } : null, text: W.noFact[lang], sources, pictures: [], next: NEXT[kind](shortName), noFact: true },
      { embedding, promptTokens: usage.promptTokens, outputTokens: usage.outputTokens },
    );
    return;
  }

  // Only the facts it cited are shown, numbered in the order they appear.
  const cited = writer.order.map((n) => facts.list[n - 1]!).filter(Boolean);
  await finish(
    {
      kind,
      route: route ? { slug: route.slug, name: route.name } : null,
      text: writer.kept.join(" "),
      sources: sourcesOf(cited, ix.routes),
      pictures,
      next: NEXT[kind](shortName),
      noFact: false,
    },
    { embedding, facts: fingerprints(cited), promptTokens: usage.promptTokens, outputTokens: usage.outputTokens },
  );
}

/* ── Helpers ─────────────────────────────────────────────────────── */

function systemPrompt(lang: AskLang): string {
  const language =
    lang === "hi" ? "Hindi in Devanagari script" : lang === "hinglish" ? "Hinglish in Latin letters, the way the question is written" : "plain English";
  return [
    "You are Ask Meel, on rideplanner.in, for Indian motorcycle riders.",
    "Answer ONLY from the numbered facts. Never add anything you know from elsewhere.",
    "- Two to four short sentences. The first sentence answers the question directly.",
    "- End every sentence with the numbers of the facts it uses, like [1] or [2][3]. A sentence without a number is deleted.",
    "- Distances in the facts are already worked out. Copy them exactly; never calculate new ones.",
    "- When the facts you use say no rider has confirmed them, add one short sentence saying so, with their numbers.",
    "- Never say a road, pass, tunnel or check post is open or closed today.",
    "- Write every place name exactly as it is spelt in the facts, in Latin letters, even in a Hindi answer.",
    "- No costs, no bike rankings, no hotels, no advice beyond the facts.",
    "- If the facts answer only part of the question, answer that part and say what Meel doesn't have.",
    "- Only if no fact is about the question at all, reply with exactly: NO_FACT",
    `- Write in ${language}. Keep numbers and dates as in the facts.`,
  ].join("\n");
}

/** Takes the model's text as it streams, keeps only sentences that cite real facts, and renumbers them. */
class SentenceWriter {
  buffer = "";
  kept: string[] = [];
  order: number[] = [];
  noFact = false;
  constructor(
    private readonly count: number,
    private readonly out: (sentence: string) => void,
  ) {}

  push(piece: string) {
    this.buffer += piece;
    if (/NO_FACT/.test(this.buffer)) this.noFact = true;
    this.drain(false);
  }

  end() {
    this.drain(true);
  }

  private drain(final: boolean) {
    // "pump. [3]" becomes "pump [3]." so a source number stays with its sentence.
    this.buffer = this.buffer.replace(/([.!?।])\s*((?:\[\d+\]\s*)+)/g, (_, p, c: string) => ` ${c.trim()}${p}`);
    const end = /[.!?।](?=\s+[^\s[])/g;
    let last = 0;
    let m: RegExpExecArray | null;
    const parts: string[] = [];
    while ((m = end.exec(this.buffer))) {
      parts.push(this.buffer.slice(last, m.index + 1));
      last = m.index + 1;
    }
    this.buffer = this.buffer.slice(last);
    if (final && this.buffer.trim()) {
      parts.push(this.buffer);
      this.buffer = "";
    }
    for (const raw of parts) this.take(raw.trim());
  }

  private take(sentence: string) {
    // Read on a phone at a dhaba: four sentences at most.
    if (!sentence || this.noFact || this.kept.length >= 4) return;
    const nums = [...sentence.matchAll(/\[(\d+)\]/g)].map((x) => Number(x[1]));
    if (nums.length === 0 || nums.some((n) => n < 1 || n > this.count)) return;
    const renumbered = sentence.replace(/\[(\d+)\]/g, (_, d: string) => {
      const n = Number(d);
      if (!this.order.includes(n)) this.order.push(n);
      return `[${this.order.indexOf(n) + 1}]`;
    });
    const tidy = renumbered.replace(/\s+([.,!?।])/g, "$1").replace(/(\[\d+\])(?=\[)/g, "$1");
    this.kept.push(tidy);
    this.out(tidy);
  }
}

function sourcesOf(list: Fact[], routes: Map<string, Route>): AskSource[] {
  return list.map((f, i) => ({
    n: i + 1,
    id: f.chunk.id,
    slug: f.chunk.slug,
    routeName: routes.get(f.chunk.slug)?.name ?? "",
    title: f.title,
    // A worked-out fact shows the worked-out words; a fact from the page shows its own words and who confirmed it.
    line: f.words !== f.chunk.text ? `${f.words}${f.view ? ` ${f.view.line}` : ""}` : f.view ? `${f.view.short ?? ""} ${f.view.line}`.trim() : f.chunk.text,
    state: f.view?.state ?? null,
    href: f.view?.href ?? f.chunk.href,
  }));
}

function fingerprints(list: Fact[]): Fingerprints {
  const out: Fingerprints = { _v: ASK_VERSION };
  for (const f of list) out[f.key] = hashOf(f.view ? `${f.view.snippet}|${f.view.state}` : f.chunk.text);
  return out;
}

function firstSentences(text: string, n: number): string {
  const parts = text.split(/(?<=[.!?])\s+/).slice(0, n).join(" ").trim();
  return parts.replace(/[.!?]$/, "");
}

function splitSentences(text: string): string[] {
  return text.split(/(?<=[.!?।](?:\s*\[\d+\])*)\s+/).filter(Boolean);
}

function dedupe(hits: PlaceHit[]): PlaceHit[] {
  const seen = new Set<string>();
  return hits.filter((h) => (seen.has(h.name) ? false : (seen.add(h.name), true)));
}
