import type { AgentChartSpec } from './types'

export function buildKpiChart(measure: string): AgentChartSpec {
  const alias = `total_${measure}`
  const valuePath = `$evidence:total.values.${alias}`
  return {
    id: `kpi_total_${measure}`,
    type: 'bigvalue',
    title: `Total ${measure}`,
    data: {
      transform: [
        { type: 'aggregate', measures: [{ field: measure, op: 'sum', as: alias }] }
      ]
    },
    encoding: { value: { field: alias, type: 'quantitative' } },
    provenance: {
      evidence: ['total'], derivedFrom: [valuePath], check: 'value_match',
      claimArgs: { value: valuePath, expected: valuePath }
    }
  }
}

export function buildBarChart(measure: string, dimension: string, topN: number): AgentChartSpec {
  const alias = `total_${measure}`
  return {
    id: `ranking_by_${dimension}`,
    type: 'bar',
    title: `${measure} by ${dimension}`,
    data: {
      transform: [
        { type: 'aggregate', groupBy: [dimension], measures: [{ field: measure, op: 'sum', as: alias }] },
        { type: 'sort', field: alias, order: 'desc' },
        { type: 'limit', value: topN }
      ]
    },
    encoding: {
      x: { field: dimension, type: 'nominal' },
      y: { field: alias, type: 'quantitative' }
    },
    provenance: { evidence: ['by_dimension'], derivedFrom: ['$evidence:by_dimension.rows'] }
  }
}

export function buildLineChart(measure: string, timeField: string): AgentChartSpec {
  const alias = `total_${measure}`
  return {
    id: `trend_by_${timeField}`,
    type: 'line',
    title: `${measure} over ${timeField}`,
    data: {
      transform: [
        { type: 'aggregate', groupBy: [timeField], measures: [{ field: measure, op: 'sum', as: alias }] },
        { type: 'sort', field: timeField, order: 'asc' }
      ]
    },
    encoding: {
      x: { field: timeField, type: 'temporal' },
      y: { field: alias, type: 'quantitative' }
    },
    provenance: { evidence: ['by_time'], derivedFrom: ['$evidence:by_time.rows'] }
  }
}

export function buildPieChart(measure: string, dimension: string): AgentChartSpec {
  const alias = `total_${measure}`
  return {
    id: `share_by_${dimension}`,
    type: 'pie',
    title: `${measure} share by ${dimension}`,
    data: {
      transform: [
        { type: 'aggregate', groupBy: [dimension], measures: [{ field: measure, op: 'sum', as: alias }] },
        { type: 'sort', field: alias, order: 'desc' },
        { type: 'limit', value: 7 }
      ]
    },
    encoding: {
      label: { field: dimension, type: 'nominal' },
      value: { field: alias, type: 'quantitative' }
    },
    provenance: { evidence: ['by_dimension'], derivedFrom: ['$evidence:by_dimension.rows'] }
  }
}

export function buildTableChart(measure: string, dimension: string): AgentChartSpec {
  const alias = `total_${measure}`
  return {
    id: 'detail_table',
    type: 'table',
    title: 'Full Detail',
    data: {
      transform: [
        { type: 'aggregate', groupBy: [dimension], measures: [{ field: measure, op: 'sum', as: alias }] },
        { type: 'sort', field: alias, order: 'desc' }
      ]
    },
    encoding: {},
    provenance: { evidence: ['by_dimension'], derivedFrom: ['$evidence:by_dimension.rows'] }
  }
}
