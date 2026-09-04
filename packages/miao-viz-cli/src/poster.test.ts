import { describe, expect, it } from 'vitest'
import { analyzeDataset } from './analyzer'
import { renderStaticHtml } from './html-export'
import { profileDataset } from './data-profiler'
import { validateReportSpec } from './spec-validator'
import { buildTemplateCatalog } from './report-template-registry'
import { getReportPngExportOptions } from './cli-render'
import type { AgentReportSpec, LoadedDataset } from './types'

const rows = [
  { country: 'US', buffett_indicator: 241.7 }, { country: 'China', buffett_indicator: 83.6 },
  { country: 'Germany', buffett_indicator: 52.8 }, { country: 'India', buffett_indicator: 216.7 },
  { country: 'Japan', buffett_indicator: 193.8 }, { country: 'UK', buffett_indicator: 95.2 },
  { country: 'France', buffett_indicator: 117.1 }, { country: 'Italy', buffett_indicator: 38.5 },
  { country: 'Canada', buffett_indicator: 208.3 }, { country: 'Brazil', buffett_indicator: 46.6 }
]

function dataset(inputRows = rows): LoadedDataset {
  return { file: 'poster-ranking.csv', columns: ['country', 'buffett_indicator'], rows: inputRows }
}

function spec(overrides: Partial<AgentReportSpec> = {}): AgentReportSpec {
  return {
    layout: { preset: 'poster' },
    poster: {
      chartId: 'ranking-chart',
      hero: { eyebrow: 'The Buffett Indicator', title: 'Which Stock Markets Are the Most Expensive?', subtitle: 'A broad measure of market valuation' },
      footer: { source: 'imf.org', date: 'Aug 2026' },
      chart: { sort: 'desc', maxItems: 10, yDomain: [0, 250], valueFormat: '0.0%' },
      callouts: [{ type: 'formula', title: 'Buffett Indicator', body: 'Total Market Cap / GDP × 100%' }]
    },
    charts: [{ id: 'ranking-chart', type: 'bar', title: 'Market valuation ranking', encoding: { x: { field: 'country' }, y: { field: 'buffett_indicator' } } }],
    ...overrides
  }
}

describe('data poster', () => {
  it('validates a portrait ranking poster and renders a fixed poster canvas', () => {
    const profile = profileDataset(dataset())
    const result = validateReportSpec(spec(), profile)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const html = renderStaticHtml(result.value, profile, rows)
    expect(html).toContain('data-layout="poster"')
    expect(html).toContain('1080px')
    expect(html).toContain('Which Stock Markets Are the Most Expensive?')
    expect(html).toContain('US')
    expect(html).toContain('241.7%')
    expect(html).toContain('Total Market Cap / GDP')
  })

  it('crops poster PNG exports to the poster element instead of the default report viewport', () => {
    const options = getReportPngExportOptions(spec(), { flags: {}, positional: [] })
    expect(options).toMatchObject({ width: 1080, height: 1350, selector: '.mv-poster' })
    expect(getReportPngExportOptions({ charts: spec().charts }, { flags: {}, positional: [] }).selector).toBeUndefined()
  })

  it('rejects missing poster config, missing chart, landscape canvas, and unsupported chart variants', () => {
    const profile = profileDataset(dataset())
    expect(validateReportSpec({ layout: { preset: 'poster' }, charts: spec().charts }, profile)).toMatchObject({ ok: false, code: 'POSTER_CONFIG_MISSING' })
    expect(validateReportSpec(spec({ poster: { ...spec().poster!, chartId: 'missing' } }), profile)).toMatchObject({ ok: false, code: 'POSTER_CHART_NOT_FOUND' })
    expect(validateReportSpec(spec({ poster: { ...spec().poster!, canvas: { width: 1350, height: 1080 } } }), profile)).toMatchObject({ ok: false, code: 'INVALID_SPEC' })
    expect(validateReportSpec(spec({ charts: [{ ...spec().charts[0], variant: 'horizontal' }] }), profile)).toMatchObject({ ok: false, code: 'POSTER_CHART_INVALID' })
  })

  it('sorts ascending and limits the number of rendered ranking bars', () => {
    const profile = profileDataset(dataset())
    const ascending = spec({ poster: { ...spec().poster!, chart: { sort: 'asc', maxItems: 3, valueFormat: '0.0%' } } })
    const result = validateReportSpec(ascending, profile)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const html = renderStaticHtml(result.value, profile, rows)
    expect(html.indexOf('38.5%')).toBeLessThan(html.indexOf('46.6%'))
    expect(html).not.toContain('241.7%')
  })

  it('recommends data-poster-ranking only for readable category counts', () => {
    const context = analyzeDataset(dataset())
    const catalog = buildTemplateCatalog({ fields: context.fields, evidence: context.evidence, sampleWarnings: context.sampleWarnings } as any)
    expect(catalog.templates.find(item => item.id === 'data-poster-ranking')?.layoutPreset).toBe('poster')
    const tooMany = dataset(Array.from({ length: 13 }, (_, index) => ({ country: `C${index}`, buffett_indicator: index })))
    const blocked = buildTemplateCatalog({ fields: analyzeDataset(tooMany).fields, evidence: [], sampleWarnings: [] } as any)
    expect(blocked.blockedTemplates.find(item => item.id === 'data-poster-ranking')?.reason).toContain('> 12')
  })
})
