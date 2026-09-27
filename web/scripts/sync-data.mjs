// Copies what the site shows from ../data into this app, so the app can be built and hosted on its own.
// Runs before `dev` and before `build`. It only copies; it never changes ../data.
import { cp, mkdir, readdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const data = path.resolve(here, "..", "..", "data");
const content = path.resolve(here, "..", "content");
const images = path.resolve(here, "..", "public", "route-images");

async function exists(p) {
  try { await stat(p); return true; } catch { return false; }
}

if (!(await exists(path.join(data, "routes", "index.json")))) {
  if (await exists(path.join(content, "routes", "index.json"))) {
    console.log("sync-data: ../data not found, keeping the copy already in content/");
    process.exit(0);
  }
  console.error("sync-data: ../data/routes/index.json is missing. Run data/tools/assemble.py first.");
  process.exit(1);
}

await rm(content, { recursive: true, force: true });
await mkdir(content, { recursive: true });
await cp(path.join(data, "routes"), path.join(content, "routes"), { recursive: true });
await cp(path.join(data, "site"), path.join(content, "site"), { recursive: true });

await rm(images, { recursive: true, force: true });
await mkdir(images, { recursive: true });
let pictures = 0;
if (await exists(path.join(data, "images"))) {
  for (const f of await readdir(path.join(data, "images"))) {
    if (f.endsWith(".jpg")) {
      await cp(path.join(data, "images", f), path.join(images, f));
      pictures += 1;
    }
  }
  if (await exists(path.join(data, "images", "credits.json"))) {
    await cp(path.join(data, "images", "credits.json"), path.join(content, "site", "image-credits.json"));
  }
}
const routes = (await readdir(path.join(content, "routes"))).filter((f) => f !== "index.json").length;
console.log(`sync-data: ${routes} routes, ${pictures} pictures`);
