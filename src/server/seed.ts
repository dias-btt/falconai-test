import { readConfig } from './config.js';
import { openDatabase } from './database.js';
import { seedEmployees } from './seed-employees.js';

const { databasePath } = readConfig();
const db = openDatabase(databasePath);
try {
  const added = seedEmployees(db);
  console.log(`Added ${added} fictional employee${added === 1 ? '' : 's'} to ${databasePath}.`);
} finally {
  db.close();
}
