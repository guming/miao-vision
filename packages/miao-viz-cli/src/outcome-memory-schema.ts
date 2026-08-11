import { z } from 'zod'

const nonEmptyText = z.string().trim().min(1)
const timestampSchema = z.iso.datetime({ offset: true })
const sourceSchema = z.enum(['explicit', 'confirmed'])
export const OUTCOME_MEMORY_FIELDS = [
  'audience.role', 'audience.scope', 'audience.dataLiteracy', 'goal.purpose',
  'delivery.context', 'delivery.form', 'delivery.density', 'delivery.tone',
  'trust.evidencePolicy', 'trust.privacy', 'presentation.locale',
  'presentation.brandProfileRef', 'lifecycle.mode', 'lifecycle.cadence'
] as const

function preference<const T extends string, S extends z.ZodType>(field: T, value: S) {
  return z.object({
    field: z.literal(field),
    value,
    source: sourceSchema,
    updatedAt: timestampSchema
  }).strict()
}

export const outcomeMemoryPreferenceSchema = z.discriminatedUnion('field', [
  preference('audience.role', nonEmptyText),
  preference('audience.scope', z.enum(['self', 'internal', 'external', 'public'])),
  preference('audience.dataLiteracy', z.enum(['general', 'business', 'analytical', 'expert'])),
  preference('goal.purpose', z.enum(['inform', 'explain', 'decide', 'review', 'teach', 'publish'])),
  preference('delivery.context', z.enum(['chat', 'meeting', 'email', 'archive', 'client', 'public'])),
  preference('delivery.form', z.enum(['auto', 'brief', 'report', 'presentation', 'infographic'])),
  preference('delivery.density', z.enum(['concise', 'standard', 'detailed'])),
  preference('delivery.tone', z.enum(['executive', 'analytical', 'editorial', 'educational'])),
  preference('trust.evidencePolicy', z.enum(['strict', 'cited', 'draft'])),
  preference('trust.privacy', z.enum(['personal', 'internal', 'external', 'public'])),
  preference('presentation.locale', nonEmptyText),
  preference('presentation.brandProfileRef', nonEmptyText),
  preference('lifecycle.mode', z.enum(['one-off', 'recurring'])),
  preference('lifecycle.cadence', z.enum(['weekly', 'monthly', 'quarterly', 'yearly', 'custom']))
])

const uniquePreferences = <T extends z.ZodType>(schema: T) => z.array(schema).superRefine((items, context) => {
  const seen = new Set<string>()
  items.forEach((item, index) => {
    const field = (item as { field: string }).field
    if (seen.has(field)) {
      context.addIssue({
        code: 'custom',
        message: `duplicate memory preference: ${field}`,
        path: [index, 'field']
      })
    }
    seen.add(field)
  })
})

export const outcomeMemorySchema = z.object({
  schemaVersion: z.literal('1'),
  preferences: uniquePreferences(outcomeMemoryPreferenceSchema),
  createdAt: timestampSchema,
  updatedAt: timestampSchema
}).strict().refine(memory => memory.createdAt <= memory.updatedAt, {
  message: 'createdAt must be on or before updatedAt',
  path: ['updatedAt']
})

export const outcomeMemoryProposalSchema = z.object({
  schemaVersion: z.literal('1'),
  preferences: uniquePreferences(outcomeMemoryPreferenceSchema).min(1)
}).strict()

export const outcomeMemoryFieldSchema = z.enum(OUTCOME_MEMORY_FIELDS)

export type OutcomeMemory = z.infer<typeof outcomeMemorySchema>
export type OutcomeMemoryPreference = z.infer<typeof outcomeMemoryPreferenceSchema>
export type OutcomeMemoryProposal = z.infer<typeof outcomeMemoryProposalSchema>
export type OutcomeMemoryField = OutcomeMemoryPreference['field']
