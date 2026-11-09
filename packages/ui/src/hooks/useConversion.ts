import { useMemo } from 'react'
import { htmlToRuns, type ConvertOptions, type ConvertResult } from '@hf/core'

/** Converts cell HTML once per change (the same conversion a save uses). */
export function useConversion(html: string, options: ConvertOptions): ConvertResult {
  return useMemo(() => htmlToRuns(html, options), [html, options])
}
