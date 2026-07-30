import { describe, expect, it } from 'vitest'
import { collectProvenanceObjects, normalizeProvenance } from './provenance-normalize'
import { validateProvenance } from './provenance-validator'
import type { AnalyzeContext } from './context-schema'
import type { AgentReportSpec } from './types'

const context: AnalyzeContext = {
  intent: { raw: 'sales', coverage: 'full', assumptions: [] },
  fields: [
    { name: 'region', role: 'dimension', type: 'string' },
    { name: 'sales', role: 'measure', type: 'number' }
  ],
  evidence: [
    {
      id: 'total',
      query: 'sum sales',
      values: { total_sales: 30 },
      recipe: { schemaVersion: 1, measures: [{ operation: 'sum', field: 'sales', alias: 'total_sales' }] }
    },
    {
      id: 'by_region',
      query: 'sales by region',
      rows: [{ region: 'East', total_sales: 20 }, { region: 'West', total_sales: 10 }],
      recipe: {
        schemaVersion: 1,
        groupBy: ['region'],
        measures: [{ operation: 'sum', field: 'sales', alias: 'total_sales' }],
        orderBy: [{ field: 'total_sales', direction: 'desc' }]
      }
    }
  ],
  catalog: { charts: ['bigvalue', 'bar'], blockedCharts: [], recommendedPlan: [] },
  sampleWarnings: [],
  promptRules: []
}

describe('provenance normalization and coverage', () => {
  it('normalizes the exact-path shorthand without guessing a value', () => {
    expect(normalizeProvenance('$evidence:total.values.total_sales')).toEqual({
      evidence: ['total'],
      derivedFrom: ['$evidence:total.values.total_sales']
    })
  })

  it('covers KPI, chart, and structured insight with required checks', () => {
    const value = '$evidence:total.values.total_sales'
    const spec: AgentReportSpec = {
      charts: [
        {
          id: 'sales-total', type: 'bigvalue', encoding: { value: { field: 'total_sales' } },
          provenance: { evidence: ['total'], derivedFrom: [value], check: 'value_match', claimArgs: { value, expected: 30 } }
        },
        {
          id: 'sales-region', type: 'bar',
          encoding: { x: { field: 'region' }, y: { field: 'total_sales' } },
          provenance: { evidence: ['by_region'], derivedFrom: ['$evidence:by_region.rows'] }
        }
      ],
      insights: [{
        text: 'East ranks first.', type: 'rank',
        provenance: {
          evidence: ['by_region'],
          derivedFrom: ['$evidence:by_region.rows[0].region', '$evidence:by_region.rows[0].total_sales'],
          check: 'rank_position',
          claimArgs: {
            rows: '$evidence:by_region.rows', subjectField: 'region', valueField: 'total_sales',
            subject: 'East', expectedRank: 1, order: 'desc'
          }
        }
      }]
    }
    const result = validateProvenance(spec, context)
    expect(result.issues).toEqual([])
    expect(result.coverage).toMatchObject({
      objectCoverage: 1,
      claimCheckCoverage: 1,
      eligibleObjects: 3,
      coveredObjects: 3,
      requiredClaimChecks: 2,
      passedClaimChecks: 2
    })
  })

  it('reports missing paths and failed required checks once per object', () => {
    const spec: AgentReportSpec = {
      charts: [{
        id: 'bad', type: 'bigvalue', encoding: { value: { field: 'total_sales' } },
        provenance: { evidence: ['total'], derivedFrom: ['$evidence:total.values.missing'] }
      }]
    }
    const result = validateProvenance(spec, context)
    expect(result.issues.map(issue => issue.code)).toEqual([
      'PROVENANCE_PATH_NOT_FOUND',
      'PROVENANCE_CHECK_REQUIRED',
      'PROVENANCE_COVERAGE_INCOMPLETE'
    ])
    expect(result.coverage.invalidReferences).toBe(1)
  })

  it('rejects derived paths from evidence ids that were not declared', () => {
    const spec: AgentReportSpec = {
      charts: [{
        id: 'mismatched', type: 'bar',
        encoding: { x: { field: 'region' }, y: { field: 'total_sales' } },
        provenance: { evidence: ['by_region'], derivedFrom: ['$evidence:total.values.total_sales'] }
      }]
    }
    const result = validateProvenance(spec, context)
    expect(result.issues.some(issue =>
      issue.code === 'PROVENANCE_PATH_INCOMPATIBLE' &&
      issue.payload?.evidenceId === 'total'
    )).toBe(true)
    expect(result.coverage.invalidReferences).toBe(1)
  })

  it('requires structured checks for legacy numeric insights', () => {
    const objects = collectProvenanceObjects({
      charts: [],
      insights: ['Revenue is $evidence:total.values.total_sales.']
    })
    expect(objects[0].requiredCheck).toBe('value_match')
    expect(validateProvenance({ charts: [], insights: ['Revenue is $evidence:total.values.total_sales.'] }, context)
      .issues.some(issue => issue.code === 'PROVENANCE_CHECK_REQUIRED')).toBe(true)
  })

  it('returns full empty coverage for a report with no eligible objects', () => {
    const result = validateProvenance({ charts: [], insights: ['Methodology only.'] }, context)
    expect(result.coverage).toMatchObject({ empty: true, objectCoverage: 1, claimCheckCoverage: 1 })
  })
})
