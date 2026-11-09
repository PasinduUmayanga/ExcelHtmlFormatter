# Documentation

All project documentation lives here. Start with the [Software Architecture](architecture/SAD.md) and the
[Developer Guide](developer-guide.md).

## Index

| Document                                                       | Purpose                                                                  | Audience          |
| -------------------------------------------------------------- | ------------------------------------------------------------------------ | ----------------- |
| [requirements/SRS.md](requirements/SRS.md)                     | Requirements (`FR-xx`, `NFR-xx`) and constraints                         | Everyone          |
| [design/FDS.md](design/FDS.md)                                 | Screens, workflows, business rules, acceptance criteria                  | Product, QA, devs |
| [design/brand.md](design/brand.md)                             | The FormaFlow mark, its files and colours, how to use it                 | Design, devs      |
| [architecture/SAD.md](architecture/SAD.md)                     | Packages, boundaries, runtime view, diagrams                             | Devs, reviewers   |
| [architecture/adr/](architecture/adr/README.md)                | Architecture Decision Records: why things are the way they are           | Devs, reviewers   |
| [technical/TDS.md](technical/TDS.md)                           | Implementation details: IPC, worker protocol, conversion rules, build    | Devs              |
| [api/contracts.md](api/contracts.md)                           | `ElectronApi`, `FormatAdapter`, `FormatInfo`, worker protocol            | Devs              |
| [data/settings-schema.md](data/settings-schema.md)             | The only stored data: the tag-style settings file                        | Devs, support     |
| [security.md](security.md)                                     | Security architecture and practices                                      | Devs, reviewers   |
| [testing-strategy.md](testing-strategy.md)                     | Test levels, tools, coverage floors, quality gates                       | Devs, QA          |
| [user-manual.md](user-manual.md)                               | How to use the app                                                       | End users         |
| [developer-guide.md](developer-guide.md)                       | Setup, conventions, adding features and formats, AI-assisted development | Devs, AI agents   |
| [operations/deployment.md](operations/deployment.md)           | Building installers, CI, releases                                        | Release owner     |
| [operations/troubleshooting.md](operations/troubleshooting.md) | Known problems and fixes (development and end users)                     | Devs, support     |
| [roadmap.md](roadmap.md)                                       | Phases, task IDs, status, decisions pending approval                     | Tech lead, devs   |
| [history/](history/PLAN.md)                                    | The original build plan and the first clickable demo (not maintained)    | Reference         |

Not applicable to this project: **database design** (there is no database; the only stored data is described in
[data/settings-schema.md](data/settings-schema.md)) and **HTTP API documentation** (there is no server; the internal
APIs are in [api/contracts.md](api/contracts.md)).

## Authoritative sources

To avoid duplication, each kind of information has **one** home. Other documents link to it instead of repeating it.

| Information                       | Authoritative source                                                            |
| --------------------------------- | ------------------------------------------------------------------------------- |
| What the product must do          | [SRS](requirements/SRS.md)                                                      |
| How a feature behaves, acceptance | [FDS](design/FDS.md), backed by the tests that reference its IDs                |
| Why a decision was made           | [ADRs](architecture/adr/README.md)                                              |
| Structure and boundaries          | [SAD](architecture/SAD.md); boundaries enforced by `tools/lint/config.js`       |
| Exact types and contracts         | The TypeScript source (`packages/core/src/types.ts`, `adapter.ts`, `format.ts`) |
| Commands                          | `package.json` scripts; summarised in the root README                           |
| Versions                          | `pnpm-lock.yaml` (badges and tables are updated from it)                        |
| Task status                       | [roadmap.md](roadmap.md)                                                        |

## Keeping documentation current

- Every change that alters behaviour, a contract, a boundary or a command updates the affected documents **in the same
  change** (see the `docs-sync` skill in `.claude/skills/`).
- A new decision of architectural weight gets an ADR ([template](architecture/adr/README.md#template)).
- Requirement IDs (`FR-xx`) are referenced in FDS acceptance criteria and, where practical, in test names, so
  requirements, behaviour and tests stay traceable.
- Each document starts with its last-reviewed date. Review dates older than the latest release are a signal to check it.
