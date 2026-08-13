import type { DeckContext } from './deck-context-schema'
import { DECK_PATTERNS } from './deck-knowledge-registry'
import type { DeckSpec } from './deck-types'

export interface DeckNarrativeIssue {
  code: string
  severity: 'error' | 'warning'
  path: string
  message: string
  hint: string
}

export function collectDeckNarrativeIssues(spec: DeckSpec, context: DeckContext): DeckNarrativeIssue[] {
  const issues: DeckNarrativeIssue[] = []
  const narrative = context.narrative
  const sourceIds = new Set(context.sources.filter(source => source.kind !== 'data').map(source => source.id))
  const sectionIds = new Set(narrative?.sections.map(section => section.id) ?? [])
  const pointIds = new Set([
    ...(narrative?.keyPoints.map(point => point.id) ?? []),
    ...(narrative?.quotes.map(point => point.id) ?? [])
  ])
  const points = new Map([
    ...(narrative?.keyPoints ?? []),
    ...(narrative?.quotes ?? [])
  ].map(point => [point.id, point]))
  const narrativePattern = Boolean(spec.pattern && ['topic-explainer', 'project-update', 'proposal'].includes(spec.pattern))

  spec.slides.forEach((slide, slideIndex) => {
    const base = `slides[${slideIndex}]`
    if (narrativePattern && isNarrativeBodyRole(slide.slideRole)) {
      if (!slide.purpose) issues.push(issue('DECK_NARRATIVE_PURPOSE_REQUIRED', `${base}.purpose`, 'Narrative body slides require a purpose.', 'Describe the role this slide plays in the story.'))
      if (!slide.claimStatus) issues.push(issue('DECK_CLAIM_STATUS_REQUIRED', `${base}.claimStatus`, 'Narrative body slides require a claim status.', 'Use source-text or author-claim.'))
      if (!slide.sourceRefs?.length) issues.push(issue('DECK_SOURCE_REFS_REQUIRED', `${base}.sourceRefs`, 'Narrative body slides require source references.', 'Reference the source content used on this slide.'))
    }
    slide.sourceRefs?.forEach((reference, refIndex) => {
      const path = `${base}.sourceRefs[${refIndex}]`
      if (!sourceIds.has(reference.sourceId)) issues.push(issue('DECK_SOURCE_REF_NOT_FOUND', `${path}.sourceId`, `Source '${reference.sourceId}' does not exist.`, 'Use a source id from DeckContext.sources.'))
      if (reference.sectionId && !sectionIds.has(reference.sectionId)) issues.push(issue('DECK_SECTION_REF_NOT_FOUND', `${path}.sectionId`, `Section '${reference.sectionId}' does not exist.`, 'Use a section id from DeckContext.narrative.sections.'))
      reference.paragraphIds?.forEach((id, paragraphIndex) => {
        if (!pointIds.has(id)) issues.push(issue('DECK_POINT_REF_NOT_FOUND', `${path}.paragraphIds[${paragraphIndex}]`, `Content point '${id}' does not exist.`, 'Use an id from keyPoints or quotes.'))
        const point = points.get(id)
        if (point && (point.sourceId !== reference.sourceId || (reference.sectionId && point.sectionId !== reference.sectionId))) {
          issues.push(issue('DECK_SOURCE_REF_OWNERSHIP_MISMATCH', `${path}.paragraphIds[${paragraphIndex}]`, `Content point '${id}' does not belong to the referenced source and section.`, 'Use source, section, and point ids from the same narrative branch.'))
        }
      })
    })
    if (slide.claimStatus === 'source-text' && slide.sourceRefs?.length) {
      const referencedText = new Set(slide.sourceRefs.flatMap(reference => reference.paragraphIds ?? []).map(id => points.get(id)?.text).filter((text): text is string => Boolean(text)))
      const displayedText = [slide.claim, ...(slide.bullets ?? [])].filter((text): text is string => Boolean(text))
      displayedText.forEach((text, textIndex) => {
        if (!referencedText.has(text)) issues.push(issue('DECK_SOURCE_TEXT_MISMATCH', `${base}.content[${textIndex}]`, 'Source-text content does not match any referenced content point.', 'Use the normalized source text exactly, or mark an agent-authored synthesis as author-claim.'))
      })
    }
    if (!context.data && ((slide.charts?.length ?? 0) > 0 || (slide.metrics?.length ?? 0) > 0 || isDataRole(slide.slideRole))) {
      issues.push(issue('DECK_DATA_BLOCK_WITHOUT_DATA', base, 'Narrative-only Deck cannot use data charts, metrics, or data-only slide roles.', 'Remove the data block or analyze with --data.'))
    }
    if ((slide.title?.length ?? 0) > 100) issues.push(issue('DECK_CONTENT_BUDGET_EXCEEDED', `${base}.title`, 'Slide title exceeds 100 characters.', 'Shorten the title.'))
    if ((slide.claim?.length ?? 0) > 300) issues.push(issue('DECK_CONTENT_BUDGET_EXCEEDED', `${base}.claim`, 'Slide claim exceeds 300 characters.', 'Split or shorten the claim.'))
    if ((slide.bullets?.length ?? 0) > 6 || slide.bullets?.some(bullet => bullet.length > 180)) {
      issues.push(issue('DECK_CONTENT_BUDGET_EXCEEDED', `${base}.bullets`, 'Slide bullets exceed the narrative content budget.', 'Use at most 6 bullets and 180 characters per bullet.'))
    }
  })

  if (spec.pattern && ['topic-explainer', 'project-update', 'proposal'].includes(spec.pattern)) {
    const roles = new Set(spec.slides.map(slide => slide.slideRole).filter(Boolean))
    for (const required of requiredPatternRoles(spec.pattern)) {
      if (!roles.has(required)) issues.push(issue('DECK_REQUIRED_ROLE_MISSING', 'slides', `Pattern '${spec.pattern}' requires slide role '${required}'.`, `Add one '${required}' slide.`))
    }
  }
  return issues
}

function requiredPatternRoles(pattern: keyof typeof DECK_PATTERNS): string[] {
  if (pattern === 'topic-explainer') return ['narrative-cover', 'section-summary']
  if (pattern === 'project-update') return ['narrative-cover', 'section-summary', 'decision-request']
  if (pattern === 'proposal') return ['narrative-cover', 'text-comparison', 'decision-request']
  return []
}

function isDataRole(role?: string): boolean {
  return Boolean(role && ['cover-claim', 'kpi-snapshot', 'trend-overview-slide', 'ranking-slide', 'data-quality-slide'].includes(role))
}

function isNarrativeBodyRole(role?: string): boolean {
  return Boolean(role && ['section-summary', 'quote-focus', 'text-comparison', 'decision-request', 'narrative-ending'].includes(role))
}

function issue(code: string, path: string, message: string, hint: string): DeckNarrativeIssue {
  return { code, severity: 'error', path, message, hint }
}
