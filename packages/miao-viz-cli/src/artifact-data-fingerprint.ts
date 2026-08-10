import { profileDataset } from './data-profiler'
import { hashValue } from './report-project-storage'
import type { AgentColumnType, LoadedDataset } from './types'

export function fingerprintArtifactData(dataset: LoadedDataset): string {
  const profile = profileDataset(dataset)
  const profiles = new Map(profile.columns.map(column => [column.name, column]))
  const fields = [...dataset.columns].sort().map(name => {
    const column = profiles.get(name)
    const type = column?.type ?? 'unknown'
    const frequencies = frequencySummary(dataset.rows.map(row => row[name]), type)
    return {
      name,
      type,
      nullCount: column?.nullCount ?? dataset.rows.length,
      distinctCount: column?.distinctCount ?? 0,
      valueDigest: hashValue(frequencies),
      ...(type === 'number' ? {
        numeric: {
          min: column?.min ?? null, max: column?.max ?? null,
          sum: column?.sum ?? null, mean: column?.mean ?? null,
          median: column?.median ?? null
        }
      } : {})
    }
  })
  return hashValue({ rowCount: dataset.rows.length, fields })
}

function frequencySummary(values: unknown[], type: AgentColumnType): Array<[string, number]> {
  const frequencies = new Map<string, number>()
  for (const value of values) {
    const normalized = normalizeValue(value, type)
    frequencies.set(normalized, (frequencies.get(normalized) ?? 0) + 1)
  }
  return [...frequencies.entries()].sort(([left], [right]) => left.localeCompare(right))
}

function normalizeValue(value: unknown, type: AgentColumnType): string {
  if (value === null || value === undefined || value === '') return 'null:'
  if (type === 'number') {
    const number = Number(value)
    return Number.isFinite(number) ? `number:${number}` : `invalid-number:${String(value)}`
  }
  if (type === 'date') {
    const date = value instanceof Date ? value : new Date(String(value))
    return Number.isNaN(date.getTime()) ? `invalid-date:${String(value)}` : `date:${date.toISOString().slice(0, 10)}`
  }
  if (typeof value === 'boolean') return `boolean:${value}`
  if (typeof value === 'string') return `string:${value.trim()}`
  return `${typeof value}:${JSON.stringify(value)}`
}
