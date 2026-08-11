import { describe, expect, it } from 'vitest'
import { analyzeDataset } from './analyzer'
import { guidanceFromPlan, guidanceFromVerification, artifactGuidanceSchema } from './artifact-guidance'
import { planArtifact } from './artifact-planner'
import { resolveOutcomeBrief } from './outcome-brief-resolver'
import { artifactVerificationSchema } from './artifact-verification-schema'

function plan(rawRequest: string, overrides: Record<string, unknown> = {}) {
  const context = analyzeDataset({
    file: 'sales.csv', columns: ['region', 'sales'], rows: [{ region: 'East', sales: 10 }]
  })
  return planArtifact(resolveOutcomeBrief({ schemaVersion: '1', rawRequest, ...overrides }), context)
}

function verification(status: 'verified' | 'needs_repair' | 'blocked', code = 'PLAN_CONTEXT_MISMATCH') {
  const hash = 'a'.repeat(64)
  return artifactVerificationSchema.parse({
    schemaVersion: '1', status, specKind: 'report', adapter: 'report-scene', targetId: 'overview',
    briefHash: hash, contextHash: hash, planHash: hash, specHash: hash, dataFingerprint: hash,
    checks: [{ code, status: status === 'verified' ? 'passed' : 'failed', message: 'internal detail' }],
    warnings: [], repairHints: [],
    renderReadiness: {
      ready: status === 'verified', allowedFormats: status === 'verified' ? ['html'] : [],
      blockingCodes: status === 'blocked' ? [code] : []
    }
  })
}

describe('Artifact Guidance', () => {
  it.each([
    [{ delivery: { form: 'report' } }, 'proceed'],
    [{ audience: { scope: 'external' }, delivery: { form: 'report' } }, 'confirm'],
    [{}, 'clarify'],
    [{ audience: { scope: 'public' } }, 'stop']
  ])('projects plan state without exposing internal protocol fields', (overrides, state) => {
    const guidance = guidanceFromPlan(plan('Make an artifact', overrides))
    expect(artifactGuidanceSchema.safeParse(guidance).success).toBe(true)
    expect(guidance.state).toBe(state)
    expect(guidance.assumptions.length).toBeLessThanOrEqual(3)
    expect(guidance.reasons.length).toBeLessThanOrEqual(2)
    expect(JSON.stringify(guidance)).not.toMatch(/briefHash|contextHash|adapter|catalog|rawRequest/)
  })

  it('localizes Chinese and English plan guidance deterministically', () => {
    const zh = guidanceFromPlan(plan('给老板做一份报告', { delivery: { form: 'report' } }))
    const en = guidanceFromPlan(plan('Make a report', { delivery: { form: 'report' } }))
    expect(zh.locale).toBe('zh-CN')
    expect(zh.headline).toContain('报告')
    expect(en.locale).toBe('en')
    expect(en.headline).toContain('report')
    expect(guidanceFromPlan(plan('Make a report', { delivery: { form: 'report' } }))).toEqual(en)
  })

  it.each([
    ['verified', 'ready'], ['needs_repair', 'repair'], ['blocked', 'stop']
  ] as const)('projects verification %s as %s', (status, state) => {
    expect(guidanceFromVerification(verification(status), 'zh-CN')).toMatchObject({ state, locale: 'zh-CN' })
  })

  it('uses a stable generic message for unknown verification codes', () => {
    const guidance = guidanceFromVerification(verification('blocked', 'FUTURE_UNKNOWN_CODE'))
    expect(guidance.headline).toBe('The artifact cannot continue')
    expect(guidance.reasons).toEqual(['Validation found an issue that needs attention.'])
  })
})
