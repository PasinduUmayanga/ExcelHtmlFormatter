# 0003. All file work in worker threads, with Cancel

- Status: Accepted
- Date: 2026-11-09

## Context

Reading, converting and writing a 60,000-cell workbook in the Electron main process blocked it for up to 1.6 s
(measured), freezing window move/resize/close. Larger files would be worse, and users need a way to stop long jobs.

## Decision

Run every read/scan/preview/convert/write in a Node worker thread (`@hf/desktop/worker` runs the app's
`FormatAdapter`). The main process talks to it through a small request/response protocol (`@hf/desktop/protocol`) with
progress messages. One long-lived worker per open file keeps the document for previews; each export uses a fresh
short-lived worker so **Cancel = terminate the thread**, followed by removing its temporary `.saving` file. Exports
always re-read the original file, so the open document is never modified. Workers get up to 4 GB of heap.

## Consequences

- Measured after the change (60,000 cells): main process blocked ≤ ~90 ms; window frame gaps ≤ ~95 ms.
- Out-of-memory and crashes in a worker become clear error messages, not app crashes.
- The worker entry file must live in each app (electron-vite's `?nodeWorker` import); it is three lines.
- Progress updates are throttled (100 ms) to avoid flooding the window.

## Alternatives considered

- **Async code in the main process:** ExcelJS conversion is CPU-bound; still blocks.
- **Utility/child processes:** heavier, more IPC plumbing, no benefit over worker threads here.
