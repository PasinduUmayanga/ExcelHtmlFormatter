---
name: add-format
description: Add support for a new file format to the HTML Formatter monorepo — a new FormatAdapter package plus a thin app (e.g. Word → Word), or later a reader/writer for exporting to PDF/DOCX/TXT/HTML/Markdown. Use whenever a task mentions a new file type, export format or conversion.
---

# Add a file format

Read first: `docs/architecture/SAD.md`, `docs/api/contracts.md`, `packages/core/src/adapter.ts`,
`packages/adapter-excel/` (the reference implementation).

## 0. Decide which kind of change this is

| Goal                                                   | Path                                                                                                                                                    |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Format the HTML **inside** files of format X, saving X | New adapter + app (steps 1–6). No shared-code changes.                                                                                                  |
| **Export/convert** to another format (PDF, DOCX…)      | Needs the Phase 3 pipeline (document model, registry, writers). Check `docs/roadmap.md`: if Phase 3 isn't done or approved, stop and ask the Tech Lead. |

Confirm the phase or task is approved in `docs/roadmap.md` before you write code.

## 1. Adapter package `packages/adapter-<format>`

- `package.json`: name `@hf/adapter-<format>`, `exports` `"."` → `src/index.ts` and `"./format"` → `src/format.ts`;
  `@hf/core` + the format library as `dependencies`; scripts `typecheck`, `test`, `test:coverage`.
- `src/format.ts` (browser-safe, no library or Node imports): export `<format>Format: FormatInfo` and the preview types.
- `src/<format>.ts`: `read` (user-actionable errors, `{ cause }`), `summarize` (sections + `scanCells`), `preview`,
  `convert` (only text; never formulas/fields/links; report progress with `throttle`), `write` (`<target>.saving` →
  rename).
- `src/index.ts`: `export const <format>Adapter: FormatAdapter<Doc, Preview> = { … }`.
- Add the package to the boundary rules in `tools/lint/config.js` (copy the `adapter-excel` blocks), including the
  "browser-safe `./format`" rule.

## 2. Tests (`packages/adapter-<format>/tests`)

Use real files built in the test (see `packages/adapter-excel/tests/convert.test.ts`): round trip (write → read back),
nested tags, line breaks, unknown tags (`strip`/`keep`), untouched non-text content, missing/damaged file errors,
progress reporting. Add `vitest.config.ts` with coverage floors at or near the Excel adapter's.

## 3. App `apps/<format>-formatter`

Copy `apps/excel-formatter`, then change:

- `src/main/main.ts` (format + icon), `src/main/worker.ts` (`runWorker(<format>Adapter)`)
- `src/renderer/main.tsx` + a preview component (props: `PreviewProps` from `@hf/ui`)
- `package.json`: `name`, `productName`, runtime `dependencies` = the format library only; `@hf/*` stay in
  `devDependencies` (so they're bundled)
- `electron-builder.yml` (`appId`, `productName`, artifact names), `build/icon.svg` (+ `pnpm --filter <app> icon`)
- `e2e/` tests adapted to the format

## 4. Verify

```bash
pnpm install && pnpm check && pnpm test:coverage && pnpm test:e2e
pnpm --filter <app> build
```

Check the built main/worker only `require` Electron, Node built-ins and the format library (no `@hf/*` at runtime):
`grep -ohE 'require\("[^"]+"\)' apps/<app>/out/main/*.js apps/<app>/out/main/chunks/*.js | sort -u`.

## 5. Docs (same change)

ADR if any contract changed; `docs/api/contracts.md`; `docs/architecture/SAD.md` (package table);
`docs/requirements/SRS.md` + `docs/design/FDS.md` (new FR IDs); `docs/user-manual.md`; root `README.md` (structure,
features); `AGENTS.md` map; `docs/roadmap.md` status; `CHANGELOG.md`.

## 6. Report

What was added, the real test and build output, anything not verified (e.g. macOS packaging), and open questions.
