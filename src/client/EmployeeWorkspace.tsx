import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { Employee } from '../shared/employees.js';
import { validateEmployeeName } from '../shared/employees.js';
import { addEmployee, fetchEmployees } from './employee-api.js';
import { TimeWorkspace } from './TimeWorkspace';

type LoadState = 'loading' | 'ready' | 'error';

export function EmployeeWorkspace() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [attempt, setAttempt] = useState(0);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const nameInput = useRef<HTMLInputElement>(null);
  const saveInFlight = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 10000);
    let active = true;

    async function load() {
      try {
        const result = await fetchEmployees(controller.signal);
        if (active) {
          setEmployees(result);
          setLoadState('ready');
        }
      } catch {
        if (active) setLoadState('error');
      } finally {
        window.clearTimeout(timeout);
      }
    }

    void load();
    return () => {
      active = false;
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [attempt]);

  function reloadEmployees() {
    setLoadState('loading');
    setAnnouncement('');
    setAttempt(value => value + 1);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saveInFlight.current || loadState !== 'ready') return;
    const validation = validateEmployeeName(name);
    setAnnouncement('');
    setSaveError('');
    if (!validation.ok) {
      setFormError(validation.error);
      nameInput.current?.focus();
      return;
    }

    setFormError('');
    saveInFlight.current = true;
    setSaving(true);
    try {
      const employee = await addEmployee(validation.name);
      setEmployees(current => [...current, employee]);
      setName('');
      setAnnouncement(`${employee.name} was added to your team.`);
    } catch {
      // A lost response can mean the write succeeded. Do not retry POST automatically.
      setSaveError('Could not confirm the save. Refresh the list before trying again to avoid adding someone twice.');
    } finally {
      saveInFlight.current = false;
      setSaving(false);
      nameInput.current?.focus();
    }
  }

  const disabled = saving || loadState !== 'ready';
  const selectedEmployee = employees.find(employee => employee.id === selectedId) ?? employees[0];

  return (
    <section className="employee-workspace" aria-label="Employee management">
      <div className="workspace-card team-card">
        <div className="card-heading">
          <span className="section-number">01 / YOUR PEOPLE</span>
          {loadState === 'ready' && (
            <span className="stage-label">{employees.length} {employees.length === 1 ? 'employee' : 'employees'}</span>
          )}
        </div>
        <h2>Your team</h2>
        <p className="card-description">The people behind the work, all in one place.</p>

        {loadState === 'loading' && <p className="list-message" role="status">Loading your team…</p>}
        {loadState === 'error' && (
          <div className="list-message">
            <p role="alert">We couldn’t load your team. Check your connection and try again.</p>
            <button className="secondary-button" type="button" onClick={reloadEmployees}>Try again</button>
          </div>
        )}
        {loadState === 'ready' && employees.length === 0 && (
          <div className="empty-team">
            <span className="empty-icon" aria-hidden="true">+</span>
            <h3>A great workday starts with your team.</h3>
            <p>Add your first employee using the form. Their time records will have a home here.</p>
          </div>
        )}
        {loadState === 'ready' && employees.length > 0 && (
          <ul className="employee-list" aria-label="Employees">
            {employees.map((employee, index) => (
              <li key={employee.id} className={selectedEmployee?.id === employee.id ? 'selected-employee' : ''}>
                <span className="employee-avatar" aria-hidden="true">{Array.from(employee.name)[0]?.toLocaleUpperCase()}</span>
                <div className="employee-details">
                  <h3>{employee.name}</h3>
                  <p>#{index + 1} · Added <time dateTime={new Date(employee.createdAt).toISOString()}>{new Date(employee.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</time></p>
                </div>
                <button className="secondary-button select-employee" type="button"
                  aria-label={`Track time for ${employee.name}, employee ${index + 1}`}
                  aria-pressed={selectedEmployee?.id === employee.id}
                  onClick={() => setSelectedId(employee.id)}>Track time</button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <aside className="workspace-card add-card" aria-labelledby="add-title">
        <span className="section-number">GROW YOUR TEAM</span>
        <h2 id="add-title">Add an employee</h2>
        <p className="card-description">A name is all you need to get started.</p>
        <form onSubmit={event => { void submit(event); }} noValidate aria-busy={saving}>
          <label htmlFor="employee-name">Employee name</label>
          <input
            ref={nameInput}
            id="employee-name"
            name="employeeName"
            type="text"
            required
            autoComplete="off"
            placeholder="e.g. Alex Example"
            value={name}
            readOnly={saving}
            aria-invalid={formError ? true : undefined}
            aria-describedby={`name-hint${formError ? ' name-error' : ''}`}
            onChange={event => { setName(event.target.value); setFormError(''); setAnnouncement(''); }}
          />
          <p className="field-hint" id="name-hint">1–100 characters. Use fictional names only.</p>
          {formError && <p className="form-error" id="name-error" role="alert">{formError}</p>}
          <button className="primary-button" type="submit" disabled={disabled}>
            {saving ? 'Adding employee…' : 'Add employee'}
          </button>
          {saveError && (
            <div className="save-error">
              <p role="alert">{saveError}</p>
              <button className="secondary-button" type="button" disabled={disabled} onClick={reloadEmployees}>Refresh employee list</button>
            </div>
          )}
          <p className="form-success" role="status">{announcement}</p>
        </form>
        <p className="form-note">Names can repeat. Each employee has their own record.</p>
      </aside>
      {loadState === 'ready' && selectedEmployee && <TimeWorkspace key={selectedEmployee.id} employee={selectedEmployee} />}
    </section>
  );
}
