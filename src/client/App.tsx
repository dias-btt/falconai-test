import { useEffect, useState } from 'react';

type Connection = 'checking' | 'ready' | 'unavailable';

export function App() {
  const [connection, setConnection] = useState<Connection>('checking');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 5000);
    let active = true;

    async function checkConnection() {
      try {
        const response = await fetch('/api/health', { signal: controller.signal });
        if (!response.ok) throw new Error('Health check failed');
        const health = await response.json() as { status?: string; database?: string };
        if (health.status !== 'ok' || health.database !== 'ok') throw new Error('Service unavailable');
        if (active) setConnection('ready');
      } catch {
        if (active) setConnection('unavailable');
      } finally {
        window.clearTimeout(timeout);
      }
    }

    void checkConnection();
    return () => {
      active = false;
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [attempt]);

  const status = {
    checking: 'Connecting to your workspace…',
    ready: 'Workspace connected',
    unavailable: 'Could not connect to your workspace',
  }[connection];

  return (
    <div className="app-shell">
      <header className="header">
        <a className="brand" href="/" aria-label="ShiftLedger home"><span className="brand-mark" aria-hidden="true">S</span>ShiftLedger</a>
        <span className="header-label">TEAM TIME, SIMPLIFIED</span>
      </header>
      <main>
        <p className="eyebrow">YOUR TEAM’S WORKDAY</p>
        <h1>Make time <span>count.</span></h1>
        <p className="intro">A clear place to keep track of your team, their tasks, and the time behind the work.</p>
        <section className="workspace-card" aria-labelledby="workspace-title">
          <div className="card-heading"><span className="section-number">01 / WORKSPACE</span><span className="stage-label">Foundation preview</span></div>
          <h2 id="workspace-title">A fresh start for your team.</h2>
          <p>Employee management, task timers, and time reports are coming in the next development stages.</p>
          <div className={`connection ${connection}`} role="status">
            <span className="status-dot" aria-hidden="true" />
            <span>{status}</span>
            {connection === 'unavailable' && <button type="button" onClick={() => { setConnection('checking'); setAttempt(value => value + 1); }}>Try again</button>}
          </div>
        </section>
        <div className="principles" aria-label="Workspace features">
          <div><span>01</span><h3>Your people</h3><p>One place for your team.</p></div>
          <div><span>02</span><h3>The work in focus</h3><p>A task. A timer. A clear record.</p></div>
          <div><span>03</span><h3>Time, accounted for</h3><p>See where the workday goes.</p></div>
        </div>
      </main>
      <footer>ShiftLedger <span>Built for a more considered workday.</span></footer>
    </div>
  );
}
