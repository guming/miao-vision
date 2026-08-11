import { describe, expect, it } from 'vitest'
import * as YAML from 'yaml'
import { fingerprintArtifactSpec } from './artifact-spec-fingerprint'
import type { DeckSpec } from './deck-types'
import type { AgentReportSpec } from './types'

const report: AgentReportSpec = {
  specVersion: 1,
  layout: { preset: 'executive', maxColumns: 12 },
  title: 'Sales report',
  description: 'Non-structural author note',
  theme: 'standard-white',
  charts: [{
    id: 'sales-trend', type: 'line', title: 'Sales trend',
    data: { source: 'sales', transform: [{ type: 'sort', field: 'month', order: 'asc' }] },
    encoding: { x: { field: 'month', type: 'temporal' }, y: { field: 'sales', type: 'quantitative' } },
    provenance: { derivedFrom: ['$evidence:sales_trend.rows'] }
  }]
}

const deck: DeckSpec = {
  title: 'Executive review', theme: 'standard-white', intent: 'executive-brief',
  slides: [{
    layout: 'text-chart', slideRole: 'trend', title: 'Sales trend',
    evidence: ['sales_trend'], charts: [report.charts[0]]
  }]
}

describe('fingerprintArtifactSpec', () => {
  it('is stable across object key order and equivalent JSON/YAML', () => {
    const yamlValue = YAML.parse(YAML.stringify(report)) as AgentReportSpec
    const reordered: AgentReportSpec = {
      charts: report.charts, theme: report.theme, title: report.title,
      layout: report.layout, specVersion: 1
    }
    expect(fingerprintArtifactSpec('report', yamlValue)).toBe(fingerprintArtifactSpec('report', reordered))
  })

  it('excludes descriptions and file paths', () => {
    const changed = { ...report, description: 'Changed note', file: '/private/data.csv' } as AgentReportSpec
    expect(fingerprintArtifactSpec('report', changed)).toBe(fingerprintArtifactSpec('report', report))
  })

  it.each([
    ['chart type', { ...report, charts: [{ ...report.charts[0], type: 'bar' as const }] }],
    ['field encoding', { ...report, charts: [{ ...report.charts[0], encoding: { ...report.charts[0].encoding, y: { field: 'profit' } } }] }],
    ['evidence reference', { ...report, charts: [{ ...report.charts[0], provenance: { derivedFrom: ['$evidence:profit.rows'] } }] }],
    ['layout', { ...report, layout: { preset: 'analytical' as const } }],
    ['theme', { ...report, theme: 'minimal' as const }]
  ])('changes when %s changes', (_label, changed) => {
    expect(fingerprintArtifactSpec('report', changed)).not.toBe(fingerprintArtifactSpec('report', report))
  })

  it('fingerprints Deck structure and distinguishes Spec kinds', () => {
    const changed: DeckSpec = { ...deck, slides: [{ ...deck.slides[0], layout: 'chart-full' }] }
    expect(fingerprintArtifactSpec('deck', changed)).not.toBe(fingerprintArtifactSpec('deck', deck))
    expect(fingerprintArtifactSpec('deck', deck)).not.toBe(fingerprintArtifactSpec('report', deck as unknown as AgentReportSpec))
  })

  it('returns the same hash for repeated calls', () => {
    expect(fingerprintArtifactSpec('deck', deck)).toBe(fingerprintArtifactSpec('deck', deck))
  })
})
