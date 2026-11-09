import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { Badge, Button, Icon, ICONS, Spinner, Swatch, TagName } from '../src/design/atoms'
import { cx } from '../src/design/cx'

const html = (node: React.ReactElement) => renderToStaticMarkup(node)

describe('cx', () => {
  it('joins class names and skips empty ones', () => {
    expect(cx('btn', false, undefined, null, '', 'small')).toBe('btn small')
    expect(cx()).toBe('')
  })
})

describe('Button', () => {
  it('produces the same classes the screens used before', () => {
    expect(html(<Button>Go</Button>)).toBe('<button class="btn">Go</button>')
    expect(html(<Button variant="primary">Go</Button>)).toBe('<button class="btn primary">Go</button>')
    expect(html(<Button variant="link">Go</Button>)).toBe('<button class="btn link">Go</button>')
    expect(html(<Button small>Go</Button>)).toBe('<button class="btn small">Go</button>')
    expect(
      html(
        <Button small variant="primary">
          Go
        </Button>
      )
    ).toBe('<button class="btn small primary">Go</button>')
  })

  it('passes other button attributes through, and adds no type of its own', () => {
    expect(
      html(
        <Button small type="submit" disabled aria-label="Add" className="extra">
          +
        </Button>
      )
    ).toBe('<button class="btn small extra" type="submit" disabled="" aria-label="Add">+</button>')
  })
})

describe('Badge', () => {
  it('is a chip with an optional tone and attributes', () => {
    expect(html(<Badge>3</Badge>)).toBe('<span class="chip">3</span>')
    for (const tone of ['ok', 'warn', 'info', 'muted'] as const) {
      expect(html(<Badge tone={tone}>x</Badge>)).toBe(`<span class="chip ${tone}">x</span>`)
    }
    expect(
      html(
        <Badge tone="warn" title="2 tags">
          2
        </Badge>
      )
    ).toBe('<span class="chip warn" title="2 tags">2</span>')
  })
})

describe('TagName', () => {
  it('shows the tag name as text, never as HTML', () => {
    expect(html(<TagName name="b" />)).toBe('<span class="tag">&lt;b&gt;</span>')
    expect(html(<TagName name="mark" large />)).toBe('<span class="tag large">&lt;mark&gt;</span>')
    expect(html(<TagName name={'x"><script>'} title="t" />)).toBe(
      '<span class="tag" title="t">&lt;x&quot;&gt;&lt;script&gt;&gt;</span>'
    )
  })
})

describe('Icon, Spinner and Swatch', () => {
  it('renders each icon as its character', () => {
    for (const [name, char] of Object.entries(ICONS)) {
      expect(html(<Icon name={name as keyof typeof ICONS} />)).toBe(char)
    }
  })

  it('renders a decorative spinner and a colour square', () => {
    expect(html(<Spinner />)).toBe('<span class="spinner" aria-hidden="true"></span>')
    expect(html(<Swatch color="#C00000" />)).toBe('<span class="swatch" style="background:#C00000"></span>')
  })
})
