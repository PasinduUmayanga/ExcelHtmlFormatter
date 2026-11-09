# Architecture Decision Records

An ADR records one important decision: the context, what was decided, and what follows from it. ADRs are the
**authoritative source for "why"** (see [docs/README.md](../../README.md#authoritative-sources)).

## Rules

- One decision per file, named `NNNN-short-title.md`, numbered in order. Never renumber.
- Write a new ADR when a decision changes the architecture, a package boundary, a dependency, a contract
  (`FormatAdapter`, `ElectronApi`, worker protocol), the toolchain, or a security property.
- Don't edit an accepted ADR's decision. To change it, write a new ADR and set the old one's status to
  `Superseded by NNNN`.
- Keep it short: about one screen.

## Index

| #                                                   | Decision                                                       | Status   |
| --------------------------------------------------- | -------------------------------------------------------------- | -------- |
| [0001](0001-monorepo-pnpm-turborepo.md)             | Monorepo with pnpm workspaces and Turborepo                    | Accepted |
| [0002](0002-tanstack-router-hash-history.md)        | TanStack Router with hash history                              | Accepted |
| [0003](0003-worker-threads-for-file-work.md)        | All file work in worker threads, with Cancel                   | Accepted |
| [0004](0004-own-html-tokenizer.md)                  | Own HTML tokenizer instead of a DOM parser                     | Accepted |
| [0005](0005-exceljs-for-xlsx.md)                    | ExcelJS for reading and writing .xlsx                          | Accepted |
| [0006](0006-format-adapter-and-composition-root.md) | `FormatAdapter` contract; apps as composition roots            | Accepted |
| [0007](0007-lint-tooling-package.md)                | ESLint + Prettier in their own package (TypeScript 6 for lint) | Accepted |
| [0008](0008-playwright-electron-e2e.md)             | Playwright for end-to-end tests of the Electron app            | Accepted |
| [0011](0011-atomic-design-in-ui.md)                 | Atomic Design inside `@hf/ui` (not a separate package)         | Accepted |
| [0012](0012-formaflow-product-name.md)              | Product name FormaFlow; `appId` and settings folder unchanged  | Accepted |
| [0013](0013-recent-activity.md)                     | Recent activity recorded by the main process; read/clear only  | Accepted |

0009 and 0010 are reserved for the content-model and link-policy decisions of the F2 formatting work (to be written).

## Template

```markdown
# NNNN. Title

- Status: Proposed | Accepted | Superseded by NNNN
- Date: YYYY-MM-DD

## Context

What problem or force makes a decision necessary? What constraints apply?

## Decision

What we decided, in one or two paragraphs.

## Consequences

What becomes easier, what becomes harder, what we must now do (tests, docs, follow-ups).

## Alternatives considered

Each option and why it wasn't chosen.
```
