---
name: verify-release
description: Full verification of the HTML Formatter monorepo before merging or releasing — checks, coverage, end-to-end tests, build, packaging and package contents. Use before a merge to main, a version tag, or when asked to "verify", "validate" or "check everything".
---

# Verify before merge or release

Report every result exactly as the command printed it. If a step can't run here (e.g. macOS packaging on Windows),
say so; never claim it passed.

## 1. Clean state

```bash
git status --short            # know what's uncommitted
pnpm install --frozen-lockfile
```

## 2. Quality gates (all must pass)

```bash
pnpm turbo run lint format:check typecheck test --force   # --force: don't trust the cache for a release
pnpm test:coverage                                          # floors in packages/*/vitest.config.ts
pnpm test:e2e                                               # builds the app, then Playwright against the real app
```

## 3. Package (per app, on the target OS)

```bash
pnpm dist:excel
ls -la apps/excel-formatter/dist/*.exe   # Windows: Setup + portable
```

Check the package contents: only the built app plus runtime `dependencies` (for Excel: ExcelJS and its dependencies),
no `@hf/*`, React, dev tools or source maps:

```bash
npx --yes @electron/asar list apps/excel-formatter/dist/win-unpacked/resources/app.asar | grep -vE '^\\node_modules'
```

Optional smoke test of the packaged app: launch `dist/win-unpacked/<App>.exe`, open
`packages/adapter-excel/samples/product_catalog.xlsx`, save a copy, and open it in Excel.

## 4. Release-only

- Version bumped in `apps/<app>/package.json`; `CHANGELOG.md` `Unreleased` moved under the new version.
- `docs/roadmap.md` and docs updated (`docs-sync` skill).
- Tag `v<version>` only after the Tech Lead approves (CI builds Windows + macOS installers from tags).

## 5. Report

A table: each gate → result (pass/fail with numbers), plus what wasn't verified and why.
