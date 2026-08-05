import { existsSync } from 'node:fs'
import { extname, resolve } from 'node:path'
import { z } from 'zod'
import { resolveEvidencePath } from './directive-resolver'
import type { AnalyzeContext } from './context-schema'
import type { DeckSpec } from './deck-types'
import type { AgentInsight, AgentProvenance, AgentReportSpec } from './types'
import type { ProvenanceCoverage } from './provenance-validator'

const artifactSchema = z.object({ format: z.string().min(1).max(16), path: z.string().min(1).max(4096) })
const metricSchema = z.object({
  label: z.string().min(1).max(200), value: z.union([z.string().max(500), z.number()]),
  evidenceId: z.string().min(1), evidencePath: z.string().min(1)
})
const highlightSchema = z.object({
  text: z.string().min(1).max(500), evidenceIds: z.array(z.string().min(1).max(200)).min(1).max(10)
})

export const deliveryManifestSchema = z.object({
  schemaVersion: z.literal(1),
  kind: z.enum(['report', 'recurring-report', 'deck', 'article']),
  status: z.enum(['ready', 'needs_review', 'restricted', 'failed', 'missing']),
  title: z.string().min(1).max(300),
  period: z.string().min(1).optional(),
  artifacts: z.object({
    primary: artifactSchema,
    alternatives: z.array(artifactSchema).default([]),
    preview: artifactSchema.optional()
  }),
  verification: z.object({
    verified: z.boolean().optional(), coverage: z.number().min(0).max(1).optional(),
    shareSafe: z.boolean().optional()
  }),
  summary: z.object({
    metrics: z.array(metricSchema).max(3).default([]),
    highlights: z.array(highlightSchema).max(2).default([]),
    changeCounts: z.object({
      up: z.number().int().nonnegative(), down: z.number().int().nonnegative(),
      warnings: z.number().int().nonnegative()
    }).optional()
  }),
  actions: z.array(z.enum([
    'open_primary', 'open_pdf', 'open_preview', 'inspect_evidence',
    'update_period', 'compare_previous', 'show_in_folder'
  ])).max(3)
})

export type DeliveryManifest = z.infer<typeof deliveryManifestSchema>
export type DeliveryArtifact = z.infer<typeof artifactSchema>
export type DeliveryMetric = z.infer<typeof metricSchema>
export type DeliveryHighlight = z.infer<typeof highlightSchema>
export type DeliveryAction = DeliveryManifest['actions'][number]

interface BuildDeliveryOptions {
  kind: DeliveryManifest['kind']
  title: string
  outputs: string[]
  primaryPath?: string
  previewPath?: string
  period?: string
  verified?: boolean
  coverage?: ProvenanceCoverage | number
  shareSafe?: boolean
  shareStatus?: 'safe' | 'review' | 'restricted'
  warnings?: unknown[]
  metrics?: DeliveryMetric[]
  highlights?: DeliveryHighlight[]
  changeCounts?: DeliveryManifest['summary']['changeCounts']
  recurring?: boolean
}

export function buildDelivery(options: BuildDeliveryOptions): DeliveryManifest {
  const artifacts = existingArtifacts(options.outputs)
  const requestedPrimary = options.primaryPath ? resolve(options.primaryPath) : undefined
  const primary = artifacts.find(item => item.path === requestedPrimary) ?? artifacts[0]
  if (!primary) throw new Error('Delivery requires an existing primary artifact.')
  const previewPath = options.previewPath && existsSync(options.previewPath) ? resolve(options.previewPath) : undefined
  const preview = previewPath ? { format: formatOf(previewPath), path: previewPath } : undefined
  const status = deliveryStatus(options)
  const actions: DeliveryAction[] = ['open_primary']
  if (artifacts.some(item => item.format === 'pdf') && primary.format !== 'pdf') actions.push('open_pdf')
  else if (preview && preview.path !== primary.path) actions.push('open_preview')
  if (options.recurring) actions.push(options.changeCounts ? 'compare_previous' : 'update_period')
  else if ((options.metrics?.length || options.highlights?.length) && actions.length < 3) actions.push('inspect_evidence')
  if (actions.length < 3) actions.push('show_in_folder')

  return deliveryManifestSchema.parse({
    schemaVersion: 1, kind: options.kind, status, title: compact(options.title, 300),
    ...(options.period ? { period: options.period } : {}),
    artifacts: {
      primary,
      alternatives: artifacts.filter(item => item.path !== primary.path),
      ...(preview ? { preview } : {})
    },
    verification: {
      ...(options.verified !== undefined ? { verified: options.verified } : {}),
      ...(options.coverage !== undefined ? { coverage: coverageValue(options.coverage) } : {}),
      ...(options.shareSafe !== undefined ? { shareSafe: options.shareSafe } : {})
    },
    summary: {
      metrics: (options.metrics ?? []).slice(0, 3), highlights: (options.highlights ?? []).slice(0, 2),
      ...(options.changeCounts ? { changeCounts: options.changeCounts } : {})
    },
    actions: actions.slice(0, 3)
  })
}

