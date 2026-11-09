# 0014. Theme chosen in the app, applied by the main process

- Status: Accepted
- Date: 2026-11-09

## Context

FormaFlow phase 4 adds Light / Dark / System themes with a saved choice. The window's colours already switch with
the `prefers-color-scheme` media feature (`tokens.css`). Open questions: where to keep the choice, how to avoid a white
flash when a dark window opens, and how to make native dialogs and menus match. Several colours also failed WCAG 2.2
AA contrast.

## Decision

- The choice is saved in **`preferences.json`** in the settings folder, separate from `config.json` (tag styles are a
  profile users export and share; the theme is not part of it). Read with `parsePreferences`: anything invalid means
  `system`.
- The **main process applies it** with Electron's `nativeTheme.themeSource`, before the window is created. This one
  setting drives the window's `prefers-color-scheme`, native dialogs and menus. The window's background colour is set
  from it (`windowBackground`, the sidebar colour of that theme), so a dark window never flashes white. The CSS needs
  no theme attribute or second set of rules.
- New `ElectronApi` calls: `getPreferences()` and `setTheme(theme)`; `setTheme` rejects anything other than
  `system`, `light` or `dark`. New types `ThemeChoice` and `Preferences`.
- The choice is shown in a header bar above every screen (decision C1 of the FormaFlow plan).
- **Contrast:** `--faint`, `--ok` and `--warn` changed, and three tokens were added: `--control-border` (3:1
  boundaries for inputs, selects, buttons and toggles), `--on-accent` and `--on-ok` (text on solid accent or green).
  `packages/ui/tests/tokens.test.ts` checks every listed pair in both themes (text ≥ 4.5:1, boundaries ≥ 3:1).

## Consequences

- One source of truth for the theme; dialogs match; no flash on start.
- End-to-end tests now launch without Playwright's default light emulation (`colorScheme: null`), so they see the
  app's real theme.
- Some colours changed slightly (grey hint text, green and amber text, button outlines, text on blue buttons in dark
  mode). Decorative dashed borders keep the lighter colour.

## Alternatives considered

- **`localStorage` and a `data-theme` attribute in the window:** dialogs and menus would not follow, the window would
  flash before the script ran, and every colour would need a second set of selectors.
- **Keep the theme in `config.json`:** it would travel with exported tag-style profiles.
