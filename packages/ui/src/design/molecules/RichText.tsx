import { Fragment, useMemo } from 'react'
import { htmlToRuns, type ConvertOptions, type ConvertResult } from '@hf/core'
import { styleToCss } from '../../utils/styleToCss'
import { linkTitle } from '../../utils/linkTitle'

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
