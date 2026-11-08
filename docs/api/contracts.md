# Contracts: IPC API, format adapter, worker protocol

Last reviewed: 2026-11-09. **The TypeScript source is authoritative**; this page explains it and lists what to update
when it changes. Changing a contract needs an ADR.

| Contract                      | Source                             | Implemented by                          | Used by                            |
| ----------------------------- | ---------------------------------- | --------------------------------------- | ---------------------------------- |
| `ElectronApi`                 | `packages/core/src/types.ts`       | `packages/desktop/src/preload/index.ts` | `@hf/ui` (`window.api`)            |
| `FormatAdapter<Doc, Preview>` | `packages/core/src/adapter.ts`     | `packages/adapter-excel/src/index.ts`   | `@hf/desktop/worker`               |
| `FormatInfo`                  | `packages/core/src/format.ts`      | `packages/adapter-excel/src/format.ts`  | `@hf/desktop/main`, `@hf/ui`       |
| Worker protocol               | `packages/desktop/src/protocol.ts` | `@hf/desktop/worker/handler.ts`         | `@hf/desktop/main/workerClient.ts` |

## `ElectronApi` (window → main)

All calls return promises. Errors from the main process arrive as `Error invoking remote method '…': Error: <message>`;
the UI strips the prefix (`cleanError`). A cancelled job rejects with `CANCELLED_MESSAGE` (`'Cancelled by the user.'`),
which the UI treats as a normal outcome, not an error.

| Method                                   | IPC channel          | Validation in main                                                                             | Result                                         |
| ---------------------------------------- | -------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `openFileDialog()`                       | `file:open`          | Dialog filtered to the format's file types                                                     | `PickedFile \| null`                           |
| `describeDroppedFile(file)`              | `file:describe`      | Path is a string, extension allowed, is a file                                                 | `PickedFile`                                   |
| `openDocument(path)`                     | `document:open`      | Path must be one the user picked                                                               | `DocumentSummary`                              |
| `getSectionPreview(path, section)`       | `document:preview`   | Must match the open document; section is a string                                              | Format-specific preview data                   |
| `exportDocument(path, sections, config)` | `document:export`    | Picked path; sections are strings; settings validated; target ≠ original; one export at a time | `ExportResult \| null` (null = Save cancelled) |
| `cancelJob(kind)`                        | `job:cancel`         | Only `'load'` or `'export'`                                                                    | —                                              |
| `onJobProgress(listener)`                | event `job:progress` | Sent only to the window that started the job                                                   | Unsubscribe function                           |
| `showInFolder(path)`                     | `shell:showInFolder` | Only files this app saved                                                                      | —                                              |
| `loadConfig()`                           | `config:load`        | Damaged/missing file → defaults                                                                | `AppConfig`                                    |
| `saveConfig(config)`                     | `config:save`        | `validateConfig`; atomic write                                                                 | —                                              |
| `exportConfig(config)`                   | `config:export`      | `validateConfig`; Save dialog                                                                  | File name or `null`                            |
| `importConfig()`                         | `config:import`      | Valid JSON + `validateConfig`; saved as current                                                | `AppConfig \| null`                            |
| `getAppInfo()`                           | `app:info`           | —                                                                                              | `{ version, platform, configPath }`            |

## `FormatAdapter<Doc, Preview>`

| Method                                         | Contract                                                                                                    |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `read(path)`                                   | Load the file. Throw an `Error` whose message the user can act on (missing, locked, damaged…).              |
| `summarize(doc, file, onProgress?)`            | List sections with `name`, `state` (`visible`/`hidden`/…), `sizeLabel`, and a `TagScan` of text items only. |
| `preview(doc, section)`                        | Data for the app's `Preview` component. Throw if the section doesn't exist.                                 |
| `convert(doc, sections, options, onProgress?)` | Replace HTML with formatting in the chosen sections of `doc` (in memory). Return `ExportStats`.             |
| `write(doc, path)`                             | Write safely: temporary file then rename; never leave a half-written file; clear error if locked.           |

Rules: never convert formulas, numbers, dates or links; report progress with `stage`, `done`, `total`, `unit`, `detail`;
use `throttle()` from `@hf/core` for frequent updates.

## `FormatInfo`

Plain data, safe in every context: `id`, `appName`, `fileTypes`, `outputSuffix`, `outputExtension`, the words for
`section` and `unit` (singular/plural), and screen texts (`openTitle`, `openHint`, `dropHint`, `lineBreakNote`,
`saveNote`).

## Worker protocol

Requests (main → worker), each with a numeric `id`:

| `type`    | Fields                                   | Worker does                                           |
| --------- | ---------------------------------------- | ----------------------------------------------------- |
| `load`    | `file: PickedFile`                       | `read` + `summarize`; keeps the document for previews |
| `preview` | `section`                                | `preview` on the kept document                        |
| `export`  | `source`, `target`, `sections`, `config` | Fresh `read` → `convert` → `write`                    |

Messages (worker → main): `{ id, kind: 'progress', progress }` (any number), then exactly one
`{ id, kind: 'result', result }` or `{ id, kind: 'error', message }`. A crash or out-of-memory error rejects all pending
requests with a friendly message (`friendlyWorkerError`).

## When a contract changes

1. Update the type in `@hf/core` (or `protocol.ts`).
2. Update every implementation (preload, adapters, worker handler) and the callers.
3. Add or update tests on both sides.
4. Update this page and write an ADR.
