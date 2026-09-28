import { existsSync } from "node:fs";
import { userInfo } from "node:os";

import { defineConfig } from "prisma/config";

// Prisma does not read settings files on its own. Read the same one Next.js reads, if there is one,
// so both see the same DATABASE_URL. A value already set in the environment wins.
for (const file of [".env.local", ".env"]) {
  if (existsSync(file)) process.loadEnvFile(file);
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: {
    // On your own machine: the database called meel on the Postgres at localhost:5432, as your own user,
    // which is how a Homebrew Postgres is set up. Set DATABASE_URL for anything else.
    url: process.env.DATABASE_URL ?? `postgresql://${userInfo().username}@localhost:5432/meel`,
  },
});
