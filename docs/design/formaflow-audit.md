# FormaFlow redesign: audit and implementation plan

Last reviewed: 2026-11-10. Phase 0 of the redesign in
[`FormaFlow-Claude-Redesign/CLAUDE_IMPLEMENTATION_GUIDE.md`](FormaFlow-Claude-Redesign/CLAUDE_IMPLEMENTATION_GUIDE.md)
(the guide). The guide and its reference images define the **appearance**; this audit records what the running app
**actually does**, so the redesign never shows capabilities that don't exist. Approved by the Tech Lead on 2026-11-10
with decisions R1–R9 (section 6).

## 1. Stack and entry points

| Part          | What                                                                                                     | Entry point                                                                                           |
| ------------- | -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Desktop shell | Electron 45 (sandbox, context isolation, CSP `default-src 'self'`)                                       | `apps/excel-formatter/src/main/main.ts` → `startDesktopApp()` in `packages/desktop/src/main/index.ts` |
| Window        | React 19, TanStack Router 1.170 (hash history), zustand 5                                                | `apps/excel-formatter/src/renderer/main.tsx` → `mountFormatterApp()` in `packages/ui/src/index.tsx`   |
| File work     | Worker threads (load, check, export, verify) with progress and Cancel                                    | `apps/excel-formatter/src/main/worker.ts` → `runWorker()` in `packages/desktop/src/worker`            |
| Engine        | Pure TypeScript tokenizer, HTML → document model → Excel rich text, content proof                        | `packages/core`                                                                                       |
| Excel I/O     | ExcelJS 4.4 (`.xlsx` only)                                                                               | `packages/adapter-excel`                                                                              |
| Monorepo      | pnpm 12 workspaces, Turborepo 2, TypeScript 7 (lint on TypeScript 6, ADR 0007)                           | root `package.json`, `turbo.json`                                                                     |
| Tests         | Vitest 5 (unit, per package, coverage floors), Playwright 1.65 against the built Electron app (11 tests) | `pnpm check`, `pnpm test:coverage`, `pnpm test:e2e`                                                   |
| CI            | AppVeyor (Windows): lint, format, type-check, build, coverage + JUnit, e2e, installers                   | `appveyor.yml`                                                                                        |

No new framework is needed; the redesign uses the same stack (guide §1 "no premature rewrite").

## 2. Routes, screens and components today

| Address                         | Screen (`packages/ui/src/screens/`)                                                            | Guard                           |
| ------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------- |
| `#/`                            | `Dashboard` (Home: start cards, Coming soon conversions, tools, recent activity, save message) | —                               |
| `#/open`                        | `OpenFile` (drop zone, browse, reading progress)                                               | workflow started from Home      |
| `#/sections`                    | `SelectSections` (sheet table with sizes, HTML cells, tags)                                    | open file                       |
| `#/analysis/$section`           | `TagAnalysis` (tags per sheet, their style, preview)                                           | selected sheet                  |
| `#/preview/$section?view=`      | `PreviewExport` (Excel-style grid, content check chip, Save)                                   | selected sheet                  |
| `#/check/$section?cell=&saved=` | `CheckReview` (compare screen: items, original / converted / saved text, CSV, Save anyway)     | selected sheet, or a saved file |
| `#/settings?tag=&back=`         | `TagStyles` (one profile; add, edit, remove rules; import/export JSON; reset)                  | —                               |
| `#/help`, `#/help/$topic`       | `Help`, `HelpTopic` (Markdown topics, search)                                                  | —                               |

Window frame: `design/templates/AppLayout` (sidebar, header with Help and Theme, error banner, toast), with
`StartupScreen` until the settings load. Components follow Atomic Design (ADR 0011, 0016): 8 atoms, 9 molecules,
15 organisms, 3 templates; state in `state/store.ts`; hooks, features/help and utils outside the levels.

## 3. Feature status

