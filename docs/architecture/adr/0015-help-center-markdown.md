# 0015. Help Center from Markdown, rendered without HTML

- Status: Accepted
- Date: 2026-11-09

## Context

FormaFlow phase 5 adds a searchable Help Center (Getting started, User guide, FAQs, Troubleshooting, About). The text
should exist once, be easy to edit, and read well on GitHub. The window must never render text as HTML
([security](../../security.md)), and `@hf/ui` must stay format-neutral while the help talks about Excel.

## Decision

- Help topics are **Markdown files in the app**: `apps/excel-formatter/help/*.md`, one per topic, starting with
  `# Title` and a one-paragraph summary. The app imports them as strings (Vite `?raw`) and passes them to
  `mountFormatterApp({ help })` (`FormatterAppConfig.help: HelpSource[]`). `docs/user-manual.md` links to these files
  instead of repeating them.
- `@hf/ui` parses Markdown with its own small parser (`src/help/markdown.ts`) into data, and the `Markdown` molecule
  builds React elements from it. **No HTML is ever inserted**: markup in a file is shown as text. Supported: headings,
  paragraphs, lists, bold, italic, inline code, code blocks and links. Nothing else (no tables, images or HTML).
- **Links:** `topic.md#section` and `#section` open Help topics and sections (the same links work on GitHub). Every
  other address (`http:`, `mailto:`, `javascript:`…) is shown as text and never opened, so Help adds no way to start a
  browser or navigate away.
- Search runs in the window over topic titles, section headings and text (`src/help/search.ts`); the query is in the
  address (`#/help?q=`), the section in `#/help/$topic?section=`. Both are validated in `validateSearch`.
- A topic can ask for the app's details (`appInfo: true`): About shows the version, platform and settings file.

## Consequences

- Writers edit Markdown; developers don't touch screens to change help text.
- Help can't run code or open sites, whatever the files contain (tests cover `<script>`, `<img onerror>` and
  `javascript:` links).
- Only a subset of Markdown works; anything else appears as plain text, which is visible when writing.
- A future app (for example Word) supplies its own topics.

## Alternatives considered

- **A Markdown library** (marked, markdown-it) plus HTML sanitising: more code to trust, and its output is HTML that
  would have to be injected.
- **Help written as React components:** no single source with the user manual, and harder for writers.
- **Opening web links in the browser:** needs a new IPC call with URL checks; not needed for the current topics.
