# Troubleshooting

What a message means and what to do about it.

## "Your settings could not be loaded"

FormaFlow couldn't read its settings when starting. Click **Try again**. If it keeps happening, close FormaFlow and
start it again. Your tag styles are kept in FormaFlow's settings folder and aren't changed by this.

## The file can't be opened

- **"This file could not be read as an Excel workbook":** open it in Excel and save it again as `.xlsx`. Older `.xls` files and password-protected workbooks aren't supported.
- **"Close it in Excel and try again":** the file is open in another program. Close it there, then open it again.
- **"Only .xlsx files are supported":** you dropped a different kind of file.
- **"This file is too large…":** close other programs, or split the workbook into smaller files.

## Saving doesn't work

- **"Choose a different file name…":** you picked the original file. Save the copy under another name.
- **"A file is already being saved":** wait for the current save to finish, or press **Cancel**.
- If you press **Cancel** while saving, no file is written. If you cancel while the saved file is being checked, the file is kept and the summary says it wasn't checked.

## The content check finds issues

Open the review from the message on the Preview screen. For each item:

- **Missing text** usually comes from a tag with no style set to be removed. Give the tag a style in [Tag styles](user-guide.md#tag-styles), and the check runs again.
- **Too long for one cell:** Excel holds at most 32,767 characters in a cell. Shorten the source text, or save anyway and fix the cell in Excel.

## The saved file has differences

FormaFlow reads every saved file back. If it reports differences, open the review to see the cells. Keep your original and report the problem with the version shown in [About](about.md).

## The window stopped working

Click **Reload** in the message that appears. Your tag styles are saved.

## Starting the app shows a security warning

FormaFlow isn't code-signed yet.

- **Windows** ("Windows protected your PC"): click **More info**, then **Run anyway**.
- **macOS** ("can't be opened"): open **System Settings → Privacy & Security** and click **Open Anyway**.
