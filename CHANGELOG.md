# Changelog

All notable changes are listed here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and versions follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- FormaFlow **logo** ("page in flow", chosen from three concepts): new app icon, the mark next to the name in the
  sidebar, and a favicon. See `docs/design/brand.md`.
- **Help Center** (Help in the header and on Home): Getting started, User guide, FAQs, Troubleshooting and About, with
  search. Written in Markdown in `apps/excel-formatter/help/` and shown without HTML; About shows the version and
  settings file (ADR 0015).
- **Theme:** Light, Dark or System from a new header bar; applied to the window, dialogs and menus, remembered, and
  no white flash when a dark window opens (ADR 0014).
- **Home** screen (the new start screen): open a file or continue with the open one, planned conversions to PDF, Word
  and text shown as "Coming soon", Tag styles, and **Recent activity** (last 10 opens and saves with the saved file's
  check result, Open again, Clear). Activity is recorded by the main process and stored on this computer (ADR 0013).
- ESLint, Prettier, EditorConfig and `.gitattributes`. ESLint rules enforce the package boundaries (ADR 0007).
- End-to-end tests with Playwright against the real built app (`pnpm test:e2e`, ADR 0008).
- Coverage reports with per-package floors (`pnpm test:coverage`).
- Documentation set in `docs/`: architecture (SAD), ADRs 0001–0008, technical design, contracts, settings schema,
  requirements (SRS), functional design (FDS), user manual, developer guide, testing strategy, security, deployment,
  troubleshooting and roadmap.
- AppVeyor CI (`appveyor.yml`): lint, format, type-check, build, unit tests with coverage, e2e, installers; JUnit
  results, caching of pnpm/Electron/Node downloads and the Turborepo cache. `pnpm test:ci` writes JUnit reports.
- Agent instructions (`AGENTS.md`, `CLAUDE.md`) and project skills in `.claude/skills/`.

### Changed

- Colours meet WCAG 2.2 AA in both themes: darker hint text, green and amber text, stronger outlines on inputs,
  buttons and toggles, and dark text on blue and green in dark mode. A unit test checks every pair.
- Renamed the app to **FormaFlow** (window, sidebar with a tagline, installers, shortcuts, documentation). Settings stay
  in the existing "Excel HTML Formatter" folder and the installer upgrades the old app (ADR 0012).
- The window's code is organised by Atomic Design (ADR 0011): design tokens, atoms, molecules, organisms and templates
  in `packages/ui/src/design/`, screens built on `ScreenTemplate`, no fixed inline styles, and component tests
  (`@hf/ui` coverage floors raised). Nothing users see changed.
- Read and write errors from the Excel adapter keep the original error as `cause`. Messages are unchanged.
- The historical plan and demo moved to `docs/history/`.

## [0.1.0] - 2026-11-09

### Added

- Excel HTML Formatter: open an `.xlsx` file, select sheets, analyse the tags, set tag styles, preview, and save a
  formatted copy with real rich text.
- Background worker with a progress bar and Cancel; Windows installer and portable `.exe`; macOS universal `.dmg`
  configuration.
- Monorepo with pnpm workspaces and Turborepo; TanStack Router with hash history and route guards.

### Security

- `?back=` in Tag styles only accepts in-app paths. Before this fix, an outside URL could have reached the Done button.
