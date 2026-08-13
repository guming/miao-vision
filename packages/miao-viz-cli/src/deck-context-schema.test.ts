import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { deckContentId, deckContextSchema, deckSourceId, parseDeckContext } from './deck-context-schema'

function narrativeContext() {
  const sourceId = 'src:8f41c2d0'
  const sectionId = `${sourceId}:sec:1`
  const pointId = `${sourceId}:p:1`
  return {
    version: 1,
    request: { rawIntent: 'Explain the project', durationMinutes: 10, desiredLength: 'short' },
    sources: [{ id: sourceId, kind: 'markdown', path: 'notes/project.md', title: 'Project' }],
    narrative: {
      title: 'Project',
      sections: [{ id: sectionId, sourceId, heading: 'Progress', level: 2, paragraphIds: [pointId], listItemIds: [] }],
      keyPoints: [{ id: pointId, sourceId, sectionId, kind: 'paragraph', text: 'Adoption reached 42%.' }],
      quotes: [],
      explicitClaims: [{ id: `${sourceId}:claim:1`, sourceId, sectionId, pointId, text: 'Adoption reached 42%.', status: 'author-claim', signals: ['numeric'] }],
      images: []
    },
    planning: { recommendedPatterns: [{ id: 'topic-explainer', score: 0.9, reasons: ['Structured explanatory content.'] }], blockedPatterns: [] }
  } as const
}

describe('deckContextSchema', () => {
  it.each(['narrative', 'data', 'hybrid'])('accepts the %s fixture', name => {
    const fixture = JSON.parse(readFileSync(`test_data/deck-context/${name}.json`, 'utf8'))
    expect(deckContextSchema.safeParse(fixture).success).toBe(true)
  })

  it('accepts and round-trips a narrative context', () => {
    const input = narrativeContext()
    expect(deckContextSchema.parse(input)).toEqual(input)
    expect(parseDeckContext(input)).toEqual(input)
  })

  it('accepts a data context with embedded AnalyzeContext', () => {
    const input = narrativeContext()
    const context = {
      version: 1,
      request: { rawIntent: 'Review sales' },
      sources: [{ id: 'src:1234abcd', kind: 'data', path: 'sales.csv' }],
      data: { intent: { raw: 'Review sales', coverage: 'full', assumptions: [] }, fields: [], evidence: [], catalog: { charts: [], blockedCharts: [], recommendedPlan: [] }, sampleWarnings: [], promptRules: [] },
      planning: input.planning
    }
    expect(deckContextSchema.safeParse(context).success).toBe(true)
  })

  it('rejects invalid duration and duplicate source ids with precise paths', () => {
    const input = structuredClone(narrativeContext()) as Record<string, any>
    input.request.durationMinutes = 0
    input.sources.push({ ...input.sources[0] })
    const parsed = deckContextSchema.safeParse(input)
    expect(parsed.success).toBe(false)
    if (!parsed.success) {
      expect(parsed.error.issues.map(issue => issue.path.join('.'))).toEqual(expect.arrayContaining(['request.durationMinutes', 'sources.1.id']))
    }
  })

  it.each(['version', 'request', 'sources', 'planning'])('rejects a missing %s contract field', field => {
    const input = structuredClone(narrativeContext()) as Record<string, unknown>
    delete input[field]
    const parsed = deckContextSchema.safeParse(input)
    expect(parsed.success).toBe(false)
    if (!parsed.success) expect(parsed.error.issues[0].path[0]).toBe(field)
  })

  it('rejects missing content and source references', () => {
    const input = structuredClone(narrativeContext()) as Record<string, any>
    input.narrative.sections[0].paragraphIds = ['src:8f41c2d0:p:9']
    input.narrative.keyPoints[0].sourceId = 'src:aaaaaaaa'
    const parsed = deckContextSchema.safeParse(input)
    expect(parsed.success).toBe(false)
    if (!parsed.success) {
      expect(parsed.error.issues.map(issue => issue.path.join('.'))).toEqual(expect.arrayContaining([
        'narrative.sections.0.paragraphIds.0', 'narrative.keyPoints.0.sourceId'
      ]))
    }
  })
})

describe('deck source ids', () => {
  it('uses a stable normalized relative path across workspace roots', () => {
    expect(deckSourceId('/workspace-a/notes/project.md', '/workspace-a')).toBe(
      deckSourceId('/workspace-b/notes/project.md', '/workspace-b')
    )
  })

  it('builds deterministic typed node ids', () => {
    const sourceId = deckSourceId('/workspace/notes/project.md', '/workspace')
    expect(deckContentId(sourceId, 'sec', 1)).toBe(`${sourceId}:sec:1`)
    expect(() => deckContentId(sourceId, 'p', 0)).toThrow('positive integer')
  })
})
