# Developer Guide

Last reviewed: 2026-11-09. How to set up, change, test and extend the project. Architecture:
[SAD](architecture/SAD.md). Rules for AI agents: [AGENTS.md](../AGENTS.md).

## 1. Environment

| Tool    | Version                 | Notes                                                                             |
| ------- | ----------------------- | --------------------------------------------------------------------------------- |
| Node.js | 26 LTS                  | `.nvmrc`; `engines` requires ≥ 26. The packaged app uses Electron's Node 24       |
| pnpm    | 12.18                   | `packageManager` field. Node 26 no longer bundles corepack: install pnpm yourself |
| OS      | Windows 10/11 or macOS  | macOS installers can only be built on macOS                                       |
| Editor  | Any; VS Code works well | `.editorconfig` is respected; run Prettier on save if you like                    |

```bash
git clone <repo> && cd <repo>
pnpm install          # Electron's download script is the only install script allowed (pnpm-workspace.yaml)
pnpm check            # should pass on a fresh clone
pnpm dev              # Excel app with live reload
```

Keep the clone in a short path on Windows (NSIS can't read paths over 260 characters).

## 2. Everyday commands

| Command                                               | What it does                                                        |
| ----------------------------------------------------- | ------------------------------------------------------------------- |
| `pnpm check`                                          | Lint, format check, type-check, unit tests: run before every commit |
| `pnpm test`                                           | Unit tests only (Turborepo-cached)                                  |
| `pnpm test:coverage`                                  | Unit tests with coverage floors (`packages/*/vitest.config.ts`)     |
| `pnpm test:e2e`                                       | Builds the app, then Playwright tests against the real app          |
| `pnpm lint:fix`                                       | ESLint auto-fixes                                                   |
| `pnpm format`                                         | Prettier on the whole repo                                          |
| `pnpm build`                                          | Build every app to `apps/*/out`                                     |
| `pnpm dist:excel`                                     | Installers in `apps/excel-formatter/dist`                           |
| `pnpm --filter @hf/adapter-excel sample`              | Regenerate the small sample workbook                                |
| `pnpm --filter @hf/adapter-excel sample:large [rows]` | Large workbook for speed tests (gitignored)                         |

Run a single package's tests: `pnpm --filter @hf/core test`. Watch mode: `cd packages/core && npx vitest`.

## 3. Coding standards

- **Formatting:** Prettier (no semicolons, single quotes, 120 columns, LF line endings). Don't hand-format.
- **Linting:** ESLint with typescript-eslint recommended rules, React Hooks rules, and **package-boundary rules**. A
  boundary error means the code is in the wrong layer; move it instead of disabling the rule.
- **TypeScript:** `strict`, no unused locals or parameters (prefix with `_` if intentional). Prefer types from
  `@hf/core` over local copies.
- **Naming:** files `camelCase.ts` for modules, `PascalCase.tsx` for React components. Tests in `tests/*.test.ts`.
- **Comments:** explain _why_ (constraints, edge cases). Public functions in shared packages get a one-line doc comment.
- **User-facing text:** plain English in sentence case. Errors say what to do next. No jargon in the UI.
- **Errors:** throw `Error` with a user-actionable message; keep the original as `{ cause }`.

## 4. Where code goes (modules and shared libraries)

| If the code…                                  | Put it in                            |
| --------------------------------------------- | ------------------------------------ |
| is pure logic, used by several layers or apps | `@hf/core`                           |
| reads or writes a specific file format        | an adapter package (`@hf/adapter-*`) |
| needs Electron, dialogs, IPC, the file system | `@hf/desktop`                        |
| is a screen, route, UI component or UI state  | `@hf/ui`                             |
| only connects pieces for one app              | `apps/<app>`                         |

Create a shared package only when at least two consumers need the code. Each package is consumed as TypeScript
source (`exports` → `src/…`); there's no build step per package.

## 5. Testing and debugging

- **Unit tests (Vitest):** in each package. Core and adapters are tested with real data (the Excel adapter writes and
  re-reads real `.xlsx` files). Router tests run in happy-dom (`// @vitest-environment happy-dom`).
- **Coverage floors:** set in each `vitest.config.ts`. Raise them as coverage improves; never lower them without review.
- **End-to-end (Playwright):** `apps/excel-formatter/e2e`. Tests launch the built app with a temporary
  `--user-data-dir` and replace native dialogs in the main process (`answerOpenDialog`, `answerSaveDialog` in
  `fixtures.ts`).
- **Debugging the app:** `pnpm dev`, then use DevTools in the window (Ctrl+Shift+I) for the window side. For the main
  process, start Electron with `--inspect=9229` and attach a Node debugger.
- **Common problems:** see [troubleshooting](operations/troubleshooting.md).

## 6. Adding a feature (screen or route)

1. Add the screen in `packages/ui/src/screens/` and its route in `packages/ui/src/router.tsx`. Add a guard if it
   needs an open document, and validate search params, **returning every key**.
2. Put data in the store (`packages/ui/src/store.ts`), not in component state, if other screens need it.
3. If it needs the main process, add an IPC method: update `ElectronApi` in `@hf/core`, the preload, the main
   handler (validating every argument), and [contracts.md](api/contracts.md).
4. Use the format's words from `useFormatterApp().format` instead of hard-coding "sheet" or "cell".
5. Tests: unit tests for the logic, a router test for guards, an e2e step if it changes the main flow.
6. Docs: FDS (behaviour), user manual (if users see it), plus the `docs-sync` skill checklist.

**Help text** is Markdown in `apps/<app>/help/*.md` (one file per topic, `# Title` then a one-line summary), listed
in `src/renderer/help.ts`. Only headings, paragraphs, lists, bold, italic, code and links between topics
(`other-topic.md#section`) are supported ([ADR 0015](architecture/adr/0015-help-center-markdown.md)). When a feature
changes, update the help in the same change.

**Where UI code goes (Atomic Design, [ADR 0011](architecture/adr/0011-atomic-design-in-ui.md)):** reuse what is in
`packages/ui/src/design/` before writing markup. A new piece goes to the lowest level that fits: an element with no
parts (`atoms/`), a few atoms working together (`molecules/`), a section that knows the store or the router
(`organisms/`), a layout (`templates/`). Screens in `screens/` compose them inside `ScreenTemplate` and hold only what
is specific to that screen. Use tokens and the helpers in `utilities.css` instead of inline styles; keep existing class
names (the e2e tests use them). Screens and components don't call `window.api`; add a store action instead. Test
components with `renderToStaticMarkup`, or with happy-dom and React's `act` for clicks (see
`packages/ui/tests/molecules.test.tsx`).

