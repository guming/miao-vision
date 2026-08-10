import { z } from 'zod'

const nonEmptyText = z.string().trim().min(1)
const audienceScopeSchema = z.enum(['self', 'internal', 'external', 'public'])
const dataLiteracySchema = z.enum(['general', 'business', 'analytical', 'expert'])
const purposeSchema = z.enum(['inform', 'explain', 'decide', 'review', 'teach', 'publish'])
const deliveryContextSchema = z.enum(['chat', 'meeting', 'email', 'archive', 'client', 'public'])
const outcomeFormSchema = z.enum(['auto', 'brief', 'report', 'presentation', 'infographic'])
const densitySchema = z.enum(['concise', 'standard', 'detailed'])
const toneSchema = z.enum(['executive', 'analytical', 'editorial', 'educational'])
const evidencePolicySchema = z.enum(['strict', 'cited', 'draft'])
const privacySchema = z.enum(['personal', 'internal', 'external', 'public'])
const lifecycleModeSchema = z.enum(['one-off', 'recurring'])
const cadenceSchema = z.enum(['weekly', 'monthly', 'quarterly', 'yearly', 'custom'])

const periodSchema = z.object({
  start: z.string().date(),
  end: z.string().date()
}).strict().refine(period => period.start <= period.end, {
  message: 'period.start must be on or before period.end',
  path: ['end']
})

const draftAudienceSchema = z.object({
  role: nonEmptyText.optional(),
  scope: audienceScopeSchema.optional(),
  dataLiteracy: dataLiteracySchema.optional()
}).strict()

const draftGoalSchema = z.object({
  purpose: purposeSchema.optional(),
  keyQuestion: nonEmptyText.optional(),
  decision: nonEmptyText.optional()
}).strict()

const draftDeliverySchema = z.object({
  context: deliveryContextSchema.optional(),
  form: outcomeFormSchema.optional(),
  density: densitySchema.optional(),
  tone: toneSchema.optional()
}).strict()

const draftTrustSchema = z.object({
  evidencePolicy: evidencePolicySchema.optional(),
  privacy: privacySchema.optional()
}).strict()

const draftPresentationSchema = z.object({
  locale: nonEmptyText.optional(),
  brandProfileRef: nonEmptyText.optional()
}).strict()

const draftLifecycleSchema = z.object({
  mode: lifecycleModeSchema.optional(),
  period: periodSchema.optional(),
  cadence: cadenceSchema.optional()
}).strict()

export const draftOutcomeBriefSchema = z.object({
  schemaVersion: z.literal('1'),
  rawRequest: nonEmptyText,
  audience: draftAudienceSchema.optional(),
  goal: draftGoalSchema.optional(),
  delivery: draftDeliverySchema.optional(),
  trust: draftTrustSchema.optional(),
  presentation: draftPresentationSchema.optional(),
  lifecycle: draftLifecycleSchema.optional()
}).strict()

export const resolvedOutcomeBriefSchema = z.object({
  schemaVersion: z.literal('1'),
  rawRequest: nonEmptyText,
  audience: z.object({
    role: nonEmptyText,
    scope: audienceScopeSchema,
    dataLiteracy: dataLiteracySchema
  }).strict(),
  goal: z.object({
    purpose: purposeSchema,
    keyQuestion: nonEmptyText.nullable(),
    decision: nonEmptyText.nullable()
  }).strict(),
  delivery: z.object({
    context: deliveryContextSchema,
    form: outcomeFormSchema,
    density: densitySchema,
    tone: toneSchema
  }).strict(),
  trust: z.object({
    evidencePolicy: evidencePolicySchema,
    privacy: privacySchema,
    shareSafetyRequired: z.boolean(),
    sensitiveDetailsAllowed: z.boolean(),
    recipientReady: z.boolean()
  }).strict(),
  presentation: z.object({
    locale: nonEmptyText,
    brandProfileRef: nonEmptyText.nullable()
  }).strict(),
  lifecycle: z.object({
    mode: lifecycleModeSchema,
    period: periodSchema.nullable(),
    cadence: cadenceSchema.nullable()
  }).strict()
}).strict().superRefine((brief, context) => {
  if (brief.lifecycle.mode === 'recurring' && brief.lifecycle.cadence === null) {
    context.addIssue({
      code: 'custom',
      message: 'recurring lifecycle requires cadence',
      path: ['lifecycle', 'cadence']
    })
  }
})

export const outcomeAssumptionSchema = z.object({
  field: nonEmptyText,
  value: z.unknown(),
  source: z.enum(['project', 'source_hint', 'default']),
  reasonCode: nonEmptyText,
  reason: nonEmptyText
}).strict()

export const outcomeClarificationSchema = z.object({
  field: nonEmptyText,
  question: nonEmptyText,
  options: z.array(nonEmptyText).min(2).max(3),
  reasonCode: nonEmptyText,
  blocking: z.boolean()
}).strict()

export type DraftOutcomeBrief = z.infer<typeof draftOutcomeBriefSchema>
export type ResolvedOutcomeBrief = z.infer<typeof resolvedOutcomeBriefSchema>
export type OutcomeAssumption = z.infer<typeof outcomeAssumptionSchema>
export type OutcomeClarification = z.infer<typeof outcomeClarificationSchema>
