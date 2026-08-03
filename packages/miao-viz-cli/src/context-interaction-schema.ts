import { z } from 'zod'

export interface InteractionRecommendation {
  preset: 'filter' | 'filter-and-detail'
  score: number
  filters: Array<{ field: string; type: 'select' | 'range'; reason: string }>
  detailFields: string[] | null
  dataPolicy: 'minimal' | 'detail-safe'
  risks: string[]
}

export type CompactInteractionRecommendation = [
  preset: InteractionRecommendation['preset'],
  score: number,
  filters: Array<[string, 'select' | 'range', string]>,
  detailFields: string[] | null,
  dataPolicy: InteractionRecommendation['dataPolicy'],
  risks: string[]
]

export const interactionRecommendationSchema = z.object({
  preset: z.enum(['filter', 'filter-and-detail']),
  score: z.number().min(0).max(1),
  filters: z.array(z.object({ field: z.string(), type: z.enum(['select', 'range']), reason: z.string() })).max(2),
  detailFields: z.array(z.string()).nullable(),
  dataPolicy: z.enum(['minimal', 'detail-safe']),
  risks: z.array(z.string())
})

export const compactInteractionRecommendationSchema = z.tuple([
  z.enum(['filter', 'filter-and-detail']),
  z.number(),
  z.array(z.tuple([z.string(), z.enum(['select', 'range']), z.string()])),
  z.array(z.string()).nullable(),
  z.enum(['minimal', 'detail-safe']),
  z.array(z.string())
])
