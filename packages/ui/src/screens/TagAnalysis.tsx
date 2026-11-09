import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { capitalize, defaultConfig, describeStyle, isConfigured, sortedTags } from '@hf/core'
import { useApp } from '../store'
import { useFormatterApp } from '../router'
import { useEditTag } from '../hooks'
import { RichText, Stat } from '../design/molecules'
import { Badge, Button, Swatch, TagName } from '../design/atoms'
import { MissingStylesBanner, SectionTabs } from '../design/organisms'
import { ScreenTemplate } from '../design/templates'

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
    <ScreenTemplate
      title="Tag analysis"
      intro={
        <>The formatting tags found in each selected {format.section.singular}, and the style each one will get.</>
      }
      footer={
        <>
          <Button onClick={() => navigate({ to: '/sections' })}>← Back</Button>
          <Button variant="primary" onClick={() => navigate({ to: '/preview/$section', params: { section: name } })}>
            Preview result →
          </Button>
        </>
      }
    >
      <SectionTabs screen="analysis" current={name} />

      <div className="stats">
        <Stat value={section.scan.htmlCells} label={`${capitalize(unit.plural)} with HTML`} />
        <Stat value={tags.length} label="Different tags" />
        <Stat value={totalUses} label="Tag uses" />
        <Stat value={missing.length} label="No style yet" tone={missing.length ? 'warn' : 'ok'} />
      </div>

      {missing.length > 0 && (
        <MissingStylesBanner firstTag={missing[0]}>
          {tagList(missing)} {missing.length === 1 ? 'has' : 'have'} no style yet.{' '}
          {options.unknownTagAction === 'keep'
            ? `The tags will stay in the ${unit.singular} as visible text.`
            : 'The tags will be removed and their text left plain.'}
        </MissingStylesBanner>
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
                      <TagName name={tag} />
                    </td>
                    <td className="num">{usage.count.toLocaleString()}</td>
                    <td className="code">{usage.firstCell}</td>
                    <td>
                      {description ? (
                        <span className="style-desc">
                          <Badge tone="ok">
                            {description.builtin ? 'Built in' : description.fallback ? 'Default' : 'Styled'}
                          </Badge>{' '}
                          {description.color && <Swatch color={description.color} />}
                          {description.parts.join(' · ')}
                        </span>
                      ) : (
                        <Badge tone="warn">No style</Badge>
                      )}
                    </td>
                    <td className="preview-cell" title={usage.sample}>
                      <RichText html={usage.sample} options={options} />
                    </td>
                    <td className="actions">
                      {!description?.builtin && (
                        <Button small onClick={() => editTag(tag)}>
                          {description ? 'Edit' : 'Set style'}
                        </Button>
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
