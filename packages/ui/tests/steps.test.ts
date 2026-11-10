import { describe, expect, it } from 'vitest'
import { WORKFLOW_STEPS, stepIndex, stepOfPath } from '../src/features/workflow/steps'

describe('workflow steps', () => {
  it('has the six steps of the prototype, in order', () => {
    expect(WORKFLOW_STEPS.map((s) => s.label)).toEqual([
      'File type',
      'Action',
      'Upload',
      'Configure',
      'Preview',
      'Export'
    ])
    expect(stepIndex('upload')).toBe(2)
  })

  it('maps every workflow address to its step, and other pages to none', () => {
    expect(stepOfPath('/upload')).toBe('upload')
    expect(stepOfPath('/sections')).toBe('configure')
    expect(stepOfPath('/analysis/Sheet1')).toBe('configure')
    expect(stepOfPath('/configure')).toBe('configure')
    expect(stepOfPath('/preview/Sheet1')).toBe('preview')
    expect(stepOfPath('/check/Sheet1')).toBe('preview')
    expect(stepOfPath('/complete')).toBe('export')
    for (const other of ['/', '/help', '/settings', '/uploads', '/previewer']) expect(stepOfPath(other)).toBeNull()
  })
})
