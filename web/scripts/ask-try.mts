// Asks Ask Meel questions from the command line, against the local database and the real model.
//   pnpm ask:try "petrol pump in chitkul" ["another question" ...]
// Each question counts towards the "phone:try" allowance in the local database only.
import { runAsk } from "../src/server/ask/answer";

const questions = process.argv.slice(2);
for (const question of questions) {
  const started = Date.now();
  let first = 0;
  console.log(`\n? ${question}`);
  await runAsk({ question }, { who: "phone:try", loggedIn: true }, (e) => {
    if (e.t === "step") console.log(`  · ${e.text}`);
    else if (e.t === "text") {
      first ||= Date.now() - started;
      console.log(`  > ${e.text}`);
    } else if (e.t === "done") {
      const a = e.answer;
      console.log(`  = [${a.kind}/${a.lang}${a.route ? `/${a.route.slug}` : ""}${a.copied ? "/copied" : ""}${a.noFact ? "/no-fact" : ""}] ${a.text}`);
      for (const s of a.sources) console.log(`    ${s.n}. ${s.title} — ${s.line.slice(0, 110)}`);
      if (a.pictures.length) console.log(`    pictures: ${a.pictures.map((p) => p.kind).join(", ")}`);
      if (a.choices.length) console.log(`    choices: ${a.choices.map((c) => c.label).join(" | ")}`);
      console.log(`    ${((Date.now() - started) / 1000).toFixed(1)} s${first ? `, first sentence ${(first / 1000).toFixed(1)} s` : ""}`);
    } else console.log(`  ! ${e.t}: ${e.message}`);
  });
}
process.exit(0);
