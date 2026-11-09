---
name: add-feature
description: Add or change a screen, route, UI component or user-facing workflow in the FormaFlow apps (packages/ui, and IPC in packages/desktop when needed). Use for any UI or workflow change.
---

# Add or change a feature

Read first: `docs/design/FDS.md` (current behaviour), `docs/architecture/SAD.md` §4 (routes and state),
`docs/technical/TDS.md` §4 (component levels), `packages/ui/src/router.tsx`, `packages/ui/src/store.ts`.

## 1. Pin down the behaviour

- Find or add the requirement in `docs/requirements/SRS.md` (`FR-xx`) and the acceptance criteria in
  `docs/design/FDS.md`. If the change alters existing business behaviour, get approval first.

## 2. Implement in the right layer

| Need                               | Where                                                                                                                     |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| New screen/address                 | `packages/ui/src/screens/` + route in `router.tsx`                                                                        |
| Guard (needs a document/selection) | `beforeLoad` using `canVisit(useApp.getState(), …)`                                                                       |
| Search params                      | `validateSearch` that **returns every key** (TanStack keeps raw values of omitted keys)                                   |
| Shared data across screens         | the zustand store (`store.ts`); router owns "where the user is"                                                           |
| Main-process work                  | `ElectronApi` in `@hf/core` → preload → handler in `@hf/desktop/main` (validate every argument) → `docs/api/contracts.md` |
| Format-specific words              | `useFormatterApp().format` (never hard-code "sheet"/"cell")                                                               |
| Markup and styling                 | reuse `src/design/` (atoms → templates, ADR 0011); new pieces at the lowest level that fits; `ScreenTemplate` for screens |
| Spacing, sizes, colours            | tokens and `utilities.css` helpers; no fixed inline styles; keep class names (e2e selectors)                              |
| Calling the main process from UI   | a store action, never `window.api` in a screen or component                                                               |
| Long-running work                  | worker request + progress + `JobProgressPanel` + Cancel                                                                   |

Rules: no `innerHTML`/`dangerouslySetInnerHTML`; render cell text through `RichText`; plain sentence-case text; errors
say what to do next; keyboard and `aria-*` attributes on interactive controls.

## 3. Tests

- Logic: unit tests in `packages/ui/tests` (router guards use `// @vitest-environment happy-dom`).
- Components: `renderToStaticMarkup`, or happy-dom + `act` for clicks (`atoms`, `molecules`, `organisms` tests).
- IPC: tests in `packages/desktop/tests`.
- Main flow changed? Update `apps/excel-formatter/e2e/smoke.spec.ts`.

```bash
pnpm check && pnpm test:e2e
```

## 4. Docs (same change)

FDS (behaviour + acceptance), SRS if requirements changed, Help topics in `apps/<app>/help/` (if users see it), SAD §4 route table,
contracts (if IPC changed), README features (if notable), CHANGELOG, roadmap status. Run the `docs-sync` skill.
