import { useMemo } from 'react'
import { getRouteApi, useNavigate, useRouter } from '@tanstack/react-router'
import { BUILTIN_TAGS, builtinStyle, mergeScans } from '@hf/core'
import { useApp } from '../store'
import { Badge, Button, TagName } from '../design/atoms'
import { Field } from '../design/molecules'
import { AddTag, StyleEditor } from '../design/organisms'
import { ScreenTemplate } from '../design/templates'

const route = getRouteApi('/settings')

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
      ...Object.keys(used).filter((t) => !Object.hasOwn(BUILTIN_TAGS, t))
    ])
    return [...names].sort()
  }, [config, used])

  if (!config) return <p className="sub">Loading tag styles…</p>
  const tag = tagParam && tagNames.includes(tagParam) ? tagParam : (tagNames[0] ?? null)
  const backLabel = back?.startsWith('/preview')
    ? 'preview'
    : back?.startsWith('/analysis')
      ? 'tag analysis'
      : back?.startsWith('/check')
        ? 'the content check'
        : null

  return (
    <ScreenTemplate
      title="Tag styles"
      intro={<>Choose the formatting for each HTML tag. Changes are saved automatically and used for every file.</>}
      footer={
        <>
          <div className="row">
            <Button onClick={exportConfig}>Export JSON…</Button>
            <Button onClick={importConfig}>Import JSON…</Button>
            <Button
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
            </Button>
          </div>
          {back && backLabel && (
            <Button variant="primary" onClick={() => router.history.push(back)}>
              Done, back to {backLabel} →
            </Button>
          )}
        </>
      }
    >
      <div className="cfg">
        <div>
          <div className="taglist" role="listbox" aria-label="Tags">
            {tagNames.map((name) => {
              const hasRule = Object.hasOwn(config.rules, name)
              const hasDefault = !hasRule && builtinStyle(name) !== undefined
              return (
                <button
                  key={name}
                  role="option"
                  aria-selected={name === tag}
                  className={name === tag ? 'active' : ''}
                  onClick={() => setSelected(name)}
                >
                  <TagName name={name} />
                  {hasDefault ? (
                    <Badge tone="ok">Default</Badge>
                  ) : !hasRule ? (
                    <Badge tone="warn">No style</Badge>
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

      <div className="editor mt-6">
        <Field label="Tags with no style" htmlFor="unknown-action" className="mb-0">
          <select
            id="unknown-action"
            value={config.unknownTagAction}
            onChange={(e) => setUnknownTagAction(e.target.value === 'keep' ? 'keep' : 'strip')}
          >
            <option value="strip">Remove the tag, keep its text plain</option>
            <option value="keep">Keep the tag as visible text</option>
          </select>
        </Field>
      </div>
    </ScreenTemplate>
  )
}
