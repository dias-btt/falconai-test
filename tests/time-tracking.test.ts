import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/server/app.js';
import { openDatabase } from '../src/server/database.js';
import { formatDuration, reportBounds } from '../src/shared/time.js';

describe('timer operations and reports', () => {
  let db: ReturnType<typeof openDatabase>;
  let app: ReturnType<typeof createApp>;
  let clock: number;
  beforeEach(() => {
    db = openDatabase(':memory:');
    db.prepare('INSERT INTO employees VALUES (?, ?, ?)').run('alex', 'Alex Example', 0);
    db.prepare('INSERT INTO employees VALUES (?, ?, ?)').run('sam', 'Sam Sample', 0);
    clock = 1000;
    app = createApp(db, undefined, () => clock);
  });
  afterEach(() => db.close());

  it('starts, stops idempotently, then restarts as a separate entry without losing history', async () => {
    const first = await request(app).post('/api/employees/alex/timer/start')
      .send({ description: '  Fictional task  ', startedAt: 999 }).expect(201);
    expect(first.body.entry).toMatchObject({ employeeId: 'alex', description: 'Fictional task', startedAt: 1000, stoppedAt: null });
    clock = 5000;
    const stopped = await request(app).post(`/api/time-entries/${first.body.entry.id}/stop`).expect(200);
    expect(stopped.body.entry.stoppedAt).toBe(5000);
    clock = 6000;
    const repeated = await request(app).post(`/api/time-entries/${first.body.entry.id}/stop`).expect(200);
    expect(repeated.body.entry).toEqual(stopped.body.entry);
    expect((await request(app).get('/api/employees/alex/timer')).body.entry).toBeNull();
    const restarted = await request(app).post('/api/employees/alex/timer/start').send({ description: 'Next task' }).expect(201);
    expect(restarted.body.entry.id).not.toBe(first.body.entry.id);
    expect(restarted.body.entry.startedAt).toBe(6000);
    const report = await request(app).get('/api/employees/alex/report?from=0&to=10000').expect(200);
    expect(report.body.totalMs).toBe(4000);
    expect(report.body.entries).toHaveLength(1);
    expect(report.body.entries[0].id).toBe(first.body.entry.id);
  });

  it('allows only one of two simultaneous starts, while another employee can run independently', async () => {
    const results = await Promise.all([1, 2].map(() => request(app).post('/api/employees/alex/timer/start').send({ description: 'Task' })));
    expect(results.map(result => result.status).sort()).toEqual([201, 409]);
    await request(app).post('/api/employees/sam/timer/start').send({ description: 'Other task' }).expect(201);
    expect(db.prepare('SELECT COUNT(*) AS count FROM time_entries').get()?.count).toBe(2);
  });

  it.each([undefined, '', ' \t\n ', 'x'.repeat(501), 'x\0y', 42])('rejects invalid task descriptions without writing: %j', async description => {
    await request(app).post('/api/employees/alex/timer/start').send({ description }).expect(400);
    expect(db.prepare('SELECT COUNT(*) AS count FROM time_entries').get()?.count).toBe(0);
  });

  it('rejects a stop before the start and leaves the timer active', async () => {
    const started = await request(app).post('/api/employees/alex/timer/start').send({ description: 'Task' });
    clock = 999;
    await request(app).post(`/api/time-entries/${started.body.entry.id}/stop`).expect(409);
    expect((await request(app).get('/api/employees/alex/timer')).body.entry.stoppedAt).toBeNull();
  });

  it('returns 404 for unknown employees and entries', async () => {
    await request(app).get('/api/employees/missing/timer').expect(404);
    await request(app).post('/api/employees/missing/timer/start').send({ description: 'Task' }).expect(404);
    await request(app).post('/api/time-entries/missing/stop').expect(404);
    await request(app).get('/api/employees/missing/report?from=0&to=1000').expect(404);
  });

  it('returns an empty report with a zero total', async () => {
    const response = await request(app).get('/api/employees/alex/report?from=0&to=10000').expect(200);
    expect(response.body).toEqual({ entries: [], totalMs: 0, from: 0, to: 10000 });
  });

  it('clips overlap at either/both edges and excludes active timers, boundary-only entries, and other employees', async () => {
    const insert = db.prepare('INSERT INTO time_entries VALUES (?, ?, ?, ?, ?)');
    for (const [id, start, stop] of [
      ['left', -1000, 1000], ['inside', 1000, 3000], ['right', 9000, 11000],
      ['both', -1000, 11000], ['before', -1000, 0], ['after', 10000, 12000],
    ] as const) insert.run(id, 'alex', id, start, stop);
    insert.run('running', 'alex', 'Running', 1000, null);
    insert.run('other', 'sam', 'Other employee', 0, 10000);
    const response = await request(app).get('/api/employees/alex/report?from=0&to=10000').expect(200);
    expect(response.body.totalMs).toBe(14000);
    expect(Object.fromEntries(response.body.entries.map((entry: { id: string; durationMs: number }) => [entry.id, entry.durationMs])))
      .toEqual({ left: 1000, inside: 2000, right: 1000, both: 10000 });
  });

  it.each(['', '?from=10&to=10', '?from=20&to=10', '?from=oops&to=100', '?from=1.5&to=100', '?from=0&to=99999999999999999', '?from=0&from=1&to=10'])(
    'rejects invalid report bounds: %s', async query => {
      await request(app).get(`/api/employees/alex/report${query}`).expect(400);
    });
});

describe('time display and calendar boundaries', () => {
  it('keeps totals over 24 hours and rounds only the final display', () => {
    expect(formatDuration(90061999)).toBe('25:01:01');
    expect(formatDuration(0)).toBe('00:00:00');
  });

  it('uses local calendar days across daylight-saving changes', () => {
    const previous = process.env.TZ;
    process.env.TZ = 'America/New_York';
    try {
      const spring = reportBounds('2026-03-08', '2026-03-08');
      const autumn = reportBounds('2026-11-01', '2026-11-01');
      expect(spring.to - spring.from).toBe(23 * 3600000);
      expect(autumn.to - autumn.from).toBe(25 * 3600000);
    } finally {
      if (previous === undefined) delete process.env.TZ;
      else process.env.TZ = previous;
    }
  });

  it('rejects reversed and invalid calendar dates', () => {
    expect(() => reportBounds('2026-02-30', '2026-03-01')).toThrow();
    expect(() => reportBounds('2026-11-03', '2026-11-02')).toThrow();
    expect(() => reportBounds('', '2026-11-02')).toThrow();
  });
});
