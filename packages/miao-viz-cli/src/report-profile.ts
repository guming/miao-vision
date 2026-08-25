import { z } from 'zod'

const nonEmptyText = z.string().trim().min(1)
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'must be a six-digit hex color')
const threshold = z.number().finite().nonnegative()

export const reportMetricProfileSchema = z.object({
  evidenceId: nonEmptyText,
  metric: nonEmptyText,
  label: nonEmptyText,
  desiredDirection: z.enum(['increase', 'decrease', 'neutral']).optional(),
  target: z.number().finite().optional(),
  materiality: z.object({
    absolute: threshold.optional(),
    percent: threshold.optional()
  }).strict().optional()
}).strict().superRefine((metric, context) => {
  if (metric.materiality?.absolute === undefined && metric.materiality?.percent === undefined) {
    context.addIssue({
      code: 'custom',
      path: ['materiality'],
      message: 'at least one absolute or percent materiality threshold is required'
    })
  }
})

export const reportProfileSchema = z.object({
  schemaVersion: z.literal(1),
  client: z.object({
    name: nonEmptyText,
    reportTitle: nonEmptyText.optional(),
    confidentiality: nonEmptyText.optional()
  }).strict().optional(),
  presentation: z.object({
    locale: nonEmptyText.optional(),
    logo: nonEmptyText.optional(),
    primaryColor: color.optional(),
    accentColor: color.optional(),
    footer: nonEmptyText.optional()
  }).strict().optional(),
  audience: z.object({
    primary: z.enum(['client', 'operator', 'manager']).optional(),
    tone: z.enum(['executive', 'analytical']).optional()
  }).strict().optional(),
  metrics: z.array(reportMetricProfileSchema).min(1)
}).strict().superRefine((profile, context) => {
  const seen = new Set<string>()
  profile.metrics.forEach((metric, index) => {
    const key = `${metric.evidenceId}\u0000${metric.metric}`
    if (seen.has(key)) {
      context.addIssue({
        code: 'custom',
        path: ['metrics', index],
        message: `duplicate metric reference '${metric.evidenceId}.${metric.metric}'`
      })
    }
    seen.add(key)
  })
})

export type ReportMetricProfile = z.infer<typeof reportMetricProfileSchema>
export type ReportProfileV1 = z.infer<typeof reportProfileSchema>
