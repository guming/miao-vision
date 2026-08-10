import { describe, expect, it } from 'vitest'
import { artifactVerificationSchema } from './artifact-verification-schema'

const hash = 'a'.repeat(64)

function verification(status: 'verified' | 'needs_repair' | 'blocked') {
  return {
    schemaVersion: '1', status, specKind: 'report', adapter: 'report-scene', targetId: 'business-overview',
    briefHash: hash, contextHash: hash, planHash: hash, specHash: hash, dataFingerprint: hash,
    checks: [{ code: 'SPEC_SCHEMA', status: status === 'verified' ? 'passed' : 'failed', message: 'Spec schema checked.' }],
    warnings: [], repairHints: status === 'needs_repair'
      ? [{ code: 'FIELD_NOT_FOUND', path: 'charts.0.encoding.x.field', problem: 'Field is missing.', action: 'Choose an available field.' }]
      : [],
    renderReadiness: {
      ready: status === 'verified', allowedFormats: status === 'verified' ? ['html', 'pdf'] : [],
      blockingCodes: status === 'blocked' ? ['PLAN_CONTEXT_MISMATCH'] : []
    }
  }
}

describe('artifactVerificationSchema', () => {
  it.each(['verified', 'needs_repair', 'blocked'] as const)('accepts %s', status => {
    expect(artifactVerificationSchema.safeParse(verification(status)).success).toBe(true)
  })

  it('requires verified artifacts to be render-ready', () => {
    const input = verification('verified')
    input.renderReadiness.ready = false
    expect(artifactVerificationSchema.safeParse(input).success).toBe(false)
  })

  it('prevents repair and blocked states from being render-ready', () => {
    for (const status of ['needs_repair', 'blocked'] as const) {
      const input = verification(status)
      input.renderReadiness.ready = true
      expect(artifactVerificationSchema.safeParse(input).success).toBe(false)
    }
  })

  it('requires blocked states to identify a blocking code', () => {
    const input = verification('blocked')
    input.renderReadiness.blockingCodes = []
    expect(artifactVerificationSchema.safeParse(input).success).toBe(false)
  })

  it('requires stable repair hint fields', () => {
    const input = verification('needs_repair') as any
    delete input.repairHints[0].action
    expect(artifactVerificationSchema.safeParse(input).success).toBe(false)
  })

  it('rejects raw requests, paths, rows, and catalog payloads', () => {
    for (const extra of ['rawRequest', 'inputPath', 'evidenceRows', 'catalog']) {
      expect(artifactVerificationSchema.safeParse({ ...verification('verified'), [extra]: {} }).success).toBe(false)
    }
  })

  it('keeps the serialized contract compact', () => {
    expect(Buffer.byteLength(JSON.stringify(verification('verified')))).toBeLessThan(8 * 1024)
  })
})
