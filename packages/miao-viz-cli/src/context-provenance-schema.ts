import { z } from 'zod'

export interface CatalogProvenanceRecipe {
  objectKind: 'kpi' | 'chart' | 'insight'
  evidenceId: string
  resultPath: 'values' | 'rows'
  path: string
  fields: string[]
}

export const catalogProvenanceRecipeSchema = z.object({
  objectKind: z.enum(['kpi', 'chart', 'insight']),
  evidenceId: z.string().min(1),
  resultPath: z.enum(['values', 'rows']),
  path: z.string().min(1),
  fields: z.array(z.string().min(1))
})
