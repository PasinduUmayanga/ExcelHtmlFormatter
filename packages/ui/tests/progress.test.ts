import { describe, expect, it } from 'vitest'
import { describeProgress } from '../src/components/JobProgress'

describe('describeProgress', () => {
  it('describes progress in plain language, using the format’s words', () => {
    expect(describeProgress({ stage: 'reading' })).toBe('Reading the file…')
    expect(describeProgress({ stage: 'scanning', done: 1, total: 5, unit: 'sheets', detail: 'Team' })).toBe(
      'Looking for HTML tags: 1 of 5 sheets (Team)'
    )
    expect(describeProgress({ stage: 'converting', done: 12000, total: 15001, unit: 'rows', detail: 'Products' }, 'cells')).toBe(
      `Formatting cells: ${(12000).toLocaleString()} of ${(15001).toLocaleString()} rows (Products)`
    )
    expect(describeProgress({ stage: 'converting' })).toBe('Formatting items:')
    expect(describeProgress({ stage: 'saving' })).toBe('Saving the new file…')
  })
})
