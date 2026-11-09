import { useMemo } from 'react'
import {
  contentDiff,
  describeCheckItem,
  diffWords,
  htmlToRuns,
  words,
  type CheckItem,
  type ConvertOptions,
  type DiffPart
} from '@hf/core'
import { RichText } from '../molecules'
import { clip } from '../../utils/clip'

/** One item side by side: the raw HTML, the original text (missing words in red) and the result. */
export function CheckDetail({ item, options }: { item: CheckItem; options: ConvertOptions }) {
  const result = useMemo(() => htmlToRuns(item.source, options), [item.source, options])
  const isAfterSave = item.kind === 'saved' || item.kind === 'untouched'
  const parts = useMemo(
    () =>
      isAfterSave
        ? diffWords(words(item.converted), words(item.saved ?? ''))
        : contentDiff(item.source, result, options),
    [isAfterSave, item, result, options]
  )

  return (
    <div className="check-detail" aria-label={`Details of ${item.location}`}>
      <div className="check-desc-full">
        <b>{item.location || 'File'}</b> · {describeCheckItem(item)}
      </div>
      {item.kind !== 'untouched' && (
        <section>
          <h3>Original HTML</h3>
          <pre className="code check-text">{clip(item.source)}</pre>
        </section>
      )}
      {isAfterSave ? (
        <>
          <section>
            <h3>{item.kind === 'untouched' ? 'Original value' : 'Converted text'}</h3>
            <DiffText parts={parts} side="before" fallback={item.converted} />
          </section>
          <section>
            <h3>In the saved file</h3>
            <DiffText parts={parts} side="after" fallback={item.saved ?? ''} />
          </section>
        </>
      ) : (
        <>
          <section>
            <h3>Original text</h3>
            <DiffText parts={parts} side="before" fallback={item.converted} />
          </section>
          <section>
            <h3>Converted</h3>
            <div className="check-text">
              <RichText html={item.source} options={options} result={result} />
            </div>
            <p className="faint legend">
              <span className="layout-sample">Green</span>: bullets, numbers and separators added for layout.{' '}
              <del>Red</del>: text missing from the result. <ins>Underlined</ins>: text not in the original.
            </p>
            {(item.proof?.added.length ?? 0) > 0 && (
              <p>
                Not in the original:{' '}
                {item.proof!.added.map((g, i) => (
                  <ins key={i}>{g.text} </ins>
                ))}
              </p>
            )}
          </section>
        </>
      )}
    </div>
  )
}

/** Words of one side of a diff, with the other side's differences marked (as text, never as HTML). */
function DiffText({ parts, side, fallback }: { parts: DiffPart[] | null; side: 'before' | 'after'; fallback: string }) {
  if (!parts) return <div className="check-text">{fallback}</div>
  return (
    <div className="check-text">
      {parts.map((part, i) => {
        const text = part.items.join(' ') + ' '
        if (part.op === 'same') return <span key={i}>{text}</span>
        if (part.op === 'removed') return side === 'before' ? <del key={i}>{text}</del> : null
        return side === 'after' ? <ins key={i}>{text}</ins> : null
      })}
    </div>
  )
}
