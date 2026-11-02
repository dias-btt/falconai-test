import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

// Append migrations; never change a migration already used by a released app.
const migrations = [
  `
    CREATE TABLE employees (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 100),
      created_at INTEGER NOT NULL
    ) STRICT;

    CREATE TABLE time_entries (
      id TEXT PRIMARY KEY NOT NULL,
      employee_id TEXT NOT NULL REFERENCES employees(id),
      description TEXT NOT NULL CHECK (length(trim(description)) BETWEEN 1 AND 500),
      started_at INTEGER NOT NULL,
      stopped_at INTEGER CHECK (stopped_at IS NULL OR stopped_at >= started_at)
    ) STRICT;

    CREATE UNIQUE INDEX one_active_timer_per_employee
      ON time_entries(employee_id) WHERE stopped_at IS NULL;
    CREATE INDEX time_entries_employee_start ON time_entries(employee_id, started_at);
  `,
];

export function schemaVersion(db: DatabaseSync): number {
  const row = db.prepare('PRAGMA user_version').get();
  return Number(row?.user_version);
}

export function openDatabase(filename: string): DatabaseSync {
  if (filename !== ':memory:') mkdirSync(dirname(resolve(filename)), { recursive: true });
  const db = new DatabaseSync(filename);

  try {
    db.exec('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000; PRAGMA journal_mode = WAL;');
    // Take the write lock before reading the version so simultaneous startups
    // cannot apply the same migration twice.
    db.exec('BEGIN IMMEDIATE');
    try {
      const version = schemaVersion(db);
      if (version > migrations.length) {
        throw new Error('Database schema is newer than this application. Update the application.');
      }
      for (let index = version; index < migrations.length; index += 1) {
        db.exec(migrations[index]!);
        db.exec(`PRAGMA user_version = ${index + 1}`);
      }
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
    return db;
  } catch (error) {
    db.close();
    throw error;
  }
}
