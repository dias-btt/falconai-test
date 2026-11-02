import type { DatabaseSync } from 'node:sqlite';

const fictionalEmployees = [
  { id: 'demo-alex-example', name: 'Alex Example' },
  { id: 'demo-sam-sample', name: 'Sam Sample' },
  { id: 'demo-jordan-demo', name: 'Jordan Demo' },
];

// Stable IDs make the optional seed safe to repeat without changing existing rows.
export function seedEmployees(db: DatabaseSync): number {
  db.exec('BEGIN IMMEDIATE');
  try {
    const insert = db.prepare(`
      INSERT INTO employees (id, name, created_at) VALUES (?, ?, ?)
      ON CONFLICT(id) DO NOTHING
    `);
    const createdAt = Date.now();
    let added = 0;
    for (const employee of fictionalEmployees) {
      added += Number(insert.run(employee.id, employee.name, createdAt).changes);
    }
    db.exec('COMMIT');
    return added;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
