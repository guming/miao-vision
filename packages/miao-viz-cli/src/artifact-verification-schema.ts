import { z } from 'zod'

const hashSchema = z.string().regex(/^[a-f0-9]{64}$/)

export const artifactVerificationStatusSchema = z.enum(['verified', 'needs_repair', 'blocked'])

export const artifactVerificationCheckSchema = z.object({
  code: z.string().trim().min(1).max(120),
  status: z.enum(['passed', 'warning', 'failed']),
  message: z.string().trim().min(1).max(500),
  path: z.string().trim().min(1).max(500).optional()
}).strict()

export const artifactVerificationWarningSchema = z.object({
  code: z.string().trim().min(1).max(120),
  message: z.string().trim().min(1).max(500),
  path: z.string().trim().min(1).max(500).optional()
}).strict()

export const artifactRepairHintSchema = z.object({
  code: z.string().trim().min(1).max(120),
  path: z.string().trim().min(1).max(500),
  problem: z.string().trim().min(1).max(500),
  action: z.string().trim().min(1).max(500)
}).strict()

const coverageBucketSchema = z.object({
  eligible: z.number().int().nonnegative(),
  covered: z.number().int().nonnegative()
}).strict().refine(value => value.covered <= value.eligible, {
  message: 'covered cannot exceed eligible'
})

export const artifactEvidenceCoverageSchema = z.object({
  objectCoverage: z.number().min(0).max(1),
  claimCheckCoverage: z.number().min(0).max(1),
  eligibleObjects: z.number().int().nonnegative(),
  coveredObjects: z.number().int().nonnegative(),
  requiredClaimChecks: z.number().int().nonnegative(),
  passedClaimChecks: z.number().int().nonnegative(),
  invalidReferences: z.number().int().nonnegative(),
  failedClaimChecks: z.number().int().nonnegative(),
  empty: z.boolean(),
  byType: z.record(z.string(), coverageBucketSchema)
}).strict()

const renderReadinessSchema = z.object({
  ready: z.boolean(),
  allowedFormats: z.array(z.enum(['html', 'pdf', 'png', 'svg'])),
  blockingCodes: z.array(z.string().trim().min(1).max(120))
}).strict()

export const artifactVerificationSchema = z.object({
  schemaVersion: z.literal('1'),
  status: artifactVerificationStatusSchema,
  specKind: z.enum(['report', 'deck']),
  adapter: z.enum(['report-scene', 'report-template', 'deck-pattern']),
  targetId: z.string().trim().min(1).max(200),
  briefHash: hashSchema,
  contextHash: hashSchema,
  planHash: hashSchema,
  specHash: hashSchema,
  dataFingerprint: hashSchema,
  checks: z.array(artifactVerificationCheckSchema),
  evidenceCoverage: artifactEvidenceCoverageSchema.optional(),
  warnings: z.array(artifactVerificationWarningSchema),
  repairHints: z.array(artifactRepairHintSchema),
  renderReadiness: renderReadinessSchema
}).strict().superRefine((verification, context) => {
  const { status, renderReadiness } = verification
  if (status === 'verified' && !renderReadiness.ready) {
    context.addIssue({
      code: 'custom', path: ['renderReadiness', 'ready'],
      message: 'verified artifacts must be render-ready'
    })
  }
  if (status !== 'verified' && renderReadiness.ready) {
    context.addIssue({
      code: 'custom', path: ['renderReadiness', 'ready'],
      message: `${status} artifacts cannot be render-ready`
    })
  }
  if (status === 'blocked' && renderReadiness.blockingCodes.length === 0) {
    context.addIssue({
      code: 'custom', path: ['renderReadiness', 'blockingCodes'],
      message: 'blocked artifacts require at least one blocking code'
    })
  }
  if (renderReadiness.ready && renderReadiness.blockingCodes.length > 0) {
    context.addIssue({
      code: 'custom', path: ['renderReadiness', 'blockingCodes'],
      message: 'render-ready artifacts cannot contain blocking codes'
    })
  }
})

export type ArtifactVerification = z.infer<typeof artifactVerificationSchema>
export type ArtifactVerificationCheck = z.infer<typeof artifactVerificationCheckSchema>
export type ArtifactVerificationWarning = z.infer<typeof artifactVerificationWarningSchema>
export type ArtifactRepairHint = z.infer<typeof artifactRepairHintSchema>
export type ArtifactEvidenceCoverage = z.infer<typeof artifactEvidenceCoverageSchema>
