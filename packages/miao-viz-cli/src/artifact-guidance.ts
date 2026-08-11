import { z } from 'zod'
import type { ArtifactPlanV2 } from './artifact-plan-v2-schema'
import type { ArtifactVerification } from './artifact-verification-schema'

const nonEmptyText = z.string().trim().min(1).max(500)

export const artifactGuidanceSchema = z.object({
  schemaVersion: z.literal('1'),
  locale: nonEmptyText,
  state: z.enum(['proceed', 'confirm', 'clarify', 'stop', 'ready', 'repair']),
  headline: nonEmptyText,
  form: z.enum(['brief', 'report', 'presentation', 'infographic']).nullable(),
  structure: z.array(nonEmptyText).max(12),
  reasons: z.array(nonEmptyText).max(2),
  assumptions: z.array(nonEmptyText).max(3),
  safetyNotice: nonEmptyText.nullable(),
  question: z.object({
    text: nonEmptyText,
    options: z.array(nonEmptyText).min(2).max(3)
  }).strict().nullable(),
  nextStep: nonEmptyText
}).strict()

export type ArtifactGuidance = z.infer<typeof artifactGuidanceSchema>

export function guidanceFromPlan(plan: ArtifactPlanV2): ArtifactGuidance {
  const zh = isChinese(plan.resolvedBrief.presentation.locale)
  const state = plan.nextAction === 'instantiate' ? 'proceed' : plan.nextAction
  const question = plan.clarification
    ? { text: plan.clarification.question, options: plan.clarification.options }
    : plan.nextAction === 'confirm'
      ? {
          text: zh ? '是否按这些交付与安全设置继续生成？' : 'Continue with these delivery and safety settings?',
          options: zh ? ['继续', '调整设置'] : ['Continue', 'Adjust settings']
        }
      : null
  return artifactGuidanceSchema.parse({
    schemaVersion: '1', locale: plan.resolvedBrief.presentation.locale, state,
    headline: planHeadline(plan, zh), form: plan.form,
    structure: plan.structureRoles.map(role => structureLabel(role, zh)),
    reasons: plan.selectionReasons.slice(0, 2).map(reason => reasonLabel(reason.code, plan.form, zh)),
    assumptions: plan.assumptions.slice(0, 3).map(item => assumptionLabel(item.field, item.value, zh)),
    safetyNotice: safetyNotice(plan, zh), question,
    nextStep: nextStepForPlan(plan.nextAction, zh)
  })
}

export function guidanceFromVerification(
  verification: ArtifactVerification,
  locale = 'en'
): ArtifactGuidance {
  const zh = isChinese(locale)
  const failure = verification.checks.find(check => check.status === 'failed')
  const state = verification.status === 'verified' ? 'ready'
    : verification.status === 'needs_repair' ? 'repair' : 'stop'
  const category = failureCategory(failure?.code)
  return artifactGuidanceSchema.parse({
    schemaVersion: '1', locale, state,
    headline: verificationHeadline(verification.status, category, zh),
    form: verification.specKind === 'deck' ? 'presentation' : 'report',
    structure: [], reasons: failure ? [failureReason(category, zh)] : [], assumptions: [],
    safetyNotice: category === 'safety'
      ? (zh ? '当前成果未满足安全交付条件。' : 'The artifact does not yet meet safe-delivery requirements.')
      : null,
    question: null,
    nextStep: verification.status === 'verified'
      ? (zh ? '可以进入现有渲染流程。' : 'Continue to the existing render workflow.')
      : verification.status === 'needs_repair'
        ? (zh ? '按修复建议调整成果后重新验证。' : 'Apply the repair guidance and validate again.')
        : (zh ? '更新输入或重新规划后再继续。' : 'Update the inputs or re-plan before continuing.')
  })
}

function planHeadline(plan: ArtifactPlanV2, zh: boolean): string {
  if (plan.nextAction === 'clarify') return zh ? '需要确认一个关键信息' : 'One key detail needs clarification'
  if (plan.nextAction === 'stop') return zh ? '当前请求暂不支持自动生成' : 'This request cannot be generated automatically yet'
  const label = formLabel(plan.form, zh)
  return plan.nextAction === 'confirm'
    ? (zh ? `建议生成${label}，继续前需要确认` : `Recommended: ${label}; confirmation is required`)
    : (zh ? `建议生成${label}` : `Recommended: ${label}`)
}

function formLabel(form: ArtifactPlanV2['form'], zh: boolean): string {
  const labels = zh
    ? { brief: '一页简报', report: '报告', presentation: '演示文稿', infographic: '信息图' }
    : { brief: 'one-page brief', report: 'report', presentation: 'presentation', infographic: 'infographic' }
  return form ? labels[form] : (zh ? '视觉成果' : 'visual artifact')
}

function structureLabel(role: string, zh: boolean): string {
  const labels: Record<string, [string, string]> = {
    'cover-claim': ['核心结论封面', 'opening claim'],
    'executive-summary': ['执行摘要', 'executive summary'],
    overview: ['整体概览', 'overview'],
    trends: ['趋势分析', 'trend analysis'],
    breakdown: ['维度拆解', 'breakdown'],
    details: ['明细与证据', 'details and evidence']
  }
  return labels[role]?.[zh ? 0 : 1] ?? role.replaceAll('-', ' ')
}

