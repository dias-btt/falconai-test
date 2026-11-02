import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { DatabaseSync } from 'node:sqlite';
import { afterEach, describe, expect, it } from 'vitest';
import { openDatabase, schemaVersion } from '../src/server/database.js';

describe('SQLite persistence and schema', () => {
  const directories: string[] = [];
  const databases: DatabaseSync[] = [];

  function open(filename = ':memory:') {
    const db = openDatabase(filename);
    databases.push(db);
    return db;
  }

  afterEach(() => {
    for (const db of databases.splice(0)) if (db.isOpen) db.close();
    for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true });
  });

  function addEmployee(db: DatabaseSync) {
    db.prepare('INSERT INTO employees (id, name, created_at) VALUES (?, ?, ?)').run('employee-1', 'Alex Example', 1000);
  }

  it('initializes a nested database path and preserves records when reopened', () => {
    const directory = mkdtempSync(join(tmpdir(), 'shiftledger-'));
    directories.push(directory);
    const filename = join(directory, 'nested', 'test.sqlite');
    const first = open(filename);
    expect(schemaVersion(first)).toBe(1);
    addEmployee(first);
    first.close();

    const reopened = open(filename);
    expect(schemaVersion(reopened)).toBe(1);
    expect(reopened.prepare('SELECT * FROM employees').all()).toEqual([
      { id: 'employee-1', name: 'Alex Example', created_at: 1000 },
    ]);
  });

  it('enforces foreign keys on every connection', () => {
    const db = open();
    expect(() => db.prepare('INSERT INTO time_entries VALUES (?, ?, ?, ?, ?)')
      .run('entry-1', 'missing', 'Fictional task', 1000, null)).toThrow(/FOREIGN KEY/);
  });

  it('permits only one active timer per employee while retaining stopped entries', () => {
    const db = open();
    addEmployee(db);
    const insert = db.prepare('INSERT INTO time_entries VALUES (?, ?, ?, ?, ?)');
    insert.run('entry-1', 'employee-1', 'Fictional task', 1000, null);
    expect(() => insert.run('entry-2', 'employee-1', 'Another task', 2000, null)).toThrow(/UNIQUE/);
    db.prepare('UPDATE time_entries SET stopped_at = ? WHERE id = ?').run(2000, 'entry-1');
    insert.run('entry-2', 'employee-1', 'Another task', 2000, null);
    expect(db.prepare('SELECT COUNT(*) AS count FROM time_entries').get()?.count).toBe(2);
  });

  it('rejects negative duration at the database boundary', () => {
    const db = open();
    addEmployee(db);
    expect(() => db.prepare('INSERT INTO time_entries VALUES (?, ?, ?, ?, ?)')
      .run('entry-1', 'employee-1', 'Fictional task', 2000, 1000)).toThrow(/CHECK/);
  });

  it('refuses a newer schema without replacing existing data', () => {
    const directory = mkdtempSync(join(tmpdir(), 'shiftledger-'));
    directories.push(directory);
    const filename = join(directory, 'test.sqlite');
    const db = open(filename);
    addEmployee(db);
    db.exec('PRAGMA user_version = 999');
    db.close();

    expect(() => openDatabase(filename)).toThrow(/newer than this application/);
    // Inspect directly, without running the application's migrations.
    db.open();
    expect(schemaVersion(db)).toBe(999);
    expect(db.prepare('SELECT name FROM employees').get()?.name).toBe('Alex Example');
  });
});
