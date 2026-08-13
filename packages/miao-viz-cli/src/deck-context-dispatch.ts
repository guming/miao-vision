import { analyzeContextSchema, parseAnalyzeContext, type AnalyzeContext } from './context-schema'
import { relative } from 'node:path'
import { deckContextSchema, deckSourceId, type DeckContext } from './deck-context-schema'
import { agentError, ok } from './errors'
import type { AgentResult } from './types'

export interface DeckCommandContext {
  kind: 'deck' | 'analyze'
  deckContext: DeckContext
  analyzeContext?: AnalyzeContext
}

export interface DeckContextDispatchOptions {
  contextPath?: string
  workspaceRoot?: string
}

export function parseDeckCommandContext(
  value: unknown,
  options: DeckContextDispatchOptions = {}
): AgentResult<DeckCommandContext> {
  const deck = deckContextSchema.safeParse(value)
  if (deck.success) {
    return ok({ kind: 'deck', deckContext: deck.data, analyzeContext: deck.data.data })
  }

  const analyze = parseAnalyzeContext(value)
  if (analyze) {
    return ok({
      kind: 'analyze',
      analyzeContext: analyze,
      deckContext: adaptAnalyzeContext(analyze, options)
    })
  }

  const analyzeIssue = analyzeContextSchema.safeParse(value)
  return agentError('INVALID_DECK_CONTEXT', 'Context must be a DeckContext or AnalyzeContext.', {
    acceptedShapes: ['DeckContext version 1', 'AnalyzeContext'],
    deckContextIssue: firstIssue(deck.error),
    analyzeContextIssue: analyzeIssue.success ? undefined : firstIssue(analyzeIssue.error),
    hint: 'Run "miao-viz deck analyze" for DeckContext or "miao-viz data analyze" for AnalyzeContext.'
  })
}

export function adaptAnalyzeContext(
  analyzeContext: AnalyzeContext,
  options: DeckContextDispatchOptions = {}
): DeckContext {
  const contextPath = options.contextPath ?? 'context.json'
  const workspaceRoot = options.workspaceRoot ?? process.cwd()
  const sourcePath = relative(workspaceRoot, contextPath).split('\\').join('/') || 'context.json'
  const recommendedPatterns = (analyzeContext.catalog.deckPatterns ?? []).map(pattern => ({
    id: pattern.id,
    score: pattern.score,
    reasons: [`AnalyzeContext recommends ${pattern.id}.`]
  }))
  return deckContextSchema.parse({
    version: 1,
    request: { rawIntent: analyzeContext.intent.raw },
    sources: [{ id: deckSourceId(contextPath, workspaceRoot), kind: 'data', path: sourcePath }],
    data: analyzeContext,
    planning: { recommendedPatterns, blockedPatterns: [] }
  })
}

function firstIssue(error: { issues: Array<{ path: PropertyKey[]; message: string }> }): { path: string; message: string } | undefined {
  const issue = error.issues[0]
  return issue ? { path: issue.path.join('.'), message: issue.message } : undefined
}
