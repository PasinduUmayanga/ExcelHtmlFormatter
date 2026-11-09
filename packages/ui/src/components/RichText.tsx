import { Fragment, useMemo } from 'react'
import { htmlToRuns, type ConvertOptions, type ConvertResult } from '@hf/core'
import { styleToCss } from './styleToCss'

/** Converts cell HTML once per change (the same conversion a save uses). */
export function useConversion(html: string, options: ConvertOptions): ConvertResult {
  return useMemo(() => htmlToRuns(html, options), [html, options])
}

/** Tooltip for a linked run: where it goes, or why it won't be a link. */
export function linkTitle(result: ConvertResult, index: number | undefined): string | undefined {
  if (index === undefined) return undefined
  const link = result.links[index]
  if (!link) return undefined
  if (link.check.ok && link.check.href === result.cellLink && result.links.findIndex((l) => l.check.ok) === index) {
    return `Link: ${link.check.href}`
  }
  if (link.check.ok) return `Not linked (a cell can have only one link): ${link.href}`
  const why = { unsafe: 'unsafe address', invalid: 'not a valid address', 'too-long': 'address too long' }[
    link.check.problem
  ]
  return `Not linked (${why}): ${link.href}`
}

/**
 * Shows cell HTML the way it will look after conversion. Text is rendered as text, never as HTML.
 * Pass `result` when the caller already converted the HTML (see useConversion).
 */
export function RichText({ html, options, result }: { html: string; options: ConvertOptions; result?: ConvertResult }) {
  const converted = useMemo(() => result ?? htmlToRuns(html, options), [result, html, options])
  return (
    <span className="xl">
      {converted.runs.map((run, i) => (
        <span
          key={i}
          style={styleToCss(run.style)}
          className={run.layout ? 'layout' : undefined}
          title={linkTitle(converted, run.link)}
        >
          {run.text.split('\n').map((line, j) => (
            <Fragment key={j}>
              {j > 0 && <br />}
              {line}
            </Fragment>
          ))}
        </span>
      ))}
    </span>
  )
}
