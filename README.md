# ShiftLedger

A small employee time tracker for the Falcon AI programmer assignment.

**Status:** foundation implemented. The app runs locally with a connected workspace shell, HTTP API, SQLite schema, automated tests, and CI configuration. Employee controls, timers, and reports are upcoming stages; this is not yet the completed assignment.

## Scope

- Add employees using fictional names.
- Start and stop a timer with a task description, with one active timer per employee.
- View each employee's records and total time for a selected period.
- Retain employees, completed entries, and running timers after application restarts.
- Provide a simple interface without authentication or roles.

## Implementation

TypeScript throughout, with a React/Vite interface, an Express HTTP API, and SQLite persistence using Node's built-in `node:sqlite` module. Vitest and Supertest cover the foundation with real SQLite databases and HTTP requests. Playwright browser automation will be added with the feature acceptance work. Direct dependencies and the resolved dependency tree are pinned in `package.json` and `package-lock.json`.

The server owns timestamps and validation. SQLite stores durable state; the browser renders elapsed time from the server's start timestamp. Reports count completed entries and clip their duration to the requested period. Running timers appear separately.

See [the implementation plan](docs/IMPLEMENTATION_PLAN.md) for decisions, acceptance criteria, and the branch sequence.

## Run locally

Requires **Node.js 24.2 or newer within the 24.x series** and **npm 11.x**. `.nvmrc` selects the locally tested minimum, 24.2.0. If you use nvm, run `nvm install` and `nvm use` first. Node 24.2 emits an experimental warning for `node:sqlite`; no experimental flag or database service is required.

```bash
git clone https://github.com/dias-btt/falconai-test.git
cd falconai-test
npm ci
npm run dev
```

Until the foundation PR is merged, check out `chore/foundation` before installing. Open [the development app](http://127.0.0.1:5173). Vite proxies `/api` to the Node server at port 3001. Both processes restart or refresh when their source changes; Ctrl+C stops both. The shell should display **Workspace connected**.

The server creates `data/shiftledger.sqlite` and applies pending migrations automatically at startup. Restarting uses the same file without clearing data. There is no separate database initialization command and no seed data yet.

### Configuration

No `.env` file is needed for the defaults. To customize them, copy `.env.example` to `.env` and edit it. Restart the development command after changing configuration.

| Variable | Default | Purpose |
| --- | --- | --- |
| `HOST` | `127.0.0.1` | API/production bind address |
| `PORT` | `3001` | API/production port; the Vite proxy reads this too |
| `DATABASE_PATH` | `./data/shiftledger.sqlite` | Persistent SQLite path, relative to the working directory or absolute |

Use the default host for local development; the Vite proxy connects through `127.0.0.1`. The app has no authentication and is intended for this local assignment. Use only fictional data.

### Production build

Stop the development servers first, then run:

```bash
npm run build
npm start
```

Open [the production app](http://127.0.0.1:3001). One Node process serves the compiled client and API; Vite is not needed at runtime. Keep `dist/`, `package.json`, production `node_modules`, and the persistent database together in your deployment directory. The database path is independent of build output; rebuilding does not delete it.

### Checks

```bash
npm run check
```

This runs lint, all tests, type checking, and the production build. Individual commands are `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:watch`, and `npm run build`.

The 21 foundation tests cover configuration validation, SQLite initialization and reopening, foreign keys, timer constraints, newer-schema rejection, health responses, JSON errors, and static file serving. Tests use in-memory or temporary databases and do not modify your local data. Timer operations and empty-report tests will arrive alongside those features.

[GitHub Actions](.github/workflows/ci.yml) runs `npm ci` and `npm run check` for PRs and pushes to `main`, on the minimum and current Node 24 releases. Local checks passing do not imply that remote CI has run.

### Structure and persistence

```text
src/client/         React app and styles
src/server/         HTTP app, startup, configuration, SQLite migrations
tests/              Vitest database, API, and configuration tests
docs/               Delivery plan and AI work log
.github/            CI workflow and PR template
```

The HTTP app accepts a database connection, making it testable without starting the production entry point. SQLite migration 1 creates employees and time entries, foreign keys, duration checks, and a unique partial index enforcing one active timer per employee. Pending migrations run within a transaction; a database from a newer app version is rejected instead of being overwritten. Future schema changes append migrations in `src/server/database.ts`.

### Known limitations

- Employee, timer, and report endpoints and controls are not implemented yet.
- `node:sqlite` is experimental in the minimum supported runtime; the application is intentionally scoped to Node 24.
- The foundation audit found zero production vulnerabilities. The full audit reports 12 moderate findings propagated from a development-only [minimatch advisory](https://github.com/advisories/GHSA-g3hv-75wg-m249) in the lint toolchain. The supported lint packages still request an affected major version. Recheck upstream fixes before submission; no forced downgrade or cross-major override has been applied.

## AI tools, prompts, and code review

Development uses **OpenAI Codex in the desktop app** for planning, implementation, review, and testing. The exact model identifier has not been verified and must be recorded from the session's visible model configuration before submission.

The [AI work log](docs/AI_WORK_LOG.md) records actual requests, decisions, validation, and defects. Example prompts below are intended for later development; they have **not** been executed:

1. “Implement employee creation with server validation and SQLite persistence. Test blank names and persistence using a temporary database. Explain the schema choices.”
2. “Implement start and stop operations with one active timer per employee. Test start → stop → start, duplicate starts, and recovery after restarting the server. Use a controllable clock.”
3. “Review reporting for date-boundary errors. Test an empty report and entries overlapping either edge of the selected period. Show a failing regression test before fixing any confirmed defect.”

**Error found and fixed in the foundation:** the initial error handler converted an oversized JSON request into `500 Internal Server Error`. A regression test reproduced the failure (20 passed, 1 failed); handling the parser's `entity.too.large` error now returns `413` with a clear message, and all 21 tests pass. See [the work log](docs/AI_WORK_LOG.md) and `tests/app.test.ts` for evidence. No commit or PR link is claimed until this branch is committed and published.

## Repository workflow

Each implementation stage uses a focused branch and a reviewable pull request. Tests accompany the behavior they verify. See [CONTRIBUTING.md](CONTRIBUTING.md) for commit and PR conventions.

Use only fictional employee and task data. A SQLite database and local environment files must never be committed. Authentication, payroll, billing, and deployment infrastructure are outside this assignment's scope.
