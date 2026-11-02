import type { Employee } from '../shared/employees.js';

async function readResponse(response: Response): Promise<unknown> {
  const body: unknown = await response.json();
  if (!response.ok) {
    const message = typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string'
      ? body.error : 'The request could not be completed.';
    throw new Error(message);
  }
  return body;
}

export async function fetchEmployees(signal: AbortSignal): Promise<Employee[]> {
  const response = await fetch('/api/employees', { signal, cache: 'no-store' });
  const body = await readResponse(response) as { employees: Employee[] };
  return body.employees;
}

export async function addEmployee(name: string): Promise<Employee> {
  const response = await fetch('/api/employees', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
    signal: AbortSignal.timeout(10000),
  });
  const body = await readResponse(response) as { employee: Employee };
  return body.employee;
}
