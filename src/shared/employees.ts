export interface Employee {
  id: string;
  name: string;
  createdAt: number;
}

type NameValidation = { ok: true; name: string } | { ok: false; error: string };

// Count Unicode code points, matching SQLite length(), rather than UTF-16 units.
export function validateEmployeeName(value: unknown): NameValidation {
  if (typeof value !== 'string') return { ok: false, error: 'Enter an employee name.' };
  const name = value.trim();
  if (name.length === 0) return { ok: false, error: 'Enter an employee name.' };
  if (name.includes('\0')) return { ok: false, error: 'Employee names cannot contain null characters.' };
  if (Array.from(name).length > 100) return { ok: false, error: 'Use 100 characters or fewer for the name.' };
  return { ok: true, name };
}
