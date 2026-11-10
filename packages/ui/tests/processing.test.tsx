// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { useApp } from '../src/state/store'
import { ProcessingPanel, STAGES, currentStage } from '../src/design/organisms'

const idle = { status: 'idle', progress: null }
afterEach(() => useApp.setState({ job: null, check: { ...useApp.getState().check, status: 'idle', progress: null } }))

describe('processing stages', () => {
  it('lists every real stage, in order', () => {
    expect(STAGES.map(([stage]) => stage)).toEqual([
      'reading',
      'scanning',
      'checking',
      'converting',
      'saving',
      'verifying'
    ])
  })

  it('follows the save while saving, otherwise the content check, otherwise nothing', () => {
    expect(currentStage(null, idle)).toBeNull()
    expect(currentStage(null, { status: 'running', progress: null })).toEqual({ stage: 'checking' })
    const checking = { stage: 'checking' as const, done: 3, total: 10 }
    expect(currentStage(null, { status: 'running', progress: checking })).toBe(checking)
    const saving = { stage: 'saving' as const }
    expect(currentStage({ kind: 'export', progress: saving }, { status: 'running', progress: checking })).toBe(saving)
    // A save whose dialog is still open has no progress yet
    expect(currentStage({ kind: 'export', progress: null }, idle)).toBeNull()
  })
})

/** Renders with the store's current state (a server render would read its initial state). */
function render(): string {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  const host = document.createElement('div')
  const root = createRoot(host)
  act(() => root.render(<ProcessingPanel items="cells" />))
  const html = host.innerHTML
  act(() => root.unmount())
  return html
}

describe('ProcessingPanel', () => {
  it('is hidden when nothing runs', () => {
    expect(render()).toBe('')
  })

  it('shows a percentage only when the stage reports counts, and marks earlier stages done', () => {
    useApp.setState({ job: { kind: 'export', progress: { stage: 'converting', done: 1, total: 4 } } })
    const html = render()
    expect(html).toContain('aria-valuenow="25"')
    expect(html).toContain('25%')
    expect(html).toContain('Saving your file…')
    expect(html.match(/<li class="done">/g)).toHaveLength(3)
    expect(html).toContain('<li class="doing">')
    expect(html).toContain('>Cancel</button>')

    useApp.setState({ job: null, check: { ...useApp.getState().check, status: 'running', progress: null } })
    const checking = render()
    expect(checking).not.toContain('aria-valuenow')
    expect(checking).toContain('class="spinning"')
    expect(checking).toContain('Processing your file…')
    expect(checking).not.toContain('Cancel')
  })
})
