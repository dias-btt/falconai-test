# Submission validation

Validated on **2026-11-02**, using Node **24.2.0**, npm **11.3.0**, Playwright **1.64.1**, and Chromium on macOS ARM64. Source: `feat/submission`, based on merged commit `f7f27bc`, including the pending acceptance/documentation changes.

## Observed results

| Check | Result |
| --- | --- |
| `npm ci` in a clean source copy | Passed; no existing dependencies, build output, database, or `.env` copied |
| `npx playwright install chromium` | Passed |
| `npm run verify` in that copy | Passed: lint, strict type checking, production build, 63 unit/integration tests, 8 browser cases |
| Process-restart test | Passed: employee, completed record, and active timer recovered after stopping/restarting the real API process |
| Browser workflows | Passed on desktop and mobile Chromium: creation, validation, timer reload/restart, history, date/employee filters, empty reports, failed requests, lost-response recovery |
| Accessibility checks | No violations for the selected axe WCAG A/AA rules in the tested report state after fixes; report scroller is keyboard-focusable |
| Responsive layout | No page-level horizontal overflow at desktop and mobile test sizes; wide report tables scroll within their labeled region |
| `npm run db:seed` twice in the clean copy | Added 3 then 0 fictional employees |
| `npm audit --omit=dev --json` | Zero production findings |
| Full dependency audit during clean install | 12 moderate findings propagated from the existing development-only minimatch advisory |

The clean source copy included pending files from this branch. It was not a claim that uncommitted changes could already be cloned from GitHub. Browser fixtures start the compiled production server on isolated local ports with a new temporary database for every case; they do not reuse the author's running app.

## Defects found during acceptance

The first browser run passed 6 cases and failed the 2 layout/accessibility cases:

1. **Insufficient contrast:** muted small text was too light, and the generic hover rule gave a selected employee button a light background while retaining white text. Darkened the relevant text colors and added an explicit selected-button hover style.
2. **Unreachable report scroller:** the mobile report table overflowed into a scrolling region that keyboard users could not focus. Added a labeled `region`, `tabIndex={0}`, a visible focus indicator, and a focus assertion.

Both previously failing cases passed after the fixes. The subsequent full clean-copy run passed all 8 browser cases. The earlier HTTP 500/413 defect remains covered by `tests/app.test.ts`.

## Screenshots

- [Desktop](screenshots/desktop.png)
- [Mobile](screenshots/mobile.png)

Captured directly by the passing browser test, with fictional records in an isolated database. Its 90-minute record is a deterministic test fixture, not a claim that someone worked for that duration during verification. Screenshots were visually inspected.

## GitHub and remaining handoff

The repository was confirmed **public** through GitHub. [PR #3](https://github.com/dias-btt/falconai-test/pull/3) was confirmed merged, and [its CI run](https://github.com/dias-btt/falconai-test/actions/runs/41495428078) passed on Node 24.2.0 and current Node 24.

Those results cover the previous timer/report commit. The pending final PR adds the browser CI job; it still needs to be pushed, checked by GitHub Actions, and merged by the author. No remote CI result is claimed for unpushed changes. The application form should point to the [public repository](https://github.com/dias-btt/falconai-test) after that merge.

## Limits

Chromium desktop/mobile coverage is not a cross-engine guarantee. Automated accessibility scanning is not a complete accessibility audit. The app deliberately has no authentication, no hosted demo, and no automatic synchronization between browser tabs; use Refresh. Node's SQLite API is experimental in the minimum runtime. The development-only [minimatch advisory](https://github.com/advisories/GHSA-g3hv-75wg-m249) remains documented rather than hidden by a forced cross-major override.
