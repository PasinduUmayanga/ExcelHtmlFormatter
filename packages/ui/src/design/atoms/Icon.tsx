import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  CircleHelp,
  CircleMinus,
  CodeXml,
  FileOutput,
  Clock,
  FileText,
  FolderOpen,
  House,
  LayoutTemplate,
  Info,
  Layers,
  Monitor,
  Moon,
  Save,
  ScanText,
  Search,
  Settings,
  SlidersHorizontal,
  Star,
  Sun,
  Table,
  TriangleAlert,
  Workflow,
  X,
  type LucideIcon
} from 'lucide-react'

/**
 * The window's icons: one line-icon family (lucide, decision R1 of the redesign). Decorative: every icon sits next to
 * text that says the same, so screen readers skip it. They take the text colour.
 */
export const ICONS = {
  warning: TriangleAlert,
  info: Info,
  check: Check,
  close: X,
  file: FileText,
  save: Save,
  settings: Settings,
  home: House,
  workspace: FolderOpen,
  layers: Layers,
  table: Table,
  search: Search,
  recent: Clock,
  profiles: SlidersHorizontal,
  favorites: Star,
  automation: Workflow,
  templates: LayoutTemplate,
  help: CircleHelp,
  sun: Sun,
  moon: Moon,
  monitor: Monitor,
  chevron: ChevronRight,
  next: ArrowRight,
  back: ArrowLeft,
  folder: FolderOpen,
  code: CodeXml,
  convert: FileOutput,
  extract: ScanText,
  passed: CircleCheck,
  attention: CircleAlert,
  neutral: CircleMinus
} satisfies Record<string, LucideIcon>

export type IconName = keyof typeof ICONS

export function Icon({ name, size = 16 }: { name: IconName; size?: number }) {
  const Svg = ICONS[name]
  return <Svg className="icon" size={size} strokeWidth={2} aria-hidden="true" focusable="false" />
}
