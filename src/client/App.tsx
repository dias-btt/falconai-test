import { EmployeeWorkspace } from './EmployeeWorkspace';

export function App() {
  return (
    <div className="app-shell">
      <header className="header">
        <a className="brand" href="/" aria-label="ShiftLedger home">
          <span className="brand-mark" aria-hidden="true">S</span>ShiftLedger
        </a>
        <span className="header-label">TEAM TIME, SIMPLIFIED</span>
      </header>
      <main>
        <p className="eyebrow">YOUR TEAM’S WORKDAY</p>
        <h1>Good work starts <span>with people.</span></h1>
        <p className="intro">Your team, their tasks, and the time behind the work.</p>
        <EmployeeWorkspace />
      </main>
      <footer>ShiftLedger <span>Built for a more considered workday.</span></footer>
    </div>
  );
}
