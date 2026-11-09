# 0013. Recent activity recorded by the main process

- Status: Accepted
- Date: 2026-11-09

## Context

The Home screen (FormaFlow phase 3) shows recent activity: files opened and saved, with how the saved file checked
out, and an "Open again" action. Two security rules apply ([security](../../security.md)): the window is untrusted
(it renders cell text), and the app only opens files the user picked. Storing file locations is also personal data.

## Decision

- The **main process records** activity, at the two points where it knows what really happened: after a file is
  opened (`document:open`) and after a save and its check (`document:export`). The window can only **read**
  (`getActivity()`) and **clear** (`clearActivity()`) the list; it can't add or change entries.
- At most **10 entries**, newest first, in `activity.json` in the settings folder: kind, file name, folder, time, and
  for saves the source name, items formatted and the check result. Nothing from inside the files is stored. Written
  via a temporary file, one write at a time; checked when loaded (`parseActivity`, malformed entries dropped). A
  failure to record never fails the open or save.
- **Open again** does not open a stored path. It calls `openFileDialog(startIn)`, and the main process starts the
  dialog in `startIn` **only if that folder is in the activity list** (`knownFolder`); otherwise it is ignored. The user
  still picks the file, so "only files the user picked" holds.
- `ElectronApi` changes: `openFileDialog(startIn?)` (optional, backward compatible), new `getActivity()` and
  `clearActivity()`, new type `ActivityEntry`.

## Consequences

- A compromised window can't plant entries or make the dialog start in an arbitrary folder.
- Folder paths are stored on the user's computer until they press **Clear** (documented in the user manual and the
  data documentation).
- Tests: `desktop/tests/activity.test.ts` (parsing, limit, known folders), UI store tests, and an e2e test (entries
  after a save, Continue, Open again starts in the saved file's folder, Clear survives a restart).

## Alternatives considered

- **The window records activity** (for example in `localStorage`): simpler, but the window could write anything, and
  the list would not match what the main process actually did.
- **Open again opens the stored file directly:** one click less, but breaks the "only files the user picked" rule.
- **Keep it in `config.json`:** that file is the tag-style profile users export and share; history doesn't belong
  there.
