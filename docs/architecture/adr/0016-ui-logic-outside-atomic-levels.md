# 0016. Logic, state and shared styles outside the Atomic Design levels

- Status: Accepted (amends [0011](0011-atomic-design-in-ui.md))
- Date: 2026-11-10

## Context

ADR 0011 organised `@hf/ui` by Atomic Design (`src/design/` atoms → templates, `src/screens/` as pages). Since then,
non-component code had collected inside the levels: a hook and a helper in `RichText`, `styleToCss` among the
molecules, wording helpers in organisms (`describeProgress`, `describeActivity`, `formatWhen`, `clip`), and `cx`,
`tokens.css`, `base.css` and `utilities.css` at the top of `design/`. The store, a hooks file and the Help parser sat
loose at the top of `src`. Enterprise React apps keep a design system for components and put state, hooks, feature
logic and utilities beside it, not inside it.

## Decision

Keep the folder names from ADR 0011 (`design/`, `screens/`) and move everything that is not a component out of them:

```
packages/ui/src/
  design/          atoms/ molecules/ organisms/ templates/  (components and their CSS only)
  screens/         the pages level, one per route
  state/store.ts   app state (zustand); splitting it per feature is roadmap task P2-T3
  hooks/           useEditTag, useHelp, useConversion
  features/help/   the Markdown parser and search (ADR 0015)
  utils/           cx, styleToCss, linkTitle, describeProgress, describeActivity (+ formatWhen), clip
  styles/          styles.css (the entry, in cascade order), tokens.css, base.css, utilities.css
  router.tsx  index.tsx
```

- The levels' `index.ts` files export components only. `@hf/ui`'s public exports are unchanged (`index.tsx`
  re-exports `useConversion`, `linkTitle`, `styleToCss`, `describeProgress` from their new places).
- Each level keeps its own stylesheet next to its components; the cascade order is unchanged.
- Code was moved, not rewritten (`git mv` where a file moved whole).
- Not done, on purpose: renaming `design/` to `components/` or `screens/` to `pages/` (no benefit, against ADR 0011's
  decision), a `services/` layer (calls to `window.api` already live only in the store), and props-only organisms
  (organisms may still read the store and router hooks, as in ADR 0011).

## Consequences

- The levels hold only components, so it is clear where new code goes: a component → `design/`, a reusable function →
  `utils/`, a hook → `hooks/`, logic for one feature → `features/<feature>/`, app state → `state/`.
- About 45 import paths changed; tests that import deep paths were updated. Nothing users see changed (checked by
  screenshot comparison and the e2e tests).
- Next steps towards feature modules are roadmap tasks P2-T3 (store slices) and P2-T5 (feature modules), each needing
  approval.

## Alternatives considered

- **Also rename to `components/` and `pages/`:** matches a common example layout, but adds ~30 more changed imports and
  doc churn for no change in behaviour or reuse.
- **Leave the helpers where they were:** keeps working, but mixes logic into components and hides reusable functions.
