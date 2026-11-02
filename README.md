# ShiftLedger

A small employee time tracker for the Falcon AI programmer assignment.

**Status:** planning complete; implementation has not started. This repository does not yet contain a runnable application.

## Scope

- Add employees using fictional names.
- Start and stop a timer with a task description, with one active timer per employee.
- View each employee's records and total time for a selected period.
- Retain employees, completed entries, and running timers after application restarts.
- Provide a simple interface without authentication or roles.

## Planned implementation

TypeScript throughout, with a React/Vite interface, a Node.js HTTP API, and SQLite persistence. Vitest will cover business rules and API integration; Playwright will cover core browser journeys. Exact dependencies and supported runtime versions will be pinned during the foundation step.

The server owns timestamps and validation. SQLite stores durable state; the browser renders elapsed time from the server's start timestamp. Reports count completed entries and clip their duration to the requested period. Running timers appear separately.

See [the implementation plan](docs/IMPLEMENTATION_PLAN.md) for decisions, acceptance criteria, and the branch sequence.

## Running and testing

There are no install, start, or test commands yet. The foundation PR will add verified instructions for a fresh clone, database initialization, development, production, and automated tests. Do not treat this planning checkpoint as a finished submission.

## AI tools, prompts, and code review

Development uses **OpenAI Codex in the desktop app** for planning, implementation, review, and testing. The exact model identifier has not been verified and must be recorded from the session's visible model configuration before submission.

The [AI work log](docs/AI_WORK_LOG.md) records actual requests, decisions, validation, and defects. Example prompts below are intended for later development; they have **not** been executed:

1. “Implement employee creation with server validation and SQLite persistence. Test blank names and persistence using a temporary database. Explain the schema choices.”
2. “Implement start and stop operations with one active timer per employee. Test start → stop → start, duplicate starts, and recovery after restarting the server. Use a controllable clock.”
3. “Review reporting for date-boundary errors. Test an empty report and entries overlapping either edge of the selected period. Show a failing regression test before fixing any confirmed defect.”

**Errors found and fixed:** none so far; no application code has been written. As real defects are discovered, this section will summarize the cause, fix, regression test, and relevant commit or PR. We will not invent debugging history.

## Repository workflow

Each implementation stage uses a focused branch and a reviewable pull request. Tests accompany the behavior they verify. See [CONTRIBUTING.md](CONTRIBUTING.md) for commit and PR conventions.

Use only fictional employee and task data. A SQLite database and local environment files must never be committed. Authentication, payroll, billing, and deployment infrastructure are outside this assignment's scope.
