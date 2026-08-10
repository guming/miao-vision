import { z } from 'zod'
import {
  outcomeAssumptionSchema, outcomeClarificationSchema, resolvedOutcomeBriefSchema
} from './outcome-brief-schema'

const hashSchema = z.string().regex(/^[a-f0-9]{64}$/)
const statusSchema = z.enum(['ready', 'ready_with_assumptions', 'needs_clarification', 'unsupported'])
const nextActionSchema = z.enum(['instantiate', 'confirm', 'clarify', 'stop'])
const formSchema = z.enum(['brief', 'report', 'presentation', 'infographic'])
const rendererSchema = z.enum(['report', 'deck', 'article'])
const targetSchema = z.discriminatedUnion('adapter', [
  z.object({ adapter: z.literal('report-scene'), id: z.string().trim().min(1) }).strict(),
  z.object({ adapter: z.literal('report-template'), id: z.string().trim().min(1) }).strict(),
  z.object({
    adapter: z.literal('deck-pattern'),
    id: z.enum(['executive-brief', 'business-review'])
  }).strict()
])
const densityBudgetSchema = z.object({
  level: z.enum(['concise', 'standard', 'detailed']),
  maxSections: z.number().int().positive(),
  maxPrimaryVisuals: z.number().int().positive()
}).strict()
const qualityGateSchema = z.enum([
  'evidence_validation', 'data_semantics', 'share_safety',
  'catalog_compliance', 'readability'
])
const formatSchema = z.enum(['html', 'pdf'])
const reasonSchema = z.object({ code: z.string().trim().min(1), message: z.string().trim().min(1) }).strict()
const warningSchema = z.object({ code: z.string().trim().min(1), message: z.string().trim().min(1) }).strict()

const sharedShape = {
  schemaVersion: z.literal('2'),
  briefHash: hashSchema,
  contextHash: hashSchema,
  status: statusSchema,
  nextAction: nextActionSchema,
  sourceKind: z.literal('tabular'),
  form: formSchema.nullable(),
  renderer: rendererSchema.nullable(),
  target: targetSchema.nullable(),
  structureRoles: z.array(z.string().trim().min(1)),
  densityBudget: densityBudgetSchema,
  qualityGates: z.array(qualityGateSchema),
  formats: z.array(formatSchema)
}

export const artifactPlanV2Schema = z.object({
  ...sharedShape,
  resolvedBrief: resolvedOutcomeBriefSchema,
  assumptions: z.array(outcomeAssumptionSchema),
  selectionReasons: z.array(reasonSchema),
  warnings: z.array(warningSchema),
  clarification: outcomeClarificationSchema.nullable()
}).strict().superRefine(validatePlanState)

const compactAssumptionSchema = outcomeAssumptionSchema.pick({
  field: true, value: true, source: true, reasonCode: true
})
const compactClarificationSchema = outcomeClarificationSchema.pick({
  field: true, question: true, options: true, reasonCode: true
})

export const compactArtifactPlanV2Schema = z.object({
  ...sharedShape,
  assumptions: z.array(compactAssumptionSchema),
  selectionReasons: z.array(reasonSchema.pick({ code: true })),
  warnings: z.array(warningSchema.pick({ code: true })),
  clarification: compactClarificationSchema.nullable()
}).strict().superRefine(validatePlanState)

type PlanState = {
  status: z.infer<typeof statusSchema>
  nextAction: z.infer<typeof nextActionSchema>
  target: z.infer<typeof targetSchema> | null
  clarification: unknown | null
}

function validatePlanState(plan: PlanState, context: z.RefinementCtx): void {
  const executable = plan.status === 'ready' || plan.status === 'ready_with_assumptions'
  if (executable && plan.target === null) {
    context.addIssue({ code: 'custom', path: ['target'], message: 'executable plans require a target' })
  }
  if (!executable && plan.target !== null) {
    context.addIssue({ code: 'custom', path: ['target'], message: 'blocked plans cannot contain a target' })
  }
  if (plan.status === 'needs_clarification') {
    if (plan.nextAction !== 'clarify') {
      context.addIssue({ code: 'custom', path: ['nextAction'], message: 'clarification plans require nextAction=clarify' })
    }
    if (plan.clarification === null) {
      context.addIssue({ code: 'custom', path: ['clarification'], message: 'clarification is required' })
    }
  } else if (plan.clarification !== null) {
    context.addIssue({ code: 'custom', path: ['clarification'], message: 'clarification is not allowed' })
  }
  if (plan.status === 'unsupported' && plan.nextAction !== 'stop') {
    context.addIssue({ code: 'custom', path: ['nextAction'], message: 'unsupported plans require nextAction=stop' })
  }
  if (executable && plan.nextAction !== 'instantiate' && plan.nextAction !== 'confirm') {
    context.addIssue({ code: 'custom', path: ['nextAction'], message: 'executable plans require instantiate or confirm' })
  }
}

export type ArtifactPlanV2 = z.infer<typeof artifactPlanV2Schema>
export type CompactArtifactPlanV2 = z.infer<typeof compactArtifactPlanV2Schema>

export function compactArtifactPlanV2(plan: ArtifactPlanV2): CompactArtifactPlanV2 {
  return compactArtifactPlanV2Schema.parse({
    schemaVersion: plan.schemaVersion,
    briefHash: plan.briefHash,
    contextHash: plan.contextHash,
    status: plan.status,
    nextAction: plan.nextAction,
    sourceKind: plan.sourceKind,
    form: plan.form,
    renderer: plan.renderer,
    target: plan.target,
    structureRoles: plan.structureRoles,
    densityBudget: plan.densityBudget,
    qualityGates: plan.qualityGates,
    formats: plan.formats,
    assumptions: plan.assumptions.map(({ field, value, source, reasonCode }) => ({ field, value, source, reasonCode })),
    selectionReasons: plan.selectionReasons.map(({ code }) => ({ code })),
    warnings: plan.warnings.map(({ code }) => ({ code })),
    clarification: plan.clarification && {
      field: plan.clarification.field, question: plan.clarification.question,
      options: plan.clarification.options, reasonCode: plan.clarification.reasonCode
    }
  })
}
