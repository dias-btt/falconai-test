# Development workflow

## One stage at a time

Follow [the implementation plan](docs/IMPLEMENTATION_PLAN.md). Finish the current stage and its checks before starting another. The user decides when to move to the next branch.

The initial documentation checkpoint is on `main`. The foundation is developed on the user-created `chore/foundation` branch. Preserve the user's selected branch names; the later names in the plan are suggestions.

For each subsequent stage:

1. Start from the latest merged `main` and create the planned branch.
2. Implement a focused slice, with tests for its main behavior and edge cases.
3. Review the diff and run the relevant checks. Fix confirmed issues and record evidence in the AI log.
4. Make meaningful commits that describe completed changes. Do not split commits artificially just to increase their count.
5. Open a PR explaining the behavior, decisions, validation, and limitations.
6. Review and merge using a merge commit to retain commits and the PR boundary. Begin the next stage only after the user's handoff.

## Commit conventions

Use `type: concrete description`, for example:

- `docs: define assignment scope and delivery plan`
- `chore: initialize application and CI`
- `feat: persist employee records`
- `test: verify active timer survives server restart`
- `fix: clip report durations to the selected period`

The examples describe potential work, not existing commits. Only use `fix` when a real defect was found and corrected.

## Review expectations

- Verify generated code instead of assuming it is correct.
- Keep date calculations and timer state transitions testable independently of the UI.
- Use temporary databases and deterministic clocks in tests.
- Test persistence through an actual process restart, not only mocked storage.
- Keep dependency changes intentional and commit the chosen lockfile.
- Update the README when setup or behavior changes; update the AI log with actual evidence.
- Keep all employee/task examples fictional and exclude local data and secrets from Git.

Run `npm ci`, then `npx playwright install chromium` once to install the test browser. Run `npm run verify` before opening a PR: it includes lint, API/database tests, type checking, the production build, and desktop/mobile browser acceptance tests. Use `npm run check` for the faster checks and `npm run test:e2e` after a build to run browser tests alone. Every browser test uses an isolated temporary database and server; it never reuses your running app. CI repeats the static/API checks on the minimum and current Node 24 releases and runs browser acceptance separately. Report local results separately from remote CI results.
