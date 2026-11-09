# Software Requirements Specification

Last reviewed: 2026-11-09 · Authoritative for **what** the product must do. Behaviour and acceptance criteria:
[FDS](../design/FDS.md).

## 1. Purpose and scope

Users receive spreadsheets (and later other documents) whose text contains HTML tags, e.g.
`<b>my name</b> is <i>pasindu</i>`. The product turns those tags into real formatting in a **new** file, with styles
the user chooses per tag. Scope today: `.xlsx` → `.xlsx` (FormaFlow for Excel). Planned: export/conversion to PDF,
DOCX, TXT, HTML and Markdown ([roadmap](../roadmap.md)).

**Users:** office users preparing documents. They need no technical knowledge.

## 2. Functional requirements

| ID    | Requirement                                                                                                                                                                                                                                                | Priority           |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| FR-01 | The user can open an `.xlsx` file from an Open dialog or by dropping it on the window; other file types are refused with a clear message.                                                                                                                  | Must               |
| FR-02 | The original file is never modified. Saving over the original is refused.                                                                                                                                                                                  | Must               |
| FR-03 | The app lists every sheet with its size, the number of cells containing HTML, and the tags used. Visible sheets with HTML are selected automatically; hidden sheets are marked. The user can change the selection.                                         | Must               |
| FR-04 | For each selected sheet, the app shows each tag's use count, first cell, the style it will get, and a preview; tags with no style are flagged.                                                                                                             | Must               |
| FR-05 | The user can set per tag: bold, italic, underline, strikethrough, color, size, font, superscript/subscript; add and remove tags; mark a tag "keep text plain"; choose whether tags with no style are removed or kept as text. Changes save automatically.  | Must               |
| FR-06 | The user can export, import and reset the tag-style settings.                                                                                                                                                                                              | Should             |
| FR-07 | The app previews the result per sheet, and can show the original HTML instead.                                                                                                                                                                             | Must               |
| FR-08 | Saving writes a new `.xlsx` where HTML in text cells becomes real rich text, keeping each cell's own font; cells with line breaks wrap; formulas, numbers, dates, links and merged-over cells are not changed.                                             | Must               |
| FR-09 | Opening and saving show progress and can be cancelled; a cancelled save leaves no file behind.                                                                                                                                                             | Must               |
| FR-10 | After saving, the user can open the file's folder.                                                                                                                                                                                                         | Should             |
| FR-11 | Every screen has its own address; back/forward work; screens that need a file or selection are not reachable without one.                                                                                                                                  | Should             |
| FR-25 | The app starts on a Home screen with the main action (open a file), a way back to the open file, the tools, and the conversions that are planned but not available yet (clearly marked as unavailable).                                                    | Must               |
| FR-26 | Home lists the last 10 files opened and saved, with each save's check result; the user can open the dialog again in that folder and clear the list. Stored only on this computer.                                                                          | Should             |
| FR-27 | The user can choose a Light, Dark or System theme from the header; the choice applies to the whole app, is remembered, and the window opens in it without a flash. All text meets WCAG 2.2 AA contrast (4.5:1) and control boundaries 3:1, in both themes. | Should             |
| FR-12 | (Planned, Phase 3–4) Export the formatted content to PDF, DOCX, TXT, HTML and Markdown, warning about formatting the target can't hold.                                                                                                                    | Could (pending D1) |

## 3. Non-functional requirements

| ID     | Requirement                                                                                                                                | Verified by                                                                        |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| NFR-01 | Responsiveness: the window stays usable during long work; the main process is never blocked for more than ~100 ms with a 60,000-cell file. | Measurement ([ADR 0003](../architecture/adr/0003-worker-threads-for-file-work.md)) |
| NFR-02 | Scale: files with at least 240,000 HTML cells can be converted.                                                                            | Measured: about 12 s                                                               |
| NFR-03 | Security: untrusted file content is never executed or rendered as HTML; the window is sandboxed; only user-picked files are read.          | [Security](../security.md), tests                                                  |
| NFR-04 | Platforms: Windows 10/11 x64 (installer and portable); macOS 11+ Intel and Apple Silicon (universal `.dmg`).                               | Windows verified; macOS not yet built                                              |
| NFR-05 | Works offline; the app makes no network requests.                                                                                          | Design (no network code)                                                           |
| NFR-06 | Data safety: settings and output are written via a temporary file then rename; damaged settings fall back to defaults.                     | Unit tests                                                                         |
| NFR-07 | Maintainability: enforced package boundaries, formatting, coverage floors, ADRs for decisions.                                             | `pnpm check`, coverage                                                             |
| NFR-08 | Usability: plain-language messages that say what to do; keyboard-reachable controls.                                                       | Review; e2e                                                                        |

## 4. Constraints and assumptions

- Electron 45 desktop app; Node 26 for development; no server, no database, no user accounts.
- ExcelJS can't preserve charts, pivot tables or macros; the app tells the user before saving.
- Installers aren't code-signed yet: first launch shows an OS warning (see [user manual](../user-manual.md)).
- Only `.xlsx` is supported (not `.xls`, `.xlsm`, `.ods`).
