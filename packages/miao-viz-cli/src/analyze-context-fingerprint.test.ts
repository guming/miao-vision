import { describe, expect, it } from 'vitest'
import { analyzeDataset } from './analyzer'
import { fingerprintAnalyzeContext } from './analyze-context-fingerprint'
import { toCompactAnalyzeContext } from './context-schema'

function context() {
  return analyzeDataset({
    file: '/private/input/sales.csv',
    columns: ['month', 'region', 'sales'],
    rows: [
      { month: '2026-01-01', region: 'East', sales: 10 },
      { month: '2026-02-01', region: 'West', sales: 20 },
      { month: '2026-03-01', region: 'East', sales: 30 }
    ]
  }, { intent: 'Review sales performance' })
}

describe('fingerprintAnalyzeContext', () => {
  it('produces the same hash for full and compact context', () => {
    const full = context()
    expect(fingerprintAnalyzeContext(full)).toBe(fingerprintAnalyzeContext(toCompactAnalyzeContext(full)))
  })

  it('is stable for identical context', () => {
    const value = context()
    expect(fingerprintAnalyzeContext(value)).toBe(fingerprintAnalyzeContext(structuredClone(value)))
  })

  it('ignores evidence values, rows, intent wording, and descriptive text', () => {
    const original = context()
    const changed = structuredClone(original)
    changed.intent.raw = 'Different wording and /different/path.csv'
    for (const evidence of changed.evidence) {
      if (evidence.values) evidence.values = { changed: 999 }
      if (evidence.rows) evidence.rows = [...evidence.rows].reverse().map(row => ({ ...row, changed: 999 }))
      evidence.query = 'Different description'
    }
    if (changed.catalog.scenes?.[0]) changed.catalog.scenes[0].description = 'Different description'
    if (changed.sampleWarnings[0]) changed.sampleWarnings[0].message = 'Different warning wording'
    expect(fingerprintAnalyzeContext(changed)).toBe(fingerprintAnalyzeContext(original))
  })

  it('changes when field planning semantics change', () => {
    const original = context()
    const changed = structuredClone(original)
    changed.fields[0].role = changed.fields[0].role === 'time' ? 'dimension' : 'time'
    expect(fingerprintAnalyzeContext(changed)).not.toBe(fingerprintAnalyzeContext(original))
  })

  it('changes when an evidence recipe changes', () => {
    const original = context()
    const changed = structuredClone(original)
    const evidence = changed.evidence.find(item => item.recipe)
    expect(evidence).toBeDefined()
    evidence!.recipe = { ...evidence!.recipe!, limit: 7 }
    expect(fingerprintAnalyzeContext(changed)).not.toBe(fingerprintAnalyzeContext(original))
  })

  it('changes when allowed or blocked catalog entries change', () => {
    const original = context()
    const changedAllowed = structuredClone(original)
    changedAllowed.catalog.scenes = [...(changedAllowed.catalog.scenes ?? []), {
      id: 'new-scene', name: 'New', description: '', score: 0.8, keywords: [],
      requiredRoles: [], metricSemantics: [], templates: [], blocks: []
    }]
    expect(fingerprintAnalyzeContext(changedAllowed)).not.toBe(fingerprintAnalyzeContext(original))

    const changedBlocked = structuredClone(original)
    changedBlocked.catalog.blockedTemplates = [
      ...(changedBlocked.catalog.blockedTemplates ?? []), { id: 'blocked-new', reason: 'description' }
    ]
    expect(fingerprintAnalyzeContext(changedBlocked)).not.toBe(fingerprintAnalyzeContext(original))
  })

  it('changes when blocking clarification identity changes', () => {
    const original = context()
    original.clarificationQuestions = [{
      id: 'primary_measure', question: 'Which measure?', options: ['sales', 'orders'],
      blocking: true, appliesTo: 'measure'
    }]
    const changed = structuredClone(original)
    changed.clarificationQuestions![0].id = 'primary_dimension'
    expect(fingerprintAnalyzeContext(changed)).not.toBe(fingerprintAnalyzeContext(original))
  })
})
