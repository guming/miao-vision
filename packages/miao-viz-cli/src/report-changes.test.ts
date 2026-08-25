import { describe, expect, it } from 'vitest'
import { compareEvidence } from './report-changes'
import type { AnalyzeEvidence } from './context-schema'

const recipe = { select: ['region'], measures: [{ op: 'sum' as const, field: 'sales', as: 'total' }], groupBy: ['region'] }
const ranked = (rows: Array<{ region: string; total: number }>, changed = false): AnalyzeEvidence => ({
  id: 'by_region', query: 'sales by region', rows,
  recipe: changed ? { ...recipe, limit: 2 } : recipe
})

describe('recurring report rank changes', () => {
  it('distinguishes movement, entry, and departure deterministically', () => {
    const before = ranked([{ region: 'A', total: 30 }, { region: 'B', total: 20 }, { region: 'C', total: 10 }])
    const after = ranked([{ region: 'B', total: 40 }, { region: 'A', total: 30 }, { region: 'D', total: 20 }])
    expect(compareEvidence([before], [after], 'p1').rankings).toEqual([
      { evidenceId: 'by_region', item: 'A', kind: 'movement', previousRank: 1, currentRank: 2, movement: -1 },
      { evidenceId: 'by_region', item: 'B', kind: 'movement', previousRank: 2, currentRank: 1, movement: 1 },
      { evidenceId: 'by_region', item: 'C', kind: 'departed', previousRank: 3, currentRank: null, movement: null },
      { evidenceId: 'by_region', item: 'D', kind: 'entered', previousRank: null, currentRank: 3, movement: null }
    ])
  })

  it('produces no rank changes for identical evidence', () => {
    const evidence = ranked([{ region: 'A', total: 30 }, { region: 'B', total: 20 }])
    expect(compareEvidence([evidence], [evidence], 'p1').rankings).toEqual([])
  })

  it('keeps changed recipes non-comparable', () => {
    const before = ranked([{ region: 'A', total: 30 }])
    const changes = compareEvidence([before], [ranked([{ region: 'A', total: 30 }], true)], 'p1')
    expect(changes.rankings).toEqual([])
    expect(changes.notComparable).toEqual([{ evidenceId: 'by_region', reason: 'evidence recipe changed' }])
  })
})
