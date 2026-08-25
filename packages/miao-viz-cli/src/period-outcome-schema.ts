import { z } from 'zod'

const nonEmptyText = z.string().trim().min(1)
const finiteNumber = z.number().finite()
const evidenceRefs = z.array(nonEmptyText).min(1)

export const periodMetricOutcomeSchema = z.object({
  id: nonEmptyText,
  classification: z.enum(['favorable', 'adverse', 'neutral']),
  evidenceId: nonEmptyText,
  metric: nonEmptyText,
  label: nonEmptyText,
  previous: finiteNumber,
  current: finiteNumber,
  absolute: finiteNumber,
  percent: finiteNumber.nullable(),
  materiality: z.object({
    matchedAbsolute: z.boolean(),
    matchedPercent: z.boolean()
  }).strict(),
  evidenceRefs
}).strict()

export const periodGoalOutcomeSchema = z.object({
  id: nonEmptyText,
  evidenceId: nonEmptyText,
  metric: nonEmptyText,
  label: nonEmptyText,
  status: z.enum(['met', 'missed']),
  current: finiteNumber,
  target: finiteNumber,
  evidenceRefs
}).strict()

export const periodRankingOutcomeSchema = z.object({
  id: nonEmptyText,
  evidenceId: nonEmptyText,
  item: nonEmptyText,
  kind: z.enum(['movement', 'entered', 'departed']),
  previousRank: z.number().int().positive().nullable(),
  currentRank: z.number().int().positive().nullable(),
  movement: z.number().int().nullable(),
  evidenceRefs
}).strict()

export const periodRecommendationSchema = z.object({
  id: nonEmptyText,
  text: nonEmptyText,
  evidenceRefs
}).strict()

export const periodOutcomeBriefSchema = z.object({
  schemaVersion: z.literal(1),
  period: nonEmptyText,
  baselineRunId: nonEmptyText.nullable(),
  noMaterialChange: z.boolean(),
  outcomes: z.array(periodMetricOutcomeSchema),
  goals: z.array(periodGoalOutcomeSchema),
  rankings: z.array(periodRankingOutcomeSchema),
  anomalies: z.object({ added: z.array(nonEmptyText), removed: z.array(nonEmptyText) }).strict(),
  warnings: z.array(z.object({
    code: nonEmptyText,
    message: nonEmptyText,
    evidenceId: nonEmptyText.optional()
  }).strict()),
  recommendations: z.array(periodRecommendationSchema)
}).strict()

export type PeriodMetricOutcome = z.infer<typeof periodMetricOutcomeSchema>
export type PeriodGoalOutcome = z.infer<typeof periodGoalOutcomeSchema>
export type PeriodRankingOutcome = z.infer<typeof periodRankingOutcomeSchema>
export type PeriodRecommendation = z.infer<typeof periodRecommendationSchema>
export type PeriodOutcomeBrief = z.infer<typeof periodOutcomeBriefSchema>
