import { existsSync, mkdtempSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { describe, expect, it } from 'vitest'
import { injectPeriodOutcomeHtml } from './period-outcome-html'
import { exportHtmlToPdf } from './pdf-export'
import type { PeriodOutcomeBrief } from './period-outcome-schema'
import type { ReportProfileV1 } from './report-profile'

const baseBrief: PeriodOutcomeBrief = {
  schemaVersion: 1, period: '2026-08', baselineRunId: '2026-07', noMaterialChange: false,
  outcomes: [{
    id: 'metric:total:sales', classification: 'favorable', evidenceId: 'total', metric: 'sales',
    label: 'Sales', previous: 100, current: 120, absolute: 20, percent: 0.2,
    materiality: { matchedAbsolute: false, matchedPercent: true }, evidenceRefs: ['total']
  }],
  goals: [], rankings: [], anomalies: { added: [], removed: [] }, warnings: [], recommendations: []
}

const metric = { evidenceId: 'total', metric: 'sales', label: 'Sales', materiality: { percent: 0.1 } }

describe('client outcome PDF visual fixtures', () => {
  it('exports light, dark, long-title, no-logo, and dense reports without hard layout failures', async () => {
    const root = mkdtempSync(join(tmpdir(), 'miao-client-visual-'))
    const profiles: Array<[string, ReportProfileV1, PeriodOutcomeBrief]> = [
      ['light', { schemaVersion: 1, client: { name: 'Light' }, presentation: { primaryColor: '#FFFFFF' }, metrics: [metric] }, baseBrief],
      ['dark', { schemaVersion: 1, client: { name: 'Dark' }, presentation: { primaryColor: '#111827' }, metrics: [metric] }, baseBrief],
      ['long-title', { schemaVersion: 1, client: { name: 'Client', reportTitle: 'A very long monthly client outcome report title that must wrap safely across lines without clipping' }, metrics: [metric] }, baseBrief],
      ['no-logo', { schemaVersion: 1, client: { name: 'No Logo' }, metrics: [metric] }, baseBrief],
      ['dense', { schemaVersion: 1, client: { name: 'Dense' }, metrics: [metric] }, {
        ...baseBrief,
        outcomes: Array.from({ length: 12 }, (_, index) => ({
          ...baseBrief.outcomes[0], id: `metric:total:sales_${index}`, metric: `sales_${index}`, label: `Metric ${index + 1}`
        }))
      }]
    ]
    for (const [name, profile, brief] of profiles) {
      const html = injectPeriodOutcomeHtml(
        '<html data-miao-render-ready="true"><body><main><h1>Base report</h1></main></body></html>',
        brief,
        { schemaVersion: 1, status: 'ready', reasons: [], materialChanges: brief.outcomes.length, warnings: 0, blockingIssues: 0 },
        { profile }
      )
      const output = join(root, `${name}.pdf`)
      const result = await exportHtmlToPdf(html, output, { mode: 'report', timeout: 30_000 })
      expect(result, `${name}: ${JSON.stringify(result)}`).toMatchObject({ ok: true })
      expect(existsSync(output), name).toBe(true)
      expect(statSync(output).size, name).toBeGreaterThan(0)
    }
  }, 120_000)
})
