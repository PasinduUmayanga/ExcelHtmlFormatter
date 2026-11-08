import { describe, expect, it } from 'vitest'
import { capitalize, count } from '../src/format'
import { throttle } from '../src/adapter'
import type { JobProgress } from '../src/types'

describe('format helpers', () => {
  it('capitalizes and counts with the right word', () => {
    expect(capitalize('sheets')).toBe('Sheets')
    expect(capitalize('')).toBe('')
    const words = { singular: 'sheet', plural: 'sheets' }
    expect(count(1, words)).toBe('1 sheet')
    expect(count(3, words)).toBe('3 sheets')
    expect(count(0, words)).toBe('0 sheets')
  })
})

describe('throttle', () => {
  it('passes the first update, then only forced ones within the interval', () => {
    const seen: number[] = []
    const report = throttle((p: JobProgress) => seen.push(p.done!), 10_000)
    for (let i = 1; i <= 100; i++) report({ stage: 'converting', done: i, total: 100 })
    report({ stage: 'converting', done: 100, total: 100 }, true)
    expect(seen).toEqual([1, 100])
  })

  it('does nothing without a listener', () => {
    expect(() => throttle()({ stage: 'reading' })).not.toThrow()
  })
})
