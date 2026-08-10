import { fromCompactAnalyzeContext } from './context-compact'
import type { AnalyzeContext, CompactAnalyzeContext } from './context-schema'
import { hashValue } from './report-project-storage'

export function fingerprintAnalyzeContext(context: AnalyzeContext | CompactAnalyzeContext): string {
  const normalized = isCompact(context) ? fromCompactAnalyzeContext(context) : context
  return hashValue({
    fields: normalized.fields.map(field => ({
      name: field.name,
      role: field.role,
      type: field.type,
      semanticTags: sorted(field.semanticTags ?? []),
      distinctCount: field.distinctCount ?? null,
      timePeriods: field.timePeriods ?? null,
      chartUsage: field.chartUsage ?? null,
      comparison: field.comparison ?? null
    })).sort(byName),
    evidence: normalized.evidence.map(item => ({
      id: item.id,
      recipe: item.recipe ?? null
    })).sort(byId),
    catalog: {
      charts: sorted(normalized.catalog.charts),
      blockedCharts: normalized.catalog.blockedCharts.map(item => item.type).sort(),
      blocks: normalized.catalog.blocks?.map(item => ({
        id: item.id, score: item.score, density: item.density,
        charts: sorted(item.charts), requiredEvidence: sorted(item.requiredEvidence ?? [])
      })).sort(byId) ?? [],
      blockedBlocks: normalized.catalog.blockedBlocks?.map(item => item.id).sort() ?? [],
      templates: normalized.catalog.templates?.map(item => ({
        id: item.id, score: item.score, density: item.density,
        blocks: [...item.blocks], requiredEvidence: sorted(item.requiredEvidence ?? [])
      })).sort(byId) ?? [],
      blockedTemplates: normalized.catalog.blockedTemplates?.map(item => item.id).sort() ?? [],
      scenes: normalized.catalog.scenes?.map(item => ({
        id: item.id, score: item.score,
        templates: [...item.templates], blocks: [...item.blocks]
      })).sort(byId) ?? [],
      blockedScenes: normalized.catalog.blockedScenes?.map(item => item.id).sort() ?? [],
      deckPatterns: normalized.catalog.deckPatterns?.map(item => ({
        id: item.id, score: item.score, density: item.density, blocks: [...item.blocks]
      })).sort(byId) ?? []
    },
    blockingClarifications: (normalized.clarificationQuestions ?? [])
      .filter(item => item.blocking)
      .map(item => ({ id: item.id, appliesTo: item.appliesTo }))
      .sort(byId),
    sampleWarnings: normalized.sampleWarnings.map(item => item.code).sort()
  })
}

function isCompact(context: AnalyzeContext | CompactAnalyzeContext): context is CompactAnalyzeContext {
  return 'format' in context && context.format === 'compact-v1'
}

function sorted(values: string[]): string[] {
  return [...values].sort()
}

function byId<T extends { id: string }>(left: T, right: T): number {
  return left.id.localeCompare(right.id)
}

function byName<T extends { name: string }>(left: T, right: T): number {
  return left.name.localeCompare(right.name)
}
