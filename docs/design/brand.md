# FormaFlow brand: logo and colours

Last reviewed: 2026-11-09. Chosen in FormaFlow phase 6 from three concepts (page in flow, bracket to bold, FF
monogram); the Tech Lead chose **A, page in flow**.

## The mark

A page on a blue tile. Its first line is bold (formatted text), the second is plain, and the third turns into a teal
arrow: text flows through the page and comes out formatted.

| Where         | File                                                | Notes                                                                                               |
| ------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Source        | `apps/excel-formatter/build/icon.svg`               | 64-unit grid scaled to 1024                                                                         |
| App icon      | `apps/excel-formatter/build/icon.png` (1024 × 1024) | Made by `pnpm --filter excel-formatter icon`; electron-builder makes the `.ico` and `.icns` from it |
| In the window | `packages/ui/src/design/atoms/Logo.tsx`             | Next to the name in the sidebar; a unit test keeps its shapes equal to `icon.svg`                   |
| Favicon       | `apps/excel-formatter/index.html`                   | The same SVG, inline                                                                                |
| Startup       | `apps/excel-formatter/index.html` (`.boot`)         | The static startup screen; a unit test checks its shapes too                                        |

Keep the three files' shapes identical. In the SVG source, never put two hyphens in a row inside a comment: that makes
the file invalid XML and the icon script fails.

## Colours

| Colour      | Hex                  | Use                          | Contrast          |
| ----------- | -------------------- | ---------------------------- | ----------------- |
| Flow Blue   | `#1F6FEB`            | Tile (also the app's accent) | White on it 4.6:1 |
| Stream Teal | `#0B8277`            | The flow arrow               | On white 4.7:1    |
| Ink Navy    | `#0B2E6B`            | The bold line                | On white 13.0:1   |
| Mist        | `#9FB9E6`, `#BFD4FB` | Plain line, page fold        | Decorative        |
| Paper       | `#FFFFFF`            | The page                     | —                 |

The tile works on light and dark grounds (Flow Blue on `#0D1117` is 4.1:1), so there is one version of the mark.

## Using it

- **Minimum size:** 16 px. Below 24 px the plain line is barely visible; the page and arrow still read.
- **Clear space:** at least a quarter of the mark's width on every side.
- **Wordmark:** "FormaFlow" in the interface font, set next to the mark, never inside it.
- **Don't:** recolour the tile, add effects (shadows, outlines), stretch it, or put it on a busy background.
- **One-colour use** (for example print): the tile and lines in one colour, the page in the background colour.
