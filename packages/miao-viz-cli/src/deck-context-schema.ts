import { createHash } from 'node:crypto'
import { posix, relative, resolve } from 'node:path'
import { z } from 'zod'
import { analyzeContextSchema, type AnalyzeContext } from './context-schema'

export const DECK_CONTEXT_VERSION = 1 as const
export const DECK_PATTERNS = [
  'executive-brief', 'business-review', 'topic-explainer', 'project-update', 'proposal'
] as const

const sourceIdSchema = z.string().regex(/^src:[a-f0-9]{8}$/, 'Source id must use src:<8 lowercase hex chars>.')
const nodeIdSchema = z.string().regex(/^src:[a-f0-9]{8}:(?:sec|p|li|q|img):[1-9]\d*$/, 'Content id is invalid.')

const deckRequestSchema = z.object({
  rawIntent: z.string().min(1),
  audience: z.string().min(1).optional(),
  objective: z.string().min(1).optional(),
  occasion: z.string().min(1).optional(),
  durationMinutes: z.number().positive().optional(),
  desiredLength: z.enum(['short', 'medium', 'long']).optional(),
  tone: z.string().min(1).optional()
})

const narrativeSourceSchema = z.object({
  id: sourceIdSchema,
  kind: z.enum(['markdown', 'text']),
  path: z.string().min(1),
  title: z.string().min(1).optional()
})

const dataSourceSchema = z.object({
  id: sourceIdSchema,
  kind: z.literal('data'),
  path: z.string().min(1)
})

const contentSectionSchema = z.object({
  id: nodeIdSchema,
  sourceId: sourceIdSchema,
  heading: z.string().min(1).optional(),
  level: z.number().int().min(0).max(6),
  paragraphIds: z.array(nodeIdSchema),
  listItemIds: z.array(nodeIdSchema)
})

const contentPointSchema = z.object({
  id: nodeIdSchema,
  sourceId: sourceIdSchema,
  sectionId: nodeIdSchema.optional(),
  kind: z.enum(['paragraph', 'list-item', 'quote']),
  text: z.string().min(1)
})

const contentClaimSchema = z.object({
  id: z.string().regex(/^src:[a-f0-9]{8}:claim:[1-9]\d*$/, 'Claim id is invalid.'),
  sourceId: sourceIdSchema,
  sectionId: nodeIdSchema.optional(),
  pointId: nodeIdSchema,
  text: z.string().min(1),
  status: z.literal('author-claim'),
  signals: z.array(z.enum(['numeric', 'rank', 'change', 'evaluation', 'causal', 'predictive']))
})

const contentImageRefSchema = z.object({
  id: nodeIdSchema,
  sourceId: sourceIdSchema,
  sectionId: nodeIdSchema.optional(),
  alt: z.string().optional(),
  target: z.string().min(1),
  kind: z.enum(['local', 'remote'])
})

const narrativeContextSchema = z.object({
  title: z.string().min(1).optional(),
  summary: z.string().min(1).optional(),
  sections: z.array(contentSectionSchema),
  keyPoints: z.array(contentPointSchema),
  quotes: z.array(contentPointSchema),
  explicitClaims: z.array(contentClaimSchema),
  images: z.array(contentImageRefSchema)
})

const deckPlanningContextSchema = z.object({
  recommendedPatterns: z.array(z.object({
    id: z.enum(DECK_PATTERNS),
    score: z.number().min(0).max(1),
    reasons: z.array(z.string().min(1))
  })),
  blockedPatterns: z.array(z.object({
    id: z.enum(DECK_PATTERNS),
    reasonCode: z.string().min(1),
    reason: z.string().min(1)
  }))
})

export const deckContextSchema = z.object({
  version: z.literal(DECK_CONTEXT_VERSION),
  request: deckRequestSchema,
  metadata: z.object({ requestFingerprint: z.string().regex(/^[a-f0-9]{64}$/), dataFingerprint: z.string().regex(/^[a-f0-9]{64}$/).optional() }).optional(),
  sources: z.array(z.discriminatedUnion('kind', [narrativeSourceSchema, dataSourceSchema])).min(1),
  narrative: narrativeContextSchema.optional(),
  data: analyzeContextSchema.optional(),
  warnings: z.array(z.object({ code: z.string().min(1), message: z.string().min(1), sourceId: sourceIdSchema.optional() })).optional(),
  planning: deckPlanningContextSchema
}).superRefine(validateDeckContextReferences)

export type DeckContext = z.infer<typeof deckContextSchema>
export type DeckRequest = z.infer<typeof deckRequestSchema>
export type DeckSource = z.infer<typeof narrativeSourceSchema> | z.infer<typeof dataSourceSchema>
export type NarrativeContext = z.infer<typeof narrativeContextSchema>
export type ContentSection = z.infer<typeof contentSectionSchema>
export type ContentPoint = z.infer<typeof contentPointSchema>
export type ContentClaim = z.infer<typeof contentClaimSchema>
export type ContentImageRef = z.infer<typeof contentImageRefSchema>

