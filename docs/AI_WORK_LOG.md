# AI work log

Keep this log factual. Distinguish prompts actually used from suggestions, proposed behavior from implemented behavior, and checks run from checks planned. Link real commits and PRs once they exist.

## Tools and model attribution

- Tool: OpenAI Codex desktop app.
- Exact model: not yet verified from the session's visible model configuration. Record it before submission; do not guess a specific model/version from the app name.
- Contributions so far: repository inspection, implementation planning, and initial project documentation.
- Human contribution so far: supplied the assignment, requested a staged branch/PR workflow, and retained control of stage transitions.

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

## Future entry format

For each stage, record:

1. Actual prompt or a clearly labeled summary of the request.
2. Tool and verified model used.
3. Generated changes and why they were accepted, revised, or rejected.
4. Commands run and observed results, including failures.
5. Real defects: reproduction, cause, fix, and regression test.
6. Remaining limitations and links to the resulting commit/PR.
