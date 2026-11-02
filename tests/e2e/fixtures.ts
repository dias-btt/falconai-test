import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test as base, expect } from '@playwright/test';

interface TestApp { url: string; databasePath: string }

export const test = base.extend<{ app: TestApp }>({
  // Playwright requires destructuring the fixture dependencies, even when empty.
  // eslint-disable-next-line no-empty-pattern
  app: async ({}, use) => {
    const directory = mkdtempSync(join(tmpdir(), 'shiftledger-browser-'));
    const databasePath = join(directory, 'test.sqlite');
    const probe = createServer();
    const port = await new Promise<number>((resolve, reject) => {
      probe.once('error', reject);
      probe.listen(0, '127.0.0.1', () => {
        const address = probe.address();
        if (!address || typeof address === 'string') { reject(new Error('No browser test port')); return; }
        probe.close(() => resolve(address.port));
      });
    });
    const child = spawn(process.execPath, ['dist/server/index.js'], {
      env: { ...process.env, HOST: '127.0.0.1', PORT: String(port), DATABASE_PATH: databasePath },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    try {
      await new Promise<void>((resolve, reject) => {
        let output = '';
        const timeout = setTimeout(() => reject(new Error(`Startup timed out: ${output}`)), 8000);
        child.once('error', error => { clearTimeout(timeout); reject(error); });
        child.once('exit', code => { clearTimeout(timeout); reject(new Error(`Server exited ${code}: ${output}`)); });
        child.stderr.on('data', chunk => { output += String(chunk); });
        child.stdout.on('data', chunk => {
          output += String(chunk);
          if (output.includes(`http://127.0.0.1:${port}`)) { clearTimeout(timeout); resolve(); }
        });
      });
      await use({ url: `http://127.0.0.1:${port}`, databasePath });
    } finally {
      if (child.exitCode === null && child.signalCode === null) {
        await new Promise<void>(resolve => {
          const timeout = setTimeout(() => child.kill('SIGKILL'), 3000);
          child.once('exit', () => { clearTimeout(timeout); resolve(); });
          child.kill('SIGTERM');
        });
      }
      rmSync(directory, { recursive: true, force: true });
    }
  },
});

export { expect };
