# Contributing

Thanks for helping. Setup, conventions and how-tos are in the [Developer Guide](docs/developer-guide.md).

## Workflow

1. **Discuss first** for anything larger than a bug fix: open an issue, or add a task to
   [docs/roadmap.md](docs/roadmap.md). Architectural changes need Tech Lead approval and an
   [ADR](docs/architecture/adr/README.md).
2. **Branch** from `main`: `feature/<short-name>`, `fix/<short-name>`, `docs/<short-name>` or `refactor/<short-name>`.
3. **Change one thing per pull request.** Refactors don't change behaviour; behaviour changes come with tests.
4. **Run the checks:**
   ```bash
   pnpm check        # required: lint, format, type-check, unit tests
   pnpm test:e2e     # required when the UI flow, IPC or packaging changes
   ```
5. **Update the docs in the same pull request.** The `docs-sync` checklist in `.claude/skills/docs-sync/SKILL.md`
   lists which ones.
6. **Commit messages:** imperative summary under 72 characters (e.g. `Add Markdown writer`), then a body explaining
   why. Mention requirement or task IDs (`FR-07`, `P3-T3`) when relevant.
7. **Changelog:** add a line under `Unreleased` in [CHANGELOG.md](CHANGELOG.md) for anything a user or developer would
   notice.

## Review checklist

Reviewers use `.claude/skills/review-checklist/SKILL.md`. In short:

- Code is in the right layer, and the package boundaries pass lint.
- Contracts are unchanged, or changed with an ADR and updated docs.
- IPC inputs are validated; no HTML is rendered from file content; the original file is never overwritten.
- Tests cover the change; coverage floors still pass.
- User-facing text is clear; docs are updated.

## Reporting problems

Include the app version (shown at the bottom of the sidebar), the OS, what you did, what you expected, and what
happened. A sample file that shows the problem helps the most. Remove any private data from it first.
