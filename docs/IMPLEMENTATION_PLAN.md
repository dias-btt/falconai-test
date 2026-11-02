# Implementation plan

## Delivery approach

Build a complete, small application in independently reviewable stages. The user controls when each new stage starts. Complete only the current stage, report the changes and checks, and hand off the Git checkpoint before continuing.

The initial documentation checkpoint belongs on `main`. Subsequent branches start from the latest merged `main`. Use normal merge commits so the individual commits and PR boundaries remain visible. Never fabricate intermediate work, failures, review comments, or fix commits.

## Branch and PR sequence

| Step | Branch | Deliverable | Completion evidence |
| --- | --- | --- | --- |
| 1 | `main` | Assignment brief, scope, acceptance criteria, workflow, AI log | Documentation cross-check; no runtime claims |
| 2 | `chore/foundation` | TypeScript client/API structure, SQLite initialization and migrations, lint/typecheck/test/build scripts, CI, runnable shell | Fresh setup works; database can reopen; automated checks pass |
| 3 | `feat/employees` | Create and list employees, validation, fictional seed data, empty/loading/error UI states | API persistence and validation tests; browser smoke check |
| 4 | `feat/reports` (combined) | Start/stop controls, task description, active timer recovery, duplicate-operation handling | Deterministic timer tests and actual API-process restart test |
| 5 | `feat/reports` (combined) | Employee and date filters, completed records, totals, empty state | Range-overlap and empty-report tests; UI verification |
| 6 | `codex/test/acceptance` | End-to-end workflows, clean-install check, accessibility and error-state review | Browser tests plus restart/persistence checks on a temporary database |
| 7 | `codex/docs/submission` | Verified README, screenshots, architecture explanation, actual AI/debugging evidence, public repository readiness | Run documented commands from a clean checkout; all CI checks green |

If review reveals a defect, use a descriptive `codex/fix/<issue>` branch with a regression test and focused PR. Do not create a fix branch merely to populate the history. An optional demo comes after the required deliverables.

## Architecture

- **Client:** React + TypeScript, built with Vite. A single clear workspace for employees, timers, and reports; responsive layout and accessible form labels.
- **API:** small Node.js + TypeScript service. Keep transport, business rules, and database access separate without adding unnecessary abstraction.
- **Persistence:** SQLite on disk, configurable database path, versioned schema initialization, foreign keys, and database constraints for timer invariants.
- **Testing:** Vitest for business logic and real SQLite/API integration; Playwright for browser journeys. Each test gets isolated data. Time-sensitive tests use an injected clock instead of sleeps.
- **Operations:** one documented production entry point serving the built client and API, plus convenient development commands. Dependencies and runtime requirements are set in step 2.

No authentication, external AI API integration, or cloud services are required by this app. AI assists development; running the finished app should not require an AI subscription or API key.

## Data and time rules

### Employees

- Store an ID, a trimmed display name, and a creation timestamp.
- Names must contain 1–100 characters after trimming. Names need not be unique; IDs identify employees.
- Employee deletion and editing are outside the initial scope.

### Time entries

- Store an ID, employee ID, trimmed task description, start timestamp, and nullable stop timestamp.
- Descriptions must contain 1–500 characters after trimming.
- Store server-generated UTC timestamps as integer milliseconds; never trust elapsed time supplied by the browser.
- An entry with no stop timestamp is active. Enforce at most one active entry per employee with a database constraint, including under simultaneous requests.
- A duplicate start while an entry is active returns a conflict without creating another entry. A repeated stop returns the already-stopped entry without changing its stop time.
- Start → stop → start creates two distinct entries. A new timer never overwrites a completed entry.
- Reloading the browser or restarting the API preserves the active start timestamp. Time continues across downtime because the entry remains active until explicitly stopped.
- Reject an invalid stop time earlier than the start time rather than storing negative duration.

### Reports

- The UI selects an employee and inclusive local calendar dates. Default to the current local day and clearly label the timezone used.
- Convert the first day's local midnight and the midnight after the last selected day into UTC bounds. Use calendar arithmetic so daylight-saving transitions do not assume every day is 24 hours.
- The API accepts a half-open interval `[from, to)` and rejects invalid or reversed bounds and unknown employees.
- Include completed entries that overlap the interval. Count only the intersection: `max(0, min(stop, to) - max(start, from))`.
- Compute and sum durations in integer milliseconds; round only for display. Show total hours without wrapping at 24 hours. Display seconds so short test sessions are visible.
- Exclude active timers from completed totals and label that behavior in the UI. Show active timers separately.
- No matching entries is a successful result with an empty list and zero total, not an error.

## Acceptance checks

| Scenario | Required outcome | Planned check |
| --- | --- | --- |
| Create an employee | Appears in the list and survives a database reopen | API + SQLite integration |
| Invalid input | Blank/oversized names and descriptions rejected without writes | Validation + API integration |
| Start/stop | Correct employee, description, timestamps, and duration retained | API with controlled clock |
| Restart timer | Start → stop → start produces a new active entry and preserves history | API + browser |
| Duplicate start/stop | No overlapping active entry; stop timestamp stays unchanged | API, including concurrent starts |
| App restart | Stop the API process, relaunch with the same database, recover employees, stopped entries, and active start time | Process integration |
| Page reload | Running timer recovers and remains stoppable | Browser |
| Period and employee filter | Only the chosen employee's overlapping completed time contributes | Reporting integration |
| Boundaries | Correct behavior at midnight, exactly at interval edges, across both edges, and through a daylight-saving transition | Deterministic reporting tests |
| Empty report | Empty records and zero total; helpful UI state | API + browser |
| Failed request | Actionable message, controls recover, no false success | API/UI verification |
| Fresh clone | Documented install, test, build, and production commands work | Final clean-checkout verification |

## Submission gate

- Every required behavior works with fictional data and persists across a real process restart.
- CI passes type checking, linting, relevant tests, and the production build.
- README contains commands actually exercised, model/tool attribution, real example prompts, and actual errors fixed with evidence.
- Public repository contains source, lockfile, migrations, tests, and useful commit/PR history; no databases, credentials, or personal application details.
- The public repository link is ready for the application form. Creating/submitting the job application is a separate action.
