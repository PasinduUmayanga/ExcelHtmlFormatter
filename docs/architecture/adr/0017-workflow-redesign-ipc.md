# 0017. Window calls added by the workflow redesign

- Status: Accepted
- Date: 2026-11-10

## Context

The redesign follows the "Reference-Matched (Horizontal Steps)" HTML prototype (roadmap P1–P15). The prototype
simulates several things the real app must do for real, and some of them need the main process: loading a sample
file, opening the file that was just saved, and keeping favourite files. The security rules stay: the window only
reads files the user picked, only shows or opens files this app saved, and never overwrites the original
([security](../../security.md)).

## Decision

Add to `ElectronApi` (documented in [contracts](../../api/contracts.md)), one call at a time as each phase lands:

- `openSample()` → `file:sample` (P3). The app passes `samplePath` to `startDesktopApp`; the Excel app ships
  `product_catalog.xlsx` with electron-builder `extraResources` (outside the asar, so the worker can read it as a
  file). The handler treats the sample as picked (it is the app's own file, chosen with "Load sample") and returns
  its `PickedFile`, or null when the app has none. The window cannot name any other path.

- `exportDocument(path, sections, config, suggestedName?)` (P7): the Export screen's "Output name" becomes the Save
  dialog's starting file name. The main process keeps only a name (`outputFileName` in `ipcChecks.ts`: no folders,
  no characters Windows or macOS refuse, the format's extension once) and falls back to the usual
  `<name>_formatted.xlsx`. The dialog still decides the final path, and saving over the original is still refused.
- `openSavedFile(path)` → `shell:openSaved` (P7, decision R9): opens a file in its usual program with
  `shell.openPath`, only if the path is in the app's saved-files list (the same list as Show in folder). Anything
  else is refused; a failure from the system is passed back as the error.

- `getFavorites()` → `favorites:list` and `toggleFavorite(fileName, folder)` → `favorites:toggle` (P9): starred
  files in `favorites.json` in the settings folder (like `activity.json`, ADR 0013; at most 50). A file can only be
  starred if it is in the recent activity, so the window can't store a path the user never opened or saved;
  unstarring always works, and Clear (recent activity) keeps favourites. Opening a favourite still shows the Open
  dialog in its folder: `knownFolder` now accepts folders from the activity or the favourites.

## Consequences

- One more read-only path the window can reach, fixed by the app; no path comes from the window.
- A new small file in the settings folder, `favorites.json`; a damaged file is read as an empty list.
- The installer contains the sample workbook (about 12 KB).
- Tests: the store's `openSample`, `openSavedFile` and output name; `outputFileName` (unit); Load sample → chosen
  file → Remove, and the output name reaching the Save dialog (e2e).
