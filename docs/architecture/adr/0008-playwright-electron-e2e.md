# 0008. Playwright for end-to-end tests of the Electron app

- Status: Accepted
- Date: 2026-11-09

## Context

Unit tests cover the engine and adapter well, but the full app (main process, worker, preload, window, routing,
native dialogs) was only checked with ad-hoc scripts outside the repository.

## Decision

Use Playwright 1.65 (`@playwright/test`, `_electron.launch`) in `apps/excel-formatter/e2e`:

- Launch the **built** app with `--user-data-dir=<temp>` so tests never touch real settings.
- Replace native Open/Save dialogs inside the main process (`app.evaluate(({ dialog }) => …)`) instead of simulating
  drag-and-drop, which proved flaky.
- Run with `pnpm test:e2e` (Turborepo builds the app first). Not part of `pnpm check`, because it needs a desktop
  session; it is part of the release checklist and CI on Windows.

## Consequences

- 5 smoke tests cover: start state, the full open → analyse → style → preview → export flow (with the saved file
  checked), refusing to overwrite the original, Cancel during a large export, and route guards after reload.
- Playwright's Electron support is marked experimental by Playwright; if it breaks on an Electron upgrade, the fallback
  is driving the app over the Chrome DevTools Protocol (as done before this ADR).

## Alternatives considered

- **Chrome DevTools Protocol scripts:** worked, but needed hand-written helpers and simulated drag-and-drop.
- **WebdriverIO + Electron service:** heavier setup for the same coverage.
