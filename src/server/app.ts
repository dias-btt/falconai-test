import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { DatabaseSync } from 'node:sqlite';
import express from 'express';
import type { ErrorRequestHandler } from 'express';
import { schemaVersion } from './database.js';

export function createApp(db: DatabaseSync, clientDirectory?: string) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '16kb' }));

  app.get('/api/health', (_request, response) => {
    db.prepare('SELECT 1').get();
    response.set('Cache-Control', 'no-store').json({ status: 'ok', database: 'ok', schemaVersion: schemaVersion(db) });
  });

  app.use('/api', (_request, response) => {
    response.status(404).json({ error: 'API endpoint not found.' });
  });

  if (clientDirectory) {
    const indexFile = join(clientDirectory, 'index.html');
    if (!existsSync(indexFile)) throw new Error('Client build is missing. Run npm run build before npm start.');
    app.use(express.static(clientDirectory));
    app.get('/', (_request, response) => { response.sendFile(indexFile); });
  }

  app.use((_request, response) => {
    response.status(404).json({ error: 'Not found.' });
  });

  const handleError: ErrorRequestHandler = (error: unknown, _request, response, _next) => {
    if (error instanceof Error && 'type' in error && error.type === 'entity.too.large') {
      response.status(413).json({ error: 'Request body is too large.' });
      return;
    }
    if (error instanceof SyntaxError && 'type' in error && error.type === 'entity.parse.failed') {
      response.status(400).json({ error: 'Request body must be valid JSON.' });
      return;
    }
    console.error(error);
    response.status(500).json({ error: 'An unexpected server error occurred.' });
  };
  app.use(handleError);
  return app;
}
