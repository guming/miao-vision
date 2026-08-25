import { describe, expect, it } from 'vitest'
import * as YAML from 'yaml'
import { reportProfileSchema } from './report-profile'

const valid = {
  schemaVersion: 1 as const,
  client: { name: 'Acme', reportTitle: 'Monthly Performance' },
  presentation: { primaryColor: '#1648D8', accentColor: '#F0A202' },
  metrics: [{
    evidenceId: 'totals', metric: 'revenue', label: 'Revenue',
    desiredDirection: 'increase' as const, target: 100_000,
    materiality: { percent: 0.1 }
  }]
}

describe('report profile schema', () => {
  it('normalizes equivalent JSON and YAML input', () => {
    const json = reportProfileSchema.parse(JSON.parse(JSON.stringify(valid)))
    const yaml = reportProfileSchema.parse(YAML.parse(YAML.stringify(valid)))
    expect(yaml).toEqual(json)
  })

  it.each([
    [{ ...valid, presentation: { primaryColor: 'blue' } }, 'six-digit hex color'],
    [{ ...valid, metrics: [{ ...valid.metrics[0], desiredDirection: 'up' }] }, 'desiredDirection'],
    [{ ...valid, metrics: [{ ...valid.metrics[0], label: '' }] }, 'label'],
    [{ ...valid, metrics: [{ ...valid.metrics[0], materiality: { percent: -1 } }] }, 'too_small'],
    [{ ...valid, metrics: [{ ...valid.metrics[0], materiality: undefined }] }, 'materiality threshold'],
    [{ ...valid, metrics: [valid.metrics[0], valid.metrics[0]] }, 'duplicate metric reference']
  ])('rejects invalid profile %#', (input, expected) => {
    const result = reportProfileSchema.safeParse(input)
    expect(result.success).toBe(false)
    expect(JSON.stringify(result.error?.issues)).toContain(expected)
  })
})
