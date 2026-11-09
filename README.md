# HTML Formatter

[![Build status](https://ci.appveyor.com/api/projects/status/eujqqr0dl6v4fh3p?svg=true)](https://ci.appveyor.com/project/Mahadenamuththa/excelhtmlformatter)
![Node.js](https://img.shields.io/badge/Node.js-26_LTS-5FA04E?logo=nodedotjs&logoColor=white)
![pnpm](https://img.shields.io/badge/pnpm-12.18-F69220?logo=pnpm&logoColor=white)
![Turborepo](https://img.shields.io/badge/Turborepo-2.11-EF4444?logo=turborepo&logoColor=white)
![Electron](https://img.shields.io/badge/Electron-45.2-47848F?logo=electron&logoColor=white)
![React](https://img.shields.io/badge/React-19.3-61DAFB?logo=react&logoColor=black)
![TanStack Router](https://img.shields.io/badge/TanStack_Router-1.170-FF4154)
![TypeScript](https://img.shields.io/badge/TypeScript-7.0-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8.3-646CFF?logo=vite&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-5.1-6E9F18?logo=vitest&logoColor=white)
![Playwright](https://img.shields.io/badge/Playwright-1.65-2EAD33?logo=playwright&logoColor=white)

Desktop apps for Windows and macOS that turn HTML tags inside documents, such as `<b>my name</b> is <i>pasindu</i>`,
into real formatting. Each file format gets its own app, built from shared packages. Today there is one app:
**Excel HTML Formatter** ([apps/excel-formatter](apps/excel-formatter/README.md)).

> Badge versions are taken from `pnpm-lock.yaml`. CI status badges will be added once the repository has a CI remote.

## Features

- **Open** an `.xlsx` file by dragging it onto the window or browsing to it. The original file is never changed.
- **Select sheets:** each sheet's size, how many cells contain HTML, and which tags it uses.
- **Tag analysis:** for every tag, how often it's used, the first cell, the style it will get, and a live preview.
- **Tag styles:** bold, italic, underline, strikethrough, color, size, font, superscript/subscript. You can also add
  your own tags, choose what happens to tags with no style, and import or export the settings as JSON.
- **Preview & export:** an Excel-style preview, then **Save formatted file…** writes a new `.xlsx` with real rich text.
  It has a progress bar and **Cancel**, and handles large files.
- **Safe by design:** formulas, numbers, dates and links are never changed; work runs in a background thread; the app
  runs sandboxed. See [docs/security.md](docs/security.md).

**Planned** (see [docs/roadmap.md](docs/roadmap.md)): exporting to PDF, Word (DOCX), TXT, HTML and Markdown, and
converting between formats.

## Architecture

```mermaid
flowchart TB
  app[apps/excel-formatter<br/>composition root] --> ui[@hf/ui<br/>screens, routing, state]
  app --> desktop[@hf/desktop<br/>Electron shell, IPC, workers]
  app --> xl[@hf/adapter-excel<br/>.xlsx via ExcelJS]
  ui --> core[@hf/core<br/>pure engine and contracts]
  desktop --> core
  xl --> core
```

Dependencies only point downwards, and ESLint enforces it. Each app plugs its format into the shared shell and UI;
nothing shared knows about Excel. Details are in the [Software Architecture Document](docs/architecture/SAD.md) and
the [ADRs](docs/architecture/adr/README.md).

## Project structure

```
apps/
  excel-formatter/      the Excel app: wiring, preview grid, packaging config, icon, e2e tests
packages/
  core/                 @hf/core: tokenizer, HTML -> styled runs, tag scanning, settings validation, contracts
  adapter-excel/        @hf/adapter-excel: .xlsx read/preview/convert/write ('./format' is browser-safe)
  desktop/              @hf/desktop: './main' window + IPC, './worker' job runner, './preload' window.api
  ui/                   @hf/ui: React screens, TanStack Router routes and guards, zustand store, styles
tools/lint/             ESLint + Prettier configuration (ADR 0007)
docs/                   all documentation: start at docs/README.md
AGENTS.md, CLAUDE.md    instructions for AI coding agents; skills in .claude/skills/
```

## Technology stack

| Area          | Technology                                                                                |
| ------------- | ----------------------------------------------------------------------------------------- |
| Desktop shell | Electron 45.2 (bundles Node 24.22 and Chromium 156), electron-vite 6, electron-builder 26 |
| Window        | React 19.3, TanStack Router 1.170 (hash history), zustand 5                               |
| Excel files   | ExcelJS 4.4                                                                               |
| Language      | TypeScript 7.0 (lint uses 6.0, see ADR 0007)                                              |
| Monorepo      | pnpm 12.18 workspaces, Turborepo 2.11                                                     |
| Quality       | Vitest 5.1 + coverage, Playwright 1.65 (Electron), ESLint 10, Prettier 3.9                |

## Getting started

**Prerequisites:** Node.js 26 LTS (`.nvmrc`) and pnpm 12.18. Git is recommended. Keep the repository in a short folder
path on Windows (the installer builder can't handle paths over 260 characters).

```bash
pnpm install          # install all workspace packages (also downloads Electron)
pnpm dev              # run the Excel app with live reload
```

**Configuration:** there are no environment variables or secrets for development. The app's only stored data is
the tag-style file `config.json` in the app's user-data folder ([settings schema](docs/data/settings-schema.md)).

## Build, test, package

```bash
pnpm check            # lint + format check + type-check + unit tests (cached by Turborepo)
pnpm test:coverage    # unit tests with per-package coverage floors
pnpm test:e2e         # build the app, then Playwright tests against the real app
pnpm build            # build every app to apps/*/out
pnpm dist:excel       # installers: Windows -> setup + portable .exe; macOS -> universal .dmg
```

Installers are written to `apps/excel-formatter/dist`.

**CI:** [AppVeyor](appveyor.yml) (Windows) runs the full test plan: lint, format check, type-check, build, unit tests
with coverage, end-to-end tests and installers. Test results go to the Tests tab, and installers and reports to
Artifacts. [GitHub Actions](.github/workflows/build.yml) builds Windows and macOS installers. Neither has run yet,
because the repository has no remote. Details: [docs/operations/deployment.md](docs/operations/deployment.md).

## Development

The full guide is [docs/developer-guide.md](docs/developer-guide.md). In short:

- **Local setup:** `pnpm install`, then `pnpm dev`. Run `pnpm check` before every commit and `pnpm test:e2e` before
  merging changes to the UI flow.
- **Coding standards:** Prettier formats the code (no semicolons, single quotes, 120 columns), and ESLint enforces the
  rules and package boundaries. Comments explain _why_. User-facing text is plain, sentence-case English.
- **Modules and shared libraries:** put code in the lowest layer that can own it. Pure logic goes in `@hf/core`,
  Electron and IPC in `@hf/desktop`, screens and state in `@hf/ui`, and format-specific code in an adapter package.
  Apps only wire things together.
- **Testing and debugging:** Vitest unit tests live in each package's `tests/`; e2e tests are in
  `apps/excel-formatter/e2e`. For troubleshooting, see [docs/operations/troubleshooting.md](docs/operations/troubleshooting.md).
- **Adding features:** add a route and screen in `@hf/ui`, with state in the store and tests. See the `add-feature`
  skill.
- **Adding formats:** implement `FormatAdapter` in a new adapter package and add a thin app. See the `add-format` skill.
  Exporting to other formats (PDF, DOCX, TXT, HTML, Markdown) needs the Phase 3 pipeline first.
- **AI-assisted development:** agents follow [AGENTS.md](AGENTS.md) and the skills in `.claude/skills/`. Larger
  changes are planned and approved first ([docs/roadmap.md](docs/roadmap.md)).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Notable changes are listed in [CHANGELOG.md](CHANGELOG.md).

## Documentation

[docs/README.md](docs/README.md) is the index. It covers requirements, functional design, architecture and ADRs,
technical design, contracts, security, testing strategy, the user manual, the developer guide, deployment and
troubleshooting. The original build plan and the first clickable demo are in [docs/history](docs/history/PLAN.md).

## License

Not decided yet (decision D10 in [docs/roadmap.md](docs/roadmap.md)). Until a license is added, all rights are
reserved by the author.
