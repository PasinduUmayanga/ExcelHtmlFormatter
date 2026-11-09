# FAQs

Short answers to common questions.

## Does FormaFlow change my original file?

No. It always saves a new copy and refuses to save over the file you opened.

## Which cells are changed?

Only text cells that contain HTML tags, on the sheets you selected. Numbers, dates, formulas and existing links are kept as they are. Cells without tags are copied unchanged.

## Which tags are supported?

Common text tags have styles you can change: `<b>`, `<strong>`, `<i>`, `<em>`, `<u>`, `<s>`, `<del>`, `<sup>`, `<sub>`, headings `<h1>` to `<h6>`, `<a>`, `<mark>`, `<code>` and `<blockquote>`. Structure tags such as `<br>`, `<p>`, lists and tables are built in. You can add a style for any other tag in Tag styles.

## What happens to a tag with no style?

By default the tag is removed and its text stays, without formatting. In Tag styles you can choose to keep such tags as visible text instead. See [Tag styles](user-guide.md#tag-styles).

## Why does a cell say it needs review?

The content check found that some text would be missing or changed, or that the cell is too long for Excel. Open the review to see exactly what. See [the content check](user-guide.md#the-content-check).

## Why wasn't every link added?

An Excel cell can hold only one link, and FormaFlow adds only web and email addresses. Other links keep their text. The save summary lists how many were left out.

## Are charts, pivot tables and macros kept?

No. They aren't copied to the new file. Keep the original for those.

## Where are my tag styles saved?

On this computer, in FormaFlow's settings folder. Settings are kept when you install a new version. Use **Export JSON…** in Tag styles to copy them to another computer.

## What does Recent activity store?

The names and folders of the last 10 files you opened and saved, the time, and whether each saved file checked out. Nothing from inside your files. **Clear** on Home empties it.

## Can I convert to PDF, Word or text?

Not yet. These are shown on Home as **Coming soon**.
