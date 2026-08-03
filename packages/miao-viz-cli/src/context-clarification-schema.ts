import { z } from 'zod'

export const clarificationQuestionSchema = z.object({
  id: z.string().min(1),
  question: z.string().min(1),
  options: z.array(z.string()),
  blocking: z.boolean(),
  appliesTo: z.enum(['measure', 'dimension', 'time', 'template'])
})
