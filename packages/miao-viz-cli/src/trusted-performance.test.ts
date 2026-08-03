import { performance } from 'node:perf_hooks'
import { describe, expect, it } from 'vitest'
import { applyInteractiveFilters } from './interactive-runtime'
import { renderReportHtmlWithTrust } from './trusted-html-render'
import { INTERACTIVE_HTML_HARD_BUDGET_BYTES, INTERACTIVE_HTML_SOFT_BUDGET_BYTES } from './trusted-artifact'
import type { AgentReportSpec, ColumnProfile, DataProfile } from './types'

const fields = ['region', 'period', 'product', 'status', 'sales', 'orders', 'margin', 'quantity']
const spec: AgentReportSpec = {
  interactions: {
    globalFilters: [{ field: 'region', type: 'select' }, { field: 'period', type: 'range' }],
    dataPolicy: { mode: 'detail-safe', detailFields: fields },
    currentView: { summaries: [{ id: 'sales', label: 'Sales', recipe: { schemaVersion: 1, measures: [{ operation: 'sum', field: 'sales', alias: 'value' }] } }] }
  },
  charts: [{ type: 'bar', encoding: { x: { field: 'region' }, y: { field: 'sales', aggregate: 'sum' } } }]
}

describe('trusted report performance fixtures', () => {
  it('keeps the 10k reference artifact inside the soft budget and renders within one second', () => {
    const rows = makeRows(10_000)
    const started = performance.now()
    const rendered = renderReportHtmlWithTrust(spec, profile(rows.length), rows, { interactive: true })
    expect(performance.now() - started).toBeLessThan(1_000)
    expect(Buffer.byteLength(rendered.html, 'utf8')).toBeLessThanOrEqual(INTERACTIVE_HTML_SOFT_BUDGET_BYTES)
  })

  it('filters the 10k reference fixture within 200ms and 50k stress fixture within 500ms', () => {
    const filters = spec.interactions!.globalFilters!
    const state = { filters: { region: 'East', period: [2023, 2025] } }
    const referenceStarted = performance.now()
    expect(applyInteractiveFilters(makeRows(10_000), filters, state).length).toBeGreaterThan(0)
    expect(performance.now() - referenceStarted).toBeLessThan(200)

    const stressRows = makeRows(50_000)
    const stressStarted = performance.now()
    expect(applyInteractiveFilters(stressRows, filters, state).length).toBeGreaterThan(0)
    expect(performance.now() - stressStarted).toBeLessThan(500)
    const stress = renderReportHtmlWithTrust(spec, profile(stressRows.length), stressRows, { interactive: true })
    expect(Buffer.byteLength(stress.html, 'utf8')).toBeLessThanOrEqual(INTERACTIVE_HTML_HARD_BUDGET_BYTES)
  })
})

function makeRows(count: number): Record<string, unknown>[] {
  const regions = ['East', 'West', 'North', 'South']
  return Array.from({ length: count }, (_, index) => ({
    region: regions[index % regions.length], period: 2023 + index % 4, product: `Product ${index % 20}`,
    status: index % 2 ? 'Open' : 'Closed', sales: index % 1000, orders: index % 100,
    margin: (index % 40) / 100, quantity: index % 25
  }))
}

function profile(rows: number): DataProfile {
  return { file: 'performance.csv', rows, columns: fields.map((name): ColumnProfile => ({
    name, type: ['sales', 'orders', 'margin', 'quantity', 'period'].includes(name) ? 'number' : 'string',
    role: name === 'region' || name === 'product' || name === 'status' ? 'dimension' : name === 'period' ? 'time' : 'measure',
    total: rows, nonNullCount: rows, nullCount: 0, nullRate: 0, fillRate: 1, uniqueRate: 0.1,
    samples: [], distinctCount: name === 'region' ? 4 : 20
  })) }
}
