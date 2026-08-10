import { hashValue } from './report-project-storage'
import type { DeckSpec } from './deck-types'
import type { AgentReportSpec } from './types'

export type ArtifactSpecKind = 'report' | 'deck'

export function fingerprintArtifactSpec(
  specKind: 'report', spec: AgentReportSpec
): string
export function fingerprintArtifactSpec(
  specKind: 'deck', spec: DeckSpec
): string
export function fingerprintArtifactSpec(
  specKind: ArtifactSpecKind, spec: AgentReportSpec | DeckSpec
): string {
  return hashValue({ specKind, spec: normalizeSpec(spec) })
}

function normalizeSpec(spec: AgentReportSpec | DeckSpec): unknown {
  return omitNonStructural(spec)
}

function omitNonStructural(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(omitNonStructural)
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(Object.entries(value as Record<string, unknown>)
    .filter(([key, item]) => item !== undefined && !excludedKey(key))
    .map(([key, item]) => [key, omitNonStructural(item)]))
}

function excludedKey(key: string): boolean {
  return key === 'description' || key === 'file' || key === 'path' || key === 'outputPath'
}
