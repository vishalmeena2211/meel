import "server-only";

import { randomInt } from "node:crypto";

import { CredentialsSignin } from "next-auth";
import { decode } from "next-auth/jwt";
import { cookies } from "next/headers";
import { redirect, unstable_rethrow } from "next/navigation";
import { cache } from "react";

import { initials, shortName } from "@/lib/format";

import { asMoment, db, newId, together } from "./db";
import { hashPassword, normalEmail, passwordMatches } from "./riders";
import { googleIsOn, SESSION_COOKIE, signIn, signOut } from "./session";

export { googleIsOn };

export interface User {
  id: string;
  email: string;
  name: string;
  /** "Rahul N." — the only form of the name other riders see. */
  shown_as: string;
  initials: string;
  /** Null until a rider who came in through Google has finished their profile. */
  home_city: string | null;
  bike: string | null;
  created_at: string;
  is_editor: boolean;
  /** True after the editor has set a one-time password, until the rider chooses their own. */
  must_change_password: boolean;
  /** False for a rider who logs in with Google only. */
  has_password: boolean;
  uses_google: boolean;
  /** Home city not given yet. Such a rider can read everything, but cannot join or post a trip. */
  needs_profile: boolean;
  /** When Google took over this account's password, if it did. */
  password_removed_at: string | null;
  /** Google took over the password in the last two weeks, and no new one has been added. The account page says so. */
  google_took_over: boolean;
}

const TOOK_OVER_NOTICE_MS = 14 * 86_400_000;

interface UserData {
  id: string;
  email: string;
  name: string;
  passwordHash: string | null;
  passwordIsTemporary: boolean;
  passwordRemovedAt: Date | null;
  homeCity: string | null;
  bike: string | null;
  createdAt: Date;
  accounts: Array<{ provider: string }>;
}

const WITH_ACCOUNTS = { accounts: { select: { provider: true } } } as const;

function editors(): string[] {
  return (process.env.MEEL_EDITOR_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * An editor's email can only be signed up with a password while the owner has opened the door, by setting
 * MEEL_EDITOR_SIGNUP to "open". Meel does not check emails, so without this, anyone who guessed the address and
 * signed up first would hold the editor's rights. Logging in with Google needs no door: Google has checked the email.
 */
export function mayNotSignUp(email: string): boolean {
  if (!editors().includes(normalEmail(email))) return false;
  return process.env.MEEL_EDITOR_SIGNUP !== "open";
}

function toUser(row: UserData): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    shown_as: shortName(row.name),
    initials: initials(row.name),
    home_city: row.homeCity,
    bike: row.bike,
    created_at: asMoment(row.createdAt),
    is_editor: editors().includes(row.email),
    must_change_password: row.passwordIsTemporary,
    has_password: row.passwordHash !== null,
    uses_google: row.accounts.some((a) => a.provider === "google"),
    needs_profile: !row.homeCity,
    password_removed_at: row.passwordRemovedAt ? asMoment(row.passwordRemovedAt) : null,
    google_took_over:
      row.passwordHash === null &&
      row.passwordRemovedAt !== null &&
      Date.now() - row.passwordRemovedAt.getTime() < TOOK_OVER_NOTICE_MS,
  };
}

// ── who is logged in ─────────────────────────────────────────────────────

/**
 * The rider id and session number in this phone's login cookie, or null.
 *
 * Read through cookies(), not Auth.js's auth(). After a form logs a phone in (or back in, after a password
 * change), Next.js re-renders the page in the same request. cookies() already holds the new cookie there;
 * auth() reads the request's original headers, which still hold the old one, and would see a logged-out rider.
 * The cookie is opened with Auth.js's own decode, with the same secret and the cookie's name as the salt.
 */
