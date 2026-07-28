import { z } from 'zod'

export type CatalogSceneSummary = [id: string, score: number, templates: string[], blocks: string[]]

export interface CatalogSceneEntry {
  id: string
  name: string
  description: string
  score: number
  keywords: string[]
  requiredRoles: Array<'measure' | 'dimension' | 'time'>
  metricSemantics: string[]
  templates: string[]
  blocks: string[]
}

export interface BlockedSceneEntry {
  id: string
  reason: string
  missing?: string[]
  clarificationQuestions?: string[]
}

export const catalogSceneEntrySchema = z.object({
  id: z.string().min(1), name: z.string().min(1), description: z.string(),
  score: z.number().min(0).max(1), keywords: z.array(z.string()),
  requiredRoles: z.array(z.enum(['measure', 'dimension', 'time'])),
  metricSemantics: z.array(z.string()), templates: z.array(z.string()), blocks: z.array(z.string())
})

export const blockedSceneEntrySchema = z.object({
  id: z.string().min(1), reason: z.string().min(1),
  missing: z.array(z.string()).optional(),
  clarificationQuestions: z.array(z.string()).optional()
})
