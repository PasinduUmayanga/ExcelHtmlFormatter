# 0007. ESLint + Prettier in their own package (TypeScript 6 for lint)

- Status: Accepted
- Date: 2026-11-09

## Context

The repo had no linting, formatting or enforced package boundaries. The project compiles with TypeScript 7.0 (the
native compiler). typescript-eslint 8.72, the latest, supports only TypeScript `>=4.8.4 <6.1.0`: TypeScript 7 doesn't
yet offer the JavaScript API it needs.

## Decision

- ESLint 10 (flat config) + typescript-eslint (recommended, non-type-aware) + React Hooks rules + Prettier 3.
- All lint tooling lives in the private workspace package **`tools/lint`**, which depends on TypeScript **6.0.3**.
  Compilation, type-checking and builds stay on TypeScript 7. The root `eslint.config.mjs` re-exports
  `tools/lint/config.js`.
- **Package boundaries** are enforced with `@typescript-eslint/no-restricted-imports` (type-only imports allowed where
  safe). Examples: core can't import Electron/Node/React; the window can't import Electron, Node or ExcelJS; the
  sandboxed preload may only import `electron` at runtime.
- Prettier matches the existing style (no semicolons, single quotes, 120 columns). `.editorconfig` and
  `.gitattributes` (`eol=lf`) keep files consistent on every OS.
- `pnpm check` runs `lint`, `format:check`, `typecheck`, `test` through Turborepo.

## Consequences

- Revisit when typescript-eslint supports TypeScript 7: then lint can use the repo's TypeScript and type-aware rules.
- Two TypeScript versions are installed; only `tools/lint` uses 6.0.

## Alternatives considered

- **Biome:** no TypeScript dependency, but its import-boundary rules are less mature, and the team chose ESLint (D5).
- **Downgrade the project to TypeScript 6:** gives up the faster compiler for a lint tool.
