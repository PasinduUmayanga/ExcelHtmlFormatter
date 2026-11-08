# Excel HTML Formatter

Converts HTML tags inside Excel cells, such as `<b>my name</b> is <i>pasindu</i>`, into real Excel rich-text formatting. Part of the HTML Formatter monorepo: see the [root README](../../README.md) for setup, commands and structure.

## What it does
1. **Open file:** drag and drop an `.xlsx` file, or browse to one.
2. **Select sheets:** lists every sheet with its size, how many cells contain HTML, and the tags found. Sheets that contain HTML are selected for you.
3. **Tag analysis:** one tab per selected sheet. For each tag it shows how often it's used, the first cell it appears in, the style it will get, and a live preview. Tags with no style are flagged.
4. **Preview & export:** an Excel-style grid shows the formatted result, with a switch to see the original HTML. **Save formatted file…** writes a new `.xlsx` and never changes the original.
5. **Tag styles** sets the formatting for each tag:
   - bold, italic, underline, strikethrough, color, size, font, and superscript/subscript
   - add and remove tags, and choose what happens to tags with no style
   - import / export the settings as JSON, and reset to defaults
   - every change saves automatically

**How cells are converted:**
- Only plain-text cells are converted. Formulas, numbers, dates, hyperlinks and merged-over cells are never changed.
- Formatted text keeps the cell's own font, and cells that now contain line breaks get wrap text turned on.
- The work runs in a background thread with a progress bar and **Cancel**.

**Known limit:** ExcelJS does not keep charts, pivot tables or macros when it saves. The app says so next to the Save button.

## What's in this folder
Everything shared lives in `packages/`. This app only contains:
```
src/main/main.ts         startDesktopApp({ format: excelFormat, createWorker, icon })
src/main/worker.ts       runWorker(excelAdapter)
src/preload/preload.ts   exposeApi()
src/renderer/main.tsx    mountFormatterApp(root, { format: excelFormat, Preview: SheetGrid })
src/renderer/SheetGrid.tsx + grid.css   the Excel-style preview grid
electron.vite.config.ts  build (shared packages bundled; only exceljs loaded at runtime)
electron-builder.yml     packaging: Windows installer + portable .exe, Mac universal .dmg
build/icon.svg / .png    app icon (pnpm --filter excel-formatter icon re-renders the PNG)
```

## Packaging
`pnpm dist:excel` from the repo root. It produces:
- **On Windows:** `dist/Excel-HTML-Formatter-Setup-<version>.exe` and `dist/Excel-HTML-Formatter-<version>-portable.exe`
- **On a Mac:** `dist/Excel-HTML-Formatter-<version>-mac-universal.dmg`

**First-launch warnings (the apps are not code-signed yet):**
- **Windows:** SmartScreen shows a warning. Click **More info → Run anyway**.
- **macOS:** the app is ad-hoc signed. Use **System Settings → Privacy & Security → Open Anyway**.

**Long folder paths on Windows:** the installer builder (NSIS) can't read paths over 260 characters. Keep the repo in a short folder.

Settings are saved to `%APPDATA%\Excel HTML Formatter\config.json` on Windows.
