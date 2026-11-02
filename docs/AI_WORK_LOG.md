# AI work log

Keep this log factual. Distinguish prompts actually used from suggestions, proposed behavior from implemented behavior, and checks run from checks planned. Link real commits and PRs once they exist.

## Tools and model attribution

- Tool: OpenAI Codex desktop app.
- Model: **GPT-6 Astra**, confirmed by the user during the submission step. Earlier entries preserve the attribution uncertainty that existed at the time.
- Contributions so far: repository inspection, implementation planning, foundation code and tests, code review, local validation, and documentation.
- Human contribution so far: supplied the assignment, requested a staged branch/PR workflow, published the initial documentation, selected `chore/foundation`, and retained control of stage transitions.

## 2026-11-02 — Step 1: planning and repository baseline

### Actual user request

> help me with assignment - it should be strong, with clear work shown on github (PR, branches, commits etc). you write me a plan, execute first step, i will create branch main, then next step - next branch feat or fix or smth. we will work like that

The user also supplied the assignment requirements: employee creation, described timers, per-employee date-range reports, persistence, AI-use documentation, and tests including timer restart and an empty report.

### Observations and decisions

- The workspace contained an empty Git repository, already on an unborn `main` branch, with no remote and no commits.
- The local environment reported Node.js v24.2.0, npm 11.3.0, and Python 3.12.0. These observations are not yet project runtime guarantees.
- Proposed TypeScript, React/Vite, a Node API, and SQLite to keep the solution small and locally runnable.
- Defined “restart timer” as both starting a fresh entry after stopping and recovering an active entry after application restart; both need tests.
- Specified period boundaries, time clipping, duplicate-operation behavior, and durable active timers before implementation.
- Prepared project documentation and a PR template. No application implementation, dependencies, Git commits, or GitHub PRs were created in this step.

### Verification

Inspected repository status, branch, remotes, workspace files, and available runtime versions. Cross-checked the plan against the assignment. No application tests were run because there is no application yet.

### Defects found and fixed

None. The timer/report edge cases above are anticipated risks, not bugs discovered in generated code.

## 2026-11-02 — Step 2: application foundation

### Actual user request

> repo already added. commits pushed to main. next step. checkouted to `chore/foundation`

This continued step 2 of the documented plan. The assistant kept the user's branch name and limited implementation to the foundation.

### Implementation and review decisions

