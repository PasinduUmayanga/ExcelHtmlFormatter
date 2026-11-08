# 0001. Monorepo with pnpm workspaces and Turborepo

- Status: Accepted
- Date: 2026-11-09

## Context

The Excel HTML Formatter started as one Electron app. More formats (Word, text, PDF output) are planned, and most of the
code — the HTML-to-formatting engine, the Electron shell, the UI — is the same for every format. Copying it per app
would make every fix N fixes.

## Decision

One repository, split into workspace packages: `@hf/core`, `@hf/adapter-*`, `@hf/desktop`, `@hf/ui`, and thin apps in
`apps/*`. pnpm 12 workspaces manage dependencies; Turborepo 2 runs `typecheck`, `test`, `build`, `dist` in dependency
order with caching. Shared packages are consumed as TypeScript source (no per-package build step); each app's
electron-vite build bundles them.

## Consequences

- A new format = a new adapter package + a thin app; shared packages don't change.
- Turborepo only re-runs tasks for changed packages and their dependents (the `transit` task propagates changes from
  dependencies to dependents).
- pnpm blocks dependency install scripts by default; allowed ones are listed in `pnpm-workspace.yaml` (only `electron`).
- Apps list `@hf/*` as `devDependencies` so electron-vite bundles them and electron-builder ships only real runtime
  `dependencies` (for Excel: ExcelJS).
- Each app ships its own Electron (~110 MB per installer). A single multi-format app remains possible later
  (decision D2 in [docs/roadmap.md](../../roadmap.md)).

## Alternatives considered

- **npm workspaces only:** no task graph or caching.
- **Nx:** more features than needed; heavier configuration.
- **Separate repositories per app:** shared code would be duplicated or published as packages; slower changes.
