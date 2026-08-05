import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildDelivery, deliveryManifestSchema, deckDeliverySummary, reportDeliverySummary } from './artifact-delivery'
import type { AnalyzeContext } from './context-schema'
import type { AgentReportSpec } from './types'

function context(): AnalyzeContext {
  return {
    intent: { raw: 'sales report', coverage: 'full', assumptions: [] }, fields: [], sampleWarnings: [],
    catalog: { charts: ['bigvalue'], blockedCharts: [], recommendedPlan: [] }, promptRules: [],
    evidence: [{ id: 'total', query: 'total', values: { sales: 120 } }]
  }
}

describe('artifact delivery', () => {
  it('normalizes files, limits content, and chooses the requested primary', () => {
    const root = mkdtempSync(join(tmpdir(), 'delivery-'))
    const html = join(root, 'report.html')
    const pdf = join(root, 'report.pdf')
    const preview = join(root, 'report.preview.png')
    for (const path of [html, pdf, preview]) writeFileSync(path, 'x')
    const delivery = buildDelivery({
      kind: 'report', title: 'Report', outputs: [pdf, html, join(root, 'missing.html')],
      primaryPath: html, previewPath: preview, verified: true,
      metrics: Array.from({ length: 5 }, (_, index) => ({
        label: `Metric ${index}`, value: index, evidenceId: 'total', evidencePath: 'values.sales'
      })),
      highlights: Array.from({ length: 4 }, (_, index) => ({ text: `Highlight ${index}`, evidenceIds: ['total'] }))
    })
    expect(delivery.artifacts.primary.path).toBe(html)
    expect(delivery.artifacts.alternatives).toEqual([{ format: 'pdf', path: pdf }])
    expect(delivery.artifacts.preview?.path).toBe(preview)
    expect(delivery.summary.metrics).toHaveLength(3)
    expect(delivery.summary.highlights).toHaveLength(2)
    expect(delivery.actions.length).toBeLessThanOrEqual(3)
    expect(deliveryManifestSchema.parse(delivery)).toEqual(delivery)
  })

  it('maps warnings and share restrictions without conflating verification', () => {
    const root = mkdtempSync(join(tmpdir(), 'delivery-status-'))
    const html = join(root, 'report.html')
    writeFileSync(html, 'x')
    expect(buildDelivery({ kind: 'report', title: 'R', outputs: [html], verified: true }).status).toBe('ready')
    expect(buildDelivery({ kind: 'report', title: 'R', outputs: [html], verified: false }).status).toBe('needs_review')
    const restricted = buildDelivery({
      kind: 'report', title: 'R', outputs: [html], verified: true,
      shareSafe: false, shareStatus: 'restricted'
    })
    expect(restricted.status).toBe('restricted')
    expect(restricted.verification).toMatchObject({ verified: true, shareSafe: false })
  })

  it('extracts only explicitly referenced, verified report evidence', () => {
    const spec: AgentReportSpec = {
      title: 'Report',
      charts: [
        { type: 'bigvalue', title: 'Sales', encoding: { value: { field: 'sales' } }, provenance: { evidence: ['total'], derivedFrom: ['$evidence:total.values.sales'] } },
        { type: 'bigvalue', title: 'Unbound', encoding: { value: { field: 'sales' } } }
      ],
      insights: [
        { text: 'Sales reached 120.', evidence: ['total'], provenance: { evidence: ['total'], derivedFrom: ['$evidence:total.values.sales'], check: 'value_match', claimArgs: { value: '$evidence:total.values.sales', expected: 120 } } },
        'Unstructured claim'
      ]
    }
    expect(reportDeliverySummary(spec, context(), true)).toEqual({
      metrics: [{ label: 'Sales', value: 120, evidenceId: 'total', evidencePath: 'values.sales' }],
      highlights: [{ text: 'Sales reached 120.', evidenceIds: ['total'] }]
    })
    expect(reportDeliverySummary(spec, context(), false)).toEqual({ metrics: [], highlights: [] })
  })

  it('extracts deck content only with verified evidence', () => {
    const summary = deckDeliverySummary({
      title: 'Deck', slides: [{ layout: 'metrics-chart', claim: 'Sales reached 120.', evidence: ['total'],
        metrics: [{ label: 'Sales', provenance: { evidence: ['total'], derivedFrom: ['$evidence:total.values.sales'] } }] }]
    }, context(), true)
    expect(summary.metrics[0]).toMatchObject({ label: 'Sales', value: 120, evidenceId: 'total' })
    expect(summary.highlights).toEqual([{ text: 'Sales reached 120.', evidenceIds: ['total'] }])
  })
})
