import { hashValue } from './report-project-storage'
import {
  draftOutcomeBriefSchema, resolvedOutcomeBriefSchema,
  type DraftOutcomeBrief, type OutcomeAssumption, type ResolvedOutcomeBrief
} from './outcome-brief-schema'

type AudienceValues = NonNullable<DraftOutcomeBrief['audience']>
type GoalValues = NonNullable<DraftOutcomeBrief['goal']>
type DeliveryValues = NonNullable<DraftOutcomeBrief['delivery']>
type TrustValues = NonNullable<DraftOutcomeBrief['trust']>
type PresentationValues = NonNullable<DraftOutcomeBrief['presentation']>
type LifecycleValues = NonNullable<DraftOutcomeBrief['lifecycle']>

export interface OutcomeBriefValues {
  audience?: AudienceValues
  goal?: GoalValues
  delivery?: DeliveryValues
  trust?: TrustValues
  presentation?: PresentationValues
  lifecycle?: LifecycleValues
}

export interface ResolveOutcomeBriefOptions {
  project?: OutcomeBriefValues
  sourceHint?: OutcomeBriefValues
}

export interface ResolvedOutcomeBriefResult {
  briefHash: string
  resolvedBrief: ResolvedOutcomeBrief
  assumptions: OutcomeAssumption[]
}

type ValueSource = OutcomeAssumption['source'] | 'explicit'

