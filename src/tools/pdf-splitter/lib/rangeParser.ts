/**
 * Parses a range string like "1-3, 5, 8-10" into a Set of page numbers.
 * Clamps output to [1, maxPage]. Invalid tokens are silently ignored.
 */
export function parseRange(input: string, maxPage: number): Set<number> {
  const result = new Set<number>()
  const tokens = input.split(',')

  for (const token of tokens) {
    const trimmed = token.trim()
    const rangeMatch = trimmed.match(/^(\d+)\s*-\s*(\d+)$/)
    const singleMatch = trimmed.match(/^(\d+)$/)

    if (rangeMatch) {
      const lo = parseInt(rangeMatch[1], 10)
      const hi = parseInt(rangeMatch[2], 10)
      for (let n = lo; n <= hi; n++) {
        if (n >= 1 && n <= maxPage) result.add(n)
      }
    } else if (singleMatch) {
      const n = parseInt(singleMatch[1], 10)
      if (n >= 1 && n <= maxPage) result.add(n)
    }
  }

  return result
}

/**
 * Serializes a Set<number> back to range notation.
 * e.g. Set{1,2,3,5} → "1-3, 5"
 */
export function serializeRange(pages: Set<number>): string {
  const sorted = [...pages].sort((a, b) => a - b)
  if (sorted.length === 0) return ''

  const groups: [number, number][] = []
  let start = sorted[0], end = sorted[0]

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === end + 1) {
      end = sorted[i]
    } else {
      groups.push([start, end])
      start = end = sorted[i]
    }
  }
  groups.push([start, end])

  return groups.map(([s, e]) => s === e ? `${s}` : `${s}-${e}`).join(', ')
}
