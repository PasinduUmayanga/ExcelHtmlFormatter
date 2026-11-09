import { useNavigate } from '@tanstack/react-router'
import { capitalize, count, sortedTags } from '@hf/core'
import { useApp } from '../store'
import { useFormatterApp } from '../router'
import { Badge, Button, TagName } from '../design/atoms'
import { ScreenTemplate } from '../design/templates'

const formatSize = (bytes: number) =>
  bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`

const MAX_TAGS_SHOWN = 8

export function SelectSections() {
  const { format } = useFormatterApp()
  const { doc, selected, toggleSection, selectAllSections } = useApp()
  const navigate = useNavigate()
  if (!doc) return null

  const { file, sections } = doc
  const words = format.section
  const chosen = new Set(selected)
  const allSelected = sections.length > 0 && sections.every((s) => chosen.has(s.name))
  const withHtml = sections.filter((s) => s.scan.htmlCells > 0)
  const visibleWithHtml = withHtml.filter((s) => s.state === 'visible').length
  const hiddenWithHtml = withHtml.length - visibleWithHtml

  return (
    <ScreenTemplate
      title={<>Select {words.plural}</>}
      intro={
        <>
          <b>{count(sections.length, words)}</b> found in {file.name} ({formatSize(file.sizeBytes)}).{' '}
          {withHtml.length === 0 && `None of them contain HTML tags.`}
          {visibleWithHtml > 0 &&
            `${visibleWithHtml} ${visibleWithHtml === 1 ? 'contains' : 'contain'} HTML and ${visibleWithHtml === 1 ? 'is' : 'are'} selected for you.`}
          {hiddenWithHtml > 0 &&
            ` ${hiddenWithHtml} hidden ${hiddenWithHtml === 1 ? `${words.singular} also contains` : `${words.plural} also contain`} HTML; tick ${hiddenWithHtml === 1 ? 'it' : 'them'} to include.`}
        </>
      }
      footer={
        <>
          <Button onClick={() => navigate({ to: '/open' })}>← Open another file</Button>
          <div className="row">
            <span className="muted">{selected.length} selected</span>
            <Button
              variant="primary"
              disabled={selected.length === 0}
              onClick={() => navigate({ to: '/analysis/$section', params: { section: selected[0] } })}
            >
              Analyse tags →
            </Button>
          </div>
        </>
      }
    >
      {sections.length === 0 ? (
        <div className="placeholder">This file has no {words.plural}.</div>
      ) : (
        <div className="card table-card">
          <table>
            <thead>
              <tr>
                <th className="pick">
                  <input
                    type="checkbox"
                    aria-label={`Select all ${words.plural}`}
                    checked={allSelected}
                    onChange={(e) => selectAllSections(e.target.checked)}
                  />
                </th>
                <th>{capitalize(words.singular)} name</th>
                <th>Size</th>
                <th>HTML {format.unit.plural}</th>
                <th>Tags found</th>
              </tr>
            </thead>
            <tbody>
              {sections.map((section) => {
                const on = chosen.has(section.name)
                const tags = sortedTags(section.scan)
                return (
                  <tr key={section.name} className={on ? 'sel' : ''} onClick={() => toggleSection(section.name)}>
                    <td>
                      <input
                        type="checkbox"
                        aria-label={`Select ${section.name}`}
                        checked={on}
                        onChange={() => toggleSection(section.name)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                    <td>
                      <b>{section.name}</b> {section.state !== 'visible' && <Badge tone="muted">Hidden</Badge>}
                    </td>
                    <td>{section.sizeLabel}</td>
                    <td>
                      {section.scan.htmlCells ? (
                        section.scan.htmlCells.toLocaleString()
                      ) : (
                        <span className="faint">0</span>
                      )}
                    </td>
                    <td>
                      {tags.length === 0 ? (
                        <Badge tone="info">No HTML found</Badge>
                      ) : (
                        <span className="row gap-1">
                          {tags.slice(0, MAX_TAGS_SHOWN).map(([tag, usage]) => (
                            <TagName key={tag} name={tag} title={`${usage.count} uses, first in ${usage.firstCell}`} />
                          ))}
                          {tags.length > MAX_TAGS_SHOWN && (
                            <span className="faint">+{tags.length - MAX_TAGS_SHOWN} more</span>
                          )}
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </ScreenTemplate>
  )
}
