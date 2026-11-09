import { Link } from '@tanstack/react-router'
import { highlight, searchWords, type HelpResult } from '../../help/search'

/** Search results on Help home: where each match is, and the words found, highlighted as text. */
export function HelpResults({ query, results }: { query: string; results: readonly HelpResult[] }) {
  const words = searchWords(query)
  return (
    <section className="help-results" aria-labelledby="help-results-title">
      <h2 id="help-results-title" className="section-title">
        Results
      </h2>
      {/* Announced as it changes, so screen-reader users hear how many results there are. */}
      <p role="status" className="muted">
        {results.length === 0
          ? `No results for “${query.trim()}”. Try other words, or browse the topics below.`
          : `${results.length} ${results.length === 1 ? 'result' : 'results'} for “${query.trim()}”`}
      </p>
      {results.length > 0 && (
        <ul className="help-result-list">
          {results.map(({ section, excerpt }) => (
            <li key={`${section.topic.id}#${section.anchor ?? ''}`}>
              <Link
                to="/help/$topic"
                params={{ topic: section.topic.id }}
                search={{ section: section.anchor ?? undefined }}
                className="help-result-title"
              >
                {section.topic.title}
                {section.heading && ` › ${section.heading}`}
              </Link>
              <p className="help-excerpt">
                {highlight(excerpt, words).map((part, i) =>
                  part.match ? <mark key={i}>{part.text}</mark> : part.text
                )}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
