# 0018. Formatting profiles and templates

- Status: Accepted
- Date: 2026-11-10

## Context

The "Reference-Matched" prototype has Formatting Profiles (several named sets of tag styles) and Templates (a saved
setup to start a task with). The app had one set of tag styles in `config.json` (`AppConfig`, settings version 2),
read by the main process, the worker (export and check), import/export and every screen. Changing that file's shape
would touch all of them and stop older versions of the app from reading the user's styles.

## Decision

**Profiles.** `config.json` stays exactly as it is and holds the **active** profile (its `profileName` is the
profile's name). The other profiles are stored in a new `profiles.json` in the settings folder:
`{ "version": 1, "profiles": [AppConfig, …] }`. There is nothing to migrate: the existing styles are the "Default"
profile (or whatever `profileName` they have).

- Switching (`activateProfile`) swaps: the chosen profile is written to `config.json`, the previous one joins the
  others. `profiles.json` is written first with both, so a crash in between loses nothing (a duplicate is dropped when
  read).
- Names: 1–60 characters, no control characters, unique ignoring case. At most 30 profiles. The active profile and
  "Default" can't be deleted. New profiles start from the default styles; Duplicate copies one.
- `saveConfig` and Import change the active profile's styles but never its name (renaming is `renameProfile`, which
  checks for duplicates), so the window can't create two profiles with one name.
- Logic in `packages/desktop/src/main/profiles.ts` (no Electron, unit-tested); the file handling and IPC
  (`profiles:list|create|rename|delete|activate`) in `index.ts`.

**Templates.** `templates.json` in the settings folder: `{ "version": 1, "templates": [WorkflowTemplate, …] }`, each
`{ name, fileType, action, profile, sheets: 'html' | 'all' }`, at most 30, unique names. The main process only
checks their shape (`templates.ts`). Using one is done in the window: it is refused when the action isn't one this app
can run, or when its profile no longer exists; otherwise it chooses the action, makes the profile active, unlocks the
workflow and, when the file opens, ticks the sections the template asks for.

The new calls are in `ElectronApi` and [contracts](../../api/contracts.md); the files are described in
[stored data](../../data/settings-schema.md).

## Consequences

- Nothing that reads `config.json` changed (worker, export, check, older app versions).
- Two new small files; a damaged one is read as empty (only the active profile, no templates).
- Tests: `profiles.test.ts`, `templates.test.ts` (desktop), the store's profile and template actions (ui), and the
  e2e "Formatting Profiles" test (create, use, rename, delete, Configure's picker, a template, a restart).
