import type { WorkflowTemplate } from '@hf/core'

/** How many templates are kept. */
export const MAX_TEMPLATES = 30

// Names may not contain control characters, so this pattern needs them.
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u001f]/
const text = (value: unknown, max: number): value is string =>
  typeof value === 'string' && value.trim().length > 0 && value.length <= max && !CONTROL.test(value)

/** One template from disk or from the window: well-formed, or null. */
export function parseTemplate(input: unknown): WorkflowTemplate | null {
  if (!input || typeof input !== 'object') return null
  const t = input as Record<string, unknown>
  if (!text(t.name, 60) || !text(t.fileType, 40) || !text(t.action, 60) || !text(t.profile, 60)) return null
  if (t.sheets !== 'html' && t.sheets !== 'all') return null
  return { name: t.name.trim(), fileType: t.fileType, action: t.action, profile: t.profile, sheets: t.sheets }
}

/** The stored templates: valid, unique names (ignoring case), at most MAX_TEMPLATES. Never throws. */
export function parseTemplates(data: unknown): WorkflowTemplate[] {
  const list = data && typeof data === 'object' ? (data as { templates?: unknown }).templates : undefined
  if (!Array.isArray(list)) return []
  const out: WorkflowTemplate[] = []
  for (const item of list) {
    const t = parseTemplate(item)
    if (!t || out.some((o) => o.name.toLowerCase() === t.name.toLowerCase())) continue
    out.push(t)
    if (out.length === MAX_TEMPLATES) break
  }
  return out
}

/** Adds a template, or replaces the one with the same name. Throws why it can't be saved. */
export function saveTemplate(list: readonly WorkflowTemplate[], input: unknown): WorkflowTemplate[] {
  const t = parseTemplate(input)
  if (!t) throw new Error('Give the template a name (up to 60 characters) and choose its settings.')
  const others = list.filter((o) => o.name.toLowerCase() !== t.name.toLowerCase())
  if (others.length >= MAX_TEMPLATES) throw new Error(`You can keep up to ${MAX_TEMPLATES} templates.`)
  return [...others, t].sort((a, b) => a.name.localeCompare(b.name))
}

export function deleteTemplate(list: readonly WorkflowTemplate[], name: unknown): WorkflowTemplate[] {
  return list.filter((t) => typeof name !== 'string' || t.name.toLowerCase() !== name.toLowerCase())
}
