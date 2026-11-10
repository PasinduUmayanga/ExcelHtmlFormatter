# Stored data: the tag-style settings file

Last reviewed: 2026-11-09. There is no database. The app stores these files in its settings folder: the active profile's tag styles
(`config.json`, below), the other formatting profiles (`profiles.json`), templates (`templates.json`), the recent
activity (`activity.json`), favourites (`favorites.json`) and window preferences (`preferences.json`), at the end of
this page.

- **Location:** `<Electron userData>/config.json`. On Windows: `%APPDATA%\Excel HTML Formatter\config.json`. On macOS:
  `~/Library/Application Support/Excel HTML Formatter/config.json`. The folder keeps the product's earlier name
  (`userDataFolder` in `startDesktopApp`), so settings carry over after the rename to FormaFlow
  ([ADR 0012](../architecture/adr/0012-formaflow-product-name.md)).
- **Written by:** `config:save` (every change in Tag styles, queued so only the latest is written) and `config:import`.
- **Write method:** `config.json.tmp` then rename (a crash can't leave half a file).
- **Validation:** `validateConfig()` in `packages/core/src/validateConfig.ts` runs on load, save, import and export.
  Invalid parts are dropped; a damaged or missing file means defaults are used.

## Schema

```jsonc
{
  "profileName": "Default", // string, trimmed, max 60 characters; default "Default"
  "unknownTagAction": "strip", // "strip" (remove tag, keep text) | "keep" (show the tag as text); anything else → "strip"
  "rules": {
    // tag name → style. Tag names: lower-case, ^[a-z][a-z0-9-]*$; "<B>" is read as "b".
    // Built-in tags "br" and "p" are never stored (always line/paragraph breaks).
    "b": { "bold": true },
    "mark": {
      "bold": true, // true only; anything else dropped
      "italic": true,
      "underline": true,
      "strike": true,
      "color": "#C00000", // hex #RGB or #RRGGBB, stored as #RRGGBB upper-case
      "size": 14, // points, 1–409 (Excel's limit), rounded to 0.5
      "font": "Georgia", // non-empty, max 31 characters (Excel's limit)
      "vertAlign": "superscript" // "superscript" | "subscript"
    },
    "span": {} // empty rule = "keep text plain": configured, no formatting
  }
}
```

## Defaults

`b`, `strong` → bold · `i`, `em` → italic · `u` → underline · `s` → strikethrough · `sup` → superscript ·
`sub` → subscript. `unknownTagAction: "strip"`. Source: `packages/core/src/defaultRules.ts`.

## Data flow

Window (Tag styles screen) → `saveConfig` → main validates → `config.json`. On start, `loadConfig` → validated →
store. During export, the window sends the current settings; the main process validates them again before the worker
uses them.

## Window preferences: `preferences.json`

`{ "theme": "system" | "light" | "dark" }`, written by `setTheme` (temporary file, then rename). Missing, damaged or
unknown values mean `"system"` ([ADR 0014](../architecture/adr/0014-theme-preference.md)). Kept apart from
`config.json` so the theme is not part of exported tag styles.

## Formatting profiles: `profiles.json` (ADR 0018)

`config.json` is the **active** profile, unchanged. The others:

```json
{ "version": 1, "profiles": [{ "version": 2, "profileName": "Client A", "unknownTagAction": "strip", "rules": {} }] }
```

Each entry is read like `config.json` (`validateConfig`); entries with a name already used (ignoring case) or the
active profile's name are dropped. At most 30 profiles in all. A missing or damaged file means only the active profile.

## Templates: `templates.json` (ADR 0018)

```json
{
  "version": 1,
  "templates": [
    { "name": "Weekly", "fileType": "excel", "action": "format-html", "profile": "Default", "sheets": "all" }
  ]
}
```

`sheets`: `html` ticks the visible sections with HTML when the file opens (the usual choice), `all` ticks every
section. Names up to 60 characters, unique ignoring case; at most 30. Invalid entries are dropped.

## Favourites: `favorites.json` (ADR 0017)

A list of `{ "fileName", "folder", "at" }`, newest first, at most 50. Only files from the recent activity can be
starred; clearing the activity keeps them.
