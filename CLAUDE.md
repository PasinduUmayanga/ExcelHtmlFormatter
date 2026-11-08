# CLAUDE.md

The project's agent instructions live in AGENTS.md (shared with other AI tools), imported here:

@AGENTS.md

## Claude Code specifics

- Project skills are in `.claude/skills/` (listed in AGENTS.md). Use them instead of improvising the workflow.
- For reviews, run the built-in `/code-review` or `/security-review` together with the `review-checklist` skill.
- Package-specific rules load automatically from `packages/core/CLAUDE.md` and `packages/desktop/CLAUDE.md` when you
  work in those folders.
