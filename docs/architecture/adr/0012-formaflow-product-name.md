# 0012. Product name FormaFlow, internal identifiers unchanged

- Status: Accepted
- Date: 2026-11-09

## Context

The product is renamed from "Excel HTML Formatter" to **FormaFlow** (FormaFlow programme, phase 2). Two of Electron's
defaults depend on names:

- The settings folder (`userData`) is named after `productName`. A new name means a new, empty folder: users would
  lose their saved tag styles.
- The Windows installer recognises an installed app by `appId`. A new `appId` would install FormaFlow next to the old
  app instead of upgrading it.

## Decision

- Users see **FormaFlow**: window title, sidebar (with a tagline, "HTML → Excel formatting"), installer and shortcut
  names (`FormaFlow-Setup-<version>.exe`, `FormaFlow-<version>-portable.exe`, `FormaFlow-<version>-mac-universal.dmg`),
  READMEs and user documentation.
- **Unchanged:** `appId` (`com.pasindu.excelhtmlformatter`), package names (`excel-formatter`, `@hf/*`), the
  repository, every API (`ElectronApi`, `FormatAdapter`, worker protocol) and the settings file format.
- **Settings folder kept:** `startDesktopApp` accepts `userDataFolder`; the Excel app passes `'Excel HTML Formatter'`,
  so settings stay in `%APPDATA%\Excel HTML Formatter\` (macOS: `~/Library/Application Support/Excel HTML Formatter/`).
  A `--user-data-dir` switch still wins (the e2e tests rely on it). The value must be a plain folder name.
- `FormatInfo` gains an optional `tagline` (backward compatible: formats without it show no tagline).

## Consequences

- Existing users keep their tag styles and, on Windows, get an in-place upgrade. Not verified here: upgrading a real
  installation from an old installer, and macOS.
- The settings folder keeps the old name, which users may notice if they look for it. The user manual and
  troubleshooting guide explain it.
- Future apps choose their own `userDataFolder` (or none) when they are created.

## Alternatives considered

- **Copy the settings to a new "FormaFlow" folder on first start:** more code (copy, conflict and failure handling)
  for a folder name few users see; can still be done later.
- **New `appId`:** a clean identity, but two installs side by side and no upgrade path.

## Note (2026-11-10)

The GitHub repository was renamed from `ExcelHtmlFormatter` to `FormaFlow` and the root package from `html-formatter`
to `formaflow`. The decision above is unchanged: `appId`, the `@hf/*` and `excel-formatter` package names and the
settings folder stay as they are.
