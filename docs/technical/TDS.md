# Technical Design Specification

Last reviewed: 2026-11-09. Implementation-level details. Structure is in the [SAD](../architecture/SAD.md); contracts in
[contracts](../api/contracts.md). When this page and the code disagree, the code is right — fix this page.

## 1. HTML → styled runs (`@hf/core`)

**Tokenizer** (`tokenize.ts`): a regular expression finds comments and tags (including quoted attributes containing
`>`). Text between tags has entities decoded (named: `&amp; &lt; &gt; &quot; &apos; &nbsp; &copy;` and others;
numeric `&#169;`, `&#xA9;`). A `<` not followed by a letter or `/` is plain text. Tag names are lower-cased.

**Run builder** (`htmlToRuns.ts`), given the settings:

| Input                          | Result                                                                                                 |
| ------------------------------ | ------------------------------------------------------------------------------------------------------ |
| Opening tag with a rule        | Push its style merged over the current style (inner rules win)                                         |
| Closing tag                    | Pop back to its matching opening tag (also closes unclosed inner tags); stray closing tags are ignored |
| `<br>`, `</br>`                | Line break                                                                                             |
| `<p>…</p>`                     | Paragraph break before/after, never at the very start or end, never doubled                            |
| Tag without a rule             | `strip`: ignore the tag, keep text · `keep`: emit the tag text; reported in `unknownTags`              |
| Void/self-closing tags         | Never pushed                                                                                           |
| Adjacent runs with equal style | Merged                                                                                                 |

Output: `{ runs, unknownTags, hasLineBreak, plainText }`. **Tag scanning** (`scanTags.ts`) uses the same tokenizer to
count opening tags per section, remembering the first cell and a sample for previews.

## 2. Excel conversion (`@hf/adapter-excel`)

- **Which cells:** plain-text strings and existing rich text (as plain text). Never formulas, numbers, dates,
  hyperlinks, errors, or merged-over cells.
- **Fonts:** each run gets the cell's own font (name, size, family, theme scheme, colour incl. theme + tint) with the
  tag's style on top. If a tag sets a font, `scheme`/`family`/`charset` are removed so Excel uses that font.
  Colours: `#RRGGBB` → `FFRRGGBB`.
- **Line breaks:** a cell whose result contains `\n` gets `alignment.wrapText = true`.
- **Empty result** (e.g. `<b></b>`): the cell becomes empty.
- **Saving:** `writeFile(target + '.saving')` then rename. Locked targets give a "close it in Excel" message.
- **Preview:** top-left 200 rows × 30 columns; formula results, dates (`yyyy-mm-dd`), booleans and link text are shown
  as display values; `truncated` is set for larger sheets.
- **Sheet size label:** `rowCount × columnCount` of the used range.

## 3. Jobs, workers and progress (`@hf/desktop`)

- **Theme** ([ADR 0014](../architecture/adr/0014-theme-preference.md)): `src/main/preferences.ts` (`parsePreferences`,
  `isTheme`, `windowBackground`). On `whenReady` the saved theme is set as `nativeTheme.themeSource` before the window
  is created; the window background follows `nativeTheme.shouldUseDarkColors` (also on `updated`). The window's CSS
  needs nothing else: `tokens.css` switches on `prefers-color-scheme`, which follows `nativeTheme`. The header
  (`organisms/AppHeader`) shows the choice from the store (`theme`, `setTheme`).
- **Recent activity** ([ADR 0013](../architecture/adr/0013-recent-activity.md)): `src/main/activity.ts`
  (`parseActivity`, `addActivity`, `knownFolder`). Loaded once into memory; each change is written with
  `writeJsonSafely` in order. Recorded after `document:open` succeeds and after `document:export` finishes (with the
  verification result). The UI reloads it after an open or a save (`loadActivity`) and remembers the last document
  screen (`lastStep`, set by `AppLayout`) for Home's Continue.
- **Settings folder:** `startDesktopApp({ userDataFolder })` sets `userData` to that folder inside the system's
  app-data folder before the app is ready (`userDataPath()` in `src/main/userData.ts`), unless `--user-data-dir` was
  given. The Excel app passes `'Excel HTML Formatter'` ([ADR 0012](../architecture/adr/0012-formaflow-product-name.md)).

