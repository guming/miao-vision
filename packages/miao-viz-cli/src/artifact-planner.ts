import { artifactPlanV2Schema, type ArtifactPlanV2 } from './artifact-plan-v2-schema'
import { fingerprintAnalyzeContext } from './analyze-context-fingerprint'
import type { AnalyzeContext, CompactAnalyzeContext } from './context-schema'
import type { OutcomeClarification, ResolvedOutcomeBrief } from './outcome-brief-schema'
import type { ResolvedOutcomeBriefResult } from './outcome-brief-resolver'

type PlannerContext = AnalyzeContext | CompactAnalyzeContext
type PlannedForm = NonNullable<ArtifactPlanV2['form']>

interface Selection {
  form: PlannedForm
  renderer: NonNullable<ArtifactPlanV2['renderer']>
  reasonCode: string
  reason: string
}

export function planArtifact(
  briefResult: ResolvedOutcomeBriefResult,
  context: PlannerContext
): ArtifactPlanV2 {
  const { resolvedBrief: brief, assumptions } = briefResult
  const dataClarification = firstBlockingDataClarification(context)
  if (dataClarification) {
    return buildPlan(briefResult, context, {
      status: 'needs_clarification', clarification: dataClarification,
      selectionReasons: [{
        code: 'data_semantics_before_form',
        message: 'A blocking data-semantic question must be resolved before artifact selection.'
      }]
    })
  }

  const selected = selectForm(brief)
  if ('clarification' in selected) {
    return buildPlan(briefResult, context, {
      status: 'needs_clarification', clarification: selected.clarification,
      selectionReasons: [{ code: 'form_scores_close', message: selected.clarification.question }]
    })
  }
  if ('unsupported' in selected) {
    return buildPlan(briefResult, context, {
      status: 'unsupported', form: selected.form,
      selectionReasons: [{ code: selected.unsupported, message: selected.message }]
    })
  }

  const pattern = selectPattern(selected, brief, context)
  if (!pattern) {
    return buildPlan(briefResult, context, {
      status: 'unsupported', form: selected.form,
      selectionReasons: [
        { code: selected.reasonCode, message: selected.reason },
        { code: 'no_allowed_pattern', message: 'The analyze catalog contains no allowed pattern for this form.' }
      ]
    })
  }

  return buildPlan(briefResult, context, {
    status: assumptions.length > 0 ? 'ready_with_assumptions' : 'ready',
    nextAction: requiresConfirmation(briefResult) ? 'confirm' : 'instantiate',
    form: selected.form,
    renderer: selected.renderer,
    target: { adapter: pattern.adapter, id: pattern.id } as ArtifactPlanV2['target'],
    structureRoles: structureRoles(selected.form, pattern.blocks),
    formats: ['html', 'pdf'],
    selectionReasons: [
      { code: selected.reasonCode, message: selected.reason },
      { code: pattern.reasonCode, message: pattern.reason }
    ]
  })
}

function selectForm(brief: ResolvedOutcomeBrief): Selection
  | { unsupported: string; message: string; form: PlannedForm | null }
  | { clarification: OutcomeClarification } {
  const requested = brief.delivery.form
  if (requested === 'report') {
    return { form: 'report', renderer: 'report', reasonCode: 'explicit_report', reason: 'The brief explicitly requests a report.' }
  }
  if (requested === 'presentation') {
    return { form: 'presentation', renderer: 'deck', reasonCode: 'explicit_presentation', reason: 'The brief explicitly requests a presentation.' }
  }
  if (requested === 'infographic') {
    return {
      unsupported: 'infographic_not_supported_v1', form: 'infographic',
      message: 'V1 does not include the future infographic adapter.'
    }
  }
  if (requested === 'brief') {
    return { form: 'brief', renderer: 'report', reasonCode: 'brief_uses_report', reason: 'A one-page brief uses the report renderer.' }
  }
  if (brief.audience.scope === 'public' || brief.trust.privacy === 'public'
    || brief.delivery.context === 'public') {
    return {
      unsupported: 'public_requires_infographic_adapter', form: null,
      message: 'Public auto-routing requires the future infographic and share-safety adapter.'
    }
  }
  if (brief.delivery.context === 'chat' && brief.delivery.density === 'concise') {
    return { form: 'brief', renderer: 'report', reasonCode: 'chat_concise_brief', reason: 'Concise chat delivery favors an executive brief.' }
  }

  let reportScore = 0
  let presentationScore = 0
  if (brief.delivery.context === 'meeting') presentationScore += 2
  if (brief.delivery.density === 'concise') presentationScore += 1
  if (brief.delivery.tone === 'executive') presentationScore += 1
  if (brief.delivery.context === 'archive') reportScore += 2
  if (brief.delivery.context === 'email' && brief.delivery.density === 'detailed') reportScore += 2
  if (brief.delivery.density === 'detailed') reportScore += 1
  if (brief.delivery.tone === 'analytical') reportScore += 1
  if (brief.lifecycle.mode === 'recurring') reportScore += 2

  const lacksIntent = brief.goal.keyQuestion === null && brief.goal.decision === null
  if (Math.abs(reportScore - presentationScore) <= 1 && lacksIntent) {
    return { clarification: {
      field: 'delivery.form',
      question: '这份成果主要用于会议讲述，还是由读者自行阅读？',
      options: ['会议讲述', '自行阅读'],
      reasonCode: 'presentation_or_reading',
      blocking: true
    } }
  }
  return reportScore > presentationScore
    ? { form: 'report', renderer: 'report', reasonCode: 'report_score_higher', reason: `Report score ${reportScore} exceeded presentation score ${presentationScore}.` }
    : { form: 'presentation', renderer: 'deck', reasonCode: 'presentation_score_higher', reason: `Presentation score ${presentationScore} exceeded report score ${reportScore}.` }
}

