import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { analyzeDataset } from './analyzer'
import { buildDeckCatalog, buildNarrativeDeckCatalog, instantiateDeck } from './deck-knowledge-registry'
import { toCompactAnalyzeContext, parseAnalyzeContext } from './context-schema'
import { deckContextSchema } from './deck-context-schema'

const dataset = {
  file: 'sales.csv', columns: ['month', 'region', 'sales'], rows: [
    { month: '2026-01-01', region: 'East', sales: 80 },
    { month: '2026-02-01', region: 'West', sales: 100 },
    { month: '2026-03-01', region: 'East', sales: 120 }
  ]
}

describe('deck knowledge registry', () => {
  it('keeps full and compact deck candidates equivalent', () => {
    const context = analyzeDataset(dataset, { intent: 'executive sales review' })
    const restored = parseAnalyzeContext(toCompactAnalyzeContext(context))!
    expect(restored.catalog.deckPatterns).toEqual(context.catalog.deckPatterns)
    expect(restored.catalog.slideBlocks).toEqual(context.catalog.slideBlocks)
    expect(restored.catalog.blockedSlideBlocks).toEqual(context.catalog.blockedSlideBlocks)
  })

  it('instantiates both supported intents without blocked slides', () => {
    const context = analyzeDataset(dataset, { intent: 'sales review' })
    for (const intent of ['executive-brief', 'business-review'] as const) {
      const spec = instantiateDeck(intent, context)
      expect(spec.intent).toBe(intent)
      expect(spec.slides.length).toBeGreaterThan(1)
      expect(spec.slides.filter(slide => slide.slideRole === 'trend-overview-slide')).toHaveLength(1)
    }
  })

  it('blocks trend slides with only two periods', () => {
    const context = analyzeDataset({ ...dataset, rows: dataset.rows.slice(0, 2) }, { intent: 'review' })
    expect(context.catalog.blockedSlideBlocks?.find(item => item.id === 'trend-overview-slide')).toBeTruthy()
    expect(instantiateDeck('executive-brief', context).slides.some(slide => slide.slideRole === 'trend-overview-slide')).toBe(false)
  })

  it('recommends narrative blocks without data-only blocks', () => {
    const context = deckContextSchema.parse(JSON.parse(readFileSync('test_data/deck-context/narrative.json', 'utf8')))
    const catalog = buildNarrativeDeckCatalog(context)
    expect(catalog.slideBlocks.map(block => block.id)).toContain('section-summary')
    expect(catalog.slideBlocks.map(block => block.id)).not.toContain('kpi-snapshot')
  })

  it('blocks unavailable quote and decision content', () => {
    const context = deckContextSchema.parse(JSON.parse(readFileSync('test_data/deck-context/narrative.json', 'utf8')))
    const catalog = buildNarrativeDeckCatalog(context)
    expect(catalog.blockedSlideBlocks.map(block => block.id)).toEqual(expect.arrayContaining(['quote-focus', 'decision-request']))
  })

  it('offers narrative and data knowledge for hybrid contexts', () => {
    const context = deckContextSchema.parse(JSON.parse(readFileSync('test_data/deck-context/hybrid.json', 'utf8')))
    const narrative = buildNarrativeDeckCatalog(context)
    const data = buildDeckCatalog(context.data!)
    expect(narrative.slideBlocks.map(block => block.id)).toContain('section-summary')
    expect(data.deckPatterns?.map(pattern => pattern.id)).toEqual(['executive-brief', 'business-review'])
  })
})
