import { randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import { Router } from 'express';
import type { TimeEntry, TimeReport } from '../shared/time.js';
import { validateDescription } from '../shared/time.js';

const columns = 'id, employee_id AS employeeId, description, started_at AS startedAt, stopped_at AS stoppedAt';

function getEntry(db: DatabaseSync, id: string): TimeEntry | undefined {
  return db.prepare(`SELECT ${columns} FROM time_entries WHERE id = ?`).get(id) as unknown as TimeEntry | undefined;
}

export function timeTrackingRoutes(db: DatabaseSync, now: () => number) {
  const router = Router();
  router.use((_request, response, next) => { response.set('Cache-Control', 'no-store'); next(); });

  router.use('/employees/:employeeId', (request, response, next) => {
    if (!db.prepare('SELECT 1 FROM employees WHERE id = ?').get(request.params.employeeId)) {
      response.status(404).json({ error: 'Employee not found.' });
      return;
    }
    next();
  });

  router.get('/employees/:employeeId/timer', (request, response) => {
    const entry = db.prepare(`SELECT ${columns} FROM time_entries WHERE employee_id = ? AND stopped_at IS NULL`)
      .get(request.params.employeeId) ?? null;
    response.json({ entry, serverTime: now() });
  });

  router.post('/employees/:employeeId/timer/start', (request, response) => {
    const body: unknown = request.body;
    const description = typeof body === 'object' && body !== null && 'description' in body ? body.description : undefined;
    const error = validateDescription(description);
    if (error || typeof description !== 'string') {
      response.status(400).json({ error });
      return;
    }
    const id = randomUUID();
    const startedAt = now();
    // One SQL statement plus the unique index makes concurrent starts safe,
    // including from separate server processes sharing this database.
    const result = db.prepare(`INSERT INTO time_entries (id, employee_id, description, started_at)
      SELECT ?, ?, ?, ? WHERE NOT EXISTS (
        SELECT 1 FROM time_entries WHERE employee_id = ? AND stopped_at IS NULL
      )`).run(id, request.params.employeeId, description.trim(), startedAt, request.params.employeeId);
    if (!result.changes) {
      response.status(409).json({ error: 'This employee already has a running timer. Refresh to see it.' });
      return;
    }
    response.status(201).json({ entry: getEntry(db, id), serverTime: startedAt });
  });

  router.post('/time-entries/:entryId/stop', (request, response) => {
    const entry = getEntry(db, request.params.entryId);
    if (!entry) { response.status(404).json({ error: 'Time entry not found.' }); return; }
    const stoppedAt = now();
    if (entry.stoppedAt === null) {
      if (stoppedAt < entry.startedAt) {
        response.status(409).json({ error: 'The server clock is earlier than the timer start. Correct the clock and retry.' });
        return;
      }
      db.prepare('UPDATE time_entries SET stopped_at = ? WHERE id = ? AND stopped_at IS NULL')
        .run(stoppedAt, entry.id);
    }
    response.json({ entry: getEntry(db, entry.id), serverTime: stoppedAt });
  });

  router.get('/employees/:employeeId/report', (request, response) => {
    const { from: rawFrom, to: rawTo } = request.query;
    const validTimestamp = (value: unknown): value is string => typeof value === 'string'
      && /^-?\d+$/.test(value) && Number.isSafeInteger(Number(value)) && Math.abs(Number(value)) <= 8640000000000000;
    if (!validTimestamp(rawFrom) || !validTimestamp(rawTo) || Number(rawFrom) >= Number(rawTo)) {
      response.status(400).json({ error: 'Provide valid millisecond timestamps with from earlier than to.' });
      return;
    }
    const from = Number(rawFrom);
    const to = Number(rawTo);
    const rows = db.prepare(`SELECT ${columns} FROM time_entries
      WHERE employee_id = ? AND stopped_at IS NOT NULL AND started_at < ? AND stopped_at > ?
      ORDER BY started_at DESC, rowid DESC`).all(request.params.employeeId, to, from) as unknown as TimeEntry[];
    const entries = rows.map(entry => ({
      ...entry, durationMs: Math.max(0, Math.min(entry.stoppedAt!, to) - Math.max(entry.startedAt, from)),
    }));
    const report: TimeReport = { entries, totalMs: entries.reduce((sum, entry) => sum + entry.durationMs, 0), from, to };
    response.json(report);
  });
  return router;
}
