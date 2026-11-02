import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { Employee } from '../shared/employees.js';
import type { TimeReport, TimerState } from '../shared/time.js';
import { formatDuration, localDateString, reportBounds, validateDescription } from '../shared/time.js';
import { timeRequest } from './time-api.js';

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Could not connect. Please try again.';
}

export function TimeWorkspace({ employee }: { employee: Employee }) {
  const [timer, setTimer] = useState<TimerState | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [task, setTask] = useState('');
  const [timerError, setTimerError] = useState('');
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const inFlight = useRef(false);
  const [firstDay, setFirstDay] = useState(localDateString);
  const [lastDay, setLastDay] = useState(localDateString);
  const [range, setRange] = useState(() => reportBounds(localDateString(), localDateString()));
  const [report, setReport] = useState<TimeReport | null>(null);
  const [reportError, setReportError] = useState('');
  const [dateError, setDateError] = useState('');
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  useEffect(() => {
    let active = true;
    void timeRequest<TimerState>(`/employees/${employee.id}/timer`)
      .then(value => { if (active) { setTimer(value); setTimerError(''); } })
      .catch(error => { if (active) setTimerError(errorMessage(error)); });
    return () => { active = false; };
  }, [employee.id, refresh]);

  useEffect(() => {
    if (!timer?.entry) return;
    const entry = timer.entry;
    const receivedAt = performance.now();
    const tick = () => setElapsed(Math.max(0, timer.serverTime - entry.startedAt + performance.now() - receivedAt));
    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [timer]);

  useEffect(() => {
    let active = true;
    void timeRequest<TimeReport>(`/employees/${employee.id}/report?from=${range.from}&to=${range.to}`)
      .then(value => { if (active) { setReport(value); setReportError(''); } })
      .catch(error => { if (active) setReportError(errorMessage(error)); });
    return () => { active = false; };
  }, [employee.id, range, refresh]);

  function reload() {
    setTimer(null);
    setReport(null);
    setTimerError('');
    setReportError('');
    setRefresh(value => value + 1);
  }

  async function toggleTimer(event: FormEvent) {
    event.preventDefault();
    if (!timer || inFlight.current) return;
    if (!timer.entry) {
      const error = validateDescription(task);
      if (error) { setTimerError(error); return; }
    }
    inFlight.current = true;
    setBusy(true);
    try {
      const result = timer.entry
        ? await timeRequest<TimerState>(`/time-entries/${timer.entry.id}/stop`, {})
        : await timeRequest<TimerState>(`/employees/${employee.id}/timer/start`, { description: task.trim() });
      setTimer({ ...result, entry: result.entry?.stoppedAt === null ? result.entry : null });
      setElapsed(0);
      setTimerError('');
      setReport(null);
      setRefresh(value => value + 1);
    } catch (error) {
      setTimer(null);
      setTimerError(`${errorMessage(error)} Refresh to confirm the timer state before trying again.`);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  function applyDates(event: FormEvent) {
    event.preventDefault();
    try {
      const nextRange = reportBounds(firstDay, lastDay);
      setDateError('');
      setReportError('');
      setReport(null);
      setRange(nextRange);
    } catch (error) { setDateError(errorMessage(error)); }
  }

  return (
    <section className="workspace-card time-workspace" aria-label={`Time tracking for ${employee.name}`}>
      <div className="card-heading">
        <span className="section-number">02 / TIME & TASKS</span>
        <button className="secondary-button" type="button" onClick={reload} disabled={busy}>Refresh</button>
      </div>
      <h2>{employee.name}</h2>
      <form className="timer-form" onSubmit={event => { void toggleTimer(event); }} noValidate>
        <div>
          <label htmlFor="task-description">Task description</label>
          <textarea id="task-description" value={timer?.entry?.description ?? task}
            onChange={event => setTask(event.target.value)} readOnly={Boolean(timer?.entry) || busy}
            placeholder="e.g. Prepare the fictional project brief" rows={2} required />
          <p className="field-hint">1–500 characters. One running timer per employee.</p>
        </div>
        <div className="timer-controls">
          <output className="timer-value" aria-label="Elapsed time">{formatDuration(timer?.entry ? elapsed : 0)}</output>
          <button className="primary-button" disabled={!timer || busy} type="submit">
            {busy ? 'Saving…' : timer?.entry ? 'Stop timer' : 'Start timer'}
          </button>
        </div>
      </form>
      {!timer && !timerError && <p role="status">Loading timer…</p>}
      {timerError && <p className="form-error" role="alert">{timerError}</p>}
      {timer?.entry && <p className="running-note" role="status">Timer running. It continues across page reloads and server restarts until you stop it.</p>}

      <div className="report-heading"><h3>Time report</h3><span>{timezone}</span></div>
      <form className="report-filters" onSubmit={applyDates}>
        <div><label htmlFor="report-from">From</label><input id="report-from" type="date" required value={firstDay} onChange={event => setFirstDay(event.target.value)} /></div>
        <div><label htmlFor="report-to">Through</label><input id="report-to" type="date" required value={lastDay} onChange={event => setLastDay(event.target.value)} /></div>
        <button className="secondary-button" type="submit">View report</button>
      </form>
      {dateError && <p className="form-error" role="alert">{dateError}</p>}
      <p className="field-hint">Completed entries only. Running timers are excluded. Entries crossing the selected dates count only their time inside the period.</p>
      {reportError ? <p className="form-error" role="alert">{reportError} Use Refresh to retry.</p>
        : !report ? <p role="status">Loading report…</p> : <>
          <div className="report-total"><span>Total completed time</span><strong>{formatDuration(report.totalMs)}</strong></div>
          <p className="field-hint">Showing {new Date(report.from).toLocaleDateString()} – {new Date(report.to - 1).toLocaleDateString()}</p>
          {report.entries.length === 0 ? <p className="empty-report" role="status">No completed time entries in this period.</p>
            : <div className="table-scroll"><table>
              <caption className="sr-only">Completed time entries for {employee.name}</caption>
              <thead><tr><th scope="col">Task</th><th scope="col">Started</th><th scope="col">Stopped</th><th scope="col">Time in period</th></tr></thead>
              <tbody>{report.entries.map(entry => <tr key={entry.id}>
                <td>{entry.description}</td><td>{new Date(entry.startedAt).toLocaleString()}</td>
                <td>{new Date(entry.stoppedAt!).toLocaleString()}</td><td>{formatDuration(entry.durationMs)}</td>
              </tr>)}</tbody>
            </table></div>}
        </>}
    </section>
  );
}
