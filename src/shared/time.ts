export interface TimeEntry {
  id: string;
  employeeId: string;
  description: string;
  startedAt: number;
  stoppedAt: number | null;
}

export interface TimerState { entry: TimeEntry | null; serverTime: number }
export interface TimeReport {
  entries: (TimeEntry & { durationMs: number })[];
  totalMs: number;
  from: number;
  to: number;
}

export function validateDescription(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return 'Describe the task before starting a timer.';
  if (value.includes('\0')) return 'Task descriptions cannot contain null characters.';
  if (Array.from(value.trim()).length > 500) return 'Use 500 characters or fewer for the task.';
  return null;
}

export function formatDuration(milliseconds: number): string {
  const seconds = Math.floor(Math.max(0, milliseconds) / 1000);
  return [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60]
    .map(value => String(value).padStart(2, '0')).join(':');
}

export function localDateString(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// Calendar-day arithmetic preserves local dates across 23/25-hour DST days.
export function reportBounds(firstDay: string, lastDay: string): { from: number; to: number } {
  const start = new Date(`${firstDay}T00:00:00`);
  const end = new Date(`${lastDay}T00:00:00`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(firstDay) || !/^\d{4}-\d{2}-\d{2}$/.test(lastDay)
    || !Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())
    || localDateString(start) !== firstDay || localDateString(end) !== lastDay || start > end) {
    throw new Error('Choose valid dates with the start on or before the end.');
  }
  end.setDate(end.getDate() + 1);
  return { from: start.getTime(), to: end.getTime() };
}