export function parseDeckContext(value: unknown): DeckContext | null {
  const parsed = deckContextSchema.safeParse(value)
  return parsed.success ? parsed.data : null
}

export function deckSourceId(sourcePath: string, workspaceRoot: string): string {
  const normalizedPath = normalizedRelativePath(sourcePath, workspaceRoot)
  return `src:${createHash('sha256').update(normalizedPath).digest('hex').slice(0, 8)}`
}

export function deckContentId(sourceId: string, kind: 'sec' | 'p' | 'li' | 'q' | 'img', index: number): string {
  if (!sourceIdSchema.safeParse(sourceId).success) throw new Error(`Invalid source id: ${sourceId}`)
  if (!Number.isInteger(index) || index < 1) throw new Error('Content index must be a positive integer.')
  return `${sourceId}:${kind}:${index}`
}

function normalizedRelativePath(sourcePath: string, workspaceRoot: string): string {
  const relativePath = relative(resolve(workspaceRoot), resolve(sourcePath)).split('\\').join('/')
  return posix.normalize(relativePath).replace(/^\.\//, '')
}

function validateDeckContextReferences(context: {
  sources: DeckSource[]
  narrative?: NarrativeContext
  data?: AnalyzeContext
}, ctx: z.RefinementCtx): void {
  const sourceIds = new Set<string>()
  context.sources.forEach((source, index) => {
    if (sourceIds.has(source.id)) addIssue(ctx, ['sources', index, 'id'], `Duplicate source id '${source.id}'.`)
    sourceIds.add(source.id)
  })
  const narrativeSources = new Set(context.sources.filter(source => source.kind !== 'data').map(source => source.id))
  const hasDataSource = context.sources.some(source => source.kind === 'data')
  if (context.data && !hasDataSource) addIssue(ctx, ['data'], 'Embedded AnalyzeContext requires a data source.')
  if (hasDataSource && !context.data) addIssue(ctx, ['data'], 'A data source requires an embedded AnalyzeContext.')
  if (!context.narrative) return

  const sectionIds = new Set(context.narrative.sections.map(section => section.id))
  const points = [...context.narrative.keyPoints, ...context.narrative.quotes]
  const pointIds = new Set(points.map(point => point.id))
  const ids = [...sectionIds, ...pointIds, ...context.narrative.images.map(image => image.id)]
  if (new Set(ids).size !== ids.length) addIssue(ctx, ['narrative'], 'Narrative content ids must be unique.')

  context.narrative.sections.forEach((section, index) => {
    checkNarrativeSource(section.sourceId, narrativeSources, ctx, ['narrative', 'sections', index, 'sourceId'])
    section.paragraphIds.forEach((id, refIndex) => checkRef(id, pointIds, ctx, ['narrative', 'sections', index, 'paragraphIds', refIndex]))
    section.listItemIds.forEach((id, refIndex) => checkRef(id, pointIds, ctx, ['narrative', 'sections', index, 'listItemIds', refIndex]))
  })
  points.forEach((point, index) => {
    checkNarrativeSource(point.sourceId, narrativeSources, ctx, ['narrative', point.kind === 'quote' ? 'quotes' : 'keyPoints', index, 'sourceId'])
    if (point.sectionId) checkRef(point.sectionId, sectionIds, ctx, ['narrative', point.kind === 'quote' ? 'quotes' : 'keyPoints', index, 'sectionId'])
  })
  context.narrative.explicitClaims.forEach((claim, index) => {
    checkNarrativeSource(claim.sourceId, narrativeSources, ctx, ['narrative', 'explicitClaims', index, 'sourceId'])
    checkRef(claim.pointId, pointIds, ctx, ['narrative', 'explicitClaims', index, 'pointId'])
    if (claim.sectionId) checkRef(claim.sectionId, sectionIds, ctx, ['narrative', 'explicitClaims', index, 'sectionId'])
  })
  context.narrative.images.forEach((image, index) => {
    checkNarrativeSource(image.sourceId, narrativeSources, ctx, ['narrative', 'images', index, 'sourceId'])
    if (image.sectionId) checkRef(image.sectionId, sectionIds, ctx, ['narrative', 'images', index, 'sectionId'])
  })
}

function checkNarrativeSource(id: string, valid: Set<string>, ctx: z.RefinementCtx, path: PropertyKey[]): void {
  if (!valid.has(id)) addIssue(ctx, path, `Narrative source '${id}' does not exist.`)
}

function checkRef(id: string, valid: Set<string>, ctx: z.RefinementCtx, path: PropertyKey[]): void {
  if (!valid.has(id)) addIssue(ctx, path, `Content reference '${id}' does not exist.`)
}

function addIssue(ctx: z.RefinementCtx, path: PropertyKey[], message: string): void {
  ctx.addIssue({ code: 'custom', path, message })
}
