# Deployment and Release

Last reviewed: 2026-11-09

## Build outputs

| Command (repo root) | Runs on | Output in `apps/excel-formatter/dist`                                                |
| ------------------- | ------- | ------------------------------------------------------------------------------------ |
| `pnpm dist:excel`   | Windows | `FormaFlow-Setup-<version>.exe` (NSIS, per-user), `FormaFlow-<version>-portable.exe` |
| `pnpm dist:excel`   | macOS   | `FormaFlow-<version>-mac-universal.dmg` (ad-hoc signed)                              |

`appId` stays `com.pasindu.excelhtmlformatter` after the FormaFlow rename, so new installers upgrade the installed app
([ADR 0012](../architecture/adr/0012-formaflow-product-name.md)).

`dist` runs only after build, type-check, tests and lint pass (Turborepo `dependsOn`). Packaging config:
`apps/excel-formatter/electron-builder.yml`. Measured sizes (Windows, 0.1.0): installer about 124 MB, portable about
112 MB.

## Continuous integration

- **GitHub Actions** (`.github/workflows/build.yml`): Windows and macOS; `pnpm install --frozen-lockfile` →
  `turbo run typecheck test build` → `turbo run dist` (not on pull requests) → installers uploaded as artifacts.
  **Status: not yet run**, because the repository has no remote (decision D11).
- **AppVeyor** (`appveyor.yml`, Windows, image "Visual Studio 2022"). **Status: configured, not yet run on AppVeyor**
  (no remote or AppVeyor project yet); every step was run locally on Windows on 2026-11-09 and passed.

  | Stage          | Commands                                                                                                       | Shows up in                                                               |
  | -------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
  | `install`      | Node 26 (image, or downloaded + SHA-256 checked), pnpm from `packageManager`, `pnpm install --frozen-lockfile` | Console log                                                               |
  | `build_script` | `pnpm lint` → `pnpm format:check` → `pnpm typecheck` → `pnpm build`                                            | Console log                                                               |
  | `test_script`  | `pnpm test:ci` (unit + coverage floors + JUnit) → `pnpm test:e2e` (Playwright + JUnit)                         | **Tests** tab (126 results today)                                         |
  | `after_test`   | `pnpm dist` (skipped for pull requests)                                                                        | **Artifacts**: `installers`                                               |
  | `on_finish`    | Upload JUnit files; zip coverage and e2e results (always, also on failure)                                     | **Tests**; **Artifacts**: `coverage-reports.zip`, `e2e-results-<app>.zip` |

  Caches: pnpm store, Electron and electron-builder downloads, the Node download (keyed on `pnpm-lock.yaml`,
  `electron-builder.yml`, `.nvmrc`), and Turborepo's `.turbo/cache`. Releases to GitHub are prepared but commented out
  until an encrypted token is added. macOS installers stay on GitHub Actions.

  **To activate:** push the repository to GitHub, add it as a project at ci.appveyor.com (it picks up `appveyor.yml`),
  and check the first build. Two things can only be confirmed there: whether the image already has Node 26 (otherwise
  the download fallback runs, about 30 s on the first build, then cached), and that the Electron e2e tests have a
  desktop session on AppVeyor's Windows workers.

## Release steps

1. Run the `verify-release` skill on the release commit.
2. Bump `version` in `apps/<app>/package.json`; move `CHANGELOG.md` "Unreleased" under the new version.
3. Commit, then tag `v<version>` (after Tech Lead approval). CI builds the installers from the tag.
4. Publish the installers (GitHub Releases planned in P5-T2) with the changelog entry.

## Code signing (not set up yet)

- **Windows:** set `CSC_LINK` (certificate) and `CSC_KEY_PASSWORD` as CI secrets; electron-builder signs automatically.
- **macOS:** remove `identity: '-'` and `hardenedRuntime: false` from `electron-builder.yml`, then add a Developer ID
  certificate and notarization credentials as CI secrets.

Until then, users see a first-launch warning ([user manual](../user-manual.md#installing)).

## Configuration at runtime

None. The app reads no environment variables. It stores its settings in `<userData>/config.json`
([schema](../data/settings-schema.md)).
