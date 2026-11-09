export type DiffOp = 'same' | 'removed' | 'added'

export interface DiffPart {
  op: DiffOp
  items: string[]
}

/**
 * Myers' O((N+M)·D) diff of two word lists. Returns null when more than `maxEdits` edits would be
 * needed, so callers can fall back to a cheaper comparison instead of spending time and memory.
 */
export function diffWords(a: readonly string[], b: readonly string[], maxEdits = 2000): DiffPart[] | null {
  // Common prefix and suffix cost nothing and are by far the usual case (identical text).
  let start = 0
  while (start < a.length && start < b.length && a[start] === b[start]) start++
  let endA = a.length
  let endB = b.length
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA--
    endB--
  }
  const middle = myers(a.slice(start, endA), b.slice(start, endB), maxEdits)
  if (!middle) return null
  const parts: DiffPart[] = []
  const push = (op: DiffOp, item: string) => {
    const last = parts[parts.length - 1]
    if (last?.op === op) last.items.push(item)
    else parts.push({ op, items: [item] })
  }
  for (const item of a.slice(0, start)) push('same', item)
  for (const [op, item] of middle) push(op, item)
  for (const item of a.slice(endA)) push('same', item)
  return parts
}

function myers(a: readonly string[], b: readonly string[], maxEdits: number): Array<[DiffOp, string]> | null {
  const n = a.length
  const m = b.length
  const max = n + m
  const offset = max + 1
  const v = new Int32Array(2 * max + 3)
  // trace[d] holds v (diagonals -d-1 … d+1) as it was before step d, for walking back.
  const trace: Int32Array[] = []
  for (let d = 0; d <= Math.min(max, maxEdits); d++) {
    trace.push(v.slice(offset - d - 1, offset + d + 2))
    for (let k = -d; k <= d; k += 2) {
      let x = k === -d || (k !== d && v[offset + k - 1] < v[offset + k + 1]) ? v[offset + k + 1] : v[offset + k - 1] + 1
      let y = x - k
      while (x < n && y < m && a[x] === b[y]) {
        x++
        y++
      }
      v[offset + k] = x
      if (x >= n && y >= m) return backtrack(a, b, trace)
    }
  }
  return null
}

function backtrack(a: readonly string[], b: readonly string[], trace: Int32Array[]): Array<[DiffOp, string]> {
  const ops: Array<[DiffOp, string]> = []
  let x = a.length
  let y = b.length
  for (let d = trace.length - 1; d >= 0; d--) {
    const before = trace[d]
    const at = (k: number) => before[k + d + 1]
    const k = x - y
    const prevK = k === -d || (k !== d && at(k - 1) < at(k + 1)) ? k + 1 : k - 1
    const prevX = at(prevK)
    const prevY = prevX - prevK
    while (x > prevX && y > prevY) {
      x--
      y--
      ops.push(['same', a[x]])
    }
    if (d > 0) {
      if (x === prevX) ops.push(['added', b[--y]])
      else ops.push(['removed', a[--x]])
    }
  }
  return ops.reverse()
}
