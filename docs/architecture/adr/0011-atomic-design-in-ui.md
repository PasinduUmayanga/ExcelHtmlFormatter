# 0011. Atomic Design inside `@hf/ui`

- Status: Accepted
- Date: 2026-11-09

## Context

The window's 6 screens repeated the same markup by hand: 32 buttons with style classes, status chips, tag labels,
banners, segmented choices, tab bars, and the title/intro/footer frame of every screen. 23 inline `style={{…}}` values
held fixed spacing and font sizes, and one 800-line stylesheet held everything. Roadmap task P2-T4 asked for a design
system, and decision D4 recommended putting it in its own package.

Constraints: nothing users see may change; the e2e tests select by class names (`.check-chip`, `.success`, `.tab`…);
cell text is never rendered as HTML; no new dependencies.

## Decision

Organise the window by Atomic Design levels as **folders inside `@hf/ui`**, not as a separate package:

```
packages/ui/src/design/   tokens.css, base.css, utilities.css, cx.ts
  atoms/        Button, Badge, TagName, Icon, Spinner, Swatch
  molecules/    Field, SegmentedControl, Banner, ConfirmBox, Tabs/Tab, Stat, RichText, styleToCss
  organisms/    Sidebar, JobProgressPanel, CheckChip, SectionTabs, SaveSummary, StyleEditor, AddTag,
                CheckList, CheckDetail, MissingStylesBanner
  templates/    AppLayout (the window frame), ScreenTemplate (title, intro, content, footer)
packages/ui/src/screens/  the Pages level: one file per route, composed from the levels above
```

- Each level imports only from levels below it (organisms may use the store and router hooks; atoms and molecules
  don't). Screens import levels through their `index.ts`.
- Styles: one stylesheet per level, imported in a fixed order by `styles.css` (tokens → base → atoms → molecules →
  organisms → templates → screens → utilities). Class names are unchanged. `utilities.css` comes last so that its
  helpers (`.spread`, `.mb-5`, `.text-sm`…) override like the inline styles they replaced.
- No fixed inline styles. Only data-driven ones remain: a colour swatch, previewed text styles, the progress bar width.
- The public exports of `@hf/ui` are unchanged, so apps don't change.
- Screens don't call `window.api`; file actions are store actions (`browseForFile`, `openDroppedFile`).

## Consequences

- One place to change how a button, chip, banner or screen frame looks. New screens are shorter and consistent.
- Components are unit-tested (`atoms`, `molecules`, `organisms` tests); `@hf/ui` coverage went from about 18 % to 46 %
  of lines, and the floors were raised.
- Verified at the time of the change: all screens pixel-identical (light and dark) and the same HTML apart from
  reviewed style-to-class changes, plus the e2e tests.
- Contributors must put new UI pieces at the right level (see the developer guide and the `add-feature` skill).
- If a second consumer of the components appears (for example another window), moving `design/` into its own
  package is a mechanical change.

## Alternatives considered

- **`@hf/design-system` package (D4):** more `package.json`, tsconfig and lint wiring for a single consumer; every
  formatter app already uses the components through `@hf/ui`. Revisit when there is a second consumer.
- **CSS Modules or CSS-in-JS:** would rename classes (breaking e2e selectors and the Excel grid's stylesheet) or add a
  dependency.
- **Leaving the screens as they were:** duplication would grow with every new format and screen.
