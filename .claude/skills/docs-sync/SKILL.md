---
name: docs-sync
description: Keep the FormaFlow documentation, agent instructions and roadmap in sync with a code change. Use at the end of every change, and when asked to update or review documentation.
---

# Keep the docs in sync

Principle: each kind of information has one authoritative home (`docs/README.md#authoritative-sources`). Update that
home; elsewhere, link to it rather than copying.

## Which documents a change touches

| Change                                                                   | Update                                                                                              |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| User-visible behaviour, screen or text                                   | `docs/design/FDS.md`, `docs/user-manual.md`, root `README.md` features (if notable), `CHANGELOG.md` |
| New or changed requirement                                               | `docs/requirements/SRS.md` (new `FR-xx`/`NFR-xx`), FDS acceptance criteria                          |
| Package, boundary, route or runtime structure                            | `docs/architecture/SAD.md`, `tools/lint/config.js` (boundaries), `AGENTS.md` map, ADR               |
| Contract (`ElectronApi`, `FormatAdapter`, `FormatInfo`, worker protocol) | `docs/api/contracts.md`, ADR, `docs/technical/TDS.md`                                               |
| Settings file format                                                     | `docs/data/settings-schema.md`, `validateConfig` tests                                              |
| Implementation detail (conversion rules, jobs, build)                    | `docs/technical/TDS.md`                                                                             |
| Security property (IPC validation, sandbox, CSP, file access)            | `docs/security.md`, ADR                                                                             |
| Tests, coverage floors, tools                                            | `docs/testing-strategy.md`                                                                          |
| Commands, versions, prerequisites                                        | root `README.md`, `docs/developer-guide.md`, `AGENTS.md` commands                                   |
| Build, CI, packaging, release                                            | `docs/operations/deployment.md`                                                                     |
| A new known problem and its fix                                          | `docs/operations/troubleshooting.md`                                                                |
| Task started/finished                                                    | `docs/roadmap.md` status                                                                            |
| Architectural decision                                                   | new ADR in `docs/architecture/adr/` + index                                                         |

## Steps

1. List the changed files (`git status`, `git diff --stat`) and map each to the table above.
2. Update the documents. Set "Last reviewed" to today's date on each one you touched.
3. Keep versions true: read them from `pnpm-lock.yaml` / `package.json`, never from memory.
4. Check links: every relative link in the changed docs points to an existing file.
5. `pnpm format` (Prettier formats Markdown too), then `pnpm format:check`.
6. If `AGENTS.md`, `CLAUDE.md` or a skill describes something that changed, update it in the same change.