async function sessionOnThisPhone(): Promise<{ uid: string; sv: number } | null> {
  // cookies() comes first, always. It is what tells Next.js a page depends on who is asking. Checked after the
  // secret, a build with no AUTH_SECRET would bake "logged out" into pages such as /account for everyone.
  const jar = await cookies();
  const secret = process.env.AUTH_SECRET;
  if (!secret) return null;
  // On https Auth.js names it with a __Secure- prefix. A long cookie is split into .0, .1 and so on.
  for (const name of [`__Secure-${SESSION_COOKIE}`, SESSION_COOKIE]) {
    const pieces = jar
      .getAll()
      .filter((c) => c.name === name || c.name.startsWith(`${name}.`))
      .sort((a, b) => a.name.localeCompare(b.name, "en", { numeric: true }));
    if (pieces.length === 0) continue;
    const token = await decode({ token: pieces.map((c) => c.value).join(""), secret, salt: name });
    return typeof token?.uid === "string" && typeof token.sv === "number" ? { uid: token.uid, sv: token.sv } : null;
  }
  return null;
}

/** Who is logged in, or null. Checked against the database on every request that asks. */
export const currentUser = cache(async (): Promise<User | null> => {
  let session: { uid: string; sv: number } | null;
  try {
    session = await sessionOnThisPhone();
  } catch (error) {
    // A cookie that cannot be opened: tampered with, or sealed with another secret. Nobody is logged in.
    // This fails closed, never open.
    unstable_rethrow(error);
    return null;
  }
  if (!session) return null;
  const row = await db().user.findUnique({ where: { id: session.uid }, include: WITH_ACCOUNTS });
  // A phone that logged in before the session number was raised is logged out.
  if (!row || row.sessionVersion !== session.sv) return null;
  return toUser(row);
});

/**
 * Joining, posting and answering trips show a rider's home city to others. A rider who came in through Google
 * and has not given one yet is sent to finish their profile first, and brought back afterwards.
 */
export function profileFirst(user: User, next: string): void {
  if (user.needs_profile) redirect(`/welcome?next=${encodeURIComponent(next)}`);
}

/** Log this phone in, after its email and password have been set or checked. Never throws for a wrong password. */
async function startSession(email: string, password: string): Promise<LogInResult> {
  try {
    await signIn("credentials", { email, password, redirect: false });
  } catch (error) {
    if (error instanceof CredentialsSignin) {
      const resting = /^resting:(\d+)$/.exec(error.code);
      return resting ? { ok: false, reason: "resting", minutes: Number(resting[1]) } : { ok: false, reason: "no-match" };
    }
    throw error;
  }
  const row = await db().user.findUnique({ where: { email: normalEmail(email) }, select: { passwordIsTemporary: true } });
  return { ok: true, mustChangePassword: row?.passwordIsTemporary ?? false };
}

export async function endSession(): Promise<void> {
  await signOut({ redirect: false });
}

// ── signing up and logging in ────────────────────────────────────────────

export type SignUpResult = { ok: true } | { ok: false; reason: "email-in-use" };

export async function signUp(input: {
  name: string;
  email: string;
  password: string;
  homeCity: string;
  bike: string | null;
}): Promise<SignUpResult> {
  const email = normalEmail(input.email);
  if (await db().user.findUnique({ where: { email }, select: { id: true } })) {
    return { ok: false, reason: "email-in-use" };
  }
  const hash = await hashPassword(input.password);
  try {
    await db().user.create({
      data: {
        id: newId(),
        email,
        name: input.name.trim(),
        passwordHash: hash,
        homeCity: input.homeCity.trim(),
        bike: input.bike?.trim() || null,
      },
    });
  } catch {
    // Two sign-ups with the same email at the same moment: the second one loses.
    return { ok: false, reason: "email-in-use" };
  }
  await startSession(email, input.password);
  return { ok: true };
}

export type LogInResult =
  | { ok: true; mustChangePassword: boolean }
  | { ok: false; reason: "no-match" | "resting"; minutes?: number };

export function logIn(emailTyped: string, password: string): Promise<LogInResult> {
  return startSession(emailTyped, password);
}

