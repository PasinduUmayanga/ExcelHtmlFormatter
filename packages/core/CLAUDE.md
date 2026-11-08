# packages/core — local rules

- **Pure TypeScript only.** No Electron, Node built-ins, React, file-format libraries or other `@hf/*` packages
  (enforced by ESLint). Code here must run in the window, the worker, the main process and tests unchanged.
- Everything exported from `src/index.ts` is a shared contract used by every app. Changing a type in `types.ts`,
  `adapter.ts` or `format.ts` needs an ADR and an update to `docs/api/contracts.md`.
- Cell text is untrusted input. The tokenizer must stay forgiving (never throw on bad HTML) and must never produce
  output that someone renders as HTML.
- Coverage floor is ~99% lines; new code comes with tests in `tests/`.
