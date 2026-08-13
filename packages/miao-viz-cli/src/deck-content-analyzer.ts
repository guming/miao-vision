import { readFileSync } from 'node:fs'
import { extname, relative, resolve } from 'node:path'
import { parseDocumentStructure, DOCUMENT_EXTENSIONS } from './document-structure'
import { deckContentId, deckContextSchema, deckSourceId, type ContentPoint, type DeckContext } from './deck-context-schema'
import { buildNarrativeDeckCatalog } from './deck-knowledge-registry'
import { agentError, ok } from './errors'
import type { AgentResult } from './types'
import { createHash } from 'node:crypto'
import { loadDataset } from './data-loader'
import { analyzeDataset } from './analyzer'
import { fingerprintArtifactData } from './artifact-data-fingerprint'

export interface AnalyzeDeckDocumentOptions {
  intent: string
  workspaceRoot?: string
}

export function analyzeDeckDocument(file: string, options: AnalyzeDeckDocumentOptions): AgentResult<DeckContext> {
  const extension = extname(file).toLowerCase()
  if (extension && !DOCUMENT_EXTENSIONS.includes(extension as (typeof DOCUMENT_EXTENSIONS)[number])) {
    return agentError('UNSUPPORTED_DECK_DOCUMENT', 'Deck document input must be Markdown or plain text.', { supportedExtensions: DOCUMENT_EXTENSIONS })
  }
  let raw: string
  try {
    raw = readFileSync(file, 'utf8')
  } catch (error) {
    return agentError('DECK_DOCUMENT_UNREADABLE', error instanceof Error ? error.message : 'Deck document could not be read.', { file })
  }
  const document = parseDocumentStructure(raw)
  if (!document.normalized) return agentError('EMPTY_DECK_DOCUMENT', 'Deck document is empty after normalization.', { file })
  if (!options.intent.trim()) return agentError('DECK_INTENT_REQUIRED', 'Deck analyze requires a non-empty intent.', { hint: 'Pass --intent "audience and objective".' })

  const workspaceRoot = options.workspaceRoot ?? process.cwd()
  const sourceId = deckSourceId(file, workspaceRoot)
  const sourcePath = relative(workspaceRoot, resolve(file)).split('\\').join('/')
  const sections: Array<{ id: string; sourceId: string; heading?: string; level: number; paragraphIds: string[]; listItemIds: string[] }> = document.sections.map((section, index) => ({
    id: deckContentId(sourceId, 'sec', index + 1), sourceId,
    ...(section.heading ? { heading: section.heading } : {}), level: section.heading ? headingLevel(document, section.heading) : 0,
    paragraphIds: [deckContentId(sourceId, 'p', index + 1)], listItemIds: [] as string[]
  }))
  const keyPoints: ContentPoint[] = document.sections.map((section, index) => ({
    id: deckContentId(sourceId, 'p', index + 1), sourceId, sectionId: sections[index].id,
    kind: 'paragraph', text: narrativeSectionText(section.content, document) || section.heading || section.content
  }))
  document.listItems.forEach((text, index) => {
    const pointId = deckContentId(sourceId, 'li', index + 1)
    const section = sectionForText(document, sections, text)
    keyPoints.push({ id: pointId, sourceId, sectionId: section?.id, kind: 'list-item', text })
    if (section) section.listItemIds.push(pointId)
  })
  const quotes: ContentPoint[] = document.quotes.map((text, index) => ({
    id: deckContentId(sourceId, 'q', index + 1), sourceId, sectionId: sectionForText(document, sections, text)?.id, kind: 'quote', text
  }))
  const claimPoints = [...keyPoints, ...quotes].filter(point => claimSignals(point.text).length > 0)
  const explicitClaims = claimPoints.map((point, index) => ({
    id: `${sourceId}:claim:${index + 1}`, sourceId, sectionId: point.sectionId, pointId: point.id,
    text: point.text, status: 'author-claim' as const, signals: claimSignals(point.text)
  }))
  const images = document.images.map((image, index) => ({
    id: deckContentId(sourceId, 'img', index + 1), sourceId, sectionId: sectionForText(document, sections, image.target)?.id,
    alt: image.alt, target: image.target, kind: /^https?:\/\//i.test(image.target) ? 'remote' as const : 'local' as const
  }))
  const durationMinutes = durationFromIntent(options.intent)
  const draft = deckContextSchema.parse({
    version: 1,
    request: {
      rawIntent: options.intent.trim(),
      ...(document.frontmatter.audience ? { audience: document.frontmatter.audience } : {}),
      ...(document.frontmatter.occasion ? { occasion: document.frontmatter.occasion } : {}),
      ...(document.frontmatter.tone ? { tone: document.frontmatter.tone } : {}),
      ...(durationMinutes ? { durationMinutes } : {})
    },
    sources: [{ id: sourceId, kind: extension === '.txt' ? 'text' : 'markdown', path: sourcePath, title: document.frontmatter.title ?? document.headings[0]?.text }],
    narrative: { title: document.frontmatter.title ?? document.headings[0]?.text, sections, keyPoints, quotes, explicitClaims, images },
    warnings: images.filter(image => image.kind === 'remote').map(image => ({ code: 'REMOTE_IMAGE_NOT_FROZEN', message: `Remote image is recorded but will not be downloaded: ${image.target}`, sourceId })),
    planning: { recommendedPatterns: [], blockedPatterns: [] }
  })
  const catalog = buildNarrativeDeckCatalog(draft)
  return ok({
    ...draft,
    planning: {
      recommendedPatterns: catalog.deckPatterns.map(pattern => ({ id: pattern.id, score: pattern.score, reasons: [`Available blocks: ${pattern.blocks.join(', ')}`] })),
      blockedPatterns: []
    }
  })
}

