import { describe, expect, it } from 'vitest'
import { planArtifact } from './artifact-planner'
import type { AnalyzeContext } from './context-schema'
import { resolveOutcomeBrief } from './outcome-brief-resolver'
import type { DraftOutcomeBrief } from './outcome-brief-schema'

function context(overrides: Partial<AnalyzeContext> = {}): AnalyzeContext {
  return {
    intent: { raw: '', coverage: 'full', assumptions: [] }, fields: [], evidence: [],
    catalog: {
      charts: [], blockedCharts: [], recommendedPlan: [],
      scenes: [
        { id: 'lower', name: 'Lower', description: '', score: 0.5, keywords: [], requiredRoles: [], metricSemantics: [], templates: [], blocks: ['detail'] },
        { id: 'business-overview', name: 'Overview', description: '', score: 0.9, keywords: [], requiredRoles: [], metricSemantics: [], templates: [], blocks: ['kpi', 'trend'] }
      ],
      templates: [{ id: 'fallback', score: 0.8, bestFor: [], requires: [], blocks: ['table'], density: 'medium' }],
      deckPatterns: [
        { id: 'executive-brief', score: 0.8, density: 'compact', blocks: ['kpi-snapshot'] },
        { id: 'business-review', score: 0.9, density: 'medium', blocks: ['kpi-snapshot', 'ranking-slide'] }
      ]
    },
    sampleWarnings: [], promptRules: [], ...overrides
  }
}

function plan(draft: Omit<DraftOutcomeBrief, 'schemaVersion' | 'rawRequest'>, ctx = context()) {
  return planArtifact(resolveOutcomeBrief({ schemaVersion: '1', rawRequest: 'x', ...draft }), ctx)
}

