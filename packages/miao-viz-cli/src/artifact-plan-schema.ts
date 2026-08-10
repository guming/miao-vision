import { z } from 'zod'
import {
  outcomeAssumptionSchema, outcomeClarificationSchema, resolvedOutcomeBriefSchema
} from './outcome-brief-schema'
import {
  artifactPlanV2Schema, compactArtifactPlanV2Schema,
  type ArtifactPlanV2, type CompactArtifactPlanV2
} from './artifact-plan-v2-schema'

const planStatusSchema = z.enum([
  'ready', 'ready_with_assumptions', 'needs_clarification', 'unsupported'
])
const plannedFormSchema = z.enum(['brief', 'report', 'presentation', 'infographic'])
const rendererSchema = z.enum(['report', 'deck', 'article'])
const qualityGateSchema = z.enum([
  'evidence_validation', 'data_semantics', 'share_safety',
  'catalog_compliance', 'readability'
])
const outputFormatSchema = z.enum(['html', 'pdf'])

const densityBudgetSchema = z.object({
  level: z.enum(['concise', 'standard', 'detailed']),
  maxSections: z.number().int().positive(),
  maxPrimaryVisuals: z.number().int().positive()
}).strict()

const selectionReasonSchema = z.object({
  code: z.string().trim().min(1),
  message: z.string().trim().min(1)
}).strict()

const warningSchema = z.object({
  code: z.string().trim().min(1),
  message: z.string().trim().min(1)
}).strict()

const completePlanShape = {
  schemaVersion: z.literal('1'),
  briefHash: z.string().regex(/^[a-f0-9]{64}$/),
  status: planStatusSchema,
  sourceKind: z.literal('tabular'),
  resolvedBrief: resolvedOutcomeBriefSchema,
  assumptions: z.array(outcomeAssumptionSchema),
  form: plannedFormSchema.nullable(),
  renderer: rendererSchema.nullable(),
  pattern: z.string().trim().min(1).nullable(),
  structureRoles: z.array(z.string().trim().min(1)),
  densityBudget: densityBudgetSchema,
  qualityGates: z.array(qualityGateSchema),
  formats: z.array(outputFormatSchema),
  selectionReasons: z.array(selectionReasonSchema),
  warnings: z.array(warningSchema),
  clarification: outcomeClarificationSchema.nullable()
}

export const artifactPlanSchema = z.object(completePlanShape).strict().superRefine((plan, context) => {
  if (plan.status === 'needs_clarification' && plan.clarification === null) {
    context.addIssue({ code: 'custom', path: ['clarification'], message: 'clarification is required' })
  }
  if (plan.status !== 'needs_clarification' && plan.clarification !== null) {
    context.addIssue({ code: 'custom', path: ['clarification'], message: 'clarification is not allowed' })
  }
  if (plan.status === 'unsupported' && (plan.renderer !== null || plan.pattern !== null)) {
    context.addIssue({ code: 'custom', path: ['renderer'], message: 'unsupported plans cannot select a renderer or pattern' })
  }
})

const compactAssumptionSchema = outcomeAssumptionSchema.pick({
  field: true, value: true, source: true, reasonCode: true
})
const compactReasonSchema = selectionReasonSchema.pick({ code: true })
const compactWarningSchema = warningSchema.pick({ code: true })
const compactClarificationSchema = outcomeClarificationSchema.pick({
  field: true, question: true, options: true, reasonCode: true
})

export const compactArtifactPlanSchema = z.object({
  schemaVersion: z.literal('1'),
  briefHash: z.string().regex(/^[a-f0-9]{64}$/),
  status: planStatusSchema,
  sourceKind: z.literal('tabular'),
  assumptions: z.array(compactAssumptionSchema),
  form: plannedFormSchema.nullable(),
  renderer: rendererSchema.nullable(),
  pattern: z.string().trim().min(1).nullable(),
  structureRoles: z.array(z.string().trim().min(1)),
  densityBudget: densityBudgetSchema,
  qualityGates: z.array(qualityGateSchema),
  formats: z.array(outputFormatSchema),
  selectionReasons: z.array(compactReasonSchema),
  warnings: z.array(compactWarningSchema),
  clarification: compactClarificationSchema.nullable()
}).strict()

export type ArtifactPlan = z.infer<typeof artifactPlanSchema>
export type CompactArtifactPlan = z.infer<typeof compactArtifactPlanSchema>

export type ReadableArtifactPlan =
  | { schemaVersion: '1'; executable: false; plan: ArtifactPlan | CompactArtifactPlan }
  | { schemaVersion: '2'; executable: true; plan: ArtifactPlanV2 | CompactArtifactPlanV2 }

export function parseReadableArtifactPlan(value: unknown): ReadableArtifactPlan | null {
  const version = value && typeof value === 'object'
    ? (value as { schemaVersion?: unknown }).schemaVersion : undefined
  if (version === '2') {
    const full = artifactPlanV2Schema.safeParse(value)
    if (full.success) return { schemaVersion: '2', executable: true, plan: full.data }
    const compact = compactArtifactPlanV2Schema.safeParse(value)
    return compact.success ? { schemaVersion: '2', executable: true, plan: compact.data } : null
  }
  if (version === '1') {
    const full = artifactPlanSchema.safeParse(value)
    if (full.success) return { schemaVersion: '1', executable: false, plan: full.data }
    const compact = compactArtifactPlanSchema.safeParse(value)
    return compact.success ? { schemaVersion: '1', executable: false, plan: compact.data } : null
  }
  return null
}

export function compactArtifactPlan(plan: ArtifactPlan): CompactArtifactPlan {
  return compactArtifactPlanSchema.parse({
    schemaVersion: plan.schemaVersion,
    briefHash: plan.briefHash,
    status: plan.status,
    sourceKind: plan.sourceKind,
    assumptions: plan.assumptions.map(({ field, value, source, reasonCode }) => ({
      field, value, source, reasonCode
    })),
    form: plan.form,
    renderer: plan.renderer,
    pattern: plan.pattern,
    structureRoles: plan.structureRoles,
    densityBudget: plan.densityBudget,
    qualityGates: plan.qualityGates,
    formats: plan.formats,
    selectionReasons: plan.selectionReasons.map(({ code }) => ({ code })),
    warnings: plan.warnings.map(({ code }) => ({ code })),
    clarification: plan.clarification && {
      field: plan.clarification.field,
      question: plan.clarification.question,
      options: plan.clarification.options,
      reasonCode: plan.clarification.reasonCode
    }
  })
}
