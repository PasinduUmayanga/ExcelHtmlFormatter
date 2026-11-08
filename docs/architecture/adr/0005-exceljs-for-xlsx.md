# 0005. ExcelJS for reading and writing .xlsx

- Status: Accepted
- Date: 2026-11-09

## Context

The Excel app must read `.xlsx`, find text cells (not formulas, numbers, dates, hyperlinks or merged-over cells), and
write real rich text (per-run fonts) while keeping the rest of the workbook.

## Decision

Use ExcelJS 4.4 in `@hf/adapter-excel` (worker side only; the window imports only the browser-safe
`@hf/adapter-excel/format`). Each formatted run keeps the cell's own font (name, size, color incl. theme colors);
when a tag sets a font, the theme `scheme` is removed so Excel honours it. Cells with line breaks get wrap text.
Saving writes `<target>.saving` then renames it.

## Consequences

- Verified by round-trip tests and an independent reader (openpyxl).
- **Known limitation:** ExcelJS doesn't keep charts, pivot tables or macros when saving. The app says so next to the
  Save button. Fixing it would need an XML-level writer (see roadmap, optional).
- ExcelJS keeps the whole workbook in memory; workers get up to 4 GB heap.
- `exceljs` is the only runtime dependency shipped in the Excel installer.

## Alternatives considered

- **SheetJS (xlsx):** rich-text writing requires the paid edition.
- **Direct XML editing (JSZip + XML parser):** keeps everything, but much more work and risk; kept as a future option.
