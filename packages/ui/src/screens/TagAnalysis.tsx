import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { capitalize, defaultConfig, describeStyle, isConfigured, sortedTags } from '@hf/core'
import { useApp } from '../store'
import { useFormatterApp } from '../router'
import { useEditTag } from '../hooks'
import { SectionTabs } from '../components/SectionTabs'
import { RichText } from '../components/RichText'
import { Stat } from '../components/Stat'

const fallbackConfig = defaultConfig()
const route = getRouteApi('/analysis/$section')

export function TagAnalysis() {
  const { format } = useFormatterApp()
  const { section: name } = route.useParams()
  const { doc, config } = useApp()
  const navigate = useNavigate()
  const editTag = useEditTag()
  const section = doc?.sections.find((s) => s.name === name)
  if (!doc || !section) return null

  const { unit } = format
  const options = config ?? fallbackConfig
  const tags = sortedTags(section.scan)
  const missing = tags.filter(([tag]) => !isConfigured(tag, options.rules)).map(([tag]) => tag)
  const totalUses = tags.reduce((sum, [, usage]) => sum + usage.count, 0)
  const tagList = (list: string[]) => list.map((t) => `<${t}>`).join(', ')

  return (
    <>
      <h1>Tag analysis</h1>
      <p className="sub">
        The formatting tags found in each selected {format.section.singular}, and the style each one will get.
      </p>

      <SectionTabs screen="analysis" current={name} />

      <div className="stats">
        <Stat value={section.scan.htmlCells} label={`${capitalize(unit.plural)} with HTML`} />
        <Stat value={tags.length} label="Different tags" />
        <Stat value={totalUses} label="Tag uses" />
        <Stat value={missing.length} label="No style yet" tone={missing.length ? 'warn' : 'ok'} />
      </div>

      {missing.length > 0 && (
        <div className="banner" role="status">
          <span>
            ⚠ {tagList(missing)} {missing.length === 1 ? 'has' : 'have'} no style yet.{' '}
            {options.unknownTagAction === 'keep'
              ? `The tags will stay in the ${unit.singular} as visible text.`
              : 'The tags will be removed and their text left plain.'}
          </span>
          <button className="btn link" onClick={() => editTag(missing[0])}>
            Set a style →
          </button>
        </div>
      )}

      {tags.length === 0 ? (
        <div className="placeholder">This {format.section.singular} has no HTML. It will be copied unchanged.</div>
      ) : (
        <div className="card table-card">
          <table className="analysis">
            <thead>
              <tr>
                <th>Tag</th>
                <th className="num">Uses</th>
                <th>First {unit.singular}</th>
                <th>Style</th>
                <th>Preview of first {unit.singular}</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {tags.map(([tag, usage]) => {
                const description = describeStyle(tag, options.rules)
                return (
                  <tr key={tag} className="static">
                    <td>
                      <span className="tag">&lt;{tag}&gt;</span>
                    </td>
                    <td className="num">{usage.count.toLocaleString()}</td>
                    <td className="code">{usage.firstCell}</td>
                    <td>
                      {description ? (
                        <span className="style-desc">
                          <span className="chip ok">
                            {description.builtin ? 'Built in' : description.fallback ? 'Default' : 'Styled'}
                          </span>{' '}
                          {description.color && <span className="swatch" style={{ background: description.color }} />}
                          {description.parts.join(' · ')}
                        </span>
                      ) : (
                        <span className="chip warn">No style</span>
                      )}
                    </td>
                    <td className="preview-cell" title={usage.sample}>
                      <RichText html={usage.sample} options={options} />
                    </td>
                    <td className="actions">
                      {!description?.builtin && (
                        <button className="btn small" onClick={() => editTag(tag)}>
                          {description ? 'Edit' : 'Set style'}
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="footer">
        <button className="btn" onClick={() => navigate({ to: '/sections' })}>
          ← Back
        </button>
        <button
          className="btn primary"
          onClick={() => navigate({ to: '/preview/$section', params: { section: name } })}
        >
          Preview result →
        </button>
      </div>
    </>
  )
}