function selectPattern(selection: Selection, brief: ResolvedOutcomeBrief, context: PlannerContext) {
  return isCompact(context)
    ? selectCompactPattern(selection, brief, context)
    : selectFullPattern(selection, brief, context)
}

function selectCompactPattern(
  selection: Selection, brief: ResolvedOutcomeBrief, context: CompactAnalyzeContext
) {
  const catalog = context.catalog
  if (selection.renderer === 'deck') {
    const patterns = (catalog.deckPatterns ?? []).map(([id, score, , blocks]) => ({ id, score, blocks }))
    const preferred = brief.delivery.density === 'concise' || brief.delivery.tone === 'executive'
      ? 'executive-brief' : 'business-review'
    const item = patterns.find(pattern => pattern.id === preferred) ?? highest(patterns)
    return item && {
      ...item, adapter: 'deck-pattern' as const, reasonCode: `catalog_deck_${item.id}`,
      reason: `Selected allowed deck pattern ${item.id} from the analyze catalog.`
    }
  }

  const blockedScenes = new Set((catalog.blockedScenes ?? []).map(item => item[0]))
  const scenes = (catalog.scenes ?? []).map(([id, score, , blocks]) => ({ id, score, blocks }))
    .filter(item => !blockedScenes.has(item.id))
  const scene = highest(scenes)
  if (scene) return {
    ...scene, adapter: 'report-scene' as const, reasonCode: `catalog_scene_${scene.id}`,
    reason: `Selected highest-scoring allowed scene ${scene.id} from the analyze catalog.`
  }

  const blockedTemplates = new Set((catalog.blockedTemplates ?? []).map(item => item[0]))
  const templates = (catalog.templates ?? []).map(([id, score, , blocks]) => ({ id, score, blocks }))
    .filter(item => !blockedTemplates.has(item.id))
  const template = highest(templates)
  return template && {
    ...template, adapter: 'report-template' as const, reasonCode: `catalog_template_${template.id}`,
    reason: `Selected highest-scoring allowed template ${template.id} from the analyze catalog.`
  }
}

function selectFullPattern(selection: Selection, brief: ResolvedOutcomeBrief, context: AnalyzeContext) {
  const catalog = context.catalog
  if (selection.renderer === 'deck') {
    const patterns = (catalog.deckPatterns ?? []).map(item => ({
      id: item.id, score: item.score, blocks: item.blocks
    }))
    const preferred = brief.delivery.density === 'concise' || brief.delivery.tone === 'executive'
      ? 'executive-brief' : 'business-review'
    const item = patterns.find(pattern => pattern.id === preferred) ?? highest(patterns)
    return item && {
      ...item, adapter: 'deck-pattern' as const, reasonCode: `catalog_deck_${item.id}`,
      reason: `Selected allowed deck pattern ${item.id} from the analyze catalog.`
    }
  }
  const blockedScenes = new Set((catalog.blockedScenes ?? []).map(item => item.id))
  const scenes = (catalog.scenes ?? []).map(item => ({
    id: item.id, score: item.score, blocks: item.blocks
  })).filter(item => !blockedScenes.has(item.id))
  const scene = highest(scenes)
  if (scene) return {
    ...scene, adapter: 'report-scene' as const, reasonCode: `catalog_scene_${scene.id}`,
    reason: `Selected highest-scoring allowed scene ${scene.id} from the analyze catalog.`
  }
  const blockedTemplates = new Set((catalog.blockedTemplates ?? []).map(item => item.id))
  const templates = (catalog.templates ?? []).map(item => ({
    id: item.id, score: item.score, blocks: item.blocks
  })).filter(item => !blockedTemplates.has(item.id))
  const template = highest(templates)
  return template && {
    ...template, adapter: 'report-template' as const, reasonCode: `catalog_template_${template.id}`,
    reason: `Selected highest-scoring allowed template ${template.id} from the analyze catalog.`
  }
}

