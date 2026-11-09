# User Manual — FormaFlow

Last reviewed: 2026-11-09

FormaFlow (called Excel HTML Formatter before 2026-11-09) turns HTML tags inside Excel cells into real formatting. For example, a cell containing
`<b>my name</b> is <i>pasindu</i>` becomes "**my name** is _pasindu_". Your original file is never changed: the app
always saves a new copy.

## Installing

- **Windows:** run `FormaFlow-Setup-<version>.exe` (installs for your user only, no admin rights), or run
  `FormaFlow-<version>-portable.exe` from any folder without installing. Installing FormaFlow over Excel HTML Formatter
  upgrades it and keeps your tag styles.
- **macOS:** open the `.dmg` and drag the app to Applications.

The app isn't code-signed yet, so the first launch shows a warning:

- **Windows** ("Windows protected your PC"): click **More info → Run anyway**.
- **macOS** ("can't be opened"): open **System Settings → Privacy & Security** and click **Open Anyway**.

## Using the app

The app starts on **Home**. Click **Choose a file…** to begin, or **Continue** to go back to the file you have open.
Convert to PDF, Word and text are shown as **Coming soon**: they can't be used yet. **Recent activity** lists the
last 10 files you opened and saved, with whether the saved file checked out. **Open again** opens the file dialog in
that folder. The list is kept on this computer only; **Clear** empties it. The sidebar's **Home** link brings you back.

**Theme:** use **Light**, **Dark** or **System** at the top of the window. System follows your computer's setting.
FormaFlow remembers your choice.

1. **Open file.** Drop an `.xlsx` file on the window, or click it to browse. A progress bar shows while the file is
   read; **Cancel** stops it.
2. **Select sheets.** Sheets that contain HTML are ticked for you. Tick or untick sheets, then click **Analyse tags →**.
3. **Tag analysis.** For each sheet, see which tags are used and how they'll look. Tags marked **No style** will be
   removed (their text stays) unless you give them a style: click **Set style**.
4. **Tag styles.** Pick a tag, then choose bold, italic, underline, strikethrough, color, size, font, or
   superscript/subscript. The preview shows the result. **Keep text plain** keeps a tag's text without formatting.
   Changes save automatically. **Done** takes you back.
5. **Preview & export.** Check the preview (switch to **Original HTML** to compare), then click
   **Save formatted file…** and choose where to save. When it's done, **Show in folder** opens the folder.

## Good to know

- Only text cells are changed. Formulas, numbers, dates and links are kept as they are.
- Cells that get line breaks (`<br>`) are set to wrap text.
- Charts, pivot tables and macros in the original aren't copied to the new file.
- Your tag styles are kept for next time. You can share them with **Export JSON…** and **Import JSON…**.
- Large files work, but may take some seconds; you can keep using the window while it works.

## Problems

| Message or problem                                 | What to do                                                                                                 |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| "This file could not be read as an Excel workbook" | Open it in Excel and save it again as `.xlsx`. `.xls` files and password-protected files aren't supported. |
| "Close it in Excel and try again"                  | The file is open in another program. Close it and retry.                                                   |
| "Choose a different file name…"                    | You chose the original file. Save the copy under another name.                                             |
| "This file is too large…"                          | Close other programs, or split the workbook into smaller files.                                            |
| The window stopped working                         | Click **Reload**. Your tag styles are saved.                                                               |

When reporting a problem, include the version shown at the bottom of the sidebar.
