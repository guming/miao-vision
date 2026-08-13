import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { analyzeDeckDocument } from './deck-content-analyzer'
import { deckContextSchema } from './deck-context-schema'
import { instantiateNarrativeDeck } from './deck-narrative-instantiator'
import { collectDeckNarrativeIssues } from './deck-narrative-validator'
import { parseDeckSpec } from './deck-validator'

const analyzed = analyzeDeckDocument('test_data/deck-context/project-update.md', { intent: 'Project update and decision', workspaceRoot: process.cwd() })
if (!analyzed.ok) throw new Error(analyzed.message)
const analyzedContext = analyzed.value

function proposalContext() {
  const context = structuredClone(analyzedContext)
  context.request.rawIntent = 'Compare approaches and choose one'
  return deckContextSchema.parse(context)
}

describe('instantiateNarrativeDeck', () => {
  it.each(['topic-explainer', 'project-update', 'proposal'] as const)('deterministically instantiates and validates %s', pattern => {
    const context = pattern === 'proposal' ? proposalContext() : analyzedContext
    const first = instantiateNarrativeDeck(pattern, context)
    const second = instantiateNarrativeDeck(pattern, context)
    expect(first).toEqual(second)
    expect(first.ok).toBe(true)
    if (first.ok) {
      expect(parseDeckSpec(first.value).ok).toBe(true)
      expect(collectDeckNarrativeIssues(first.value, context)).toEqual([])
    }
  })

  it('uses only source ids and numeric text present in the context', () => {
    const generated = instantiateNarrativeDeck('project-update', analyzedContext)
    expect(generated.ok).toBe(true)
    if (generated.ok) {
      const knownSources = new Set(analyzedContext.sources.map(source => source.id))
      expect(generated.value.slides.flatMap(slide => slide.sourceRefs ?? []).every(ref => knownSources.has(ref.sourceId))).toBe(true)
      expect(JSON.stringify(generated.value).match(/\d+(?:\.\d+)?%?/g)).toEqual(expect.arrayContaining(['42%']))
    }
  })

  it('returns unsupported instead of an empty shell when required content is absent', () => {
    const context = deckContextSchema.parse(JSON.parse(readFileSync('test_data/deck-context/narrative.json', 'utf8')))
    expect(instantiateNarrativeDeck('project-update', context)).toMatchObject({ ok: false, code: 'DECK_PATTERN_UNSUPPORTED', reasonCode: 'MISSING_DECISION_CONTENT' })
    expect(instantiateNarrativeDeck('proposal', context)).toMatchObject({ ok: false, code: 'DECK_PATTERN_UNSUPPORTED', reasonCode: 'MISSING_COMPARISON_CONTENT' })
  })
})
