import { useMemo, useState, type CSSProperties, type FormEvent } from 'react'
import { getRouteApi, useNavigate, useRouter } from '@tanstack/react-router'
import { BUILTIN_TAGS, describeStyle, mergeScans, normalizeTagName, type TagStyle } from '@hf/core'
import { useApp } from '../store'
import { RichText } from '../components/RichText'

const route = getRouteApi('/settings')

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

export function TagStyles() {
  const { config, doc, setUnknownTagAction, resetConfig, importConfig, exportConfig } = useApp()
  // ?tag= is the tag being edited, ?back= the screen to return to (set by "Set style" / "Edit").
  const { tag: tagParam, back } = route.useSearch()
  const navigate = useNavigate()
  const router = useRouter()
  const setSelected = (tag: string) =>
    navigate({ to: '/settings', search: (prev) => ({ ...prev, tag }), replace: true })

  // Tags used anywhere in the open document (for counts, warnings and real previews).
  const used = useMemo(() => (doc ? mergeScans(doc.sections.map((s) => s.scan)).tags : {}), [doc])
  const tagNames = useMemo(() => {
    const names = new Set([
      ...Object.keys(config?.rules ?? {}),
      ...Object.keys(used).filter((t) => !(t in BUILTIN_TAGS))
    ])
    return [...names].sort()
  }, [config, used])

  if (!config) return <p className="sub">Loading tag styles…</p>
  const tag = tagParam && tagNames.includes(tagParam) ? tagParam : (tagNames[0] ?? null)
  const backLabel = back?.startsWith('/preview') ? 'preview' : back?.startsWith('/analysis') ? 'tag analysis' : null

  return (
    <>
      <h1>Tag styles</h1>
      <p className="sub">
        Choose the formatting for each HTML tag. Changes are saved automatically and used for every file.
      </p>

      <div className="cfg">
        <div>
          <div className="taglist" role="listbox" aria-label="Tags">
            {tagNames.map((name) => {
              const hasRule = Boolean(config.rules[name])
              return (
                <button
                  key={name}
                  role="option"
                  aria-selected={name === tag}
                  className={name === tag ? 'active' : ''}
                  onClick={() => setSelected(name)}
                >
                  <span className="tag">&lt;{name}&gt;</span>
                  {!hasRule ? (
                    <span className="chip warn">No style</span>
                  ) : used[name] ? (
                    <span className="faint" title="Uses in the open file">
                      {used[name].count}×
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>
          <AddTag onAdded={setSelected} />
        </div>

        {tag ? (
          <StyleEditor tag={tag} sample={used[tag]?.sample} uses={used[tag]?.count} />
        ) : (
          <div className="editor faint">Add a tag to start.</div>
        )}
      </div>

      <div className="editor" style={{ marginTop: 20 }}>
        <div className="field" style={{ margin: 0 }}>
          <label htmlFor="unknown-action">Tags with no style</label>
          <select
            id="unknown-action"
            value={config.unknownTagAction}
            onChange={(e) => setUnknownTagAction(e.target.value === 'keep' ? 'keep' : 'strip')}
          >
            <option value="strip">Remove the tag, keep its text plain</option>
            <option value="keep">Keep the tag as visible text</option>
          </select>
        </div>
      </div>

      <div className="footer">
        <div className="row">
          <button className="btn" onClick={exportConfig}>
            Export JSON…
          </button>
          <button className="btn" onClick={importConfig}>
            Import JSON…
          </button>
          <button
            className="btn"
            onClick={() => {
              if (
                window.confirm(
                  'Reset all tag styles to the defaults? Your current styles will be lost unless you export them first.'
                )
              )
                resetConfig()
            }}
          >
            Reset to defaults
          </button>
        </div>
        {back && backLabel && (
          <button className="btn primary" onClick={() => router.history.push(back)}>
            Done, back to {backLabel} →
          </button>
        )}
      </div>
    </>
  )
}

function AddTag({ onAdded }: { onAdded: (tag: string) => void }) {
  const { config, updateRule } = useApp()
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)

  function submit(e: FormEvent) {
    e.preventDefault()
    const name = normalizeTagName(value)
    if (!name) return setError('Use letters and numbers, e.g. mark or h1')
    if (name in BUILTIN_TAGS) return setError(`<${name}> is built in and can't be styled`)
    // A new tag starts as bold so the change is visible; an existing one is just selected.
    if (!config?.rules[name]) updateRule(name, { bold: true })
    onAdded(name)
    setValue('')
    setError(null)
  }

  return (
    <form className="add-tag" onSubmit={submit}>
      <div className="row" style={{ flexWrap: 'nowrap' }}>
        <input
          type="text"
          aria-label="New tag name"
          placeholder="New tag, e.g. mark"
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            setError(null)
          }}
        />
        <button className="btn small" type="submit">
          Add
        </button>
      </div>
      {error && <div className="field-error">{error}</div>}
    </form>
  )
}

function StyleEditor({ tag, sample, uses }: { tag: string; sample?: string; uses?: number }) {
  const { config, updateRule, createPlainRule, removeRule } = useApp()
  if (!config) return null
  const rule: TagStyle | undefined = config.rules[tag]
  const r = rule ?? {}
  const set = (patch: Partial<TagStyle>) => updateRule(tag, patch)
  const toggle = (key: 'bold' | 'italic' | 'underline' | 'strike', label: string, css: CSSProperties) => (
    <button
      type="button"
      className={`tg ${r[key] ? 'on' : ''}`}
      style={css}
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
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 16 }}>
        <div className="row" style={{ gap: 8 }}>
          <span className="tag" style={{ fontSize: 15 }}>
            &lt;{tag}&gt;
          </span>
          {uses ? <span className="faint">{uses} uses in this file</span> : null}
        </div>
        {rule && (
          <button className="btn small" onClick={() => removeRule(tag)}>
            Remove style
          </button>
        )}
      </div>

      {!rule && (
        <div className="banner" style={{ marginBottom: 16 }}>
          <span>No style yet. Any change below creates one, or keep the text without formatting.</span>
          <button className="btn small" onClick={() => createPlainRule(tag)}>
            Keep text plain
          </button>
        </div>
      )}

      <div className="field">
        <label>Text style</label>
        <div className="toggles">
          {toggle('bold', 'B', { fontWeight: 700 })}
          {toggle('italic', 'I', { fontStyle: 'italic' })}
          {toggle('underline', 'U', { textDecoration: 'underline' })}
          {toggle('strike', 'S', { textDecoration: 'line-through' })}
        </div>
      </div>

      <div className="field">
        <label htmlFor="color-on">Font color</label>
        <div className="row">
          <label className="row" style={{ gap: 6 }}>
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
      </div>

      <div className="field">
        <label htmlFor="font-size">Font size</label>
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
      </div>

      <div className="field">
        <label htmlFor="font-name">Font</label>
        <select id="font-name" value={r.font ?? ''} onChange={(e) => set({ font: e.target.value || undefined })}>
          <option value="">Keep the cell's font</option>
          {fonts.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label>Position</label>
        <div className="seg" role="radiogroup" aria-label="Position">
          {(
            [
              ['', 'Normal'],
              ['superscript', 'Superscript'],
              ['subscript', 'Subscript']
            ] as const
          ).map(([value, label]) => (
            <button
              key={label}
              role="radio"
              aria-checked={(r.vertAlign ?? '') === value}
              className={(r.vertAlign ?? '') === value ? 'on' : ''}
              onClick={() => set({ vertAlign: value || undefined })}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="field" style={{ alignItems: 'start', marginBottom: 0 }}>
        <label>Preview</label>
        <div>
          <div className="preview">
            <RichText html={`The <${tag}>quick brown fox</${tag}> jumps over the lazy dog.`} options={config} />
          </div>
          {sample && (
            <div className="preview">
              <div className="code" style={{ marginBottom: 4 }}>
                From your file:
              </div>
              <RichText html={sample} options={config} />
            </div>
          )}
          {description && (
            <div className="faint" style={{ marginTop: 6, fontSize: 12.5 }}>
              {description.parts.join(' · ')}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
