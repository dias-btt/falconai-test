import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/server/app.js';
import { openDatabase } from '../src/server/database.js';

describe('employee API', () => {
  let db: ReturnType<typeof openDatabase>;
  const directories: string[] = [];

  beforeEach(() => { db = openDatabase(':memory:'); });
  afterEach(() => {
    if (db.isOpen) db.close();
    for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true });
  });

  it('returns an empty list for a new workspace without caching it', async () => {
    const response = await request(createApp(db)).get('/api/employees').expect(200);
    expect(response.body).toEqual({ employees: [] });
    expect(response.headers['cache-control']).toBe('no-store');
  });

  it('trims names, generates identity/timestamps on the server, and lists saved records', async () => {
    const app = createApp(db);
    const before = Date.now();
    const response = await request(app).post('/api/employees')
      .send({ name: '  Alex Example \t', id: 'client-supplied', createdAt: 0 }).expect(201);
    const employee = response.body.employee;
    expect(employee.name).toBe('Alex Example');
    expect(employee.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(employee.createdAt).toBeGreaterThanOrEqual(before);
    expect(employee.createdAt).toBeLessThanOrEqual(Date.now());
    const listed = await request(app).get('/api/employees').expect(200);
    expect(listed.body.employees).toEqual([employee]);
  });

  it.each([
    ['missing name', {}],
    ['null', { name: null }],
    ['number', { name: 42 }],
    ['object', { name: { text: 'Alex Example' } }],
    ['array name', { name: ['Alex Example'] }],
    ['array body', [{ name: 'Alex Example' }]],
    ['empty', { name: '' }],
    ['whitespace', { name: ' \t\n\u2003 ' }],
    ['too long', { name: 'a'.repeat(101) }],
    ['embedded null', { name: 'Alex\0Example' }],
  ])('rejects %s without writing a row', async (_label, body) => {
    const app = createApp(db);
    const response = await request(app).post('/api/employees').send(body).expect(400);
    expect(response.body.error).toEqual(expect.any(String));
    expect((await request(app).get('/api/employees')).body.employees).toEqual([]);
  });

  it('rejects a missing body', async () => {
    await request(createApp(db)).post('/api/employees').expect(400);
    expect(db.prepare('SELECT count(*) AS count FROM employees').get()?.count).toBe(0);
  });

  it('accepts the 100-character boundary after trimming, including supplementary Unicode letters', async () => {
    const app = createApp(db);
    for (const name of ['a'.repeat(100), '𐐀'.repeat(100)]) {
      const response = await request(app).post('/api/employees').send({ name: `  ${name}  ` }).expect(201);
      expect(response.body.employee.name).toBe(name);
    }
    await request(app).post('/api/employees').send({ name: '𐐀'.repeat(101) }).expect(400);
    expect((await request(app).get('/api/employees')).body.employees).toHaveLength(2);
  });

  it('allows duplicate names with distinct IDs and keeps insertion order', async () => {
    const app = createApp(db);
    const first = await request(app).post('/api/employees').send({ name: 'Sam Sample' }).expect(201);
    const second = await request(app).post('/api/employees').send({ name: 'Sam Sample' }).expect(201);
    expect(first.body.employee.id).not.toBe(second.body.employee.id);
    expect((await request(app).get('/api/employees')).body.employees)
      .toEqual([first.body.employee, second.body.employee]);
  });

  it('stores quotes and SQL-like text as a name rather than executing it', async () => {
    const app = createApp(db);
    const name = "O'Example'); DROP TABLE employees; --";
    const created = await request(app).post('/api/employees').send({ name }).expect(201);
    expect(created.body.employee.name).toBe(name);
    expect((await request(app).get('/api/employees')).body.employees).toEqual([created.body.employee]);
  });

  it('preserves API-created employees after closing and reopening a file-backed database', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'shiftledger-employees-'));
    directories.push(directory);
    const filename = join(directory, 'test.sqlite');
    db.close();
    db = openDatabase(filename);
    const created = await request(createApp(db)).post('/api/employees').send({ name: 'Jordan Demo' }).expect(201);
    db.close();
    db = openDatabase(filename);
    const response = await request(createApp(db)).get('/api/employees').expect(200);
    expect(response.body.employees).toEqual([created.body.employee]);
  });
});
