# Troubleshooting

Last reviewed: 2026-11-09. End-user problems are also in the [user manual](../user-manual.md#problems).

## Development

| Symptom                                                                                    | Cause                                                                       | Fix                                                                                                                                         |
| ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm install` stops with `ERR_PNPM_IGNORED_BUILDS`                                        | A dependency wants an install script that isn't listed in `allowBuilds`     | Decide per package in `pnpm-workspace.yaml` (`true` to allow, `false` to block), then reinstall                                             |
| `electron` fails to start / `dist/electron.exe` missing                                    | Electron's download script didn't run (e.g. the first install failed early) | `pnpm rebuild --pending`; if that does nothing, run `node install.js` inside `node_modules/.pnpm/electron@<version>*/node_modules/electron` |
| `pnpm dist:excel` fails with `!include: could not open file …StdUtils.nsh`                 | Repo path too long for NSIS (260 characters)                                | Move the repo to a short path such as `C:\dev\html-formatter`                                                                               |
| ESLint can't parse TypeScript / typescript-eslint peer warning                             | typescript-eslint doesn't support TypeScript 7                              | Expected: lint runs from `tools/lint` with TypeScript 6 (ADR 0007). Run `pnpm lint`, not a global `eslint`                                  |
| Router tests: guards don't redirect, or `window is not defined`                            | No DOM: TanStack Router switches to server mode                             | Add `// @vitest-environment happy-dom` at the top of the test file                                                                          |
| A router search param keeps an invalid value                                               | `validateSearch` left the key out (TanStack keeps raw values)               | Return every key, with `undefined` for invalid values                                                                                       |
| e2e tests fail to launch the app                                                           | App not built                                                               | Use `pnpm test:e2e` (builds first), not `playwright test` directly                                                                          |
| A type-check of an app can't see `window.api` or `*.css`                                   | The UI's declaration files aren't included                                  | `store.ts` and `index.tsx` keep their `/// <reference path>` lines; don't remove them                                                       |
| `pnpm dist` fails: `EBUSY` or "Can't open output file" ("locked … maybe by virus scanner") | A previous installer in `dist/` is locked (often antivirus scanning it)     | Delete `apps/<app>/dist` and run again. CI machines start clean, so this only happens locally                                               |
| Turborepo shows old results                                                                | Cache                                                                       | `pnpm turbo run <task> --force`                                                                                                             |
| Git warns about LF/CRLF                                                                    | Line-ending settings                                                        | `.gitattributes` forces LF; run `git add --renormalize .` once                                                                              |
| Coverage fails after deleting tests                                                        | Coverage floor                                                              | Add tests back; floors are only lowered after review                                                                                        |

## Running app

| Symptom                               | Cause                                                                          | Fix                                                                    |
| ------------------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| Tag styles reset to defaults          | `config.json` damaged or invalid                                               | Expected safety behaviour; re-import an exported settings file         |
| "Please open the file again."         | The open document was closed (another file was opened, or the window reloaded) | Open the file again                                                    |
| Saved file lacks charts/pivots/macros | ExcelJS limitation (ADR 0005)                                                  | Known; keep the original for those parts                               |
| Window frozen or blank                | Renderer crash                                                                 | A dialog offers Reload; settings are kept. Report with the app version |

Settings file location: Windows `%APPDATA%\Excel HTML Formatter\config.json`; macOS
`~/Library/Application Support/Excel HTML Formatter/config.json`. The folder keeps FormaFlow's earlier name on purpose,
so saved tag styles carry over ([ADR 0012](../architecture/adr/0012-formaflow-product-name.md)).
