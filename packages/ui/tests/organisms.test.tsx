// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, type ReactElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { defaultConfig, type CheckItem } from '@hf/core'
import { useApp } from '../src/state/store'
import { AddTag, CheckList, StyleEditor } from '../src/design/organisms'

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
const click = (el: Element | null | undefined) => act(() => (el as HTMLElement).click())
const button = (el: HTMLElement, name: string) =>
  [...el.querySelectorAll('button')].find((b) => b.textContent === name || b.title === name)

beforeEach(() => {
  ;(window as unknown as { api: object }).api = { saveConfig: vi.fn(async () => {}) }
  useApp.setState({ config: defaultConfig() })
})

describe('StyleEditor', () => {
  it('shows a styled tag and changes it with the style buttons', () => {
    const el = mount(<StyleEditor tag="b" sample="<b>x</b>" uses={3} />)
    expect(el.querySelector('.tag.large')!.textContent).toBe('<b>')
    expect(el.textContent).toContain('3 uses in this file')
    const bold = button(el, 'Bold')!
    expect(bold.className).toBe('tg bold on')
    click(button(el, 'Italic'))
    expect(useApp.getState().config!.rules.b).toMatchObject({ bold: true, italic: true })
    click(button(el, 'Superscript'))
    expect(useApp.getState().config!.rules.b.vertAlign).toBe('superscript')
    click(button(el, 'Remove style'))
    expect(Object.hasOwn(useApp.getState().config!.rules, 'b')).toBe(false)
  })

  it('offers to keep a tag with no style plain', () => {
    const el = mount(<StyleEditor tag="zz" />)
    expect(el.querySelector('.banner')!.textContent).toContain('No style yet')
    click(button(el, 'Keep text plain'))
    expect(useApp.getState().config!.rules.zz).toEqual({})
  })

  it('explains a tag that uses its built-in look', () => {
    const config = defaultConfig()
    delete config.rules.h2
    useApp.setState({ config })
    const el = mount(<StyleEditor tag="h2" />)
    expect(el.querySelector('.banner')!.textContent).toContain('Uses the built-in look')
  })
})

describe('AddTag', () => {
  const type = (input: HTMLInputElement, value: string) =>
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value)
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
  const submit = (form: HTMLFormElement) => act(() => form.requestSubmit())

  it('adds a new tag (bold, so the change shows) and reports names it cannot use', () => {
    const onAdded = vi.fn()
    const el = mount(<AddTag onAdded={onAdded} />)
    const input = el.querySelector('input')!
    const form = el.querySelector('form')!
    type(input, '<Mark2>')
    submit(form)
    expect(onAdded).toHaveBeenCalledWith('mark2')
    expect(useApp.getState().config!.rules.mark2).toEqual({ bold: true })
    type(input, '!!')
    submit(form)
    expect(el.querySelector('.field-error')!.textContent).toBe('Use letters and numbers, e.g. mark or h1')
    type(input, 'br')
    submit(form)
    expect(el.querySelector('.field-error')!.textContent).toBe("<br> is built in and can't be styled")
  })
})

describe('CheckList', () => {
  const item = (location: string, severity: CheckItem['severity'] = 'issue'): CheckItem => ({
    section: 'S',
    location,
    severity,
    kind: severity === 'issue' ? 'missing' : 'note',
    source: '<b>x</b>',
    converted: 'x'
  })

  it('shows one page of items, marks the selected one and pages through the rest', () => {
    const items = [item('A1'), item('A2', 'note')]
    const onSelect = vi.fn()
    const onPage = vi.fn()
    const el = mount(
      <CheckList
        items={items}
        selected={items[1]}
        onSelect={onSelect}
        onKeyDown={() => {}}
        page={0}
        pages={2}
        onPage={onPage}
      />
    )
    const list = el.querySelector('[role="listbox"]')!
    expect(list.getAttribute('aria-activedescendant')).toBe('check-A2')
    const rows = el.querySelectorAll('[role="option"]')
    expect([...rows].map((r) => r.className)).toEqual(['check-row', 'check-row active'])
    expect(rows[0].querySelector('.chip')!.className).toBe('chip warn')
    expect(rows[1].querySelector('.chip')!.textContent).toBe('ℹ A2')
    click(rows[0])
    expect(onSelect).toHaveBeenCalledWith(items[0])
    expect(el.textContent).toContain('Page 1 of 2')
    expect(button(el, '← Previous')!.disabled).toBe(true)
    click(button(el, 'Next →'))
    expect(onPage).toHaveBeenCalledWith(1)
  })
})
