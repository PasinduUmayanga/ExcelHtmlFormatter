# Security

Last reviewed: 2026-11-09 · Changes to anything here need a review with the `review-checklist` skill and
`/security-review`.

## Threat model

| Asset / risk                         | Source of risk                                      | Mitigation                                                                                                                                           |
| ------------------------------------ | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| User's computer (code execution)     | Untrusted file content (cell text with HTML/script) | Text is tokenized, never rendered as HTML; window sandboxed; no `innerHTML` in app code                                                              |
| User's files (unwanted reads/writes) | A compromised or buggy window asking main for files | Main only opens files the user picked (`pickedFiles`); only reveals files it saved; never writes over the original                                   |
| User's data (corruption)             | Crashes during writes                               | Temporary file then rename for outputs and settings                                                                                                  |
| Availability (hangs, memory)         | Very large or malicious workbooks                   | Worker threads (main stays responsive), 4 GB worker heap limit, Cancel = terminate                                                                   |
| Navigation to outside content        | Links or crafted addresses                          | `will-navigate` blocked except in-page hash changes; `window.open` denied (http/https links open in the browser); `?back=` only accepts in-app paths |
| Settings tampering                   | Edited or imported `config.json`                    | `validateConfig` on load, save, import and export; invalid parts dropped                                                                             |
| Supply chain                         | npm packages                                        | Frozen lockfile in CI; pnpm blocks install scripts except Electron's; minimal runtime dependencies (ExcelJS only)                                    |

## Electron hardening (in `@hf/desktop/main`)

- `sandbox: true`, `contextIsolation: true`, `nodeIntegration: false` for the window.
- Preload exposes a fixed, typed API (`window.api`); it imports only `electron` at runtime (enforced by ESLint).
- Content Security Policy in each app's `index.html`: `default-src 'self'; script-src 'self'; style-src 'self'
'unsafe-inline'; img-src 'self' data:`.
- Renderer crashes show a dialog (Reload/Quit) instead of a blank window; uncaught main-process errors show a dialog.

## IPC rules

Every handler validates its arguments: types (`typeof`), allowed values (`'load' | 'export'`), file paths against
the allow-lists, settings with `validateConfig`, target ≠ original (case-insensitive). Recent activity is recorded by
the main process only; the window can read and clear it. The Open dialog starts in a window-supplied folder only if
that folder is in the activity list, and the user still picks the file
([ADR 0013](architecture/adr/0013-recent-activity.md)). `setTheme` accepts only `system`, `light` or `dark`.
Help text is Markdown parsed into data and rendered as React elements: never as HTML, and only links between Help
topics are followed ([ADR 0015](architecture/adr/0015-help-center-markdown.md)). `activity.json` stores file names and folders (no file
content) on the user's computer until they clear it. Since the redesign (ADR 0017, 0018): **Load sample** opens only
the app's own sample (its path comes from the app, never the window); **Open file** opens only a file this app saved
(the same list as Show in folder); a favourite can only be a file from the recent activity (`favorites.json`, names
and folders only); profiles and templates (`profiles.json`, `templates.json`) are checked like the settings, with
limits on names and counts; the Save dialog's suggested name is reduced to a plain file name. See the table in
[contracts](api/contracts.md#electronapi-window--main).

## Development practices

- Package boundaries enforced by ESLint (e.g. the window can't import Node or Electron).
- Security-relevant decisions are recorded as ADRs.
- Reviews of `packages/desktop`, IPC, file handling and rendering use `/security-review`.

## Known gaps (planned)

| Gap                                                                                                | Plan                                     |
| -------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| Installers aren't code-signed (Windows) or notarized (macOS)                                       | P5-T2, needs certificates                |
| Electron fuses (e.g. disable `RunAsNode`) not configured                                           | P5-T3                                    |
| No `pnpm audit` / dependency review in CI                                                          | P5-T3                                    |
| No explicit limit on uncompressed size for `.xlsx` input (zip bombs rely on the 4 GB worker limit) | With Phase 4 readers (DOCX)              |
| `style-src 'unsafe-inline'` needed for preview styles                                              | Revisit with the design system (Phase 2) |

## Reporting a vulnerability

Contact the project owner privately (not in a public issue), with steps to reproduce and a sample file if possible.
