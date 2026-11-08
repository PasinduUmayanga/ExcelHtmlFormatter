# Excel HTML Formatter: build plan

A standalone desktop app for Windows and macOS. It opens an `.xlsx` file whose cells contain HTML such as `<b>my name</b> is <i>pasindu</i>`, and saves a copy where those cells use real Excel rich-text formatting.

- **Clickable demo:** `demo/index.html`. Open it in any browser. It uses sample data and does not read real files yet.
- **Stack:** Electron, React, TypeScript, Vite, ExcelJS, and electron-builder to package it.
- **What users need installed:** nothing. You give them a `.exe` (Windows) or a `.dmg` (Mac).

---

## 1. Screens and flow

```
[1 Open file] → [2 Select sheets] → [3 Tag analysis] → [4 Preview & export]
                                          │   ▲                │   ▲
                                          ▼   │                ▼   │
                                   [⚙ Tag styles: the configuration screen]
                                   (also always reachable from the sidebar)
```

| #   | Screen               | What the user does                                                                                                                                                                                                                   | What the app does                                                                                                                                                                 |
| --- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Open file**        | Drag and drop, or click to browse. Can pick from recent files.                                                                                                                                                                       | Opens the workbook, reads every sheet name, and scans the cells.                                                                                                                  |
| 2   | **Select sheets**    | Ticks the sheets to convert, or uses "select all".                                                                                                                                                                                   | Shows each sheet's name, its rows × columns, how many cells contain HTML, and the tags it found. Sheets with HTML are ticked automatically.                                       |
| 3   | **Tag analysis**     | Opens one tab per selected sheet.                                                                                                                                                                                                    | For each tag, lists how many times it's used, the first cell it appears in, the style it will get, and a live preview. Tags with no style are flagged, with a "Set style" button. |
| ⚙   | **Tag styles**       | Picks a tag, then sets bold, italic, underline, strikethrough, color, size, font, and superscript or subscript. Can add or remove tags, choose what happens to tags with no style, import or export JSON, and reset to the defaults. | Shows a live preview on sample text and on a real cell from the file. Saves automatically.                                                                                        |
| 4   | **Preview & export** | Switches between the formatted and original HTML views, then clicks **Save formatted file…**.                                                                                                                                        | Shows an Excel-like grid and the totals, warns about tags with no style, and writes a new `.xlsx` file. The original file is never changed.                                       |

**Conversion rules**

- Nested tags add up: `<b><i>x</i></b>` becomes bold and italic.
- `<br>` and `<p>` become line breaks, and the cell's "wrap text" setting is turned on.
- Text codes such as `&amp;` and `&nbsp;` are turned back into normal characters.
- Tags with no rule are removed (keeping their text) or left as visible text, depending on the setting.
- Cells without HTML, formulas, merged cells, column widths and the other sheets are copied unchanged.

---

## 2. How the app is organised

```
┌──────────── Electron app ─────────────────────────────┐
│ Main process (Node.js)                                │
│   • Open and save dialogs, recent files               │
│   • Reads and writes .xlsx files (ExcelJS)            │
│   • Config file: <userData>/config.json               │
│                 ▲   preload bridge (IPC)   │          │
│                 │                          ▼          │
│ Renderer (React UI): the 5 screens above              │
│   core/scanTags.ts      finds and counts tags         │
│   core/htmlToRuns.ts    turns HTML into rich text     │
│   (heavy conversions run in a background thread)      │
└───────────────────────────────────────────────────────┘
```

### Folder layout

```
excel-html-formatter/
├─ electron/
│  ├─ main.ts          window, menu, IPC handlers
│  ├─ preload.ts       exposes openFile / saveFile / loadConfig / saveConfig
│  └─ excel.ts         ExcelJS reading and writing
├─ src/
│  ├─ screens/         OpenFile, SelectSheets, TagAnalysis, TagStyles, PreviewExport
│  ├─ components/      Sidebar, SheetTabs, StyleEditor, RichPreview, Grid
│  ├─ core/            scanTags.ts, htmlToRuns.ts, defaultRules.ts, types.ts
│  ├─ store/           app state (Zustand)
│  └─ App.tsx
├─ tests/              unit tests for scanTags and htmlToRuns (Vitest)
├─ .github/workflows/  builds the Windows and Mac apps in the cloud
└─ package.json        scripts: dev, test, build, dist:win, dist:mac
```

### Config file format

```json
{
  "profileName": "Default",
  "unknownTagAction": "strip",
  "rules": {
    "b": { "bold": true },
    "i": { "italic": true },
    "sup": { "vertAlign": "superscript" },
    "mark": { "bold": true, "color": "#C00000" }
  }
}
```

---

## 3. Phases

| Phase                      | Work                                                                                                                  | Done when                                                     |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| **0. Demo** ✅             | A clickable HTML demo of every screen and the flow                                                                    | You agree with the screens and the flow                       |
| **1. Project setup** ✅    | Electron, Vite, React and TypeScript set up, the sidebar layout, the 5 empty screens                                  | `npm run dev` opens a desktop window                          |
| **2. Core engine** ✅      | `scanTags` and `htmlToRuns`, with unit tests (nested tags, `<br>`, text codes, unknown tags)                          | The tests pass                                                |
| **3. Open & sheets** ✅    | A real file dialog, ExcelJS reading the file, the sheet list with counts                                              | A real `.xlsx` shows the correct sheets and tags              |
| **4. Tag analysis** ✅     | One tab per sheet, the tag table, previews, warnings                                                                  | Matches the demo, using real data                             |
| **5. Tag styles** ✅       | The style editor, saving the config file, import and export, reset                                                    | Settings survive closing and reopening the app                |
| **6. Preview & export** ✅ | The grid preview, writing rich text to the file, wrap text for `<br>`, saving as a new file                           | The output opens correctly in Excel and LibreOffice           |
| **7. Robustness** ✅       | Large files handled in a background thread with a progress bar, error dialogs, cancel                                 | A file with 50,000 cells converts without the window freezing |
| **8. Packaging** ✅        | electron-builder: a Windows portable `.exe` and installer, a Mac universal `.dmg`, an app icon, GitHub Actions builds | Double-clicking the app works on a clean PC and Mac           |

Optional later: named profiles, more styles (cell background, `<a>` links), and batch conversion of a whole folder.

---

## 4. Risks and how to handle them

- **Messy HTML in cells** (unclosed tags): the app's own tokenizer (`src/core/tokenize.ts`) tolerates it, and unit tests cover these cases. It doesn't need a browser, so it also works in a background thread.
- **Cells already formatted with rich text:** read the plain text first, then convert it.
- **Very large workbooks:** process in batches in a background thread and show progress.
- **Mac security warning on first open:** document "Open Anyway", or sign and notarize later.

---

## 5. After the plan: monorepo restructure (done)

To prepare for more formats (Word, text…), the project became a pnpm + Turborepo monorepo with TanStack Router. The Excel app behaves exactly as before, and all checks were repeated afterwards (121 tests, packaging, open/analyse/export/Cancel in the packaged app, large-file speed, openpyxl). See the root `README.md` for the current structure and commands. The file paths in sections 2–4 above describe the original single-app layout.
