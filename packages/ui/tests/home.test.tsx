// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import {
  FILE_TYPES,
  actionsFor,
  availabilityOf,
  firstReadyAction,
  type FileTypeId
} from '../src/features/workflow/registry'
import { useApp } from '../src/state/store'
import { RadioCards } from '../src/design/molecules'

describe('workflow registry', () => {
  it('offers Excel, Word, PDF and Text; Excel lists only the extension the app really opens', () => {
    expect(FILE_TYPES.map((t) => t.id)).toEqual(['excel', 'word', 'pdf', 'text'])
    expect(FILE_TYPES[0].extensions).toEqual(['.xlsx'])
  })

  it('makes only the implemented action ready, for the running app only', () => {
    const excel = actionsFor('excel')
    expect(excel.map((a) => [a.label, availabilityOf(a, 'excel')])).toEqual([
      ['Format HTML tags', 'ready'],
      ['Convert to PDF', 'coming-soon']
    ])
    // Another app (e.g. a future Word app) doesn't get Excel's action
    expect(availabilityOf(excel[0], 'word')).toBe('coming-soon')
    for (const type of ['word', 'pdf', 'text'] as FileTypeId[]) {
      expect(actionsFor(type).length).toBeGreaterThan(0)
      expect(firstReadyAction(type, 'excel')).toBeNull()
    }
    expect(firstReadyAction('excel', 'excel')?.id).toBe('format-html')
  })
})

describe("Home's choice (store)", () => {
  beforeEach(() => useApp.setState({ homeType: 'excel', homeAction: 'format-html' }))

  it('starts on Excel with its ready action, and clears an action that no longer fits', () => {
    expect(useApp.getState()).toMatchObject({ homeType: 'excel', homeAction: 'format-html' })
    useApp.getState().setHomeType('word', 'excel')
    expect(useApp.getState()).toMatchObject({ homeType: 'word', homeAction: null })
    useApp.getState().setHomeType('excel', 'excel')
    expect(useApp.getState()).toMatchObject({ homeType: 'excel', homeAction: 'format-html' })
  })
})

describe('RadioCards (keyboard and pointer)', () => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  let root: Root | null = null
  afterEach(() => act(() => root?.unmount()))

  function mount(value: string, onChange: (v: string) => void) {
    const host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
    act(() =>
      root!.render(
        <RadioCards
          label="File type"
          value={value}
          options={[{ value: 'a' }, { value: 'b', disabled: true }, { value: 'c' }]}
          onChange={onChange}
          renderCard={(o) => <span>{o.value.toUpperCase()}</span>}
        />
      )
    )
    return host
  }

  it('has one tab stop, skips unavailable cards with the arrow keys, and ignores clicks on them', () => {
    const onChange = vi.fn()
    const host = mount('a', onChange)
    const radios = [...host.querySelectorAll<HTMLButtonElement>('[role="radio"]')]
    expect(host.querySelector('[role="radiogroup"]')!.getAttribute('aria-label')).toBe('File type')
    expect(radios.map((r) => r.tabIndex)).toEqual([0, -1, -1])
    expect(radios.map((r) => r.getAttribute('aria-checked'))).toEqual(['true', 'false', 'false'])
    expect(radios[1].getAttribute('aria-disabled')).toBe('true')
    act(() => radios[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })))
    expect(onChange).toHaveBeenLastCalledWith('c')
    act(() => radios[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true })))
    expect(onChange).toHaveBeenLastCalledWith('c')
    act(() => radios[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true })))
    expect(onChange).toHaveBeenLastCalledWith('c')
    onChange.mockClear()
    act(() => radios[1].click())
    expect(onChange).not.toHaveBeenCalled()
    act(() => radios[2].click())
    expect(onChange).toHaveBeenCalledWith('c')
  })
})
