import { randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import { Router } from 'express';
import type { Employee } from '../shared/employees.js';
import { validateEmployeeName } from '../shared/employees.js';

export function listEmployees(db: DatabaseSync): Employee[] {
  return db.prepare('SELECT id, name, created_at AS createdAt FROM employees ORDER BY rowid').all() as unknown as Employee[];
}

export function employeeRoutes(db: DatabaseSync) {
  const router = Router();
  router.use((_request, response, next) => {
    response.set('Cache-Control', 'no-store');
    next();
  });

  router.get('/', (_request, response) => {
    response.json({ employees: listEmployees(db) });
  });

  router.post('/', (request, response) => {
    const body: unknown = request.body;
    const name = typeof body === 'object' && body !== null && !Array.isArray(body) && 'name' in body
      ? body.name : undefined;
    const validation = validateEmployeeName(name);
    if (!validation.ok) {
      response.status(400).json({ error: validation.error });
      return;
    }

    const employee: Employee = { id: randomUUID(), name: validation.name, createdAt: Date.now() };
    db.prepare('INSERT INTO employees (id, name, created_at) VALUES (?, ?, ?)')
      .run(employee.id, employee.name, employee.createdAt);
    response.status(201).json({ employee });
  });

  return router;
}