- `JobWorker` wraps one `worker_threads.Worker` (heap limit 4 GB). `request()` returns a promise per message id;
  `terminate(reason)` rejects everything pending with `reason` (default `CANCELLED_MESSAGE`).
- **Session worker:** created by `document:open`; replaced when another file is opened; keeps the document for previews.
- **Export worker:** created per `document:export`; always terminated afterwards. On failure or Cancel, the main
  process deletes `target.saving`.
- **Progress:** adapters report `{ stage, done, total, unit, detail }`; conversion progress is throttled to one update
  per 100 ms (`throttle()` in core). The main process forwards it as `job:progress` to the window that started the job.
- **Allow-lists in main:** `pickedFiles` (only files from the Open dialog or a drop may be opened) and `savedFiles`
  (only files this app saved may be shown in their folder).

## 4. Window (`@hf/ui`)

- `createFormatterRouter()` builds the route tree (see SAD §4) with `createHashHistory()`. `validateSearch` returns
  every key explicitly. Guards read the store with `useApp.getState()`.
- **Store** (zustand): `doc`, `selected`, `config`, `appInfo`, `job`, `previews`, `exporting`, `exportResult`,
  `notice`, `error`. Settings saves are queued (one write at a time, latest wins). `openFile` resets document state on
  failure or cancel, because the main process closes the previous document when a new load starts.
- **Rendering cell text:** `RichText` renders runs as React text nodes with inline CSS from `styleToCss()`. No HTML is
  ever injected.
- **Performance:** the preview component is memoised so 100 ms progress updates don't re-render the grid.
- **Components (Atomic Design, [ADR 0011](../architecture/adr/0011-atomic-design-in-ui.md)):** `src/design/` holds
  the levels, each with an `index.ts` and one stylesheet:

  | Level     | Contents                                                                                                                                             | May use                               |
  | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
  | Tokens    | `tokens.css`: colours (light, dark by `prefers-color-scheme`), `--radius`, `--space-1`…`--space-6`, `--text-xs`…`--text-lg`                          | —                                     |
  | Atoms     | `Button` (variant, small), `Badge` (tone), `TagName`, `Icon`, `Spinner`, `Swatch`                                                                    | tokens                                |
  | Molecules | `Field`, `SegmentedControl`, `Banner`, `ConfirmBox`, `Tabs`/`Tab`/`tabClass`, `Stat`, `RichText`, `styleToCss`                                       | atoms, `@hf/core`                     |
  | Organisms | `Sidebar`, `JobProgressPanel`, `CheckChip`, `SectionTabs`, `SaveSummary`, `StyleEditor`, `AddTag`, `CheckList`, `CheckDetail`, `MissingStylesBanner` | the levels below, store, router hooks |
  | Templates | `AppLayout` (sidebar, error banner, current screen, toast), `ScreenTemplate` (title, intro, content, footer)                                         | the levels below                      |
  | Pages     | `src/screens/*`, one per route                                                                                                                       | everything above                      |

  `styles.css` imports the level stylesheets in that order, then `screens/screens.css` and `utilities.css` (layout
  helpers such as `.spread`, `.nowrap`, `.gap-1`, `.mt-2`, `.mb-5`, `.muted`, `.text-sm`, `.truncate`). Utilities load
  last so they override like the inline styles they replaced. Class names are part of the e2e tests' selectors: keep
  them when changing a component. Only data-driven inline styles are allowed (`Swatch`, `RichText` runs, the progress
  bar).

## 5. Build and packaging (`apps/*`)

- **electron-vite 6:** `main`, `preload` and `renderer` builds. `@hf/*` are `devDependencies` → bundled. Real
  `dependencies` (`exceljs`) stay external and are shipped by electron-builder. The worker entry is imported with
  `?nodeWorker`; the icon with `?asset`. The renderer dedupes React, zustand and the router.
- **Content Security Policy** (`index.html`): `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';
img-src 'self' data:` (inline styles are used by previews).
- **electron-builder 26:** Windows NSIS installer (per-user, choose folder) and portable `.exe`; macOS universal
  `.dmg`, ad-hoc signed with `hardenedRuntime: false` until a Developer ID exists. Output in `apps/<app>/dist`.
- **Turborepo tasks:** `typecheck`, `test`, `test:coverage`, `build` depend on `transit` (so dependency changes
  invalidate dependents); `dist` depends on build + tests + lint; `lint`, `format:check`, `dev`, `test:e2e`, `dist` are
  not cached.
