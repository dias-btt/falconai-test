import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, it } from 'vitest';
import type { Employee } from '../src/shared/employees.js';
import type { TimeEntry, TimeReport } from '../src/shared/time.js';

let child: ChildProcess | undefined;
let directory: string | undefined;

async function stop() {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  const processToStop = child;
  await new Promise<void>((resolve) => {
    const timeout = setTimeout(() => processToStop.kill('SIGKILL'), 3000);
    processToStop.once('exit', () => { clearTimeout(timeout); resolve(); });
    processToStop.kill('SIGTERM');
  });
}

afterEach(async () => {
  await stop();
  if (directory) rmSync(directory, { recursive: true, force: true });
});

it('recovers employees, completed records, and an active timer after a real API process restart', async () => {
  directory = mkdtempSync(join(tmpdir(), 'shiftledger-restart-'));
  const probe = createServer();
  const port = await new Promise<number>((resolve, reject) => {
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const address = probe.address();
      if (!address || typeof address === 'string') { reject(new Error('No test port')); return; }
      probe.close(() => resolve(address.port));
    });
  });
  const origin = `http://127.0.0.1:${port}`;
  async function start() {
    child = spawn(process.execPath, ['--import', 'tsx', 'src/server/index.ts'], {
      cwd: process.cwd(),
      env: { ...process.env, PORT: String(port), HOST: '127.0.0.1', DATABASE_PATH: join(directory!, 'test.sqlite') },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    await new Promise<void>((resolve, reject) => {
      let output = '';
      const timeout = setTimeout(() => reject(new Error(`Server readiness timeout: ${output}`)), 5000);
      child!.once('error', error => { clearTimeout(timeout); reject(error); });
      child!.once('exit', code => { clearTimeout(timeout); reject(new Error(`Server exited ${code}: ${output}`)); });
      child!.stderr?.on('data', chunk => { output += String(chunk); });
      child!.stdout?.on('data', chunk => {
        output += String(chunk);
        if (output.includes(`http://127.0.0.1:${port}`)) { clearTimeout(timeout); resolve(); }
      });
    });
  }
  async function api<T>(path: string, body?: object): Promise<T> {
    const response = await fetch(origin + path, {
      ...(body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(5000),
    });
    expect(response.ok).toBe(true);
    return await response.json() as T;
  }

  await start();
  const { employee } = await api<{ employee: Employee }>('/api/employees', { name: 'Restart Example' });
  const { entry: completed } = await api<{ entry: TimeEntry }>(`/api/employees/${employee.id}/timer/start`, { description: 'First task' });
  const { entry: stopped } = await api<{ entry: TimeEntry }>(`/api/time-entries/${completed.id}/stop`, {});
  const { entry: active } = await api<{ entry: TimeEntry }>(`/api/employees/${employee.id}/timer/start`, { description: 'Ongoing task' });
  await stop();
  await start();
  expect((await api<{ employees: Employee[] }>('/api/employees')).employees).toEqual([employee]);
  expect((await api<{ entry: TimeEntry }>(`/api/employees/${employee.id}/timer`)).entry).toEqual(active);
  const { entry: recovered } = await api<{ entry: TimeEntry }>(`/api/time-entries/${active.id}/stop`, {});
  expect(recovered.startedAt).toBe(active.startedAt);
  expect(recovered.stoppedAt).toBeGreaterThanOrEqual(active.startedAt);
  const report = await api<TimeReport>(`/api/employees/${employee.id}/report?from=${completed.startedAt - 1}&to=${recovered.stoppedAt! + 1}`);
  expect(report.entries).toHaveLength(2);
  expect(report.totalMs).toBe(stopped.stoppedAt! - stopped.startedAt + recovered.stoppedAt! - recovered.startedAt);
}, 15000);
