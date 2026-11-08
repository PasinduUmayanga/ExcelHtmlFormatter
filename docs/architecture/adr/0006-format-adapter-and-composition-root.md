# 0006. `FormatAdapter` contract; apps as composition roots

- Status: Accepted
- Date: 2026-11-09

## Context

The shell (Electron main, worker, preload) and the UI must work for any file format without knowing its library.

## Decision

`@hf/core` defines `FormatAdapter<Doc, Preview>` (`read`, `summarize`, `preview`, `convert`, `write`) and `FormatInfo`
(names, file types, on-screen words). Everything format-specific is injected by the app, which is the **composition
root**:

```ts
startDesktopApp({ format: excelFormat, createWorker, icon }) // main process
runWorker(excelAdapter) // worker thread
exposeApi() // preload
mountFormatterApp(root, { format: excelFormat, Preview: SheetGrid }) // window
```

Dependency injection is done with plain parameters and factories — no DI container. Package boundaries are enforced by
ESLint (`tools/lint/config.js`).

## Consequences

- A new same-format app needs no changes to `core`, `desktop` or `ui`.
- `FormatAdapter` assumes input and output are the **same format** (xlsx → xlsx). Exporting to other formats (PDF,
  DOCX, TXT, HTML, Markdown) needs a reader → document model → writer pipeline; that is planned as Phase 3 and will be
  recorded in a new ADR.
- File system and dialogs are not yet injectable in `@hf/desktop`, which is why its IPC handlers have low test
  coverage (planned in Phase 2).

## Alternatives considered

- **Format checks (`if excel …`) inside shared packages:** couples every package to every format.
- **A DI container (e.g. InversifyJS):** unnecessary at this size.