describe('planArtifact routing matrix', () => {
  it.each([
    ['explicit report', { delivery: { form: 'report' } }, 'report', 'report', 'business-overview', 'explicit_report'],
    ['explicit presentation', { delivery: { form: 'presentation' } }, 'presentation', 'deck', 'business-review', 'explicit_presentation'],
    ['meeting executive', { delivery: { context: 'meeting', tone: 'executive' }, goal: { keyQuestion: 'What changed?' } }, 'presentation', 'deck', 'executive-brief', 'presentation_score_higher'],
    ['meeting concise', { delivery: { context: 'meeting', density: 'concise' }, goal: { decision: 'Choose action' } }, 'presentation', 'deck', 'executive-brief', 'presentation_score_higher'],
    ['archive detailed', { delivery: { context: 'archive', density: 'detailed' } }, 'report', 'report', 'business-overview', 'report_score_higher'],
    ['archive analytical', { delivery: { context: 'archive', tone: 'analytical' } }, 'report', 'report', 'business-overview', 'report_score_higher'],
    ['email detailed', { delivery: { context: 'email', density: 'detailed' } }, 'report', 'report', 'business-overview', 'report_score_higher'],
    ['recurring', { lifecycle: { mode: 'recurring', cadence: 'monthly' } }, 'report', 'report', 'business-overview', 'report_score_higher'],
    ['chat concise', { delivery: { context: 'chat', density: 'concise' } }, 'brief', 'report', 'business-overview', 'chat_concise_brief'],
    ['internal executive decision', { audience: { scope: 'internal' }, delivery: { tone: 'executive' }, goal: { decision: 'Approve' } }, 'presentation', 'deck', 'executive-brief', 'presentation_score_higher'],
    ['analytical decision', { delivery: { tone: 'analytical', density: 'detailed' }, goal: { decision: 'Approve' } }, 'report', 'report', 'business-overview', 'report_score_higher'],
    ['external explicit report', { audience: { scope: 'external' }, delivery: { form: 'report' } }, 'report', 'report', 'business-overview', 'explicit_report']
  ] as const)('%s', (_name, draft, form, renderer, pattern, reason) => {
    const result = plan(draft as Omit<DraftOutcomeBrief, 'schemaVersion' | 'rawRequest'>)
    expect([result.form, result.renderer, result.target?.id]).toEqual([form, renderer, pattern])
    expect(result.selectionReasons[0]?.code).toBe(reason)
  })

  it('does not let scoring override an explicit form', () => {
    expect(plan({ delivery: { form: 'report', context: 'meeting', tone: 'executive' } }).form).toBe('report')
  })

  it('returns unsupported for public auto-routing and future infographic requests', () => {
    expect(plan({ audience: { scope: 'public' } }).status).toBe('unsupported')
    expect(plan({ delivery: { form: 'infographic' } }).status).toBe('unsupported')
  })

  it('asks one form clarification when scores are close and intent is sparse', () => {
    const result = plan({})
    expect(result.status).toBe('needs_clarification')
    expect(result.clarification?.reasonCode).toBe('presentation_or_reading')
  })

  it('prioritizes a blocking data clarification', () => {
    const result = plan({ delivery: { form: 'presentation' } }, context({
      clarificationQuestions: [{
        id: 'primary_measure', question: '收入指哪个字段？', options: ['revenue', 'net_revenue'],
        blocking: true, appliesTo: 'measure'
      }]
    }))
    expect(result.status).toBe('needs_clarification')
    expect(result.clarification?.reasonCode).toBe('data_semantics_blocking')
  })

  it('never selects blocked report catalog items', () => {
    const ctx = context()
    ctx.catalog.blockedScenes = [{ id: 'business-overview', reason: 'blocked' }]
    expect(plan({ delivery: { form: 'report' } }, ctx).target?.id).toBe('lower')
  })

  it('returns unsupported instead of guessing without an allowed pattern', () => {
    const ctx = context()
    ctx.catalog.scenes = []
    ctx.catalog.templates = []
    expect(plan({ delivery: { form: 'report' } }, ctx).status).toBe('unsupported')
    ctx.catalog.deckPatterns = []
    expect(plan({ delivery: { form: 'presentation' } }, ctx).status).toBe('unsupported')
  })

  it('is deterministic including selection reasons', () => {
    const brief = resolveOutcomeBrief({
      schemaVersion: '1', rawRequest: 'x', delivery: { context: 'archive', density: 'detailed' }
    })
    expect(planArtifact(brief, context())).toEqual(planArtifact(brief, context()))
  })

  it.each([
    ['external defaults', { audience: { scope: 'external' }, delivery: { form: 'report' } }, 'confirm'],
    ['public explicit report defaults', { audience: { scope: 'public' }, delivery: { form: 'report' } }, 'confirm'],
    ['external privacy explicit', { audience: { scope: 'external' }, delivery: { form: 'report' }, trust: { privacy: 'external' } }, 'confirm'],
    ['external evidence explicit', { audience: { scope: 'external' }, delivery: { form: 'report' }, trust: { evidencePolicy: 'strict' } }, 'confirm'],
    ['external trust explicit', { audience: { scope: 'external' }, delivery: { form: 'report' }, trust: { privacy: 'external', evidencePolicy: 'strict' } }, 'instantiate'],
    ['internal defaults', { audience: { scope: 'internal' }, delivery: { form: 'report' } }, 'instantiate']
  ] as const)('sets confirmation policy for %s', (_name, draft, nextAction) => {
    const result = plan(draft as Omit<DraftOutcomeBrief, 'schemaVersion' | 'rawRequest'>)
    expect(result.nextAction).toBe(nextAction)
  })

  it('allows draft spec generation but warns that it is not recipient-ready', () => {
    const result = plan({
      audience: { scope: 'internal' }, delivery: { form: 'report' },
      trust: { privacy: 'internal', evidencePolicy: 'draft' }
    })
    expect(result.nextAction).toBe('instantiate')
    expect(result.warnings.some(item => item.code === 'draft_not_recipient_ready')).toBe(true)
  })

  it('emits a stable context hash and discriminated targets', () => {
    const report = plan({ delivery: { form: 'report' } })
    const deck = plan({ delivery: { form: 'presentation' } })
    expect(report.contextHash).toMatch(/^[a-f0-9]{64}$/)
    expect(report.target).toEqual({ adapter: 'report-scene', id: 'business-overview' })
    expect(deck.target).toEqual({ adapter: 'deck-pattern', id: 'business-review' })
  })
})
