import { builtinStyle, describeStyle, type TagStyle } from '@hf/core'
import { useApp } from '../../store'
import { cx } from '../cx'
import { Button, TagName } from '../atoms'
import { Banner, Field, RichText, SegmentedControl } from '../molecules'

const SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 36]
const FONTS = [
  'Aptos',
  'Arial',
  'Calibri',
  'Cambria',
  'Consolas',
  'Courier New',
  'Georgia',
  'Segoe UI',
  'Tahoma',
  'Times New Roman',
  'Verdana'
]
const DEFAULT_COLOR = '#C00000'
const POSITIONS = [
  ['', 'Normal'],
  ['superscript', 'Superscript'],
  ['subscript', 'Subscript']
] as const

/** The settings of one tag's style, with a live preview. Every change is saved at once. */
export function StyleEditor({ tag, sample, uses }: { tag: string; sample?: string; uses?: number }) {
  const { config, updateRule, createPlainRule, removeRule } = useApp()
  if (!config) return null
  const rule: TagStyle | undefined = Object.hasOwn(config.rules, tag) ? config.rules[tag] : undefined
  const fallback = rule ? undefined : builtinStyle(tag)
  // With no rule, the controls show the built-in look; the first change turns it into a rule.
  const r = rule ?? fallback ?? {}
  const set = (patch: Partial<TagStyle>) => updateRule(tag, patch)
  const toggle = (key: 'bold' | 'italic' | 'underline' | 'strike', label: string) => (
    <button
      type="button"
      // The button shows its own effect (B is bold, I italic…): see .tg.bold and the others.
      className={cx('tg', key, r[key] && 'on')}
      aria-pressed={Boolean(r[key])}
      title={key[0].toUpperCase() + key.slice(1)}
      onClick={() => set({ [key]: !r[key] } as Partial<TagStyle>)}
    >
      {label}
    </button>
  )
  const sizes = r.size && !SIZES.includes(r.size) ? [...SIZES, r.size].sort((a, b) => a - b) : SIZES
  const fonts = r.font && !FONTS.includes(r.font) ? [...FONTS, r.font].sort() : FONTS
  const description = describeStyle(tag, config.rules)

  return (
    <div className="editor">
      <div className="row spread mb-5">
        <div className="row gap-3">
          <TagName name={tag} large />
          {uses ? <span className="faint">{uses} uses in this file</span> : null}
        </div>
        {rule && (
          <Button small onClick={() => removeRule(tag)}>
            Remove style
          </Button>
        )}
      </div>

      {!rule && fallback && (
        <Banner>Uses the built-in look ({description?.parts.join(' · ')}). Any change below makes it your own.</Banner>
      )}

      {!rule && !fallback && (
        <Banner
          action={
            <Button small onClick={() => createPlainRule(tag)}>
              Keep text plain
            </Button>
          }
        >
          No style yet. Any change below creates one, or keep the text without formatting.
        </Banner>
      )}

      <Field label="Text style">
        <div className="toggles">
          {toggle('bold', 'B')}
          {toggle('italic', 'I')}
          {toggle('underline', 'U')}
          {toggle('strike', 'S')}
        </div>
      </Field>

      <Field label="Font color" htmlFor="color-on">
        <div className="row">
          <label className="row gap-2">
            <input
              id="color-on"
              type="checkbox"
              checked={Boolean(r.color)}
              onChange={(e) => set({ color: e.target.checked ? DEFAULT_COLOR : undefined })}
            />
            Set color
          </label>
          {r.color && (
            <>
              <input
                type="color"
                aria-label="Font color"
                value={r.color}
                onChange={(e) => set({ color: e.target.value.toUpperCase() })}
              />
              <span className="code">{r.color}</span>
            </>
          )}
        </div>
      </Field>

      <Field label="Font size" htmlFor="font-size">
        <select
          id="font-size"
          value={r.size ?? ''}
          onChange={(e) => set({ size: e.target.value ? Number(e.target.value) : undefined })}
        >
          <option value="">Keep the cell's size</option>
          {sizes.map((s) => (
            <option key={s} value={s}>
              {s} pt
            </option>
          ))}
        </select>
      </Field>

      <Field label="Font" htmlFor="font-name">
        <select id="font-name" value={r.font ?? ''} onChange={(e) => set({ font: e.target.value || undefined })}>
          <option value="">Keep the cell's font</option>
          {fonts.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Position">
        <SegmentedControl
          label="Position"
          value={r.vertAlign ?? ''}
          options={POSITIONS}
          onChange={(value) => set({ vertAlign: value || undefined })}
        />
      </Field>

      <Field label="Preview" alignTop className="mb-0">
        <div>
          <div className="preview">
            <RichText html={`The <${tag}>quick brown fox</${tag}> jumps over the lazy dog.`} options={config} />
          </div>
          {sample && (
            <div className="preview">
              <div className="code mb-1">From your file:</div>
              <RichText html={sample} options={config} />
            </div>
          )}
          {description && <div className="faint mt-2 text-sm">{description.parts.join(' · ')}</div>}
        </div>
      </Field>
    </div>
  )
}
