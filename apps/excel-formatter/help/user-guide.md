# User guide

Each step of FormaFlow in detail, from opening a workbook to checking the saved copy.

## Home

**Choose a file →** starts the workflow and opens the Open screen. When a file is open, **Continue** takes you back to the step you were on. The workflow steps in the sidebar are locked until you start one of these. Convert to PDF, Word and text are marked **Coming soon**: they can't be used yet.

**Recent activity** lists the last 10 files you opened and saved, and whether each saved file checked out. **Open again** opens the file dialog in that folder. The list stays on this computer; **Clear** empties it.

## Opening a file

Drop an `.xlsx` file on the Open screen, or click it to browse. A progress bar shows while the file is read; **Cancel** stops it. Large workbooks can take a few seconds, and the window keeps working meanwhile.

## Selecting sheets

Every sheet is listed with its size, how many cells contain HTML, and the tags it uses. Visible sheets with HTML are ticked for you; hidden sheets are marked **Hidden** and can be ticked too. Only ticked sheets are formatted. The others are copied unchanged.

## Tag analysis

For each selected sheet: how often each tag is used, the first cell that uses it, the style it will get, and a preview of that cell.

- **Built in** tags give structure, such as line breaks, lists and tables. They can't be styled.
- **Default** tags have a ready-made look you can change, such as headings, links and `<mark>`.
- **No style** tags need a style. Without one, the tag is removed and its text kept plain, unless you choose to keep such tags as visible text (see [Tag styles](#tag-styles)).

## Tag styles

Pick a tag, then choose bold, italic, underline, strikethrough, font colour, size, font, or superscript and subscript. The preview shows the result with a sample sentence and, when the tag is used in your file, with your own text. Changes are saved at once and used for every file.

- **Keep text plain** gives a tag a style that keeps its text without formatting.
- **Add** a tag that isn't in the list, for example one you expect in other files.
- **Tags with no style** chooses what happens to tags without a style: remove the tag and keep its text, or keep the tag as visible text.
- **Export JSON…** and **Import JSON…** share your styles; **Reset to defaults** starts again.

## Preview and saving

The preview shows how the cells will look. Switch to **Original HTML** to compare with the source text.

Before saving, FormaFlow runs the content check (see [the content check](#the-content-check)). If nothing is lost, **Save formatted file…** asks where to save the new copy. You can't save over the original. When saving is done, FormaFlow reads the new file back to check it:

- If everything is fine, the file is closed and you're back on **Home**. A message there says what was saved: how many cells were formatted, which links were added or left out, and **Verified: the saved file matches** (the converted cells are as expected and every other cell is unchanged). **Show in folder** opens the folder with the new file selected. The workflow steps lock again until you start the next file.
- If you saved with known issues, or the saved file has differences, you stay on Preview with the file open, so you can review them.

## The content check

FormaFlow compares the text of every converted cell with its original, so no text is lost without you knowing.

- **Issues** stop the save until you review them: text missing from the result, text that wasn't in the original, or a cell longer than Excel's limit of 32,767 characters.
- **Notes** are worth a look but don't stop the save, for example a link that was left out or an HTML comment that was removed.

The review screen lists the items. Select one to see the original HTML, the original text with missing words marked, and the converted result. Bullets, numbers and separators that FormaFlow adds for layout are shown in green. **Export report (CSV)** saves the list. To save despite issues, use **Save anyway** and confirm.

## Line breaks, lists and tables

Excel cells hold text, not layout, so FormaFlow writes structure as text: `<br>` and paragraphs become line breaks, list items get bullets or numbers, and table rows are written one per line with `|` between cells. Cells with line breaks are set to wrap text.

## Links and highlights

An Excel cell can hold one link. The first safe link in a cell (a web or email address) becomes the cell's link; other links keep their text and are listed in the save summary. A cell whose whole text is inside `<mark>` gets a yellow fill. Inside a longer text, `<mark>` uses its tag style instead, because Excel can't highlight part of a cell.
