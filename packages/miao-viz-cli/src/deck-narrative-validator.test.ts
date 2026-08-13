import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { deckContextSchema } from './deck-context-schema'
import { collectDeckNarrativeIssues } from './deck-narrative-validator'
import type { DeckSpec } from './deck-types'

const context = deckContextSchema.parse(JSON.parse(readFileSync('test_data/deck-context/narrative.json', 'utf8')))
const sourceId = context.sources[0].id
const sectionId = context.narrative!.sections[0].id
const pointId = context.narrative!.keyPoints[0].id

function validSpec(): DeckSpec {
  return {
    pattern: 'topic-explainer',
    slides: [
      { layout: 'cover', slideRole: 'narrative-cover', title: 'Project' },
      { layout: 'text-points', slideRole: 'section-summary', purpose: 'Summarize progress.', title: 'Progress', claimStatus: 'source-text', sourceRefs: [{ sourceId, sectionId, paragraphIds: [pointId], kind: 'source-text' }] }
    ]
  }
}

describe('collectDeckNarrativeIssues', () => {
  it('accepts a sourced narrative spec', () => {
    expect(collectDeckNarrativeIssues(validSpec(), context)).toEqual([])
  })

  it('reports a precise path for missing source references', () => {
    const spec = validSpec()
    spec.slides[1].sourceRefs![0].sectionId = 'src:8f41c2d0:sec:9'
    expect(collectDeckNarrativeIssues(spec, context)[0]).toMatchObject({ code: 'DECK_SECTION_REF_NOT_FOUND', path: 'slides[1].sourceRefs[0].sectionId' })
  })

  it('blocks data content without data', () => {
    const spec = validSpec()
    spec.slides.push({ layout: 'title-only', slideRole: 'kpi-snapshot' })
    expect(collectDeckNarrativeIssues(spec, context).map(issue => issue.code)).toContain('DECK_DATA_BLOCK_WITHOUT_DATA')
  })

  it('requires pattern roles and enforces content budgets', () => {
    const spec = validSpec()
    spec.slides = [{ layout: 'title-only', title: 'x'.repeat(101) }]
    expect(collectDeckNarrativeIssues(spec, context).map(issue => issue.code)).toEqual(expect.arrayContaining(['DECK_REQUIRED_ROLE_MISSING', 'DECK_CONTENT_BUDGET_EXCEEDED']))
  })

  it('rejects unsourced narrative body slides', () => {
    const spec = validSpec()
    spec.slides[1] = { layout: 'text-points', slideRole: 'section-summary', title: 'Invented', bullets: ['Invented claim'] }
    expect(collectDeckNarrativeIssues(spec, context).map(issue => issue.code)).toEqual(expect.arrayContaining([
      'DECK_NARRATIVE_PURPOSE_REQUIRED', 'DECK_CLAIM_STATUS_REQUIRED', 'DECK_SOURCE_REFS_REQUIRED'
    ]))
  })

  it('rejects false source-text attribution', () => {
    const spec = validSpec()
    spec.slides[1].bullets = ['Revenue doubled.']
    expect(collectDeckNarrativeIssues(spec, context).map(issue => issue.code)).toContain('DECK_SOURCE_TEXT_MISMATCH')
  })
})
