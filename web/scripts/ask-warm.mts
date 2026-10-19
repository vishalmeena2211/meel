// Answers every starter question in advance, so a rider who taps one gets the answer at once and costs nothing.
//
//   DATABASE_URL=<the database to fill> pnpm ask:warm
//
// Run after `pnpm ask:index` and a deploy. About 208 questions (4 overall, 4 for each route), roughly ₹4.
// An answer is given again only while its facts read the same, so after a data change the next run refreshes it.
import { readFile } from "node:fs/promises";
import path from "node:path";

import { STARTERS, startersFor } from "../src/lib/ask/starters";
import type { Route, RouteIndex } from "../src/lib/types";
import { runAsk } from "../src/server/ask/answer";

const content = path.resolve(process.cwd(), "content");
const index = JSON.parse(await readFile(path.join(content, "routes", "index.json"), "utf8")) as RouteIndex;
const jobs: Array<{ question: string; route?: string }> = STARTERS.map((question) => ({ question }));
for (const r of index.routes) {
  const route = JSON.parse(await readFile(path.join(content, "routes", `${r.slug}.json`), "utf8")) as Route;
  for (const question of startersFor(route)) jobs.push({ question, route: r.slug });
}

let done = 0;
let copied = 0;
let failed = 0;
for (const job of jobs) {
  try {
    await runAsk(job, { who: "warm", loggedIn: true, warm: true }, (e) => {
      if (e.t === "done") {
        done += 1;
        if (e.answer.copied) copied += 1;
      } else if (e.t === "error") {
        failed += 1;
        console.error(`\nask-warm: no answer for "${job.question}"`);
      }
    });
  } catch (error) {
    // One question that throws (a dropped connection, say) must not stop the rest.
    failed += 1;
    console.error(`\nask-warm: "${job.question}" threw: ${error instanceof Error ? error.message.split("\n")[0] : String(error)}`);
  }
  process.stdout.write(`\rask-warm: ${done + failed} of ${jobs.length}`);
  // Google gives a new project few requests a minute; this keeps well under it and leaves room for riders.
  await new Promise((r) => setTimeout(r, 3000));
}
console.log(`\nask-warm: ${done} answered (${copied} already ready), ${failed} failed.`);
process.exit(failed ? 1 : 0);
