import "server-only";

import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

import { db, isDuplicate, newId, together } from "./db";

/*
  The database side of logging in, shared by the Auth.js setup (session.ts) and the pages' own calls (auth.ts).
  Nothing here reads or writes a cookie.
*/

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

const MAX_TRIES = 5;
const REST_MINUTES = 15;
const SCRYPT = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 } as const;

export function normalEmail(typed: string): string {
  return typed.trim().toLowerCase();
}

// ── passwords ────────────────────────────────────────────────────────────

/** Passwords are stored scrambled with scrypt and a salt of their own. Never as typed. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt, 64, SCRYPT);
  return ["scrypt", SCRYPT.N, SCRYPT.r, SCRYPT.p, salt.toString("base64"), key.toString("base64")].join("$");
}

export async function passwordMatches(password: string, stored: string): Promise<boolean> {
  const [scheme, n, r, p, salt, key] = stored.split("$");
  if (scheme !== "scrypt" || !n || !r || !p || !salt || !key) return false;
  const expected = Buffer.from(key, "base64");
  const actual = await scryptAsync(password, Buffer.from(salt, "base64"), expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
    maxmem: SCRYPT.maxmem,
  });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

// A hash to compare against when no password exists, so a wrong email takes as long as a wrong password.
let decoy: Promise<string> | null = null;
export function decoyHash(): Promise<string> {
  decoy ??= hashPassword(randomBytes(12).toString("hex"));
  return decoy;
}

// ── logging in with an email and a password ──────────────────────────────

export type CheckResult =
  | { ok: true; userId: string; sessionVersion: number }
  | { ok: false; reason: "no-match" }
  | { ok: false; reason: "resting"; minutes: number };

/** Five wrong tries rest the email for fifteen minutes. A rider who has no password never matches. */
export async function checkLogin(emailTyped: string, password: string): Promise<CheckResult> {
  const email = normalEmail(emailTyped);
  const since = new Date(Date.now() - REST_MINUTES * 60_000);
  const recent = await db().loginAttempt.findMany({
    where: { email, at: { gt: since } },
    orderBy: { at: "asc" },
    select: { at: true },
  });
  const first = recent[0];
  if (recent.length >= MAX_TRIES && first) {
    const minutes = Math.max(1, Math.ceil((first.at.getTime() + REST_MINUTES * 60_000 - Date.now()) / 60_000));
    return { ok: false, reason: "resting", minutes };
  }

  const row = await db().user.findUnique({ where: { email }, select: { id: true, passwordHash: true, sessionVersion: true } });
  const matches = await passwordMatches(password, row?.passwordHash ?? (await decoyHash()));
  if (!row?.passwordHash || !matches) {
    await db().loginAttempt.create({ data: { email } });
    return { ok: false, reason: "no-match" };
  }
  await db().loginAttempt.deleteMany({ where: { email } });
  return { ok: true, userId: row.id, sessionVersion: row.sessionVersion };
}

// ── logging in with Google ───────────────────────────────────────────────

function nameFrom(google: string | null, email: string): string {
  const name = (google ?? "").trim().replace(/\s+/g, " ").slice(0, 60);
  if (name.length >= 2) return name;
  return email.split("@")[0]?.slice(0, 60) || "Rider";
}

/**
 * The rider behind a Google account, made or found. Google has checked the email before this is called.
 *
 * - A Google account seen before: its rider.
 * - An email Meel already knows: that account, with Google linked to it. If it had a password, Google takes over:
 *   the password is removed and every phone is logged out, because Meel never checked that whoever set the
 *   password owned the email, and Google has.
 * - Otherwise a new rider, with no home city until they finish their profile.
 */
export async function riderFromGoogle(input: {
  googleId: string;
  email: string;
  name: string | null;
}): Promise<{ id: string; sessionVersion: number }> {
  const email = normalEmail(input.email);
  const account = { provider: "google", providerAccountId: input.googleId };
  const picked = { id: true, sessionVersion: true } as const;

  for (let attempt = 0; ; attempt += 1) {
    try {
      return await together(async (tx) => {
        const linked = await tx.account.findUnique({
          where: { provider_providerAccountId: account },
          select: { user: { select: picked } },
        });
        if (linked) return linked.user;

        const known = await tx.user.findUnique({ where: { email }, select: { id: true, passwordHash: true } });
        if (known) {
          const tookOver = known.passwordHash !== null;
          const rider = await tx.user.update({
            where: { id: known.id },
            data: {
              accounts: { create: account },
              ...(tookOver
                ? { passwordHash: null, passwordIsTemporary: false, passwordRemovedAt: new Date(), sessionVersion: { increment: 1 } }
                : {}),
            },
            select: picked,
          });
          if (tookOver) await tx.loginAttempt.deleteMany({ where: { email } });
          return rider;
        }

        return tx.user.create({
          data: { id: newId(), email, name: nameFrom(input.name, email), accounts: { create: account } },
          select: picked,
        });
      });
    } catch (error) {
      // Two first logins with the same Google account at the same moment. The second finds what the first made.
      if (attempt === 0 && isDuplicate(error)) continue;
      throw error;
    }
  }
}
