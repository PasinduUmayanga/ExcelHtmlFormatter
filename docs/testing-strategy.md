# Testing Strategy

Last reviewed: 2026-11-09 · Decisions: [ADR 0008](architecture/adr/0008-playwright-electron-e2e.md)

## Test levels

| Level             | Tool                                   | Where                                  | What it covers                                                            | Runs in                 |
| ----------------- | -------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------- | ----------------------- |
| Static            | TypeScript 7, ESLint, Prettier         | all packages                           | Types, rules, **package boundaries**, formatting                          | `pnpm check`            |
| Unit              | Vitest 5.1                             | `packages/*/tests`                     | Engine, settings validation, adapter logic, worker handler, router guards | `pnpm check`            |
| Integration       | Vitest 5.1 with real files and threads | `adapter-excel/tests`, `desktop/tests` | Real `.xlsx` round trips; a real worker thread incl. Cancel               | `pnpm check`            |
| End-to-end        | Playwright 1.65 (Electron)             | `apps/excel-formatter/e2e`             | The built app driven like a user                                          | `pnpm test:e2e`         |
| Independent check | openpyxl (Python), manual              | outside the repo                       | Saved files read correctly by another implementation; opening in Excel    | before releases         |
| Performance       | Scripted measurement                   | outside the repo (see ADR 0003)        | Main-process blocking and frame gaps with 60,000–240,000 cells            | after worker/UI changes |

## Current numbers (2026-11-09)

- Unit/integration: **298 tests** — core 132, adapter-excel 57, ui 88, desktop 21.
- End-to-end: **11 tests** — start-up failure and Try again; start state (Home, Coming soon cards, workflow locked, also by address); Help (keyboard, search, links between topics,
  About details); theme (applies everywhere, survives a restart,
  dark window background); Home (Continue mid-workflow, entries after a save,
  Open again starts in the right folder, Clear survives a restart); open → analyse → set style → preview → export (back on Home with the summary, workflow locked, saved file checked, original
  unchanged); a content issue stops the save until "Save anyway", with a CSV report; refuse to overwrite the original;
  Cancel during a 60,000-cell export leaves no file; Cancel while checking the saved file keeps the file; reload
  returns to Home with the workflow locked.
- Colour contrast: `ui/tests/tokens.test.ts` reads `tokens.css` and checks every text pair (≥ 4.5:1) and control
  boundary (≥ 3:1) in light and dark.
- e2e launches Electron with `colorScheme: null` (no light emulation), so tests see the app's real theme.
- `@hf/ui` components have unit tests by level (`atoms`, `molecules`, `organisms` tests): rendered markup with
  `renderToStaticMarkup`, clicks and typing with happy-dom and React's `act`. No testing library is needed.

## Coverage

Floors are set in each `packages/*/vitest.config.ts` and checked by `pnpm test:coverage`. They may be raised, never
lowered without review. Set a new floor about one point below the measured value: a floor equal to the measurement
fails on machines where timing-dependent code runs a little differently (as happened in CI).

| Package             | Lines | Statements | Functions | Branches | Note                                                                      |
| ------------------- | ----- | ---------- | --------- | -------- | ------------------------------------------------------------------------- |
| `@hf/core`          | 99    | 99         | 100       | 95       |                                                                           |
| `@hf/adapter-excel` | 98    | 91         | 96        | 82       |                                                                           |
| `@hf/desktop`       | 23    | 21         | 15        | 14       | IPC handlers untested at unit level (covered by e2e); Phase 2 raises this |
| `@hf/ui`            | 45    | 44         | 38        | 37       | Components unit-tested (ADR 0011); screens covered by e2e                 |

## Quality gates

| When                   | Must pass                                                                                                                                                                                               |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Every commit           | `pnpm check`                                                                                                                                                                                            |
| Before merging         | `pnpm check`, `pnpm test:coverage`, `pnpm test:e2e` if UI/IPC/packaging changed                                                                                                                         |
| Before a release       | The `verify-release` skill: forced (uncached) checks, coverage, e2e, packaging, package contents, an independent read of a saved file                                                                   |
| CI (GitHub Actions)    | Install with frozen lockfile, `typecheck test build`, then `dist` (Windows + macOS). Lint and e2e to be added in Phase 5                                                                                |
| CI (AppVeyor, Windows) | `lint`, `format:check`, `typecheck`, `build`, `test:ci` (coverage floors + JUnit), `test:e2e` (JUnit), `dist`; results in the Tests tab ([deployment](operations/deployment.md#continuous-integration)) |

## Writing tests

- Test behaviour through public functions; build input files inside the test (see `sampleWorkbook.mts`).
- Name tests after the behaviour ("refuses to overwrite the original file"); mention `FR-xx` where useful.
- Router tests need `// @vitest-environment happy-dom`.
- e2e tests use `launchApp()` (temporary user-data folder) and replace dialogs with `answerOpenDialog` /
  `answerSaveDialog`. Never depend on the user's real settings or on simulated drag-and-drop.

## Known gaps

Desktop IPC handlers and UI screens lack unit tests; there are no visual-regression tests; macOS isn't tested yet;
performance isn't measured in CI. Planned in Phases 2 and 5 ([roadmap](roadmap.md)).
