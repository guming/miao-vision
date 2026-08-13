import type { ContentPoint, ContentSection, DeckContext } from './deck-context-schema'
import type { ContentProvenance, DeckPattern, DeckSpec, SlideSpec } from './deck-types'
import { agentError, ok } from './errors'
import type { AgentResult } from './types'
import { instantiateDeck } from './deck-knowledge-registry'

type NarrativePattern = Exclude<DeckPattern, 'executive-brief' | 'business-review'>

export function instantiateNarrativeDeck(pattern: NarrativePattern, context: DeckContext): AgentResult<DeckSpec> {
  const narrative = context.narrative
  if (!narrative?.sections.length) return agentError('DECK_PATTERN_UNSUPPORTED', `Pattern '${pattern}' requires at least one narrative section.`, { pattern, reasonCode: 'MISSING_SECTION_CONTENT' })
  if (pattern === 'proposal' && narrative.sections.length < 2) return agentError('DECK_PATTERN_UNSUPPORTED', "Pattern 'proposal' requires at least two sections to compare.", { pattern, reasonCode: 'MISSING_COMPARISON_CONTENT' })
  const decision = findDecisionPoint(context)
  if ((pattern === 'project-update' || pattern === 'proposal') && !decision) {
    return agentError('DECK_PATTERN_UNSUPPORTED', `Pattern '${pattern}' requires an explicit decision or next-step statement.`, { pattern, reasonCode: 'MISSING_DECISION_CONTENT' })
  }

  const slides: SlideSpec[] = [coverSlide(context)]
  if (pattern === 'topic-explainer') {
    slides.push(...narrative.sections.slice(0, 4).map(section => sectionSlide(context, section)))
    const quote = narrative.quotes[0]
    if (quote) slides.push(quoteSlide(context, quote))
    slides.push(endingSlide(context))
  } else if (pattern === 'project-update') {
    slides.push(...narrative.sections.slice(0, 3).map(section => sectionSlide(context, section)))
    slides.push(decisionSlide(decision!))
    slides.push(endingSlide(context))
  } else {
    slides.push(sectionSlide(context, narrative.sections[0]))
    slides.push(sectionSlide(context, narrative.sections[1]))
    slides.push(comparisonSlide(context, narrative.sections[0], narrative.sections[1]))
    slides.push(decisionSlide(decision!))
  }
  const narrativeSpec: DeckSpec = {
    title: narrative.title ?? sourceTitle(context, context.sources[0]?.id) ?? 'Presentation',
    description: context.request.objective ?? context.request.rawIntent,
    pattern, audience: context.request.audience, objective: context.request.objective,
    slides
  }
  if (!context.data) return ok(narrativeSpec)
  const dataSpec = instantiateDeck('executive-brief', context.data)
  const dataSlides = dataSpec.slides.filter(slide => !['cover-claim', 'data-quality-slide'].includes(slide.slideRole ?? ''))
  const insertion = Math.min(2, narrativeSpec.slides.length - 1)
  return ok({
    ...narrativeSpec,
    ...(dataSpec.caveats?.length ? { caveats: dataSpec.caveats } : {}),
    slides: [...narrativeSpec.slides.slice(0, insertion), ...dataSlides, ...narrativeSpec.slides.slice(insertion)]
  })
}

function coverSlide(context: DeckContext): SlideSpec {
  return { layout: 'cover', slideRole: 'narrative-cover', purpose: 'Frame the topic and objective.', eyebrow: context.request.occasion ?? 'Briefing', title: context.narrative?.title ?? sourceTitle(context, context.sources[0]?.id) ?? 'Presentation', claim: context.request.objective }
}

function sectionSlide(context: DeckContext, section: ContentSection): SlideSpec {
  const points = pointsForSection(context, section)
  const isAuthorClaim = context.narrative!.explicitClaims.some(claim => points.some(point => point.id === claim.pointId))
  const claimStatus = isAuthorClaim ? 'author-claim' as const : 'source-text' as const
  return {
    layout: 'section-summary', slideRole: 'section-summary', purpose: 'Summarize sourced material.',
    title: section.heading ?? 'Overview', bullets: points.map(point => point.text).slice(0, 5),
    claimStatus, sourceRefs: [sourceRef(section.sourceId, section.id, points, claimStatus)]
  }
}

function quoteSlide(context: DeckContext, quote: ContentPoint): SlideSpec {
  return {
    layout: 'quote-focus', slideRole: 'quote-focus', purpose: 'Present a sourced quotation.',
    claim: quote.text, callout: sourceTitle(context, quote.sourceId) ?? 'Source material',
    claimStatus: 'source-text', sourceRefs: [sourceRef(quote.sourceId, quote.sectionId, [quote])]
  }
}

function comparisonSlide(context: DeckContext, left: ContentSection, right: ContentSection): SlideSpec {
  const leftPoints = pointsForSection(context, left).slice(0, 3)
  const rightPoints = pointsForSection(context, right).slice(0, 3)
  return {
    layout: 'comparison-text', slideRole: 'text-comparison', purpose: 'Compare two sourced sections.', title: `${left.heading ?? 'Option A'} / ${right.heading ?? 'Option B'}`,
    bullets: [...leftPoints, ...rightPoints].map(point => point.text),
    comparison: { left: leftPoints.map(point => point.text), right: rightPoints.map(point => point.text) }, claimStatus: 'source-text',
    sourceRefs: [sourceRef(left.sourceId, left.id, leftPoints), sourceRef(right.sourceId, right.id, rightPoints)]
  }
}

function decisionSlide(point: ContentPoint): SlideSpec {
  return {
    layout: 'decision', slideRole: 'decision-request', purpose: 'Present the explicit sourced decision request.',
    eyebrow: 'Decision', title: 'Decision requested', claim: point.text,
    claimStatus: 'author-claim', sourceRefs: [sourceRef(point.sourceId, point.sectionId, [point], 'author-claim')]
  }
}

function sourceTitle(context: DeckContext, sourceId: string | undefined): string | undefined {
  const source = context.sources.find(candidate => candidate.id === sourceId)
  return source && source.kind !== 'data' ? source.title : undefined
}

function endingSlide(context: DeckContext): SlideSpec {
  const section = context.narrative!.sections.at(-1)!
  const points = pointsForSection(context, section)
  return {
    layout: 'ending', slideRole: 'narrative-ending', purpose: 'Close with the final sourced point.',
    title: 'Summary', claim: points[0]?.text ?? section.heading,
    claimStatus: 'source-text', sourceRefs: [sourceRef(section.sourceId, section.id, points.slice(0, 1))]
  }
}

function pointsForSection(context: DeckContext, section: ContentSection): ContentPoint[] {
  return [...context.narrative!.keyPoints, ...context.narrative!.quotes].filter(point => point.sectionId === section.id)
}

function findDecisionPoint(context: DeckContext): ContentPoint | undefined {
  return context.narrative?.keyPoints.find(point => /\b(decide|decision|approve|choose|next step)\b|决策|批准|选择|下一步/i.test(point.text))
}

function sourceRef(sourceId: string, sectionId: string | undefined, points: ContentPoint[], kind: ContentProvenance['kind'] = 'source-text'): ContentProvenance {
  return { sourceId, ...(sectionId ? { sectionId } : {}), paragraphIds: points.map(point => point.id), kind }
}
