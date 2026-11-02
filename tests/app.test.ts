import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/server/app.js';
import { openDatabase } from '../src/server/database.js';

describe('HTTP application', () => {
  let db: ReturnType<typeof openDatabase>;
  const directories: string[] = [];

  beforeEach(() => { db = openDatabase(':memory:'); });
  afterEach(() => {
    if (db.isOpen) db.close();
    for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('checks the database and returns uncached health information', async () => {
    const response = await request(createApp(db)).get('/api/health').expect(200);
    expect(response.body).toEqual({ status: 'ok', database: 'ok', schemaVersion: 1 });
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.headers['x-powered-by']).toBeUndefined();
  });

  it('does not claim readiness when the database is closed', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const app = createApp(db);
    db.close();
    const response = await request(app).get('/api/health').expect(500);
    expect(response.body).toEqual({ error: 'An unexpected server error occurred.' });
    expect(log).toHaveBeenCalledOnce();
  });

  it('returns JSON 404s for unknown API endpoints', async () => {
    const response = await request(createApp(db)).get('/api/missing').expect(404);
    expect(response.body).toEqual({ error: 'API endpoint not found.' });
  });

  it('rejects malformed JSON as a client error', async () => {
    const response = await request(createApp(db)).post('/api/missing')
      .set('Content-Type', 'application/json').send('{').expect(400);
    expect(response.body.error).toBe('Request body must be valid JSON.');
  });

  it('returns 413 for a JSON body larger than the configured limit', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const response = await request(createApp(db)).post('/api/missing')
      .send({ description: 'x'.repeat(17000) }).expect(413);
    expect(response.body).toEqual({ error: 'Request body is too large.' });
  });

  it('serves a client build without returning HTML for missing API or asset paths', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'shiftledger-client-'));
    directories.push(directory);
    writeFileSync(join(directory, 'index.html'), '<!doctype html><title>ShiftLedger test</title>');
    const app = createApp(db, directory);
    const page = await request(app).get('/').expect(200).expect('Content-Type', /html/);
    expect(page.text).toContain('ShiftLedger test');
    await request(app).get('/api/missing').expect(404).expect('Content-Type', /json/);
    await request(app).get('/assets/missing.js').expect(404);
  });

  it('fails clearly when the production client has not been built', () => {
    const directory = mkdtempSync(join(tmpdir(), 'shiftledger-empty-'));
    directories.push(directory);
    expect(() => createApp(db, directory)).toThrow(/npm run build/);
  });
});