## 7. Adding a format

**Same-format app (for example Word → Word):**

1. `packages/adapter-<format>`: implement `FormatAdapter` (`read`, `summarize`, `preview`, `convert`, `write`) and a
   browser-safe `./format` export with its `FormatInfo` and preview types. Test with real files.
2. `apps/<format>-formatter`: copy `apps/excel-formatter` and change `src/main/main.ts`, `src/main/worker.ts`,
   `src/renderer/main.tsx`, the preview component, `package.json` (runtime `dependencies` = the format library only),
   `electron-builder.yml`, the icon, and the e2e tests.
3. Nothing in `core`, `desktop` or `ui` should change. If it must, that's a contract change: write an ADR.

**Exporting to another format** (PDF, DOCX, TXT, HTML, Markdown) needs the reader → document model → writer pipeline
planned in roadmap Phase 3. Don't add it ad hoc to an adapter.

The `add-format` skill walks through this step by step.

## 8. AI-assisted development

- Agents read [AGENTS.md](../AGENTS.md) (Claude Code also reads `CLAUDE.md`, which imports it, plus
  `packages/core/CLAUDE.md` and `packages/desktop/CLAUDE.md` in those folders).
- Use the project skills in `.claude/skills/`: `add-format`, `add-feature`, `verify-release`, `docs-sync`,
  `review-checklist`. Use them with the built-in `/code-review` and `/security-review`.
- Larger work follows the approval workflow in [roadmap.md](roadmap.md): analyse → plan → approve → implement one
  task at a time → validate → update the docs and roadmap.
- Agents must report real command output. If something couldn't be run, they say so.
- When the project changes, update `AGENTS.md` and the affected skill in the same change, so the agent instructions
  stay true.