export function resolveOutcomeBrief(
  input: DraftOutcomeBrief,
  options: ResolveOutcomeBriefOptions = {}
): ResolvedOutcomeBriefResult {
  const draft = draftOutcomeBriefSchema.parse(input)
  const assumptions: OutcomeAssumption[] = []
  const resolve = <T>(
    field: string, explicit: T | undefined, project: T | undefined,
    sourceHint: T | undefined, fallback: T, reasonCode: string, reason: string,
    material = true
  ): T => {
    const [value, source] = firstDefined<T>(explicit, project, sourceHint, fallback)
    if (source !== 'explicit' && material) {
      assumptions.push({ field, value, source, reasonCode, reason })
    }
    return value
  }

  const localeDefault = hasChinese(draft.rawRequest) ? 'zh-CN' : 'en'
  const scope = resolve(
    'audience.scope', draft.audience?.scope, options.project?.audience?.scope,
    options.sourceHint?.audience?.scope, 'self', 'audience_scope_defaulted',
    'Audience scope affects sharing safeguards.'
  )
  const privacy = resolve(
    'trust.privacy', draft.trust?.privacy, options.project?.trust?.privacy,
    options.sourceHint?.trust?.privacy, 'personal', 'privacy_defaulted',
    'Privacy controls whether sensitive detail may be planned.'
  )
  const evidencePolicy = resolve(
    'trust.evidencePolicy', draft.trust?.evidencePolicy, options.project?.trust?.evidencePolicy,
    options.sourceHint?.trust?.evidencePolicy, 'strict', 'evidence_policy_defaulted',
    'Tabular outcomes default to evidence that can be verified.'
  )
  const lifecycleMode = resolve(
    'lifecycle.mode', draft.lifecycle?.mode, options.project?.lifecycle?.mode,
    options.sourceHint?.lifecycle?.mode, 'one-off', 'lifecycle_mode_defaulted',
    'Lifecycle mode affects long-term reuse.'
  )
  const cadenceFallback = lifecycleMode === 'recurring' ? 'custom' : null
  const cadence = resolve(
    'lifecycle.cadence', draft.lifecycle?.cadence, options.project?.lifecycle?.cadence,
    options.sourceHint?.lifecycle?.cadence, cadenceFallback, 'cadence_defaulted',
    'A recurring outcome needs a cadence.', lifecycleMode === 'recurring'
  )
  const external = scope === 'external' || scope === 'public'
    || privacy === 'external' || privacy === 'public'

  const resolvedBrief = resolvedOutcomeBriefSchema.parse({
    schemaVersion: '1',
    rawRequest: draft.rawRequest,
    audience: {
      role: resolve(
        'audience.role', draft.audience?.role, options.project?.audience?.role,
        options.sourceHint?.audience?.role, 'General audience', 'audience_role_defaulted',
        'A neutral audience role is used when none is supplied.', false
      ),
      scope,
      dataLiteracy: resolve(
        'audience.dataLiteracy', draft.audience?.dataLiteracy, options.project?.audience?.dataLiteracy,
        options.sourceHint?.audience?.dataLiteracy, 'business', 'data_literacy_defaulted',
        'Business literacy is the neutral presentation baseline.', false
      )
    },
    goal: {
      purpose: resolve(
        'goal.purpose', draft.goal?.purpose, options.project?.goal?.purpose,
        options.sourceHint?.goal?.purpose, 'inform', 'purpose_defaulted',
        'Purpose affects the outcome structure.'
      ),
      keyQuestion: draft.goal?.keyQuestion ?? options.project?.goal?.keyQuestion
        ?? options.sourceHint?.goal?.keyQuestion ?? null,
      decision: draft.goal?.decision ?? options.project?.goal?.decision
        ?? options.sourceHint?.goal?.decision ?? null
    },
    delivery: {
      context: resolve(
        'delivery.context', draft.delivery?.context, options.project?.delivery?.context,
        options.sourceHint?.delivery?.context, 'chat', 'delivery_context_defaulted',
        'Delivery context affects the recommended artifact form.'
      ),
      form: resolve(
        'delivery.form', draft.delivery?.form, options.project?.delivery?.form,
        options.sourceHint?.delivery?.form, 'auto', 'form_defaulted',
        'Automatic form selection is used when no form is requested.'
      ),
      density: resolve(
        'delivery.density', draft.delivery?.density, options.project?.delivery?.density,
        options.sourceHint?.delivery?.density, 'standard', 'density_defaulted',
        'Density sets the information budget.'
      ),
      tone: resolve(
        'delivery.tone', draft.delivery?.tone, options.project?.delivery?.tone,
        options.sourceHint?.delivery?.tone, 'analytical', 'tone_defaulted',
        'Tone affects the planned narrative structure.'
      )
    },
    trust: {
      evidencePolicy,
      privacy,
      shareSafetyRequired: external,
      sensitiveDetailsAllowed: !external,
      recipientReady: evidencePolicy !== 'draft'
    },
    presentation: {
      locale: resolve(
        'presentation.locale', draft.presentation?.locale, options.project?.presentation?.locale,
        options.sourceHint?.presentation?.locale, localeDefault, 'locale_inferred',
        'Locale controls language and regional formatting.'
      ),
      brandProfileRef: draft.presentation?.brandProfileRef
        ?? options.project?.presentation?.brandProfileRef
        ?? options.sourceHint?.presentation?.brandProfileRef ?? null
    },
    lifecycle: {
      mode: lifecycleMode,
      period: draft.lifecycle?.period ?? options.project?.lifecycle?.period
        ?? options.sourceHint?.lifecycle?.period ?? null,
      cadence
    }
  })

  return { resolvedBrief, assumptions, briefHash: hashBrief(resolvedBrief) }
}

export function hashBrief(brief: ResolvedOutcomeBrief): string {
  const { rawRequest: _rawRequest, presentation, ...semantic } = brief
  return hashValue({ ...semantic, presentation: { locale: presentation.locale } })
}

function firstDefined<T>(...values: [T | undefined, T | undefined, T | undefined, T]): [T, ValueSource] {
  if (values[0] !== undefined) return [values[0], 'explicit']
  if (values[1] !== undefined) return [values[1], 'project']
  if (values[2] !== undefined) return [values[2], 'source_hint']
  return [values[3], 'default']
}

function hasChinese(value: string): boolean {
  return /[\u3400-\u9fff]/u.test(value)
}
