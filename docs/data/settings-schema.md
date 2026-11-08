# Stored data: the tag-style settings file

Last reviewed: 2026-11-09. There is no database. The app stores exactly one file per app: the tag styles.

- **Location:** `<Electron userData>/config.json`. On Windows: `%APPDATA%\Excel HTML Formatter\config.json`. On macOS:
  `~/Library/Application Support/Excel HTML Formatter/config.json`.
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
