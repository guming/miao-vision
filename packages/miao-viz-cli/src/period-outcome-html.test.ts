import { describe, expect, it } from 'vitest'
import { injectPeriodOutcomeHtml } from './period-outcome-html'
import type { PeriodOutcomeBrief } from './period-outcome-schema'

function brief(): PeriodOutcomeBrief {
  return {
    schemaVersion: 1, period: '2026-08', baselineRunId: '2026-07', noMaterialChange: false,
    outcomes: [{
      id: 'metric:total:sales', classification: 'favorable', evidenceId: 'total', metric: 'sales',
      label: '<Sales>', previous: 100, current: 120, absolute: 20, percent: 0.2,
      materiality: { matchedAbsolute: false, matchedPercent: true }, evidenceRefs: ['total']
    }],
    goals: [], rankings: [], anomalies: { added: [], removed: [] }, warnings: [], recommendations: []
  }
}

describe('period outcome HTML', () => {
  it('renders escaped material outcomes and evidence details', () => {
    const html = injectPeriodOutcomeHtml('<html><body><main>Report</main></body></html>', brief(), {
      schemaVersion: 1, status: 'ready', reasons: [], materialChanges: 1, warnings: 0, blockingIssues: 0
    })
    expect(html).toContain('Positive outcomes')
    expect(html).toContain('&lt;Sales&gt;')
    expect(html).toContain('Previous 100 · Change +20 (+20.0%)')
    expect(html).toContain('Evidence references: total')
    expect(html).not.toContain('$evidence:')
  })

  it('renders an informative no-material-change state', () => {
    const input = brief()
    input.outcomes = []
    input.noMaterialChange = true
    const html = injectPeriodOutcomeHtml('<body></body>', input, {
      schemaVersion: 1, status: 'ready', reasons: [], materialChanges: 0, warnings: 0, blockingIssues: 0
    })
    expect(html).toContain('No configured materiality threshold was crossed')
  })

  it('renders first-run baseline language without comparison claims', () => {
    const input = brief()
    input.baselineRunId = null
    input.outcomes = []
    input.noMaterialChange = true
    const html = injectPeriodOutcomeHtml('<body></body>', input, {
      schemaVersion: 1, status: 'ready', reasons: [], materialChanges: 0, warnings: 0, blockingIssues: 0
    })
    expect(html).toContain('No period comparison is available yet')
  })

  it('renders escaped client branding with controlled colors and an embedded logo', () => {
    const html = injectPeriodOutcomeHtml('<html><body><main>Report</main></body></html>', brief(), {
      schemaVersion: 1, status: 'ready', reasons: [], materialChanges: 1, warnings: 0, blockingIssues: 0
    }, {
      profile: {
        schemaVersion: 1,
        client: { name: '<Acme>', reportTitle: 'Monthly Results', confidentiality: 'Internal' },
        presentation: { primaryColor: '#1648D8', accentColor: '#F0A202', footer: 'Prepared locally' },
        metrics: [{ evidenceId: 'total', metric: 'sales', label: 'Sales', materiality: { percent: 0.1 } }]
      },
      logoDataUri: 'data:image/png;base64,cG5n'
    })
    expect(html.indexOf('mv-client-cover')).toBeLessThan(html.indexOf('<main>'))
    expect(html).toContain('&lt;Acme&gt;')
    expect(html).toContain('data:image/png;base64,cG5n')
    expect(html).toContain('--mv-client-primary:#1648D8')
    expect(html).toContain('--mv-client-on-primary:#FFFFFF')
    expect(html).toContain('Prepared locally')
  })

  it('chooses dark text for a light brand color', () => {
    const html = injectPeriodOutcomeHtml('<body></body>', brief(), {
      schemaVersion: 1, status: 'ready', reasons: [], materialChanges: 1, warnings: 0, blockingIssues: 0
    }, {
      profile: {
        schemaVersion: 1, client: { name: 'Light brand' }, presentation: { primaryColor: '#FFFFFF' },
        metrics: [{ evidenceId: 'total', metric: 'sales', label: 'Sales', materiality: { percent: 0.1 } }]
      }
    })
    expect(html).toContain('--mv-client-on-primary:#111827')
  })

  it('renders contributor changes and typed recommendations', () => {
    const input = brief()
    input.rankings = [{
      id: 'ranking:region:East', evidenceId: 'region', item: 'East', kind: 'entered',
      previousRank: null, currentRank: 1, movement: null, evidenceRefs: ['region']
    }]
    input.recommendations = [{ id: 'action:1', text: 'Review channel allocation', evidenceRefs: ['total'] }]
    const html = injectPeriodOutcomeHtml('<body></body>', input, {
      schemaVersion: 1, status: 'needs_review', reasons: [], materialChanges: 1, warnings: 1, blockingIssues: 0
    })
    expect(html).toContain('East entered at 1')
    expect(html).toContain('Suggested next actions')
    expect(html).toContain('Review channel allocation')
  })
})