function highest<T extends { id: string; score: number }>(items: T[]): T | undefined {
  return [...items].sort((left, right) => right.score - left.score || left.id.localeCompare(right.id))[0]
}

function firstBlockingDataClarification(context: PlannerContext): OutcomeClarification | null {
  if (isCompact(context)) return firstCompactClarification(context)
  const item = (context.clarificationQuestions ?? []).find(question => question.blocking)
  if (!item) return null
  const options = item.options.slice(0, 3)
  if (options.length < 2) options.push('Use the current assumption')
  return {
    field: `data.${item.appliesTo}`, question: item.question,
    options, reasonCode: 'data_semantics_blocking', blocking: true
  }
}

function firstCompactClarification(context: CompactAnalyzeContext): OutcomeClarification | null {
  const item = (context.clarificationQuestions ?? []).find(question => question[3])
  if (!item) return null
  const options = item[2].slice(0, 3)
  if (options.length < 2) options.push('Use the current assumption')
  return {
    field: `data.${item[4]}`, question: item[1], options,
    reasonCode: 'data_semantics_blocking', blocking: true
  }
}

function buildPlan(
  briefResult: ResolvedOutcomeBriefResult,
  context: PlannerContext,
  overrides: Partial<ArtifactPlanV2> & Pick<ArtifactPlanV2, 'status' | 'selectionReasons'>
): ArtifactPlanV2 {
  const density = briefResult.resolvedBrief.delivery.density
  const budget = density === 'concise' ? [4, 3] : density === 'detailed' ? [10, 8] : [7, 5]
  const gates: ArtifactPlanV2['qualityGates'] = ['evidence_validation', 'data_semantics', 'catalog_compliance', 'readability']
  if (briefResult.resolvedBrief.trust.shareSafetyRequired) gates.push('share_safety')
  const warnings = contextWarnings(context)
  if (briefResult.resolvedBrief.trust.evidencePolicy === 'draft') {
    warnings.push({
      code: 'draft_not_recipient_ready',
      message: 'Draft evidence policy permits spec generation but not recipient-ready delivery.'
    })
  }
  return artifactPlanV2Schema.parse({
    schemaVersion: '2', briefHash: briefResult.briefHash,
    contextHash: fingerprintAnalyzeContext(context),
    nextAction: overrides.status === 'needs_clarification' ? 'clarify' : 'stop',
    sourceKind: 'tabular',
    resolvedBrief: briefResult.resolvedBrief, assumptions: briefResult.assumptions,
    form: null, renderer: null, target: null, structureRoles: [],
    densityBudget: { level: density, maxSections: budget[0], maxPrimaryVisuals: budget[1] },
    qualityGates: gates, formats: [],
    warnings, clarification: null,
    ...overrides
  })
}

function contextWarnings(context: PlannerContext): ArtifactPlanV2['warnings'] {
  return isCompact(context)
    ? context.warnings.map(([code, message]) => ({ code, message }))
    : context.sampleWarnings.map(({ code, message }) => ({ code, message }))
}

function structureRoles(form: PlannedForm, blocks: string[]): string[] {
  const lead = form === 'presentation' ? ['cover-claim'] : ['executive-summary']
  return [...new Set([...lead, ...blocks])]
}

function requiresConfirmation(briefResult: ResolvedOutcomeBriefResult): boolean {
  if (!briefResult.resolvedBrief.trust.shareSafetyRequired) return false
  return briefResult.assumptions.some(assumption =>
    assumption.source === 'default'
    && (assumption.field === 'trust.privacy' || assumption.field === 'trust.evidencePolicy')
  )
}

function isCompact(context: PlannerContext): context is CompactAnalyzeContext {
  return 'format' in context && context.format === 'compact-v1'
}
