import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { readConfig } from './config.js';
import { openDatabase } from './database.js';

const config = readConfig();
const db = openDatabase(config.databasePath);
// Compiled entry lives in dist/server; development runs src/server directly.
const isBuilt = fileURLToPath(import.meta.url).endsWith('.js');
const clientDirectory = isBuilt ? fileURLToPath(new URL('../client/', import.meta.url)) : undefined;

try {
  const app = createApp(db, clientDirectory);
  const server = app.listen(config.port, config.host, () => {
    console.log(`ShiftLedger API${isBuilt ? ' + web' : ''}: http://${config.host}:${config.port}`);
  });

  server.on('error', (error) => {
    console.error(`Could not start server: ${error.message}`);
    db.close();
    process.exitCode = 1;
  });

  let stopping = false;
  const shutdown = () => {
    if (stopping) return;
    stopping = true;
    const timeout = setTimeout(() => process.exit(1), 5000);
    timeout.unref();
    server.close(() => {
      clearTimeout(timeout);
      db.close();
    });
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
} catch (error) {
  db.close();
  throw error;
}
