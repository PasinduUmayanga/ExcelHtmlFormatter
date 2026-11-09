import { useMemo } from 'react'
import { getRouteApi, Link, useNavigate } from '@tanstack/react-router'
import { useHelp } from '../hooks/useHelp'
import { searchHelp } from '../features/help/search'
import { FeatureCard } from '../design/molecules'
import { HelpResults } from '../design/organisms'
import { ScreenTemplate } from '../design/templates'

const route = getRouteApi('/help')

/** Help home: search across every topic, and the list of topics. */
export function Help() {
  const { q } = route.useSearch()
  const navigate = useNavigate()
  const { topics, sections } = useHelp()
  const query = q ?? ''
  const results = useMemo(() => (query.trim() ? searchHelp(sections, query) : null), [sections, query])

  return (
    <ScreenTemplate title="Help" intro="Guides and answers for FormaFlow. Search, or pick a topic.">
      <form role="search" className="help-search" onSubmit={(e) => e.preventDefault()}>
        <label htmlFor="help-q">Search help</label>
        <input
          id="help-q"
          type="search"
          value={query}
          placeholder="For example: wrap text, links, missing text"
          autoComplete="off"
          onChange={(e) => navigate({ to: '/help', search: { q: e.target.value || undefined }, replace: true })}
        />
      </form>

      {results && <HelpResults query={query} results={results} />}

      <h2 className="section-title">Topics</h2>
      <div className="cards">
        {topics.map((topic) => (
          <FeatureCard
            key={topic.id}
            title={topic.title}
            description={topic.summary}
            action={
              <Link
                to="/help/$topic"
                params={{ topic: topic.id }}
                search={{ section: undefined }}
                className="btn"
                aria-label={`Open ${topic.title}`}
              >
                Open
              </Link>
            }
          />
        ))}
      </div>
    </ScreenTemplate>
  )
}
