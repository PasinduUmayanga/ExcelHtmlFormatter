# HTML Formatter

Desktop apps (Windows and macOS) that turn HTML tags inside documents, such as `<b>my name</b> is <i>pasindu</i>`, into real formatting. There's one app per file format, all built from shared packages. Today there is one app, **Excel HTML Formatter** (`apps/excel-formatter`). The history of the original build is in [docs/PLAN.md](docs/PLAN.md), and the first clickable demo is in [docs/demo](docs/demo/index.html).

## Tools
| | Version |
|---|---|
| Node.js | 26 LTS (pinned in `.nvmrc` and `engines`) |
| pnpm | 12.18 (pinned in `packageManager`), workspaces |
| Turborepo | 2.11: runs tasks in dependency order, in parallel, with caching |
| Electron | 45 (the packaged app runs on its built-in Node 24) |
| React | 19.3, with TanStack Router 1.170 and zustand 5 |
| TypeScript / Vite / Vitest | 7.0 / 8.3 / 5.1 |

## Commands (from the repo root)
```bash
pnpm install               # once, and after pulling changes
pnpm dev                   # run the Excel app with live reload
pnpm check                 # type-check and test every package (cached by Turborepo)
pnpm build                 # build every app to apps/*/out
pnpm dist:excel            # package the Excel app: Windows -> .exe files, Mac -> .dmg (in apps/excel-formatter/dist)
pnpm --filter @hf/adapter-excel sample        # small test workbook in packages/adapter-excel/samples
pnpm --filter @hf/adapter-excel sample:large  # 60,000-cell workbook for speed tests
```
Turborepo skips anything unchanged. A second `pnpm check` with no changes finishes in under a second, and editing one package only re-runs that package and the packages that depend on it.

## Structure
```
apps/
  excel-formatter/      the Excel app: wires the packages together; packaging config and icon
packages/
  core/                 @hf/core: format-agnostic engine. HTML -> styled runs, tag scanning,
                        tag-style settings, shared types, the FormatAdapter contract
  adapter-excel/        @hf/adapter-excel: everything .xlsx (ExcelJS): read, scan, preview, convert, write
                        './format' is the browser-safe part (labels, file types, preview types)
  desktop/              @hf/desktop: shared Electron shell
                        './main' window, dialogs, IPC, settings, workers, crash dialogs
                        './worker' runs any FormatAdapter in a background thread (progress, cancel)
                        './preload' the safe window.api bridge
  ui/                   @hf/ui: shared React window: screens, routing, state, styles
docs/                   original plan and demo
```
**Dependencies only point downwards:** apps → ui / desktop / adapters → core. The shared packages are used as TypeScript source (there's no separate build step). Each app lists them as `devDependencies`, so electron-vite bundles them into the app, and electron-builder ships only real runtime `dependencies` (for Excel: ExcelJS).

## Routing (TanStack Router, in `@hf/ui`)
| Address | Screen |
|---|---|
| `#/open` | Open a file |
| `#/sections` | Choose the sections (sheets) to convert |
| `#/analysis/$section` | Tags found in one section |
| `#/preview/$section?view=original` | Formatted preview; `view=original` shows the raw HTML |
| `#/settings?tag=b&back=/analysis/Products` | Tag styles; `back` adds a "Done" button that returns there |

- **Hash history** (`#/…`): the packaged app loads from a `file://` address, where normal browser-style paths break on reload.
- **Guards** (`beforeLoad`): screens that need an open file send you to `#/open`, and screens that need a selection send you to `#/sections`.
- **Validated search settings**: `back` only accepts in-app paths.
- **Type-checked addresses**: route parameters and search settings are checked at compile time, in every package.

## Adding a new format (for example Word)
1. `packages/adapter-word`: implement `FormatAdapter` from `@hf/core` (`read`, `summarize`, `preview`, `convert`, `write`), plus a browser-safe `./format` export with its `FormatInfo` and preview types.
2. `apps/word-formatter`: copy `apps/excel-formatter` and change the four wiring files (`src/main/main.ts`, `src/main/worker.ts`, `src/renderer/main.tsx` and the preview component), the app's `package.json` dependencies, `electron-builder.yml` and the icon.
3. Nothing in `core`, `desktop` or `ui` needs to change. CI builds every app in `apps/` automatically.

## CI
`.github/workflows/build.yml` runs on Windows and macOS. It sets up pnpm and Node from the repo, runs `pnpm install --frozen-lockfile`, then `turbo run typecheck test build`, and then `turbo run dist`, which packages every app and uploads the installers as artifacts. Pull requests only run the checks.

## Notes
- **pnpm install scripts:** pnpm blocks them unless allowed in `pnpm-workspace.yaml`. Only Electron's is allowed (it downloads the Electron runtime).
- **Turborepo telemetry:** Turborepo collects anonymous usage data. To turn it off, run `pnpm turbo telemetry disable`.
