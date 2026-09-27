import "server-only";

import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

import { cookies } from "next/headers";
import { cache } from "react";

import { initials, shortName } from "@/lib/format";

import { all, newId, now, one, run, together } from "./db";

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

const COOKIE = "meel_session";
const SESSION_DAYS = 30;
const MAX_TRIES = 5;
const REST_MINUTES = 15;
const SCRYPT = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 } as const;

export interface User {
  id: string;
  email: string;
  name: string;
  /** "Rahul N." — the only form of the name other riders see. */
  shown_as: string;
  initials: string;
  home_city: string;
  bike: string | null;
  created_at: string;
  is_editor: boolean;
}

interface UserRow {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  home_city: string;
  bike: string | null;
  created_at: string;
}

function editors(): string[] {
  return (process.env.MEEL_EDITOR_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

function toUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    shown_as: shortName(row.name),
    initials: initials(row.name),
    home_city: row.home_city,
    bike: row.bike,
    created_at: row.created_at,
    is_editor: editors().includes(row.email),
  };
}

// ── passwords ────────────────────────────────────────────────────────────

/** Passwords are stored scrambled with scrypt and a salt of their own. Never as typed. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt, 64, SCRYPT);
  return ["scrypt", SCRYPT.N, SCRYPT.r, SCRYPT.p, salt.toString("base64"), key.toString("base64")].join("$");
}

async function passwordMatches(password: string, stored: string): Promise<boolean> {
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

// A hash to compare against when no account exists, so a wrong email takes as long as a wrong password.
let decoy: Promise<string> | null = null;
function decoyHash(): Promise<string> {
  decoy ??= hashPassword(randomBytes(12).toString("hex"));
  return decoy;
}

// ── sessions ─────────────────────────────────────────────────────────────

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

async function startSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  run(
    "INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
    hashToken(token),
    userId,
    now(),
    expires.toISOString(),
  );
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires,
  });
}

export async function endSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) run("DELETE FROM sessions WHERE token_hash = ?", hashToken(token));
  jar.delete(COOKIE);
}

/** Who is logged in, or null. Checked against the database on every request that asks. */
export const currentUser = cache(async (): Promise<User | null> => {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  const row = one<UserRow & { expires_at: string }>(
    `SELECT u.*, s.expires_at FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?`,
    hashToken(token),
  );
  if (!row) return null;
  if (row.expires_at < now()) {
    run("DELETE FROM sessions WHERE token_hash = ?", hashToken(token));
    return null;
  }
  return toUser(row);
});

// ── signing up and logging in ────────────────────────────────────────────

export type SignUpResult = { ok: true } | { ok: false; reason: "email-in-use" };

export async function signUp(input: {
  name: string;
  email: string;
  password: string;
  homeCity: string;
  bike: string | null;
}): Promise<SignUpResult> {
  const email = input.email.trim().toLowerCase();
  if (one<{ id: string }>("SELECT id FROM users WHERE email = ?", email)) {
    return { ok: false, reason: "email-in-use" };
  }
  const id = newId();
  const hash = await hashPassword(input.password);
  try {
    run(
      `INSERT INTO users (id, email, name, password_hash, home_city, bike, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      id,
      email,
      input.name.trim(),
      hash,
      input.homeCity.trim(),
      input.bike?.trim() || null,
      now(),
    );
  } catch {
    // Two sign-ups with the same email at the same moment: the second one loses.
    return { ok: false, reason: "email-in-use" };
  }
  await startSession(id);
  return { ok: true };
}

export type LogInResult = { ok: true } | { ok: false; reason: "no-match" | "resting"; minutes?: number };

export async function logIn(emailTyped: string, password: string): Promise<LogInResult> {
  const email = emailTyped.trim().toLowerCase();
  const since = new Date(Date.now() - REST_MINUTES * 60_000).toISOString();
  const tries = one<{ n: number; first: string | null }>(
    "SELECT COUNT(*) AS n, MIN(at) AS first FROM login_attempts WHERE email = ? AND at > ?",
    email,
    since,
  );
  if (tries && tries.n >= MAX_TRIES) {
    const first = tries.first ? new Date(tries.first).getTime() : Date.now();
    const minutes = Math.max(1, Math.ceil((first + REST_MINUTES * 60_000 - Date.now()) / 60_000));
    return { ok: false, reason: "resting", minutes };
  }

  const row = one<UserRow>("SELECT * FROM users WHERE email = ?", email);
  const matches = await passwordMatches(password, row?.password_hash ?? (await decoyHash()));
  if (!row || !matches) {
    run("INSERT INTO login_attempts (email, at) VALUES (?, ?)", email, now());
    return { ok: false, reason: "no-match" };
  }
  run("DELETE FROM login_attempts WHERE email = ?", email);
  await startSession(row.id);
  return { ok: true };
}

export async function checkPassword(userId: string, password: string): Promise<boolean> {
  const row = one<UserRow>("SELECT * FROM users WHERE id = ?", userId);
  if (!row) return false;
  return passwordMatches(password, row.password_hash);
}

export function updateProfile(userId: string, input: { name: string; homeCity: string; bike: string | null }): void {
  run(
    "UPDATE users SET name = ?, home_city = ?, bike = ? WHERE id = ?",
    input.name.trim(),
    input.homeCity.trim(),
    input.bike?.trim() || null,
    userId,
  );
}

/**
 * Remove a person and keep the facts.
 * Their trips and requests go. Reports they sent stay, with no name on them.
 */
export async function deleteAccount(userId: string): Promise<void> {
  together(() => {
    run("UPDATE fact_reports SET name = NULL WHERE user_id = ?", userId);
    run("UPDATE trip_reports SET name = NULL WHERE user_id = ?", userId);
    run("DELETE FROM users WHERE id = ?", userId);
  });
  const jar = await cookies();
  jar.delete(COOKIE);
}

/** Everything held about one rider, for them to take away. */
export function everythingAbout(userId: string): Record<string, unknown> {
  const user = one<UserRow>("SELECT * FROM users WHERE id = ?", userId);
  if (!user) return {};
  const { password_hash: _hidden, ...details } = user;
  void _hidden;
  return {
    taken_on: now(),
    your_details: details,
    trips_you_lead: all("SELECT * FROM trips WHERE leader_id = ?", userId),
    trips_you_asked_to_join: all("SELECT * FROM trip_members WHERE user_id = ?", userId),
    facts_you_reported: all("SELECT * FROM fact_reports WHERE user_id = ?", userId),
    trip_reports_you_sent: all("SELECT * FROM trip_reports WHERE user_id = ?", userId),
  };
}
