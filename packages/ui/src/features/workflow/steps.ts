/**
 * The six steps of a task (prototype "Horizontal Steps"): the first two are chosen on Home, the other four are the
 * workflow screens. Each address belongs to one step.
 */
export const WORKFLOW_STEPS = [
  { id: 'type', label: 'File type' },
  { id: 'action', label: 'Action' },
  { id: 'upload', label: 'Upload' },
  { id: 'configure', label: 'Configure' },
  { id: 'preview', label: 'Preview' },
  { id: 'export', label: 'Export' }
] as const

export type WorkflowStepId = (typeof WORKFLOW_STEPS)[number]['id']

/** The step an in-app address belongs to, or null for pages outside the workflow (Home, Help…). */
export function stepOfPath(pathname: string): WorkflowStepId | null {
  if (/^\/upload(\/|$)/.test(pathname)) return 'upload'
  if (/^\/(configure|sections|analysis)(\/|$)/.test(pathname)) return 'configure'
  if (/^\/(preview|check)(\/|$)/.test(pathname)) return 'preview'
  if (/^\/complete(\/|$)/.test(pathname)) return 'export'
  return null
}

export const stepIndex = (id: WorkflowStepId): number => WORKFLOW_STEPS.findIndex((s) => s.id === id)
