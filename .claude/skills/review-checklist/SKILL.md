---
name: review-checklist
description: Project-specific review checklist (architecture, security, tests, docs) for changes to the HTML Formatter monorepo. Use when reviewing a diff, branch or pull request, together with the built-in /code-review and /security-review.
---

# Review checklist

Run the built-in `/code-review` (and `/security-review` for anything touching `packages/desktop`, IPC, file handling
or rendering). Then check the project-specific points below. Report findings with file:line and a concrete failure
scenario; separate confirmed problems from suspicions.

## Architecture

- [ ] Code is in the right layer (see `AGENTS.md` map); `pnpm lint` boundary rules pass without new disables.
- [ ] Shared packages contain nothing format-specific; apps only wire things together.
- [ ] Contracts (`ElectronApi`, `FormatAdapter`, `FormatInfo`, worker protocol) unchanged, or changed with an ADR,
      updated `docs/api/contracts.md`, and every implementation updated.
- [ ] No new dependency without a reason; runtime `dependencies` of apps stay minimal (they ship in the installer).
- [ ] No behaviour change in a refactor; business-rule changes were approved.

## Security (`docs/security.md`)

- [ ] Every IPC handler validates its arguments; file paths come from `pickedFiles`; settings go through `validateConfig`.
- [ ] No `innerHTML` / `dangerouslySetInnerHTML`; file content is rendered through `RichText` as text.
- [ ] `sandbox`, `contextIsolation`, CSP, navigation and window-open guards unchanged.
- [ ] Preload imports only `electron` at runtime.
- [ ] Router `validateSearch` returns every key; `back`-style params only accept in-app paths.
- [ ] The original file can't be overwritten; writes go through a temporary file then rename.
- [ ] Errors shown to users contain no stack traces or internal paths beyond the user's own file.

## Correctness and robustness

- [ ] Large files: no work on the main thread; progress throttled; Cancel cleans up temporary files.
- [ ] Formulas, numbers, dates, links and merged-over cells stay untouched (or the format's equivalent).
- [ ] Error messages tell the user what to do; original errors kept as `{ cause }`.

## Tests and docs

- [ ] Unit tests for new logic; coverage floors still pass (`pnpm test:coverage`).
- [ ] e2e updated if the main flow changed (`pnpm test:e2e`).
- [ ] Docs updated per the `docs-sync` skill; `CHANGELOG.md` entry if notable.