function reasonLabel(code: string, form: ArtifactPlanV2['form'], zh: boolean): string {
  if (code.startsWith('explicit_')) return zh ? '成果形式来自当前明确要求。' : 'The artifact form follows the current explicit request.'
  if (code.includes('score_higher') || code.includes('brief')) {
    return zh ? '交付场景和阅读方式更适合这种形式。' : 'The delivery setting and reading mode favor this format.'
  }
  if (code.startsWith('catalog_')) {
    return zh ? '结构与当前数据中可用的分析模式匹配。' : 'The structure matches an analysis pattern available for this data.'
  }
  if (code.includes('public')) return zh ? '公开传播需要额外的安全交付能力。' : 'Public delivery needs additional safety support.'
  return zh ? `该结构适合当前${formLabel(form, true)}目标。` : `The structure fits the current ${formLabel(form, false)} goal.`
}

function assumptionLabel(field: string, value: unknown, zh: boolean): string {
  const names: Record<string, [string, string]> = {
    'audience.scope': ['受众范围', 'Audience scope'], 'goal.purpose': ['交付目的', 'Purpose'],
    'delivery.context': ['交付场景', 'Delivery context'], 'delivery.form': ['成果形式', 'Artifact form'],
    'delivery.density': ['信息密度', 'Information density'], 'delivery.tone': ['表达语气', 'Tone'],
    'trust.evidencePolicy': ['证据要求', 'Evidence policy'], 'trust.privacy': ['隐私范围', 'Privacy'],
    'presentation.locale': ['语言区域', 'Locale'], 'lifecycle.mode': ['更新方式', 'Update mode'],
    'lifecycle.cadence': ['更新频率', 'Cadence']
  }
  const name = names[field]?.[zh ? 0 : 1] ?? (zh ? '交付设置' : 'Delivery setting')
  return zh ? `${name}暂按“${String(value)}”处理。` : `${name} is currently assumed to be “${String(value)}”.`
}

function safetyNotice(plan: ArtifactPlanV2, zh: boolean): string | null {
  if (plan.resolvedBrief.trust.evidencePolicy === 'draft') {
    return zh ? '当前为草稿证据策略，不应直接对外发送。' : 'Draft evidence is not ready for recipient delivery.'
  }
  if (plan.resolvedBrief.trust.shareSafetyRequired) {
    return zh ? '外部或公开交付必须通过分享安全检查。' : 'External or public delivery must pass share-safety checks.'
  }
  return null
}

function nextStepForPlan(action: ArtifactPlanV2['nextAction'], zh: boolean): string {
  const labels = {
    instantiate: zh ? '可以生成成果规格。' : 'The artifact specification can be generated.',
    confirm: zh ? '确认后再生成成果规格。' : 'Confirm before generating the artifact specification.',
    clarify: zh ? '回答上面的问题后重新规划。' : 'Answer the question and plan again.',
    stop: zh ? '调整交付形式或等待受支持的能力。' : 'Choose a supported format or wait for the required capability.'
  }
  return labels[action]
}

type FailureCategory = 'data' | 'evidence' | 'layout' | 'safety' | 'context' | 'unknown'

function failureCategory(code?: string): FailureCategory {
  if (!code) return 'unknown'
  if (/DATA|FIELD|SCHEMA/.test(code)) return 'data'
  if (/EVIDENCE|PROVENANCE|CLAIM/.test(code)) return 'evidence'
  if (/LAYOUT|DENSITY|READABILITY|SPEC/.test(code)) return 'layout'
  if (/SAFETY|PRIVACY|RECIPIENT/.test(code)) return 'safety'
  if (/PLAN|CONTEXT|TARGET/.test(code)) return 'context'
  return 'unknown'
}

function verificationHeadline(status: ArtifactVerification['status'], category: FailureCategory, zh: boolean): string {
  if (status === 'verified') return zh ? '成果已验证，可以渲染' : 'Artifact verified and ready to render'
  if (status === 'needs_repair') return zh ? '成果需要修复后再继续' : 'The artifact needs repair before continuing'
  const labels: Record<FailureCategory, [string, string]> = {
    data: ['数据条件发生变化，当前成果已暂停', 'Data conditions changed; the artifact is paused'],
    evidence: ['证据条件未满足，当前成果已暂停', 'Evidence requirements are not met; the artifact is paused'],
    layout: ['成果结构未通过检查', 'The artifact structure did not pass validation'],
    safety: ['安全交付条件未满足', 'Safe-delivery requirements are not met'],
    context: ['规划上下文已变化，需要重新规划', 'Planning context changed; re-planning is required'],
    unknown: ['当前成果无法继续', 'The artifact cannot continue']
  }
  return labels[category][zh ? 0 : 1]
}

function failureReason(category: FailureCategory, zh: boolean): string {
  const labels: Record<FailureCategory, [string, string]> = {
    data: ['数据字段或类型与规划时不一致。', 'Data fields or types differ from the planned input.'],
    evidence: ['部分结论缺少可验证证据。', 'Some claims are missing verifiable evidence.'],
    layout: ['成果规格或可读性检查未通过。', 'The artifact specification or readability check failed.'],
    safety: ['隐私或分享安全检查未通过。', 'A privacy or share-safety check failed.'],
    context: ['当前成果与原规划上下文不再匹配。', 'The artifact no longer matches its original planning context.'],
    unknown: ['检查发现了需要处理的问题。', 'Validation found an issue that needs attention.']
  }
  return labels[category][zh ? 0 : 1]
}

function isChinese(locale: string): boolean {
  return locale.toLowerCase().startsWith('zh')
}