/** The rider's password matches. False for a rider who has none. Wrong tries here are not counted. */
export async function checkPassword(userId: string, password: string): Promise<boolean> {
  const row = await db().user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
  if (!row?.passwordHash) return false;
  return passwordMatches(password, row.passwordHash);
}

/**
 * A rider chooses a new password. Every other phone is logged out; this one stays.
 * False means the present password was not right, and nothing was changed.
 */
export async function changePassword(userId: string, present: string, next: string): Promise<boolean> {
  if (!(await checkPassword(userId, present))) return false;
  const hash = await hashPassword(next);
  const row = await together(async (tx) => {
    const changed = await tx.user.update({
      where: { id: userId },
      data: { passwordHash: hash, passwordIsTemporary: false, sessionVersion: { increment: 1 } },
      select: { email: true },
    });
    // The rider has just shown the present password, so wrong tries by anyone else no longer count against them.
    await tx.loginAttempt.deleteMany({ where: { email: changed.email } });
    return changed;
  });
  // Raising the session number logged out every phone, this one too. Log this one back in with the new password.
  await startSession(row.email, next);
  return true;
}

/**
 * A rider who logs in with Google adds a password, to log in without Google too.
 * Nothing more is asked: logging in through Google has already shown who they are. No phone is logged out.
 * False if the account already has a password; that is changed with changePassword.
 */
export async function addPassword(userId: string, next: string): Promise<boolean> {
  const hash = await hashPassword(next);
  const changed = await db().user.updateMany({
    where: { id: userId, passwordHash: null },
    data: { passwordHash: hash, passwordIsTemporary: false },
  });
  return changed.count > 0;
}

// ── the editor letting a rider back in ───────────────────────────────────

export interface RiderFound {
  shown_as: string;
  home_city: string | null;
  bike: string | null;
  since: string;
  trips: number;
  facts: number;
  uses_google: boolean;
  has_password: boolean;
}

export type FindRiderResult = { ok: true; rider: RiderFound } | { ok: false; reason: "no-account" | "is-editor" };

async function riderRow(emailTyped: string): Promise<(UserData & { sessionVersion: number }) | null> {
  return db().user.findUnique({ where: { email: normalEmail(emailTyped) }, include: WITH_ACCOUNTS });
}

/** What the editor sees of a rider who says they are locked out, to help check who is asking. */
export async function findRider(emailTyped: string): Promise<FindRiderResult> {
  const row = await riderRow(emailTyped);
  if (!row) return { ok: false, reason: "no-account" };
  if (editors().includes(row.email)) return { ok: false, reason: "is-editor" };
  const [led, joined, facts] = await Promise.all([
    db().trip.count({ where: { leaderId: row.id, status: { not: "withdrawn" } } }),
    db().tripMember.count({ where: { userId: row.id, status: "accepted" } }),
    db().factReport.count({ where: { userId: row.id, status: "applied" } }),
  ]);
  return {
    ok: true,
    rider: {
      shown_as: shortName(row.name),
      home_city: row.homeCity,
      bike: row.bike,
      since: asMoment(row.createdAt),
      trips: led + joined,
      facts,
      uses_google: row.accounts.some((a) => a.provider === "google"),
      has_password: row.passwordHash !== null,
    },
  };
}

// Short words that are easy to say aloud and hard to mishear. Three of them and four digits make a one-time password.
const WORDS = [
  "nadi", "kesar", "pahad", "sadak", "chai", "dhaba", "tara", "badal", "barf", "dhoop", "rasta", "gaon",
  "pul", "ghati", "jheel", "mitti", "patta", "phool", "megh", "suraj", "chand", "hawa", "pani", "neem",
  "aam", "kela", "moti", "sona", "loha", "tamba", "resham", "kapas", "haldi", "mirch", "namak", "gud",
  "roti", "dal", "kheer", "lassi", "topi", "jhola", "rassi", "diya", "ghanta", "dhol", "bansi", "sitar",
  "mor", "hiran", "bagh", "hathi", "tota", "maina", "koyal", "titli", "machli", "kachua", "ghoda", "unt",
  "naav", "rail", "gaadi", "pahiya",
] as const;

