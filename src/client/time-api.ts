import type { TimeReport, TimerState } from '../shared/time.js';

export async function timeRequest<T extends TimerState | TimeReport>(path: string, body?: object): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method: body ? 'POST' : 'GET',
    ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
    cache: 'no-store',
    signal: AbortSignal.timeout(10000),
  });
  const result = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(result.error ?? 'The request could not be completed.');
  return result;
}
