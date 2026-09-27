import "server-only";

import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";

/*
  Accounts, trips and reports live in one SQLite file on this server's disk.
  Nothing here talks to any outside service.

  Where the file lives: MEEL_DATA_DIR if it is set, otherwise .data/ beside the app.
  That folder is never committed.

  The tables are created here the first time the app runs. To change their shape later,
  add a numbered step to MIGRATIONS below; never edit a step that has already run.
*/

const MIGRATIONS: string[] = [
  `
  CREATE TABLE users (
    id            TEXT PRIMARY KEY,
    email         TEXT NOT NULL UNIQUE,
    name          TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    home_city     TEXT NOT NULL,
    bike          TEXT,
    created_at    TEXT NOT NULL
  );

  CREATE TABLE sessions (
    token_hash TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
  );
  CREATE INDEX sessions_user ON sessions(user_id);

  CREATE TABLE login_attempts (
    email TEXT NOT NULL,
    at    TEXT NOT NULL
  );
  CREATE INDEX login_attempts_email ON login_attempts(email, at);

  CREATE TABLE trips (
    id           TEXT PRIMARY KEY,
    route_slug   TEXT NOT NULL,
    leader_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    leaves_on    TEXT NOT NULL,
    back_on      TEXT NOT NULL,
    from_city    TEXT NOT NULL,
    places       INTEGER NOT NULL,
    pace         TEXT NOT NULL,
    who_can_join TEXT NOT NULL,
    asks         TEXT,
    chat_link    TEXT,
    nights       TEXT NOT NULL DEFAULT '[]',
    is_company   INTEGER NOT NULL DEFAULT 0,
    status       TEXT NOT NULL,
    created_at   TEXT NOT NULL
  );
  CREATE INDEX trips_route ON trips(route_slug, leaves_on);
  CREATE INDEX trips_leader ON trips(leader_id);

  CREATE TABLE trip_members (
    trip_id     TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status      TEXT NOT NULL,
    note        TEXT,
    asked_at    TEXT NOT NULL,
    answered_at TEXT,
    PRIMARY KEY (trip_id, user_id)
  );
  CREATE INDEX trip_members_user ON trip_members(user_id);

  CREATE TABLE trip_flags (
    trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason  TEXT NOT NULL,
    note    TEXT,
    at      TEXT NOT NULL,
    PRIMARY KEY (trip_id, user_id)
  );

  CREATE TABLE fact_reports (
    id          TEXT PRIMARY KEY,
    route_slug  TEXT NOT NULL,
    fact_id     TEXT NOT NULL,
    fact_title  TEXT NOT NULL,
    kind        TEXT NOT NULL,
    change_kind TEXT,
    note        TEXT,
    seen_on     TEXT NOT NULL,
    name        TEXT,
    user_id     TEXT REFERENCES users(id) ON DELETE SET NULL,
    status      TEXT NOT NULL,
    created_at  TEXT NOT NULL,
    decided_at  TEXT
  );
  CREATE INDEX fact_reports_route ON fact_reports(route_slug, status);

  CREATE TABLE trip_reports (
    id         TEXT PRIMARY KEY,
    route_slug TEXT NOT NULL,
    month      TEXT NOT NULL,
    bike       TEXT NOT NULL,
    body       TEXT NOT NULL,
    name       TEXT,
    user_id    TEXT REFERENCES users(id) ON DELETE SET NULL,
    status     TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX trip_reports_route ON trip_reports(route_slug);

  CREATE TABLE suggestions (
    id         TEXT PRIMARY KEY,
    place      TEXT NOT NULL,
    note       TEXT,
    name       TEXT,
    created_at TEXT NOT NULL
  );
  `,
  // Step 2. A password set by the editor for a rider who is locked out is a one-time one.
  `
  ALTER TABLE users ADD COLUMN password_is_temporary INTEGER NOT NULL DEFAULT 0;
  `,
];

type Row = Record<string, SQLInputValue>;

let handle: DatabaseSync | null = null;

function open(): DatabaseSync {
  if (handle) return handle;
  const dir = process.env.MEEL_DATA_DIR ?? path.join(process.cwd(), ".data");
  mkdirSync(dir, { recursive: true });
  const db = new DatabaseSync(path.join(dir, "meel.sqlite"));
  db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 4000;");
  db.exec("CREATE TABLE IF NOT EXISTS schema_steps (step INTEGER PRIMARY KEY, ran_at TEXT NOT NULL)");
  const done = db.prepare("SELECT COALESCE(MAX(step), 0) AS step FROM schema_steps").get() as { step: number };
  for (let i = done.step; i < MIGRATIONS.length; i += 1) {
    const sql = MIGRATIONS[i];
    if (!sql) continue;
    db.exec("BEGIN");
    try {
      db.exec(sql);
      db.prepare("INSERT INTO schema_steps (step, ran_at) VALUES (?, ?)").run(i + 1, new Date().toISOString());
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }
  handle = db;
  return db;
}

export function all<T>(sql: string, ...params: SQLInputValue[]): T[] {
  return open().prepare(sql).all(...params) as unknown as T[];
}

export function one<T>(sql: string, ...params: SQLInputValue[]): T | null {
  const row = open().prepare(sql).get(...params) as unknown as T | undefined;
  return row ?? null;
}

export function run(sql: string, ...params: SQLInputValue[]): number {
  return Number(open().prepare(sql).run(...params).changes);
}

/** Several changes that must all happen, or none. */
export function together<T>(work: () => T): T {
  const db = open();
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = work();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function newId(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 16);
}

export function now(): string {
  return new Date().toISOString();
}

export type { Row };
