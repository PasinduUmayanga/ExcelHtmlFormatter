# User guide

Each step of FormaFlow in detail, from opening a workbook to checking the saved copy.

## Home

Home asks two things. **Step 1: Select file type:** Excel, Word, PDF or Text. **Step 2: Choose an action** for that type. Today FormaFlow can **Format HTML tags** in Excel workbooks; the other actions, such as Convert to PDF, are marked **Coming soon** and can't be chosen yet. Then click **Continue**. You can also use the arrow keys to move between the cards. **Quick actions** take you to Recent Files, Formatting Profiles or Templates.

When a file is open, **Continue →** next to its name takes you back to the step you were on.

**Recent Activity** shows your latest files; **View all** opens Recent Files.

## The six steps

Every task follows the same six steps, shown across the top of each workflow screen: **File type** and **Action** (chosen on Home), **Upload**, **Configure**, **Preview** and **Export**. Done steps have a green tick and can be clicked to go back. The **Workflow summary** beside each screen shows what you chose, the file and the profile.

## Upload

Drop an `.xlsx` file on the drop zone, or click **Choose file**. A progress bar shows while the file is read; **Cancel** stops it. The chosen file is shown with its size and number of sheets; **Remove** lets you pick another. **Load sample** opens the sample workbook that comes with FormaFlow. Click **Continue** when the file is ready.

## Configure

Two tabs, on the left:

- **Sheets** lists every sheet with its size, how many cells contain HTML, and the tags it uses. Visible sheets with HTML are ticked for you; hidden sheets are marked **Hidden** and can be ticked too. Only ticked sheets are formatted. The others are copied unchanged.
- **Tag Styles** shows, for each ticked sheet, how often each tag is used, the first cell that uses it, the style it will get, and a preview of that cell. **Active profile** chooses which formatting profile is used.
  - **Built in** tags give structure, such as line breaks, lists and tables. They can't be styled.
  - **Default** tags have a ready-made look you can change, such as headings, links and `<mark>`.
  - **No style** tags need a style. Without one, the tag is removed and its text kept plain, unless you choose to keep such tags as visible text (see [Tag styles](#tag-styles)).

## Preview

FormaFlow runs the content check (see [the content check](#the-content-check)); a ring and a list of steps show how far it is. Then the original cells and the formatted result are shown **Side by side**; **Formatted** or **Original HTML** shows one of them. **Content verification** says **Passed** when no text is lost, or how many cells need review. Click **Continue** to go to Export.

## Export and complete

**Output name** is the name the Save dialog starts with; leave it empty for the usual `name_formatted.xlsx`. **Save formatted file…** asks where to save the new copy. You can't save over the original. When saving is done, FormaFlow reads the new file back to check it:

- If everything is fine, the file is closed and **Processing completed!** shows what was saved: how many cells were formatted, which links were added or left out, and **Verified: the saved file matches** (the converted cells are as expected and every other cell is unchanged). **Open file** opens it in Excel, **Show in folder** opens its folder, and **New task** goes back to Home.
- If you saved with known issues, or the saved file has differences, the file stays open so you can review them.

## Tag styles

Open **Formatting Profiles** in the sidebar. Pick a tag, then choose bold, italic, underline, strikethrough, font colour, size, font, or superscript and subscript. The preview shows the result with a sample sentence and, when the tag is used in your file, with your own text. Changes are saved at once and used for every file.

- **Keep text plain** gives a tag a style that keeps its text without formatting.
- **Add** a tag that isn't in the list, for example one you expect in other files.
- **Tags with no style** chooses what happens to tags without a style: remove the tag and keep its text, or keep the tag as visible text.
- **Export JSON…** and **Import JSON…** share your styles; **Reset to defaults** starts again.

## Formatting profiles

A profile is a named set of tag styles, for example one per client. The **active** profile is used for every file and is the one you edit under **Tag styles in …**. **Create a profile** starts one from the default styles; **Duplicate** copies one; **Use** makes one active; **Rename** and **Delete** do what they say. The active profile and **Default** can't be deleted.

## Templates

A template saves a setup you use often: the action, the profile, and which sheets to tick (those with HTML, or all). **Use** starts a task with it at Upload. Find templates in the sidebar or with **Use a Template** on Home.

## My Workspace, Recent Files and Favorites

**My Workspace** shows the task in progress (for example "Step 4 of 6: Configure") with **Resume workflow**, shortcuts, and your latest files. **Recent Files** lists the last 10 files you opened and saved, and whether each saved file checked out (point at the status for details). **Open** shows the file dialog in that file's folder. The star adds a file to **Favorites**. **Clear** empties the recent list after asking; Favorites stay. Both lists are kept on this computer.

## Search and Settings

Press **Ctrl+K** (or click the search box at the top) to find pages, actions, recent files, favourites, templates, profiles and help topics; the arrow keys move and Enter opens. **Settings** has the theme, how your files are kept safe, keyboard shortcuts, and the version.

## The content check

FormaFlow compares the text of every converted cell with its original, so no text is lost without you knowing.

- **Issues** stop the save until you review them: text missing from the result, text that wasn't in the original, or a cell longer than Excel's limit of 32,767 characters.
- **Notes** are worth a look but don't stop the save, for example a link that was left out or an HTML comment that was removed.

The review screen lists the items. Select one to see the original HTML, the original text with missing words marked, and the converted result. Bullets, numbers and separators that FormaFlow adds for layout are shown in green. **Export report (CSV)** saves the list. To save despite issues, use **Save anyway** and confirm.

## Line breaks, lists and tables

Excel cells hold text, not layout, so FormaFlow writes structure as text: `<br>` and paragraphs become line breaks, list items get bullets or numbers, and table rows are written one per line with `|` between cells. Cells with line breaks are set to wrap text.

## Links and highlights

An Excel cell can hold one link. The first safe link in a cell (a web or email address) becomes the cell's link; other links keep their text and are listed in the save summary. A cell whose whole text is inside `<mark>` gets a yellow fill. Inside a longer text, `<mark>` uses its tag style instead, because Excel can't highlight part of a cell.
