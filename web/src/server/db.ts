import "server-only";

import { userInfo } from "node:os";

import { PrismaPg } from "@prisma/adapter-pg";

import { Prisma, PrismaClient } from "@/generated/prisma/client";

/*
  Accounts, trips and reports live in Postgres. Routes and facts do not: they are built into the site from ../data.

  Where the database is: DATABASE_URL. On your own machine, if that is not set, the database called meel on the
  Postgres at localhost:5432, as your own user, which is how a Homebrew Postgres is set up.

  The tables are made by the migrations in prisma/migrations. To change one, edit prisma/schema.prisma and run
  `pnpm db:migrate --name what-changed`. Never edit a migration that has already run.
*/

export type Client = PrismaClient | Prisma.TransactionClient;

function databaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (url) return url;
  if (process.env.NODE_ENV === "production") {
    throw new Error("DATABASE_URL is not set. Meel cannot reach its database. See web/README.md, Settings.");
  }
  return `postgresql://${userInfo().username}@localhost:5432/meel`;
}

// One pool of connections for the whole server. In development Next.js reloads this file on every change,
// so the client is kept on globalThis; otherwise each reload would open a new pool.
const kept = globalThis as unknown as { meelDb?: PrismaClient };

/** The database. Made on first use, so a build with no database still works and a missing setting fails loudly. */
export function db(): PrismaClient {
  kept.meelDb ??= new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl() }) });
  return kept.meelDb;
}

/** Several changes that must all happen, or none. */
export function together<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  return db().$transaction(work);
}

/** True when a write failed because the row is already there, as when two riders press the same button at once. */
export function isDuplicate(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export function newId(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 16);
}

// Days such as the day a trip leaves are calendar days in India, kept in Postgres as a DATE.
// Prisma hands a DATE over as midnight in world time on that day, and takes one back the same way.

/** "2027-06-19" to the value Prisma writes into a DATE column. */
export function asDate(day: string): Date {
  return new Date(`${day}T00:00:00.000Z`);
}

/** A DATE column's value back to "2027-06-19". */
export function asDay(value: Date): string {
  return value.toISOString().slice(0, 10);
}

/** A moment, such as when a report was sent, as the text the pages already read. */
export function asMoment(value: Date): string {
  return value.toISOString();
}