| Feature                                                                                 | Status            | Notes for the redesign                                                                   |
| --------------------------------------------------------------------------------------- | ----------------- | ---------------------------------------------------------------------------------------- |
| Excel `.xlsx` input (dialog, drag and drop)                                             | **Live**          | Only `.xlsx` (`excelFormat.fileTypes`). ExcelJS can't read `.xls`: **don't show `.xls`** |
| File size limit                                                                         | **None**          | Only an out-of-memory message (`desktop/src/protocol.ts`). **No "maximum 100 MB"**       |
| Sheet selection                                                                         | Live              | Real size label per sheet ("rows × columns"), HTML cell count, tags                      |
| Tag analysis and tag styles                                                             | Live              | One profile ("Default"), 21 rules by default; built-in looks; import/export JSON; reset  |
| Formatting (HTML → rich text, lists, tables, links, highlight)                          | Live              | `htmlToRuns`, `convertWorkbook`                                                          |
| Content check before saving                                                             | Live              | Every converted cell: missing / changed text, 32,767-character limit; notes; CSV report  |
| Save                                                                                    | Live              | Save dialog, never over the original, temporary file then rename, Cancel                 |
| Verification after saving                                                               | Live              | Re-reads the saved file: converted cells as written (B), every other cell unchanged (C)  |
| Recent activity                                                                         | Live              | 10 entries, recorded by main (ADR 0013); Open again = dialog in that folder              |
| Theme Light / Dark / System                                                             | Live              | `nativeTheme`, saved in `preferences.json` (ADR 0014); WCAG AA tokens                    |
| Help Center                                                                             | Live              | Markdown topics with search (ADR 0015)                                                   |
| Startup screen, workflow lock                                                           | Live              | FR-29, FR-30                                                                             |
| Processed locally                                                                       | **Confirmed**     | No network code in any package (no fetch/http/updater). The privacy strip may say so     |
| Word, PDF, text input; conversions to PDF/Word/text/CSV                                 | **Not built**     | "Coming soon", disabled (guide §1)                                                       |
| Several profiles, favorites, templates, automation, search, notifications, user account | **Not built**     | Not shown (decision R6)                                                                  |
| Estimated processing time                                                               | **Not available** | Not shown                                                                                |

## 4. How processing, rules, sheets, save and verification work

1. **Open:** the window asks main for the Open dialog (or describes a dropped file); main keeps an allow-list of picked
   files. `document:open` starts a session worker: `reading` → `scanning` (sheets done of total) → `DocumentSummary`.
2. **Rules:** `AppConfig` (`config.json`, validated by `validateConfig`) maps tags to styles; tags without a rule are
   removed or kept as text (`unknownTagAction`).
3. **Preview:** the window converts each visible cell with `htmlToRuns` (same code as the save) and draws the grid.
4. **Content check:** `document:check` runs in the session worker: `checking` with cells done of total; returns
   `ContentReport` (issues, notes, items with proofs).
5. **Save:** `document:export` → Save dialog → a fresh worker: `converting` → `saving` → `verifying` (cells done of
   total) → `ExportResult` with `stats` and `verification` (`SaveVerification`, or null if the check was stopped).
6. **Verification model:** check A (before saving, no text lost), D (cell limit), B (saved = converted), C (other cells
   unchanged). HTML removed by formatting is an _expected_ change, not a loss (layout markers are told apart).

These real stages feed the redesign's Process, Compare & Verify and Export screens (no invented percentages).

## 5. Design tokens and dependencies today

- `packages/ui/src/styles/tokens.css`: light and dark colours, radius, spacing 4–20 px, text sizes 11.5–15 px;
  `--control-border`, `--on-accent`, `--on-ok`; contrast checked by `ui/tests/tokens.test.ts`.
- Before the redesign: body text 14 px Segoe UI, headings 20 px, Unicode characters as icons. Phase 1 (2026-11-10) moved to the guide's navy and blue tokens, a 14–28 px type scale (Segoe UI Variable) and lucide line icons.
- `@hf/ui` runtime dependencies: `@hf/core`, `@tanstack/react-router`, `zustand`, and since Phase 1 `lucide-react` 1.61.0 (ISC, decision R1; the newest release at least two weeks old) (React as a peer).
- **Scale:** the reference images appear to be captured at 125–150 % Windows display scaling, so their text looks
  larger at the same window size. The redesign follows the guide's type scale (body 14–16 px, page headings 26–36 px),
  not the mockups' pixels.

## 6. Decisions, risks and migration

Approved decisions:

| #   | Decision                                                                                                                                                                                   |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| R1  | Add `lucide-react` (ISC licence, tree-shaken) for line icons                                                                                                                               |
| R2  | ~~Generic file-type glyphs only~~ Replaced 2026-11-10 at the product owner's request: the prototype's labelled pages (X, W, PDF, TXT)                                                      |
| R3  | A clean save shows an in-workflow **Complete** screen (Open file, Show in folder, Start new task); this replaces FR-29's return to Home with a message                                     |
| R4  | The **Process** step runs the real content check with live counts; Review is always shown before Export (covers the old FF-8)                                                              |
| R5  | Recent file "Open" keeps ADR 0013: the Open dialog in that folder, never a stored path                                                                                                     |
| R6  | Sidebar: Home, My Workspace (the active workflow; disabled when none), Recent Files (new page), Formatting Profiles (today's Tag styles, one profile), Settings (new page), Help & Support |
| R7  | Stop after each phase for approval                                                                                                                                                         |
| R8  | The old FF-8 and FF-9 are merged into phases 6 and 9                                                                                                                                       |
| R9  | A new IPC call opens only files this app saved (ADR + contracts)                                                                                                                           |

Risks and compatibility:

- **End-to-end tests** select by role and text; the new flow changes most of them. Each phase updates them.
- **Routes:** old addresses (`#/open`, `#/sections`, …) keep working or redirect while screens merge.
- **Contrast:** new navy and blue tokens must keep passing `tokens.test.ts` (WCAG AA) in both themes.
- **Reference fidelity:** the mockups are AI-generated; some details (`.xls`, 100 MB, "~5–30 seconds", 75 %, "100 %
  match", user names, notifications) are illustrative and will not be copied.
- **Folder rename** of the local checkout is pending (see the CHANGELOG); it doesn't affect the code.

Migration: incremental, one phase at a time, each with tests, screenshots against the references, and docs.

## 7. File-by-file plan

C = create, M = modify, K = keep. Paths under `packages/ui/src/` unless stated.

| Phase                 | Files                                                                                                                                                                                                                                                                                                                                   |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 Theme and shell     | M `styles/tokens.css`, `styles/base.css`, `design/atoms/{Button,Icon,Logo}.tsx`, `design/organisms/{Sidebar,AppHeader}.tsx`, `design/templates/AppLayout.tsx` and CSS; C `design/molecules/Breadcrumbs.tsx`; M `packages/ui/package.json` (`lucide-react`); M tests                                                                     |
| 2 Home ✅             | Built: C `features/workflow/registry.ts` (file types, actions), `design/atoms/FileGlyph.tsx`, `design/molecules/{RadioCards,HeroArt,WaveArt,JourneySteps}.tsx`, `design/organisms/QuickActions.tsx`; M `design/organisms/RecentActivity.tsx` (rows), `screens/Dashboard.tsx`, `state/store.ts`, `styles/tokens.css` (prototype colours) |
| 3 Workflow and Upload | C `design/templates/WorkflowLayout.tsx`, `design/organisms/{WorkflowStepper,TaskSummary,FileDropzone}.tsx`; M `screens/OpenFile.tsx`, `router.tsx`                                                                                                                                                                                      |
| 4 Configure           | C `screens/Configure.tsx` (Sheets and Tag styles tabs); M `screens/{SelectSections,TagAnalysis}.tsx` → organisms                                                                                                                                                                                                                        |
| 5 Process             | C `screens/Process.tsx`, `design/organisms/ProgressStages.tsx`; M `state/store.ts`                                                                                                                                                                                                                                                      |
| 6 Compare & Verify    | M `screens/{PreviewExport,CheckReview}.tsx`; C `utils/verification.ts` (reports → pass / fail / not checked)                                                                                                                                                                                                                            |
| 7 Export & Complete   | C `screens/Complete.tsx`; M `packages/desktop/src/{main,preload}`, `packages/core/src/types.ts` (`openSavedFile`), `docs/api/contracts.md`; C ADR                                                                                                                                                                                       |
| 8 Pages               | C `screens/{RecentFiles,Settings}.tsx`; M `screens/{TagStyles,Help,HelpTopic}.tsx`                                                                                                                                                                                                                                                      |
| 9 Polish and docs     | M help topics, FDS, SRS, TDS, user manual, CHANGELOG, roadmap; C `docs/design-system.md`                                                                                                                                                                                                                                                |
| Throughout            | K `packages/core`, `packages/adapter-excel`, worker protocol, settings formats, file-safety rules                                                                                                                                                                                                                                       |

## 8. Baseline

Screenshots of the current app at 1672 × 941 (dark and light: Home, Open, Select sheets, Tag analysis, Preview,
compare screen, Home after a save, Tag styles, Help) were taken on 2026-11-10 for side-by-side comparison with the
references during each phase.