export function analyzeHybridDeckDocument(file: string, dataFile: string, options: AnalyzeDeckDocumentOptions): AgentResult<DeckContext> {
  const narrative = analyzeDeckDocument(file, options)
  if (!narrative.ok) return narrative
  const dataset = loadDataset(dataFile)
  if (!dataset.ok) return dataset
  const workspaceRoot = options.workspaceRoot ?? process.cwd()
  const data = analyzeDataset(dataset.value, { intent: options.intent })
  const dataSourceId = deckSourceId(dataFile, workspaceRoot)
  const dataPath = relative(workspaceRoot, resolve(dataFile)).split('\\').join('/')
  return ok(deckContextSchema.parse({
    ...narrative.value,
    metadata: {
      requestFingerprint: createHash('sha256').update(options.intent.trim()).digest('hex'),
      dataFingerprint: fingerprintArtifactData(dataset.value)
    },
    sources: [...narrative.value.sources, { id: dataSourceId, kind: 'data', path: dataPath }],
    data,
    planning: {
      ...narrative.value.planning,
      recommendedPatterns: narrative.value.planning.recommendedPatterns.map(pattern => ({ ...pattern, reasons: [...pattern.reasons, 'Structured data is available for supporting evidence.'] }))
    }
  }))
}

function headingLevel(document: ReturnType<typeof parseDocumentStructure>, heading: string): number {
  return document.headings.find(item => item.text === heading)?.level ?? 1
}

function sectionForText(
  document: ReturnType<typeof parseDocumentStructure>,
  sections: Array<{ id: string; listItemIds: string[] }>,
  text: string
): { id: string; listItemIds: string[] } | undefined {
  const index = document.sections.findIndex(section => section.content.includes(text))
  return index >= 0 ? sections[index] : undefined
}

function narrativeSectionText(content: string, document: ReturnType<typeof parseDocumentStructure>): string {
  let result = content
  for (const item of document.listItems) result = result.replace(`- ${item}`, '').replace(`* ${item}`, '').replace(`+ ${item}`, '')
  for (const quote of document.quotes) result = result.replace(`> ${quote}`, '')
  result = result.replace(/!\[[^\]]*\]\([^)]+\)/g, '')
  return result.replace(/\s+/g, ' ').trim()
}

function durationFromIntent(intent: string): number | undefined {
  const match = intent.match(/(?:^|[\s，,])(\d{1,3})\s*(?:分钟|mins?|minutes?)(?:\s|$|[，,。.!])/i)
  if (!match) return undefined
  const value = Number(match[1])
  return value > 0 ? value : undefined
}

function claimSignals(text: string): Array<'numeric' | 'rank' | 'change' | 'evaluation' | 'causal' | 'predictive'> {
  const signals: Array<'numeric' | 'rank' | 'change' | 'evaluation' | 'causal' | 'predictive'> = []
  if (/\d/.test(text)) signals.push('numeric')
  if (/\b(?:first|top|rank|highest|lowest)\b|第一|最高|最低|排名/i.test(text)) signals.push('rank')
  if (/\b(?:increase[ds]?|decrease[ds]?|grew|declined|change[ds]?)\b|增长|下降|变化/i.test(text)) signals.push('change')
  if (/\b(?:good|bad|strong|weak|better|worse)\b|优秀|较差|强|弱/i.test(text)) signals.push('evaluation')
  if (/\b(?:cause|because|resulted in|led to)\b|导致|因为|造成/i.test(text)) signals.push('causal')
  if (/\b(?:will|forecast|predict|expected to)\b|预计|预测|将会/i.test(text)) signals.push('predictive')
  return signals
}
