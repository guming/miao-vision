import { z } from 'zod'

export const DECK_PLAN_PATTERNS = ['executive-brief', 'business-review', 'topic-explainer', 'project-update', 'proposal'] as const
export const DECK_PLAN_BLOCK_IDS = [
  'cover-claim', 'kpi-snapshot', 'trend-overview-slide', 'ranking-slide', 'data-quality-slide',
  'narrative-cover', 'section-summary', 'quote-focus', 'text-comparison', 'decision-request', 'narrative-ending'
] as const

const deckPlanClaimSchema = z.object({
  text: z.string().min(1),
  claimType: z.enum([
    'descriptive', 'rank', 'delta', 'trend', 'share',
    'comparative', 'evaluative', 'causal', 'predictive'
  ]),
  evidence: z.array(z.string().min(1)).min(1),
  derivedFrom: z.array(z.string().min(1)).min(1),
  check: z.enum([
    'evidence_ref_exists', 'value_match', 'rank_position', 'delta_formula',
    'trend_periods', 'share_formula', 'benchmark_present', 'caveat_present'
  ]),
  caveat: z.string().min(1).optional()
})

export const deckPlanSchema = z.object({
  deckPlan: z.object({
    intent: z.enum(DECK_PLAN_PATTERNS),
    audience: z.string().min(1),
    objective: z.string().min(1).optional(),
    primaryQuestion: z.string().min(1),
    sourceStrategy: z.object({
      narrative: z.enum(['primary', 'supporting', 'unused']).optional(),
      data: z.enum(['primary', 'supporting', 'unused']).optional()
    }).optional(),
    storyArc: z.object({ opening: z.string().min(1), development: z.string().min(1), resolution: z.string().min(1) }).optional(),
    mainClaim: deckPlanClaimSchema.optional(),
    slideOutline: z.array(z.object({
      role: z.enum(DECK_PLAN_BLOCK_IDS),
      purpose: z.string().min(1),
      evidence: z.array(z.string().min(1)).optional(),
      warningRefs: z.array(z.string().min(1)).optional(),
      sourceRefs: z.array(z.string().min(1)).optional(),
      contentMode: z.enum(['quote', 'summarize', 'explain', 'compare', 'evidence', 'recommend']).optional(),
      claimStatus: z.enum(['source-text', 'author-claim', 'verified-claim']).optional(),
      speakerGoal: z.string().min(1).optional()
    })).min(1),
    blockedClaims: z.array(z.object({
      text: z.string().min(1),
      reasonCode: z.string().min(1),
      reason: z.string().min(1)
    })),
    assumptions: z.array(z.object({
      key: z.string().min(1),
      value: z.string().min(1),
      reason: z.string().min(1)
    })),
    warningRefs: z.array(z.string().min(1)).optional()
  })
}).superRefine((document, ctx) => {
  const plan = document.deckPlan
  if (plan.intent === 'executive-brief' || plan.intent === 'business-review') return
  for (const field of ['objective', 'sourceStrategy', 'storyArc'] as const) {
    if (!plan[field]) ctx.addIssue({ code: 'custom', path: ['deckPlan', field], message: `${field} is required for narrative patterns.` })
  }
  plan.slideOutline.forEach((slide, index) => {
    for (const field of ['contentMode', 'claimStatus', 'speakerGoal'] as const) {
      if (!slide[field]) ctx.addIssue({ code: 'custom', path: ['deckPlan', 'slideOutline', index, field], message: `${field} is required for narrative patterns.` })
    }
    const sourceOptional = slide.role === 'narrative-cover' || slide.role === 'narrative-ending'
    if (!sourceOptional && !slide.sourceRefs?.length && !slide.evidence?.length) {
      ctx.addIssue({ code: 'custom', path: ['deckPlan', 'slideOutline', index], message: 'A narrative slide requires sourceRefs or evidence.' })
    }
  })
})

export type DeckPlanDocument = z.infer<typeof deckPlanSchema>
