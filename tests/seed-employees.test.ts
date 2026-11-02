import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { openDatabase } from '../src/server/database.js';
import { listEmployees } from '../src/server/employees.js';
import { seedEmployees } from '../src/server/seed-employees.js';

describe('optional fictional employee seed', () => {
  let db: ReturnType<typeof openDatabase>;
  beforeEach(() => { db = openDatabase(':memory:'); });
  afterEach(() => { db.close(); });

  it('can be repeated without duplicating samples or changing existing records', () => {
    db.prepare('INSERT INTO employees VALUES (?, ?, ?)').run('existing-employee', 'Alex Example', 1000);
    expect(seedEmployees(db)).toBe(3);
    const first = listEmployees(db);
    expect(first.map(employee => employee.name)).toEqual(['Alex Example', 'Alex Example', 'Sam Sample', 'Jordan Demo']);
    expect(seedEmployees(db)).toBe(0);
    expect(listEmployees(db)).toEqual(first);
    expect(first[0]).toEqual({ id: 'existing-employee', name: 'Alex Example', createdAt: 1000 });
  });

  it('rolls back the whole seed when an insert fails', () => {
    db.exec(`CREATE TRIGGER fail_second_sample BEFORE INSERT ON employees
      WHEN NEW.id = 'demo-sam-sample' BEGIN SELECT RAISE(ABORT, 'test failure'); END;`);
    expect(() => seedEmployees(db)).toThrow(/test failure/);
    expect(listEmployees(db)).toEqual([]);
    db.exec('DROP TRIGGER fail_second_sample');
    expect(seedEmployees(db)).toBe(3);
  });
});
