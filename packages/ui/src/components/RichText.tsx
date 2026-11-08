import { Fragment, useMemo } from 'react'
import { htmlToRuns, type ConvertOptions } from '@hf/core'
import { styleToCss } from './styleToCss'

/** Shows cell HTML the way it will look in Excel after conversion. */
export function RichText({ html, options }: { html: string; options: ConvertOptions }) {
  const runs = useMemo(() => htmlToRuns(html, options).runs, [html, options])
  return (
    <span className="xl">
      {runs.map((run, i) => (
        <span key={i} style={styleToCss(run.style)}>
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