- Added React + Vite, an Express API, strict TypeScript configurations, and pinned npm dependencies with a lockfile.
- Used Node 24's built-in SQLite module to avoid a native third-party database dependency. Verified it on Node 24.2.0; documented its experimental warning and supported runtime range.
- Created transactional, versioned schema initialization with foreign keys, a one-active-timer index, and a nonnegative-duration constraint. These are storage foundations, not completed timer features.
- Kept database creation, HTTP application construction, configuration, and process startup separate. Tests inject isolated databases; importing the HTTP app does not start the production server.
- Added a simple workspace shell that checks the API, handles connection failure, and offers retry. It clearly labels unimplemented features as upcoming and uses no external fonts or image services.
- Added development commands, production serving of built assets, graceful shutdown, and CI for Node 24.2.0 and current Node 24.
- Consulted official [Vite setup](https://vite.dev/guide/), [Express 5 migration](https://expressjs.com/en/guide/migrating-5/), and [GitHub Actions setup](https://github.com/actions/setup-node) documentation. Used the Sites skill's local-only workflow; no hosting resources or deployment were created.

### Failures and corrections

1. **Oversized JSON returned the wrong status.** Review found that the generic error handler would treat a request-body limit error as an internal failure. Added a regression test sending a 17,000-character description. The first run reported **20 passed, 1 failed**, with `expected 413, got 500`. Added explicit handling for `entity.too.large`; the next run passed **21/21**. Unknown internal errors still return a generic 500 without exposing details.
2. **Lint rejected the required Express error-handler argument.** The first lint run flagged unused `_next`. Express identifies error middleware by its four-argument signature, so removing the argument would change runtime behavior. Configured the unused-argument rule to allow explicitly prefixed `_` arguments. Lint passed afterward.
3. **Tooling selection needed revision.** Installation reported ESLint 9 as unsupported. Checked peer requirements, then moved to compatible ESLint 10 packages and reran the checks. This was a dependency-selection correction, not an application defect.

Initial npm registry queries failed under restricted network access. Retried using the environment's approved network access; dependency installation then succeeded. This was an environment issue, not an application failure.

### Verification actually performed

- `npm ci` — succeeded, reinstalling dependencies from the lockfile.
- `npm run check` after `npm ci` — lint, **21 tests across 3 files**, type checking, and production build all passed on Node 24.2.0 / npm 11.3.0.
- Database integration tests — created a nested path, wrote a fictional employee, closed/reopened the file, verified the record and schema version, checked constraints, and refused a newer schema without replacing its data.
- `npm run dev` — both processes started; the page and proxied `/api/health` responded successfully. Verified **Workspace connected** in the browser and inspected the layout; no browser warnings/errors were reported.
- `npm start` after building — compiled server started and served HTML, both bundled assets, SQLite health, and a JSON API 404. Verified the production page and connected state in the browser, with no warnings/errors reported.
- `git diff --check` and ignore checks — whitespace check passed; database files, `.env`, dependencies, and build output are excluded from Git.
- `npm audit --omit=dev --json` — zero production vulnerabilities. Full `npm audit` reported 12 moderate findings propagated from [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249) through development-only lint dependencies. `npm explain minimatch` confirmed the installed 10.2.6 dependency and upstream 10.x requirements. Recorded the limitation rather than forcing incompatible dependency replacements.

### Handoff and limits

No commits, pushes, PRs, or merges were performed by the assistant in this stage. Remote CI has not been run for these changes. The user will publish this checkpoint and open its PR. Exact model attribution remains unverified.

The application shell is runnable. Employee operations, timer operations, reporting, browser automation, and a process-level active-timer restart test remain in their planned stages. Passing schema tests does not prove those unimplemented user journeys.

## 2026-11-02 — Step 3: employee management

Actual request: “next step”. Continued the agreed plan on `feat/employees`, adding create/list API routes, a form and employee list, shared Unicode-aware name validation, and an optional repeatable fictional seed command. No dependencies or schema changes were needed. All 40 tests, lint, type checking, and build passed.

Browser verification used a temporary database: empty state, blank-name validation, creation, reload persistence, failed-save draft retention, failed-load recovery, and a real API restart all worked. Checked mobile (390px) and desktop (1280px) layouts without horizontal overflow. Running the seed twice added 3 then 0 records. No new application bug was found in this stage. The user committed and merged it in [PR #2](https://github.com/dias-btt/falconai-test/pull/2), commit `82cb4c1`.

## 2026-11-02 — Steps 4 and 5: timers and reports together

### Actual request

> do steps 4 and 5 together. tokens are limited, so make sure you dont waste them on unnecessary checks

The workspace was clean on the user-created `feat/reports` branch, based on merged employee PR #2. Combined timers and reports in one delivery and kept verification focused.

### Implementation decisions

- Added server-timestamped start/stop operations. A conditional insert and the existing unique index prevent simultaneous active timers per employee. Repeated stops preserve the recorded end time; a new start creates a distinct history entry.
- Active entries remain in SQLite across application restarts. The UI recovers server state and derives elapsed display time from the returned server timestamp plus a monotonic browser clock.
- Added employee selection, a task form, running timer display, and completed records with total time for inclusive local calendar dates. Running entries are excluded from reports and displayed separately.
- Report API uses UTC millisecond bounds `[from, to)`, clips each completed entry to their intersection, and sums milliseconds before formatting. Calendar arithmetic handles daylight-saving changes, and totals do not wrap after 24 hours.
- Failed timer writes require a refresh before another action; they are not automatically retried. Report responses from an obsolete employee/date selection are ignored.
- No new dependencies or database migrations were needed.

### Checks and corrections

- First lint run caught a line break between a parameterized test definition and its call. Corrected the formatting.
- All **63 tests across 7 files passed**, including start–stop–start, concurrent starts, repeated stops, clock rollback, invalid inputs, employee isolation, empty reports, overlap at both period edges, and 23/25-hour calendar days.
- A real child-process test created an employee, stopped one timer, left another running, terminated the API, restarted it against the same temporary SQLite file, verified the original active entry, then stopped it and checked the report total.
- Type checking caught the restart test helper returning untyped JSON. Added explicit response types; `npm run build` then passed. Runtime tests had already passed; the correction only added types, so they were not rerun unnecessarily.
- The compiled server started successfully with the isolated fictional dataset. The attempted final browser smoke check was blocked by the browser integration connection error. No claim is made that the new timer/report UI received browser verification; that remains part of acceptance hardening.
- No new application defect was found; the above corrections were in test code. The earlier oversized-request defect and its regression test remain documented in the foundation entry.

### Handoff

README now documents employee setup/seeding, timers, report rules, and API endpoints. Model identity remains unverified. Existing development-only dependency findings were not re-audited because dependencies did not change. No commits, pushes, or PRs were created by the assistant for this combined stage; remote CI has not run for these changes. Steps 6 and 7 remain: browser acceptance hardening and submission polish.

## 2026-11-02 — Steps 6 and 7: acceptance and submission

### Actual requests and attribution

> now do 6 and 7 step

When asked for the displayed model, the user answered **“GPT-6 Astra”**. Updated the current README and tool attribution; older entries retain the uncertainty that existed before that confirmation.

### Changes

Worked on the clean user-created `feat/submission` branch after timer/report PR #3 merged. Added Playwright desktop/mobile acceptance tests, an axe accessibility check, isolated production-server fixtures, a browser CI job, and `npm run verify`. Each browser case owns a temporary database and server. Added screenshots, a reviewer-oriented README, public PR history, and a validation record. Followed the user's request to keep checks focused: targeted the failed browser cases after fixes, then performed one full clean-copy verification.

### Real findings and fixes

The initial browser run had **6 passed, 2 failed**. Workflow and failure-recovery cases passed. The desktop and mobile accessibility cases exposed insufficient contrast in muted text and the selected employee button's hover state. The mobile case also found a report scroller without keyboard focus. Darkened the affected colors, preserved a dark selected hover background, and gave the report scroller a label, keyboard focus, and visible focus ring. Added an explicit focus assertion. Both failed cases then passed; these were application defects, not hypothetical risks or manufactured debugging examples.

### Final evidence

- Clean source copy without dependencies, build output, local database, or `.env`: `npm ci`, `npx playwright install chromium`, and `npm run verify` passed.
- **63 unit/integration tests and 8 browser cases** passed; lint, type checking, and production build passed.
- The browser suite covers timer reload/restart, report selection and empty results, employee creation, failed requests, and recovery when the server saves a timer but its response is lost. The existing process-restart test checks durable employees and time entries.
- The optional seed added 3 records on its first run and 0 on its second.
- Saved and visually inspected screenshots from passing desktop/mobile tests. Screenshot records are explicitly fictional fixtures.
- Production dependency audit returned zero findings; full installation still reported 12 moderate findings from the previously documented development-only advisory.
- GitHub confirmed the repository is public, PR #3 merged, and its Node 24.2.0/current-24 CI jobs passed. The new browser CI job has not run remotely because this branch has not been pushed by the assistant.

See [VALIDATION.md](VALIDATION.md) for commands, limitations, and the distinction between the tested source copy and published Git history. The final handoff preserves the user's control over commits, pushes, and merging. No job application was submitted and no demo was deployed.

## Future entry format

For each stage, record:

1. Actual prompt or a clearly labeled summary of the request.
2. Tool and verified model used.
3. Generated changes and why they were accepted, revised, or rejected.
4. Commands run and observed results, including failures.
5. Real defects: reproduction, cause, fix, and regression test.
6. Remaining limitations and links to the resulting commit/PR.