export function reportDeliverySummary(
  spec: AgentReportSpec, context: AnalyzeContext | null, verified: boolean
): { metrics: DeliveryMetric[]; highlights: DeliveryHighlight[] } {
  if (!context || !verified) return { metrics: [], highlights: [] }
  const metrics: DeliveryMetric[] = []
  for (const chart of spec.charts) {
    if (!['bigvalue', 'delta', 'progress', 'gauge', 'infographic-kpi'].includes(chart.type)) continue
    const ref = firstEvidencePath(chart.provenance)
    if (!ref) continue
    const resolved = resolveEvidencePath(context.evidence, ref.evidenceId, ref.evidencePath)
    if (!resolved.found || !['string', 'number'].includes(typeof resolved.value)) continue
    metrics.push({
      label: compact(chart.title ?? chart.encoding?.value?.field ?? ref.evidencePath, 200),
      value: typeof resolved.value === 'string' ? compact(resolved.value, 500) : resolved.value as number, ...ref
    })
    if (metrics.length === 3) break
  }
  const highlights = (spec.insights ?? []).flatMap(insightHighlight).slice(0, 2)
  return { metrics, highlights }
}

export function deckDeliverySummary(
  spec: DeckSpec, context: AnalyzeContext | null, verified: boolean
): { metrics: DeliveryMetric[]; highlights: DeliveryHighlight[] } {
  if (!context || !verified) return { metrics: [], highlights: [] }
  const metrics: DeliveryMetric[] = []
  const highlights: DeliveryHighlight[] = []
  for (const slide of spec.slides) {
    for (const metric of slide.metrics ?? []) {
      const ref = firstEvidencePath(metric.provenance)
      if (!ref) continue
      const result = resolveEvidencePath(context.evidence, ref.evidenceId, ref.evidencePath)
      const value = metric.value ?? result.value
      if (typeof value !== 'string' && typeof value !== 'number') continue
      metrics.push({ label: compact(metric.label, 200), value: typeof value === 'string' ? compact(value, 500) : value, ...ref })
      if (metrics.length === 3) break
    }
    if (slide.claim && slide.evidence?.length) highlights.push({ text: compact(slide.claim, 500), evidenceIds: slide.evidence.slice(0, 10) })
    if (metrics.length >= 3 && highlights.length >= 2) break
  }
  return { metrics: metrics.slice(0, 3), highlights: highlights.slice(0, 2) }
}

function existingArtifacts(paths: string[]): DeliveryArtifact[] {
  return [...new Set(paths.map(path => resolve(path)))].filter(path => existsSync(path))
    .map(path => ({ format: formatOf(path), path }))
}

function formatOf(path: string): string {
  return extname(path).slice(1).toLowerCase() || 'file'
}

function coverageValue(coverage: ProvenanceCoverage | number): number {
  return typeof coverage === 'number'
    ? coverage
    : Math.min(coverage.objectCoverage, coverage.claimCheckCoverage)
}

function deliveryStatus(options: BuildDeliveryOptions): DeliveryManifest['status'] {
  if (options.shareStatus === 'restricted') return 'restricted'
  if (options.shareStatus === 'review' || options.verified === false || (options.warnings?.length ?? 0) > 0) return 'needs_review'
  return 'ready'
}

function provenanceDetail(provenance: AgentProvenance | undefined): Exclude<AgentProvenance, string> | null {
  return provenance && typeof provenance !== 'string' ? provenance : null
}

function firstEvidencePath(provenance: AgentProvenance | undefined): { evidenceId: string; evidencePath: string } | null {
  const detail = provenanceDetail(provenance)
  for (const raw of detail?.derivedFrom ?? []) {
    const match = /^\$evidence:([^.]+)\.(.+)$/.exec(raw)
    if (match) return { evidenceId: match[1], evidencePath: match[2] }
  }
  return null
}

function insightHighlight(insight: AgentInsight): DeliveryHighlight[] {
  if (typeof insight === 'string') return []
  const detail = provenanceDetail(insight.provenance)
  const evidenceIds = [...new Set([...(insight.evidence ?? []), ...(detail?.evidence ?? [])])]
  return evidenceIds.length ? [{ text: compact(insight.text, 500), evidenceIds: evidenceIds.slice(0, 10) }] : []
}

function compact(value: string, limit: number): string {
  return value.length <= limit ? value : `${value.slice(0, limit - 1)}…`
}
