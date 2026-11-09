# AGENTS.md — instructions for AI coding agents

This is the single source of agent instructions for this repository (`CLAUDE.md` imports it). Keep it short and true;
details live in `docs/`. If something here disagrees with the code, the code wins — fix this file.

## What this project is

Desktop apps (Electron) that turn HTML tags inside documents (`<b>x</b>`) into real formatting. One app per file format,
built from shared packages. Today: **Excel HTML Formatter** (`apps/excel-formatter`). Planned: export/conversion to
PDF, DOCX, TXT, HTML, Markdown — see `docs/roadmap.md` (phases need Tech Lead approval before work starts).

## Map

| Path                     | What it is                                                                                               | Must not import                                  |
| ------------------------ | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `packages/core`          | Pure engine: tokenizer, HTML → runs, tag scan, settings validation, types, `FormatAdapter`, `FormatInfo` | Electron, Node, React, other `@hf/*`, libraries  |
| `packages/adapter-excel` | `.xlsx` via ExcelJS (worker side); `./format` is browser-safe                                            | Electron, React, `@hf/ui`, `@hf/desktop`         |
| `packages/desktop`       | Electron shell: `./main` (window, IPC, settings), `./worker`, `./preload`                                | React, `@hf/ui`, format adapters                 |
| `packages/ui`            | React window: screens, routes and guards, zustand store, design system in `src/design/` (ADR 0011)       | Electron, Node, ExcelJS, `@hf/desktop`, adapters |
| `apps/excel-formatter`   | Composition root: wires format + adapter + preview; packaging; e2e tests                                 | —                                                |
| `tools/lint`             | ESLint + Prettier (uses TypeScript 6 on purpose, see ADR 0007)                                           | —                                                |
| `docs/`                  | All documentation; start at `docs/README.md`                                                             | —                                                |

The "must not import" column is enforced by ESLint (`tools/lint/config.js`). Don't weaken those rules to make an import
work — move the code to the right layer instead.

## Commands (repo root, Node 26, pnpm 12)

```bash
pnpm install          # after cloning or pulling
pnpm check            # lint + format check + type-check + unit tests (must pass before you finish)
pnpm test:e2e         # builds the app, then 5 Playwright tests against the real Electron app
pnpm test:coverage    # coverage with per-package floors
pnpm test:ci          # coverage + JUnit reports (what CI runs)
pnpm format           # apply Prettier
pnpm dev              # run the Excel app with live reload
pnpm dist:excel       # package installers (Windows: .exe; macOS: .dmg)
```

## Rules

1. **Plan first for anything non-trivial.** Phases in `docs/roadmap.md` need Tech Lead approval. Don't start a new
   phase on your own.
2. **Preserve behaviour.** Refactors must not change what users see. Business-logic changes need explicit approval.
3. **Where code goes:** format-specific → an adapter package; Electron/IPC → `packages/desktop`; screens and state →
   `packages/ui`; pure logic → `packages/core`. Apps only wire things together.
4. **Contracts** (`ElectronApi`, `FormatAdapter`, `FormatInfo`, the worker protocol) change only with an ADR and
   updates to `docs/api/contracts.md`.
5. **Security:** never render cell text as HTML (no `innerHTML`/`dangerouslySetInnerHTML`); validate everything that
   crosses IPC; only open files the user picked; never overwrite the original file; keep `sandbox`/`contextIsolation`
   on. See `docs/security.md`.
6. **Tests:** add or update unit tests with every change (Vitest, next to the package in `tests/`). Coverage floors in
   each `vitest.config.ts` may be raised, never lowered without review. UI flow changes need the e2e tests updated.
7. **Router search params:** `validateSearch` must return every key (TanStack keeps raw values for omitted keys).
8. **Style:** Prettier formats (no semicolons, single quotes, 120 columns). Comments explain _why_, not _what_.
   User-facing text is plain, sentence-case English.
9. **Docs in the same change:** update the documents listed in the `docs-sync` skill. Record architectural decisions as
   ADRs (`docs/architecture/adr/`).
10. **Never fake results.** Report test/build output as it is. If you couldn't run something, say so.
11. **Commits:** only when asked. Conventional, descriptive messages.

## Skills (in `.claude/skills/`)

| Skill              | Use when                                                                      |
| ------------------ | ----------------------------------------------------------------------------- |
| `add-format`       | Adding a file format (a new app, or later a reader/writer for export)         |
| `add-feature`      | Adding or changing a screen, route or UI feature                              |
| `verify-release`   | Before merging or releasing: the full verification checklist                  |
| `docs-sync`        | At the end of any change: which documents to update                           |
| `review-checklist` | Reviewing a change (use with the built-in `/code-review`, `/security-review`) |

## Gotchas

- typescript-eslint doesn't support TypeScript 7 yet; that's why lint has its own package (ADR 0007).
- Router tests need `// @vitest-environment happy-dom` (no DOM = server mode).
- A first `pnpm install` that fails before scripts run can leave Electron undownloaded; run `pnpm rebuild --pending`
  or Electron's `install.js` (see `docs/operations/troubleshooting.md`).
- Windows packaging fails if the repo path is very long (NSIS 260-character limit).
- e2e tests launch the **built** app; `pnpm test:e2e` builds first. They use a temporary `--user-data-dir`.
