import { describe, expect, it } from 'vitest'
import { fingerprintArtifactData } from './artifact-data-fingerprint'
import type { LoadedDataset } from './types'

function dataset(rows: Record<string, unknown>[], file = '/tmp/data.csv'): LoadedDataset {
  return { file, columns: ['period', 'region', 'sales'], rows }
}

const rows = [
  { period: '2026-01-01', region: 'East', sales: 10 },
  { period: '2026-02-01', region: 'West', sales: 20 },
  { period: '2026-03-01', region: null, sales: 30 }
]

describe('fingerprintArtifactData', () => {
  it('is independent of file format, path, sheet, and row order', () => {
    const csv = dataset(rows, '/private/sales.csv')
    const xlsx = { ...dataset([...rows].reverse(), '/private/sales.xlsx'), sheet: 'Data' }
    expect(fingerprintArtifactData(csv)).toBe(fingerprintArtifactData(xlsx))
  })

  it('normalizes equivalent Date and date-string values', () => {
    const dates = rows.map(row => ({ ...row, period: new Date(`${row.period}T00:00:00Z`) }))
    expect(fingerprintArtifactData(dataset(dates))).toBe(fingerprintArtifactData(dataset(rows)))
  })

  it.each([
    ['field', { file: 'x', columns: ['period', 'region', 'revenue'], rows: rows.map(({ sales, ...row }) => ({ ...row, revenue: sales })) }],
    ['type', dataset(rows.map((row, index) => ({ ...row, sales: ['low', 'medium', 'high'][index] })))],
    ['row count', dataset(rows.slice(0, 2))],
    ['numeric value', dataset(rows.map((row, index) => index === 0 ? { ...row, sales: 11 } : row))],
    ['null distribution', dataset(rows.map((row, index) => index === 0 ? { ...row, region: null } : row))]
  ])('changes when %s changes', (_label, changed) => {
    expect(fingerprintArtifactData(changed)).not.toBe(fingerprintArtifactData(dataset(rows)))
  })

  it('is stable across repeated calls', () => {
    expect(fingerprintArtifactData(dataset(rows))).toBe(fingerprintArtifactData(dataset(rows)))
  })
})