function oneTimePassword(): string {
  const word = () => WORDS[randomInt(WORDS.length)] ?? "nadi";
  return `${word()}-${word()}-${word()}-${String(randomInt(10_000)).padStart(4, "0")}`;
}

export type OneTimeResult = { ok: true; password: string } | { ok: false; reason: "no-account" | "is-editor" };

/**
 * The editor lets a locked-out rider back in. The password is given back once, to be passed on by hand,
 * and is never kept as typed. The rider is logged out everywhere and any rest after wrong tries is cleared.
 * For a rider who uses Google, this adds a password to the account; Google still works as well.
 */
export async function setOneTimePassword(emailTyped: string): Promise<OneTimeResult> {
  const row = await riderRow(emailTyped);
  if (!row) return { ok: false, reason: "no-account" };
  if (editors().includes(row.email)) return { ok: false, reason: "is-editor" };
  const password = oneTimePassword();
  const hash = await hashPassword(password);
  await together(async (tx) => {
    await tx.user.update({
      where: { id: row.id },
      data: { passwordHash: hash, passwordIsTemporary: true, sessionVersion: { increment: 1 } },
    });
    await tx.loginAttempt.deleteMany({ where: { email: row.email } });
  });
  return { ok: true, password };
}

// ── the rider's own details ──────────────────────────────────────────────

/** Also finishes the profile of a rider who came in through Google: that is only a home city being given. */
export async function updateProfile(
  userId: string,
  input: { name: string; homeCity: string; bike: string | null },
): Promise<void> {
  await db().user.update({
    where: { id: userId },
    data: { name: input.name.trim(), homeCity: input.homeCity.trim(), bike: input.bike?.trim() || null },
  });
}

/**
 * Remove a person and keep the facts.
 * Their trips and requests go. Reports they sent stay, with no name on them.
 */
export async function deleteAccount(userId: string, handTo: Record<string, string> = {}): Promise<void> {
  await together(async (tx) => {
    // A trip the rider leads goes to the rider they named, if that rider is going on it. Otherwise it goes with them.
    for (const [tripId, riderId] of Object.entries(handTo)) {
      const going = await tx.tripMember.findFirst({ where: { tripId, userId: riderId, status: "accepted" }, select: { userId: true } });
      const mine = await tx.trip.findFirst({ where: { id: tripId, leaderId: userId }, select: { id: true } });
      if (!going || !mine) continue;
      await tx.trip.update({ where: { id: tripId }, data: { leaderId: riderId } });
      await tx.tripMember.delete({ where: { tripId_userId: { tripId, userId: riderId } } });
    }
    await tx.factReport.updateMany({ where: { userId }, data: { name: null } });
    await tx.tripReport.updateMany({ where: { userId }, data: { name: null } });
    // Google links, trips led, requests and flags go with the row.
    await tx.user.delete({ where: { id: userId } });
  });
  await endSession();
}

/** Everything held about one rider, for them to take away. Never a password, scrambled or not. */
export async function everythingAbout(userId: string): Promise<Record<string, unknown>> {
  const user = await db().user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      homeCity: true,
      bike: true,
      createdAt: true,
      passwordRemovedAt: true,
      accounts: { select: { provider: true, providerAccountId: true, createdAt: true } },
    },
  });
  if (!user) return {};
  const { accounts, ...details } = user;
  const [led, asked, facts, reports] = await Promise.all([
    db().trip.findMany({ where: { leaderId: userId } }),
    db().tripMember.findMany({ where: { userId } }),
    db().factReport.findMany({ where: { userId } }),
    db().tripReport.findMany({ where: { userId } }),
  ]);
  return {
    taken_on: new Date().toISOString(),
    your_details: details,
    ways_you_log_in: accounts,
    trips_you_lead: led,
    trips_you_asked_to_join: asked,
    facts_you_reported: facts,
    trip_reports_you_sent: reports,
  };
}
