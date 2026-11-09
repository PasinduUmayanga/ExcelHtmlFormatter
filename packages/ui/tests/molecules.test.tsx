// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, type ReactElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { Banner, ConfirmBox, Field, SegmentedControl, Stat, Tab, Tabs, tabClass } from '../src/design/molecules'

const html = (node: ReactElement) => renderToStaticMarkup(node)

// React only runs effects and events synchronously inside act() when it knows it is a test.
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
let root: Root | null = null
let host: HTMLElement
function mount(node: ReactElement): HTMLElement {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  act(() => root!.render(node))
  return host
}
afterEach(() => {
  act(() => root?.unmount())
  root = null
  host?.remove()
})
const click = (el: Element | null) => act(() => (el as HTMLElement).click())

describe('Field', () => {
  it('labels a control, optionally tied to it and aligned to the top', () => {
    expect(
      html(
        <Field label="Font" htmlFor="font">
          <select id="font" />
        </Field>
      )
    ).toBe('<div class="field"><label for="font">Font</label><select id="font"></select></div>')
    expect(
      html(
        <Field label="Preview" alignTop className="mb-0">
          <div />
        </Field>
      )
    ).toBe('<div class="field top mb-0"><label>Preview</label><div></div></div>')
  })
})

describe('SegmentedControl', () => {
  const options = [
    ['a', 'First'],
    ['b', 'Second']
  ] as const

  it('is a labelled radio group with the current option on', () => {
    expect(html(<SegmentedControl label="Mode" value="b" options={options} onChange={() => {}} />)).toBe(
      '<div class="seg" role="radiogroup" aria-label="Mode">' +
        '<button role="radio" aria-checked="false" class="">First</button>' +
        '<button role="radio" aria-checked="true" class="on">Second</button></div>'
    )
  })

  it('reports the chosen option', () => {
    const onChange = vi.fn()
    const el = mount(<SegmentedControl label="Mode" value="a" options={options} onChange={onChange} className="x" />)
    expect(el.querySelector('.seg')!.className).toBe('seg x')
    click(el.querySelectorAll('button')[1])
    expect(onChange).toHaveBeenCalledWith('b')
  })
})

describe('Banner and ConfirmBox', () => {
  it('shows a message with an optional action and role', () => {
    expect(html(<Banner>Note</Banner>)).toBe('<div class="banner"><span>Note</span></div>')
    expect(
      html(
        <Banner role="status" action={<button>Fix</button>}>
          Problem
        </Banner>
      )
    ).toBe('<div class="banner" role="status"><span>Problem</span><button>Fix</button></div>')
  })

  it('asks a question in the page and answers it with Cancel or the action', () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    const el = mount(
      <ConfirmBox label="Save anyway" confirmLabel="Save anyway" onConfirm={onConfirm} onCancel={onCancel}>
        Save with 1 issue?
      </ConfirmBox>
    )
    const box = el.querySelector('[role="alertdialog"]')!
    expect(box.getAttribute('aria-label')).toBe('Save anyway')
    expect(box.textContent).toBe('Save with 1 issue?CancelSave anyway')
    const [cancel, confirm] = box.querySelectorAll('button')
    expect(confirm.className).toBe('btn small primary')
    click(cancel)
    expect(onCancel).toHaveBeenCalledTimes(1)
    click(confirm)
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })
})

describe('Tabs', () => {
  it('marks the selected tab and reports clicks', () => {
    expect(tabClass(true)).toBe('tab active')
    expect(tabClass(false)).toBe('tab')
    const onClick = vi.fn()
    const el = mount(
      <Tabs label="Sheets">
        <Tab selected onClick={onClick}>
          One
        </Tab>
        <Tab selected={false} onClick={onClick}>
          Two
        </Tab>
      </Tabs>
    )
    expect(el.querySelector('[role="tablist"]')!.getAttribute('aria-label')).toBe('Sheets')
    const tabs = el.querySelectorAll('[role="tab"]')
    expect([...tabs].map((t) => t.getAttribute('aria-selected'))).toEqual(['true', 'false'])
    click(tabs[1])
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})

describe('Stat', () => {
  it('shows a number with a label and an optional tone', () => {
    expect(html(<Stat value={1234} label="Cells" tone="warn" />)).toBe(
      '<div class="stat"><div class="v warn">1,234</div><div class="l">Cells</div></div>'
    )
  })
})
