// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { HeroArt, JourneySteps, WaveArt } from '../src/design/molecules'
import { QuickActions } from '../src/design/organisms'

const navigate = vi.fn()
vi.mock(import('@tanstack/react-router'), async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => navigate
}))

const html = (node: React.ReactElement) => renderToStaticMarkup(node)

describe('JourneySteps', () => {
  const steps = [
    { title: 'One', hint: 'a' },
    { title: 'Two', hint: 'b' },
    { title: 'Three', hint: 'c' }
  ]

  it('is an ordered list that fills the numbers up to the current step and marks it for screen readers', () => {
    const out = html(<JourneySteps steps={steps} current={1} />)
    expect(out).toContain('<ol class="journey" aria-label="How it works">')
    expect(out.match(/journey-num on/g)).toHaveLength(2)
    expect(out.match(/aria-current="step"/g)).toHaveLength(1)
    expect(out).toMatch(/aria-current="step"><span class="journey-num on">2</)
    // A chevron between steps, none after the last
    expect(out.match(/<svg/g)).toHaveLength(2)
  })
})

describe('Home pictures', () => {
  it('hides the wave and the file cards from screen readers', () => {
    expect(html(<WaveArt />)).toContain('aria-hidden="true"')
    const hero = html(<HeroArt />)
    expect(hero).toMatch(/^<div class="hero-art" aria-hidden="true">/)
    expect(hero.match(/class="hero-doc /g)).toHaveLength(4)
  })

  it('gives each wave its own gradient and filter ids', () => {
    const page = html(
      <>
        <WaveArt />
        <WaveArt />
      </>
    )
    const ids = [...page.matchAll(/ id="([^"]+)"/g)].map((m) => m[1])
    expect(ids).toHaveLength(10)
    expect(new Set(ids).size).toBe(10)
  })
})

describe('QuickActions', () => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  let root: Root | null = null
  afterEach(() => {
    act(() => root?.unmount())
    document.body.innerHTML = ''
    navigate.mockReset()
  })

  it('opens Recent Files, Formatting Profiles and Templates', () => {
    const host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
    act(() => root!.render(<QuickActions />))

    const buttons = [...host.querySelectorAll('button')]
    expect(buttons.map((b) => b.querySelector('b')!.textContent)).toEqual([
      'Open recent',
      'Formatting Profiles',
      'Use a Template'
    ])
    for (const [i, to] of [
      [0, '/recent'],
      [1, '/settings'],
      [2, '/templates']
    ] as const) {
      act(() => buttons[i].click())
      expect(navigate).toHaveBeenLastCalledWith({ to })
    }
  })
})
