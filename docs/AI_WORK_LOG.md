# AI work log

Keep this log factual. Distinguish prompts actually used from suggestions, proposed behavior from implemented behavior, and checks run from checks planned. Link real commits and PRs once they exist.

## Tools and model attribution

- Tool: OpenAI Codex desktop app.
- Exact model: not yet verified from the session's visible model configuration. Record it before submission; do not guess a specific model/version from the app name.
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

## Future entry format

For each stage, record:

1. Actual prompt or a clearly labeled summary of the request.
2. Tool and verified model used.
3. Generated changes and why they were accepted, revised, or rejected.
4. Commands run and observed results, including failures.
5. Real defects: reproduction, cause, fix, and regression test.
6. Remaining limitations and links to the resulting commit/PR.
