# 0004. Own HTML tokenizer instead of a DOM parser

- Status: Accepted
- Date: 2026-11-09

## Context

Cell text such as `<b>my name</b> is <i>pasindu</i>` must become styled runs. A browser `DOMParser` isn't available in
worker threads, the Electron main process, or unit tests, and full HTML parsing (scripts, entities, tree fix-ups) is far
more than needed. The text is untrusted input.

## Decision

`@hf/core` has its own small, forgiving tokenizer (`tokenize.ts`) and run builder (`htmlToRuns.ts`): tags (with
quoted attributes), comments, named and numeric entities, `<br>`/`<p>` line breaks, nested and unclosed tags, `<`
that isn't a tag. Tag **names** select styles through the user's rules; attributes (e.g. `style="color:red"`) are
ignored. The text is never rendered as HTML — the UI renders runs as React text nodes.

## Consequences

- Runs anywhere (window, worker, tests), with no DOM dependency; covered by unit tests for nesting, broken HTML,
  entities and line breaks.
- No XSS path: there is no `innerHTML`/`dangerouslySetInnerHTML` in app code.
- `style` attributes and CSS are not supported; adding them would be a new decision.

## Alternatives considered

- **`DOMParser`:** not available in workers/main process.
- **A full HTML parser library (e.g. parse5):** larger than needed; still needs mapping to runs.
