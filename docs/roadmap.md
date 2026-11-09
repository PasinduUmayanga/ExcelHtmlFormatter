# Roadmap and progress

Last reviewed: 2026-11-09. Phases need Tech Lead approval before they start; tasks inside an approved phase are done one
reviewable change at a time. Status: ✅ done · 🔄 in progress · ⏳ approved, not started · 📝 proposed (needs approval).

## Phase 0 — Guardrails (approved 2026-11-09) ✅

| ID    | Task                                                                    | Status | Result                                                                                       |
| ----- | ----------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------- |
| P0-T1 | ESLint + Prettier + EditorConfig + package-boundary rules + `lint` task | ✅     | `tools/lint` ([ADR 0007](architecture/adr/0007-lint-tooling-package.md)); `pnpm check` clean |
| P0-T2 | End-to-end smoke tests in the repo                                      | ✅     | 5 Playwright tests ([ADR 0008](architecture/adr/0008-playwright-electron-e2e.md))            |
| P0-T3 | Coverage reports with baseline thresholds                               | ✅     | Floors per package ([testing strategy](testing-strategy.md#coverage))                        |

## Phase 1 — Knowledge base and documentation (approved 2026-11-09) ✅

| ID    | Task                                                          | Status | Result                                                               |
| ----- | ------------------------------------------------------------- | ------ | -------------------------------------------------------------------- |
| P1-T1 | `AGENTS.md`, `CLAUDE.md`, package-level `CLAUDE.md`           | ✅     | Root files + `packages/core`, `packages/desktop`                     |
| P1-T2 | `docs/` structure, index, history moved, ADRs 0001–0008       | ✅     | [docs/README.md](README.md), [ADRs](architecture/adr/)               |
| P1-T3 | Architecture, technical design, contracts, settings schema    | ✅     | SAD, TDS, contracts, settings schema                                 |
| P1-T4 | README, developer guide, CONTRIBUTING, CHANGELOG              | ✅     | Badges from the lockfile; LICENSE pending decision D10               |
| P1-T5 | Project skills                                                | ✅     | add-format, add-feature, verify-release, docs-sync, review-checklist |
| P1-T6 | SRS, FDS, user manual, testing strategy, security, operations | ✅     | Requirement IDs FR-01–FR-12, NFR-01–NFR-08                           |

## Phase 2 — Modular refactor, no behaviour change 🔄

P2-T4 approved and done 2026-11-09; the other tasks still need approval.

| ID    | Task                                                                         | Category    | Depends on   | Status                                                                        |
| ----- | ---------------------------------------------------------------------------- | ----------- | ------------ | ----------------------------------------------------------------------------- |
| P2-T1 | Split the desktop main process into IPC modules and services; IPC tests      | Recommended | P0           | 📝                                                                            |
| P2-T2 | One shared safe-write utility                                                | Recommended | P2-T1        | 📝                                                                            |
| P2-T3 | Split the UI store into slices per feature                                   | Recommended | P0-T2        | 📝                                                                            |
| P2-T4 | Design system (tokens, atoms → templates), no inline styles, component tests | Recommended | P0-T1        | ✅ inside `@hf/ui` ([ADR 0011](architecture/adr/0011-atomic-design-in-ui.md)) |
| P2-T5 | `@hf/ui` reorganised into feature modules with composed routes               | Recommended | P2-T3, P2-T4 | 📝                                                                            |

## Phase 3 — Export and conversion architecture 📝

| ID    | Task                                                                  | Category  | Depends on   |
| ----- | --------------------------------------------------------------------- | --------- | ------------ |
| P3-T1 | Neutral document model and ports in core; Excel reader (+ ADR)        | Required* | P1           |
| P3-T2 | Format registry and conversion service; `exportAs` worker request/IPC | Required* | P3-T1, P2-T1 |
| P3-T3 | TXT, HTML, Markdown writers (no new dependencies)                     | Required* | P3-T2        |
| P3-T4 | "Export as…" UI with capability warnings                              | Required* | P3-T2, P2-T5 |

\* Required if export/conversion is confirmed in scope (decision D1).

## Phase 4 — New formats (each approved separately) 📝

P4-T1 PDF writer (Electron `printToPDF`) · P4-T2 DOCX writer · P4-T3 DOCX reader + Word formatter app · P4-T4 TXT/CSV readers.

## Phase 5 — CI/CD 🔄

P5-T1 (AppVeyor part) requested by the Tech Lead on 2026-11-09: `appveyor.yml` added; all steps pass locally; not yet run on AppVeyor (needs a remote + AppVeyor project).

P5-T1 CI decision; `appveyor.yml` and/or verify GitHub Actions on a remote · P5-T2 release process (versioning,
GitHub Releases, signing secrets) · P5-T3 security in CI (`pnpm audit`, Electron fuses, dependency review).

## FormaFlow programme (plan approved 2026-11-09) 🔄

Rebranding and UX work, one approval per phase. Decisions B1–B10 were approved with the plan.

| Phase | Work                                                             | Status                                                         |
| ----- | ---------------------------------------------------------------- | -------------------------------------------------------------- |
| FF-1  | Architecture analysis and plan                                   | ✅                                                             |
| FF-2  | Rebranding (name only; `appId`, APIs and settings folder kept)   | ✅ [ADR 0012](architecture/adr/0012-formaflow-product-name.md) |
| FF-3  | Dashboard (format cards, "Coming soon" export actions, activity) | ✅ [ADR 0013](architecture/adr/0013-recent-activity.md)        |
| FF-4  | Light/Dark/System theme, saved preference, contrast fixes        | ✅ [ADR 0014](architecture/adr/0014-theme-preference.md)       |
| FF-5  | Help Center (from the Markdown docs, searchable)                 | ✅ [ADR 0015](architecture/adr/0015-help-center-markdown.md)   |
| FF-6  | Logo concepts, choice and integration                            | ✅ concept A, page in flow ([brand](design/brand.md))          |
| FF-7  | Startup loading screen with error and retry                      | ✅                                                             |
| FF-8  | Pre-export review (always), Passed/Warnings/Failed, structure    | 📝                                                             |
| FF-9  | Final testing, documentation and regression                      | 📝                                                             |

## Decisions pending approval

| #   | Decision                                                                              | Recommendation                                                             |
| --- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| D1  | Export/conversion in scope? Through a lossy neutral model, keeping native formatting? | Yes; keep both paths                                                       |
| D2  | One app per format, or one multi-format app                                           | Decide before Phase 4                                                      |
| D3  | PDF via `printToPDF` or a PDF library                                                 | `printToPDF`                                                               |
| D4  | Design system as its own package                                                      | Revised: folders inside `@hf/ui` until a second consumer exists (ADR 0011) |
| D7  | Full documentation set or lean first                                                  | Done: full set written in Phase 1                                          |
| D8  | CI: AppVeyor, GitHub Actions or both                                                  | AppVeyor (Windows) + GitHub Actions (macOS) if required                    |
| D10 | Project license                                                                       | Tech Lead's choice; LICENSE file not created yet                           |
| D11 | Make `refactor/monorepo` the base of `main`; add a GitHub remote                      | Yes                                                                        |

Decided: D5 ESLint + Prettier ([ADR 0007](architecture/adr/0007-lint-tooling-package.md)), D6 Playwright
([ADR 0008](architecture/adr/0008-playwright-electron-e2e.md)), D9 `AGENTS.md` as the source for `CLAUDE.md`.
