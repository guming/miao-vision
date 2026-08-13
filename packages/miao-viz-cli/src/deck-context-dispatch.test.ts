import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { adaptAnalyzeContext, parseDeckCommandContext } from './deck-context-dispatch'
import type { AnalyzeContext } from './context-schema'

function analyzeContext(): AnalyzeContext {
  return {
    intent: { raw: 'Executive review', coverage: 'full', assumptions: [] },
    fields: [{ name: 'sales', role: 'measure', type: 'number' }],
    evidence: [{ id: 'total', query: 'sum sales', values: { total_sales: 42 } }],
    catalog: {
      charts: ['bigvalue'], blockedCharts: [], recommendedPlan: [],
      deckPatterns: [{ id: 'executive-brief', score: 0.9, density: 'compact', blocks: ['cover-claim'] }]
    },
    sampleWarnings: [{ code: 'small_sample', message: 'Small sample.' }],
    promptRules: ['Use grounded claims.']
  }
}

describe('parseDeckCommandContext', () => {
  it('dispatches DeckContext without rewriting it', () => {
    const input = JSON.parse(readFileSync('test_data/deck-context/hybrid.json', 'utf8'))
    const parsed = parseDeckCommandContext(input)
    expect(parsed.ok).toBe(true)
    if (parsed.ok) {
      expect(parsed.value.kind).toBe('deck')
      expect(parsed.value.deckContext).toEqual(input)
      expect(parsed.value.analyzeContext).toEqual(input.data)
    }
  })

  it('adapts AnalyzeContext without changing evidence, warnings, catalog, or intent', () => {
    const input = analyzeContext()
    const parsed = parseDeckCommandContext(input, { contextPath: '/workspace/context.json', workspaceRoot: '/workspace' })
    expect(parsed.ok).toBe(true)
    if (parsed.ok) {
      expect(parsed.value.kind).toBe('analyze')
      expect(parsed.value.analyzeContext).toEqual(input)
      expect(parsed.value.deckContext.data).toEqual(input)
      expect(parsed.value.deckContext.request.rawIntent).toBe(input.intent.raw)
    }
  })

  it('adapts deterministically for the same context path', () => {
    expect(adaptAnalyzeContext(analyzeContext(), { contextPath: '/a/context.json', workspaceRoot: '/a' })).toEqual(
      adaptAnalyzeContext(analyzeContext(), { contextPath: '/b/context.json', workspaceRoot: '/b' })
    )
  })

  it('returns both schema issues for an invalid value', () => {
    const parsed = parseDeckCommandContext({ intent: 'not-a-context' })
    expect(parsed).toMatchObject({
      ok: false,
      code: 'INVALID_DECK_CONTEXT',
      acceptedShapes: ['DeckContext version 1', 'AnalyzeContext']
    })
    if (!parsed.ok) {
      expect(parsed.deckContextIssue).toBeDefined()
      expect(parsed.analyzeContextIssue).toBeDefined()
    }
  })
})
