import type { ConvertResult } from '@hf/core'

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
