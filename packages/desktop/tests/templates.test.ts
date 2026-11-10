import { describe, expect, it } from 'vitest'
import { MAX_TEMPLATES, deleteTemplate, parseTemplate, parseTemplates, saveTemplate } from '../src/main/templates'

const t = (name: string) => ({
  name,
  fileType: 'excel',
  action: 'format-html',
  profile: 'Default',
  sheets: 'html' as const
})

describe('templates (main process, ADR 0018)', () => {
  it('keeps only well-formed templates', () => {
    expect(parseTemplate(t(' Weekly '))).toEqual(t('Weekly'))
    expect(parseTemplate({ ...t('x'), sheets: 'some' })).toBeNull()
    expect(parseTemplate({ ...t(''), name: '' })).toBeNull()
    expect(parseTemplate({ ...t('x'), profile: 'a'.repeat(61) })).toBeNull()
    expect(parseTemplate('nope')).toBeNull()
    expect(parseTemplates({ templates: [t('A'), t('a'), { bad: 1 }, t('B')] }).map((x) => x.name)).toEqual(['A', 'B'])
    expect(parseTemplates(null)).toEqual([])
  })

  it('adds or replaces by name, sorted, and deletes', () => {
    let list = saveTemplate([], t('Weekly'))
    list = saveTemplate(list, t('Audit'))
    list = saveTemplate(list, { ...t('weekly'), sheets: 'all' })
    expect(list.map((x) => [x.name, x.sheets])).toEqual([
      ['Audit', 'html'],
      ['weekly', 'all']
    ])
    expect(() => saveTemplate(list, { name: '' })).toThrow('Give the template a name')
    expect(deleteTemplate(list, 'AUDIT').map((x) => x.name)).toEqual(['weekly'])
    let full: ReturnType<typeof saveTemplate> = []
    for (let i = 0; i < MAX_TEMPLATES; i++) full = saveTemplate(full, t(`T${i}`))
    expect(() => saveTemplate(full, t('One more'))).toThrow(`up to ${MAX_TEMPLATES}`)
  })
})
