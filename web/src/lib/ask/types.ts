import type { FactState } from "../types";

/* What Ask Meel sends the browser. Shared by the server (server/ask) and the screens (components/ask). */

export type AskLang = "en" | "hi" | "hinglish";

export type AskKind =
  | "fuel"
  | "distance"
  | "rule"
  | "season"
  | "altitude"
  | "road"
  | "video"
  | "open"
  | "health"
  | "off-topic"
  | "general";

export interface AskSource {
  /** The number shown in the answer, from 1. */
  n: number;
  id: string;
  slug: string;
  routeName: string;
  title: string;
  /** The fact in a sentence, then who confirmed it and when. */
  line: string;
  state: FactState | null;
  href: string;
}

export type AskPicture =
  | {
      kind: "fuel";
      routeName: string;
      total: number;
      pumps: Array<{ km: number; name: string }>;
      /** The longest stretch without a pump, or the one around the place asked about. */
      gap: { from: number; to: number; fromName: string; toName: string } | null;
      place: { km: number; name: string } | null;
    }
  | { kind: "photo"; src: string; caption: string; credit: string; sourceUrl: string }
  | { kind: "videos"; items: Array<{ title: string; url: string; channel: string | null; stretch: string | null; filmed: string | null; thumb: string }> }
  | { kind: "stretches"; rows: Array<{ from: string; to: string; km: number; hours: number }>; total: number }
  | { kind: "offices"; rows: Array<{ title: string; line: string; url: string | null }> }
  | { kind: "call"; number: string; words: string; href: string | null }
  /** A button to one of the route's own tools: the fuel check, the altitude check. */
  | { kind: "tool"; title: string; sub: string; href: string };

export interface AskAnswer {
  id: string;
  question: string;
  lang: AskLang;
  kind: AskKind;
  route: { slug: string; name: string } | null;
  /** Sentences with source numbers in square brackets, such as "No pump in Chitkul [1]." */
  text: string;
  sources: AskSource[];
  pictures: AskPicture[];
  next: string[];
  /** When the question depends on which road: the routes to pick from. */
  choices: Array<{ label: string; slug: string }>;
  /** True when Meel had no fact to answer with. */
  noFact: boolean;
  /** True when this answer was given before and its facts have not changed since. */
  copied: boolean;
  at: string;
}

export type AskEvent =
  | { t: "step"; text: string }
  | { t: "text"; text: string }
  | { t: "done"; answer: AskAnswer; left: number | null }
  | { t: "error"; message: string; counted: boolean }
  | { t: "limit"; message: string; loggedIn: boolean };

export interface AskRequest {
  question: string;
  /** Asked from a route page: that route first. */
  route?: string;
  /** Asked from one fact: that fact first. */
  fact?: string;
  /** The question and answer before this one, for a follow-up. */
  previous?: { question: string; answer: string; route: string | null };
}

export const ASK_LIMIT_PHONE = 10;
export const ASK_LIMIT_USER = 40;
export const ASK_LIMIT_SITE = 2000;
export const ASK_MAX_QUESTION = 300;
