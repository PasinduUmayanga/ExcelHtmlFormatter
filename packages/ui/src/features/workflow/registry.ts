/**
 * What Home offers (redesign guide §6.1): the kinds of file a user may have, and the actions for each. The Home cards
 * and the action list are drawn from this, so adding a format or an action is a data change. An action is **ready**
 * only when the running app implements it; everything else is shown as "Coming soon" and can't be chosen.
 */

export type FileTypeId = 'excel' | 'word' | 'pdf' | 'text'
export type Availability = 'ready' | 'coming-soon'

export interface FileType {
  id: FileTypeId
  label: string
  description: string
  /** Shown under the name on the card. For the running app's own type these are the extensions it really opens. */
  extensions: string[]
}

export interface FileAction {
  id: string
  sourceType: FileTypeId
  label: string
  description: string
  /** Line icon for the action tile */
  icon: 'code' | 'convert' | 'extract'
  /** The app format id that implements it (see availabilityOf); absent while it is planned */
  implementedBy?: string
  /** Ends the Continue strip's sentence, e.g. "start the formatting process" */
  next: string
}

export const FILE_TYPES: readonly FileType[] = [
  {
    id: 'excel',
    label: 'Excel',
    description: 'Spreadsheets & workbooks',
    extensions: ['.xlsx']
  },
  {
    id: 'word',
    label: 'Word',
    description: 'Documents & reports',
    extensions: ['.docx']
  },
  { id: 'pdf', label: 'PDF', description: 'Portable documents', extensions: ['.pdf'] },
  { id: 'text', label: 'Text', description: 'Plain text & data', extensions: ['.txt', '.csv'] }
]

export const FILE_ACTIONS: readonly FileAction[] = [
  {
    id: 'format-html',
    sourceType: 'excel',
    label: 'Format HTML tags',
    description: 'Apply rich formatting to Excel cells using HTML tags (e.g., <b>, <i>, <u>, colours, etc.).',
    icon: 'code',
    implementedBy: 'excel',
    next: 'start the formatting process'
  },
  {
    id: 'excel-to-pdf',
    sourceType: 'excel',
    label: 'Convert to PDF',
    description: 'Export the formatted workbook as a PDF file.',
    icon: 'convert',
    next: 'start'
  },
  {
    id: 'word-format-html',
    sourceType: 'word',
    label: 'Format HTML tags',
    description: 'Apply rich formatting to Word documents using HTML tags.',
    icon: 'code',
    next: 'start'
  },
  {
    id: 'word-to-pdf',
    sourceType: 'word',
    label: 'Convert to PDF',
    description: 'Export the document as a PDF file.',
    icon: 'convert',
    next: 'start'
  },
  {
    id: 'pdf-extract-text',
    sourceType: 'pdf',
    label: 'Extract text',
    description: 'Save the text of a PDF as a plain .txt file.',
    icon: 'extract',
    next: 'start'
  },
  {
    id: 'text-format-html',
    sourceType: 'text',
    label: 'Format HTML tags',
    description: 'Turn HTML tags in text files into a formatted document.',
    icon: 'code',
    next: 'start'
  }
]

/** "ready" only for actions the running app (identified by its format id) implements. */
export function availabilityOf(action: FileAction, appFormatId: string): Availability {
  return action.implementedBy === appFormatId ? 'ready' : 'coming-soon'
}

/** The actions for one file type, in the order shown. */
export const actionsFor = (type: FileTypeId): FileAction[] => FILE_ACTIONS.filter((a) => a.sourceType === type)

/** The first ready action for a type, or null (nothing can be started for it yet). */
export function firstReadyAction(type: FileTypeId, appFormatId: string): FileAction | null {
  return actionsFor(type).find((a) => availabilityOf(a, appFormatId) === 'ready') ?? null
}

export const fileTypeOf = (id: FileTypeId): FileType => FILE_TYPES.find((t) => t.id === id)!
export const actionOf = (id: string | null): FileAction | null => FILE_ACTIONS.find((a) => a.id === id) ?? null
