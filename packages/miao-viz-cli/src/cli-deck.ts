import { agentError, isAgentError } from './errors'
import { parseDeckCommandContext } from './deck-context-dispatch'
import { collectDeckKnowledgeIssues, deckKnowledgeErrors } from './deck-knowledge-validator'
import { parseDeckSpec, validateDeckFields } from './deck-validator'
import { renderDeckHtml } from './deck-renderer'
import { loadDataset } from './data-loader'
import { profileDataset } from './data-profiler'
import { fail, readJson, readSpec, requiredFlag, stringFlag, writeOutput } from './cli-utils'
import type { CliArgs } from './cli-utils'
import { instantiateDeck } from './deck-knowledge-registry'
import * as YAML from 'yaml'
import { exportHtmlToPdf } from './pdf-export'
import { validateDeckProvenance } from './deck-provenance'
import { buildDelivery, deckDeliverySummary } from './artifact-delivery'
import { createArtifactPreview } from './artifact-preview'
import type { AnalyzeContext } from './context-schema'
import type { DeckSpec } from './deck-types'
import type { AgentResult } from './types'
import { analyzeDeckDocument, analyzeHybridDeckDocument } from './deck-content-analyzer'
import { resolve } from 'node:path'
import { collectDeckNarrativeIssues } from './deck-narrative-validator'
import { instantiateNarrativeDeck } from './deck-narrative-instantiator'
import { fingerprintArtifactData } from './artifact-data-fingerprint'

export function runDeckCommand(args: CliArgs): unknown {
  if (args.subcommand === 'analyze') return runDeckAnalyze(args)
  if (args.subcommand === 'instantiate') return runDeckInstantiate(args)
  if (args.subcommand !== 'validate') {
    return fail(agentError(
      'UNKNOWN_SUBCOMMAND',
      `Unknown deck subcommand: ${args.subcommand ?? '(none)'}. Available: instantiate, validate`,
      { subcommand: args.subcommand, available: ['instantiate', 'validate'] }
    ))
  }

  const specPath = requiredFlag(args, 'spec')
  const contextPath = requiredFlag(args, 'context')
  if (isAgentError(specPath)) return fail(specPath)
  if (isAgentError(contextPath)) return fail(contextPath)

  const parsedSpec = parseDeckSpec(readSpec(specPath))
  if (isAgentError(parsedSpec)) return fail(parsedSpec)

  const dispatched = parseDeckCommandContext(readJson<unknown>(contextPath), { contextPath })
  if (isAgentError(dispatched)) return fail(dispatched)
  const context = dispatched.value.analyzeContext
  const narrativeIssues = collectDeckNarrativeIssues(parsedSpec.value, dispatched.value.deckContext)
  const narrativeError = narrativeIssues.find(issue => issue.severity === 'error')
  if (narrativeError) return fail(agentError(narrativeError.code, narrativeError.message, { path: narrativeError.path, hint: narrativeError.hint, issues: narrativeIssues }))
  if (!context) return {
    ok: true,
    value: { spec: parsedSpec.value, warnings: [], issues: narrativeIssues, sourceValidated: true }
  }

  const issues = collectDeckKnowledgeIssues(parsedSpec.value, context, args.flags.strict === true)
  const provenance = validateDeckProvenance(parsedSpec.value, context)
  const errors = deckKnowledgeErrors(issues)
  if (errors.length > 0) {
    const first = errors[0]
    return fail(agentError(first.code, first.message, { path: first.path, hint: first.hint, issues }))
  }
  if (args.flags.strict === true && provenance.issues.length) {
    const first = provenance.issues[0]
    return fail(agentError(first.code, first.message, { issues: provenance.issues, coverage: provenance.coverage }))
  }

  return {
    ok: true,
    value: {
      spec: parsedSpec.value,
      warnings: issues.filter(item => item.severity === 'warning').map(item => item.message),
      issues: [...narrativeIssues, ...issues, ...provenance.issues],
      coverage: provenance.coverage
    }
  }
}

function runDeckAnalyze(args: CliArgs): unknown {
  const file = args.positional[0]
  if (!file) return fail(agentError('MISSING_INPUT', 'Usage: miao-viz deck analyze <file> --intent <text> [--output <context.json>]'))
  const intent = stringFlag(args, 'intent')
  if (!intent) return fail(agentError('DECK_INTENT_REQUIRED', 'Deck analyze requires --intent <text>.'))
  const dataFile = stringFlag(args, 'data')
  const analyzed = dataFile
    ? analyzeHybridDeckDocument(file, dataFile, { intent })
    : analyzeDeckDocument(file, { intent })
  if (isAgentError(analyzed)) return fail(analyzed)
  const output = stringFlag(args, 'output')
  if (output) writeOutput(output, `${JSON.stringify(analyzed.value, null, 2)}\n`)
  return { ok: true, value: { context: analyzed.value, ...(output ? { output } : {}) } }
}

function runDeckInstantiate(args: CliArgs): unknown {
  const intent = args.positional[0]
  const patterns = ['executive-brief', 'business-review', 'topic-explainer', 'project-update', 'proposal'] as const
  if (!patterns.includes(intent as (typeof patterns)[number])) {
    return fail(agentError('INVALID_DECK_INTENT', `Deck pattern must be one of: ${patterns.join(', ')}.`, { intent }))
  }
  const contextPath = requiredFlag(args, 'context')
  if (isAgentError(contextPath)) return fail(contextPath)
  const dispatched = parseDeckCommandContext(readJson<unknown>(contextPath), { contextPath })
  if (isAgentError(dispatched)) return fail(dispatched)
  const context = dispatched.value.analyzeContext
  const generated = context && (intent === 'executive-brief' || intent === 'business-review')
    ? { ok: true as const, value: instantiateDeck(intent, context) }
    : (intent === 'topic-explainer' || intent === 'project-update' || intent === 'proposal')
      ? instantiateNarrativeDeck(intent, dispatched.value.deckContext)
      : dataContextRequired(contextPath)
  if (isAgentError(generated)) return fail(generated)
  const spec = generated.value
  const output = stringFlag(args, 'output')
  if (output) writeOutput(output, YAML.stringify(spec))
  return { ok: true, value: { spec, ...(output ? { output } : {}) } }
}

export async function runDeckRender(args: CliArgs): Promise<unknown> {
  const specPath = requiredFlag(args, 'spec')
  const output = requiredFlag(args, 'output')
  if (isAgentError(specPath)) return fail(specPath)
  if (isAgentError(output)) return fail(output)
  const parsed = parseDeckSpec(readSpec(specPath))
  if (isAgentError(parsed)) return fail(parsed)
  const contextPath = stringFlag(args, 'context')
  if (args.flags.strict === true && !contextPath) {
    return fail(agentError(
      'DECK_CONTEXT_REQUIRED',
      'Strict deck validation requires --context <context.json>.',
      { hint: 'Run data analyze and pass its context.json output to render deck.' }
    ))
  }

  let knowledgeIssues: ReturnType<typeof collectDeckKnowledgeIssues> = []
  let provenanceCoverage: ReturnType<typeof validateDeckProvenance>['coverage'] | undefined
  let renderContext: AnalyzeContext | null = null
  let validation: AgentResult<DeckSpec> = parsed
  let rows: Record<string, unknown>[] = []
  let narrativeOnly = false
  let narrativeIssues: ReturnType<typeof collectDeckNarrativeIssues> = []
  let dispatchedContext: ReturnType<typeof parseDeckCommandContext> | undefined
  if (contextPath) {
    dispatchedContext = parseDeckCommandContext(readJson<unknown>(contextPath), { contextPath })
    if (isAgentError(dispatchedContext)) return fail(dispatchedContext)
    narrativeOnly = !dispatchedContext.value.analyzeContext
    narrativeIssues = collectDeckNarrativeIssues(validation.value, dispatchedContext.value.deckContext)
    const narrativeError = narrativeIssues.find(issue => issue.severity === 'error')
    if (narrativeError) return fail(agentError(narrativeError.code, narrativeError.message, { path: narrativeError.path, hint: narrativeError.hint, issues: narrativeIssues }))
  }

  const input = stringFlag(args, 'input')
  if (!narrativeOnly) {
    if (!input) return fail(agentError('MISSING_FLAG', 'Missing required flag --input.'))
    if (dispatchedContext?.ok && dispatchedContext.value.kind === 'deck') {
      const declared = dispatchedContext.value.deckContext.sources.find(source => source.kind === 'data')
      if (declared && resolve(declared.path) !== resolve(input)) {
        return fail(agentError('DECK_DATA_SOURCE_MISMATCH', 'Render input does not match the data source analyzed in DeckContext.', {
          expected: declared.path, actual: input, hint: 'Render with the same data file used by "deck analyze --data".'
        }))
      }
    }
    const dataset = loadDataset(input, { sheet: stringFlag(args, 'sheet'), limit: numberFlag(args, 'limit') })
    if (isAgentError(dataset)) return fail(dataset)
    if (dispatchedContext?.ok && dispatchedContext.value.kind === 'deck') {
      const expectedFingerprint = dispatchedContext.value.deckContext.metadata?.dataFingerprint
      const actualFingerprint = fingerprintArtifactData(dataset.value)
      if (expectedFingerprint && actualFingerprint !== expectedFingerprint) {
        return fail(agentError('DECK_DATA_SOURCE_MISMATCH', 'Render data does not match the data analyzed in DeckContext.', {
          expectedFingerprint, actualFingerprint,
          hint: 'Render the unchanged data file used by "deck analyze --data" without applying a different sheet or row limit.'
        }))
      }
    }
    rows = dataset.value.rows
    validation = validateDeckFields(parsed.value, profileDataset(dataset.value))
    if (isAgentError(validation)) return fail(validation)
  }

  const context = dispatchedContext?.ok ? dispatchedContext.value.analyzeContext : undefined
  if (context) {
    renderContext = context
    knowledgeIssues = collectDeckKnowledgeIssues(validation.value, context, args.flags.strict === true)
    const provenance = validateDeckProvenance(validation.value, context)
    provenanceCoverage = provenance.coverage
    const errors = deckKnowledgeErrors(knowledgeIssues)
    if (errors.length > 0) {
      const first = errors[0]
      return fail(agentError(first.code, first.message, {
        path: first.path,
        hint: first.hint,
        issues: knowledgeIssues
      }))
    }
    if (args.flags.strict === true && provenance.issues.length) {
      const first = provenance.issues[0]
      return fail(agentError(first.code, first.message, { issues: provenance.issues, coverage: provenance.coverage }))
    }
  }

  const theme = stringFlag(args, 'theme') as Parameters<typeof renderDeckHtml>[2]
  let html: string
  try {
    html = renderDeckHtml(validation.value, rows, theme)
  } catch (error) {
    return fail(agentError('DECK_RENDER_FAILED', error instanceof Error ? error.message : 'Deck rendering failed.'))
  }
  const format = stringFlag(args, 'format') ?? 'html'
  if (format !== 'html' && format !== 'pdf') {
    return fail(agentError('UNSUPPORTED_OUTPUT_FORMAT', "Deck format must be 'html' or 'pdf'.", { format }))
  }
  if (format === 'pdf') {
    const exported = await exportHtmlToPdf(html, output, {
      mode: 'deck',
      timeout: numberFlag(args, 'pdf-timeout'),
      keepTemp: args.flags['keep-temp'] === true
    })
    if (!exported.ok) return fail(exported)
  } else {
    writeOutput(output, html)
  }
  const warnings = knowledgeIssues.filter(item => item.severity === 'warning').map(item => item.message)
  const preview = await createArtifactPreview(html, output, {
    selector: '.slide', width: 1440, height: 900, timeout: numberFlag(args, 'png-timeout')
  })
  if (preview.warning) warnings.push(preview.warning)
  const verified = Boolean(contextPath) && knowledgeIssues.every(item => item.severity !== 'error') &&
    Boolean(provenanceCoverage && provenanceCoverage.objectCoverage === 1 && provenanceCoverage.claimCheckCoverage === 1)
  const summary = deckDeliverySummary(validation.value, renderContext, verified)
  const delivery = buildDelivery({
    kind: 'deck', title: validation.value.title ?? validation.value.slides[0]?.title ?? 'Miao Vision Deck',
    outputs: [output], primaryPath: output, previewPath: preview.path, verified,
    coverage: provenanceCoverage, warnings: warnings.filter(warning => !warning.startsWith('PNG_')), ...summary
  })
  return {
    ok: true,
    value: {
      output,
      slides: validation.value.slides.length,
      warnings,
      issues: [...narrativeIssues, ...knowledgeIssues],
      coverage: provenanceCoverage,
      delivery,
      ...(narrativeOnly ? { sourceValidated: Boolean(contextPath) } : {}),
      ...(!contextPath ? {
        skippedChecks: ['claim grounding', 'evidence paths', 'caveat coverage']
      } : {})
    }
  }
}

function numberFlag(args: CliArgs, name: string): number | undefined {
  const value = stringFlag(args, name)
  if (!value) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function dataContextRequired(contextPath: string) {
  return agentError('DECK_ANALYZE_CONTEXT_REQUIRED', 'This data deck operation requires an AnalyzeContext.', {
    contextPath,
    hint: 'Use a DeckContext with embedded data or pass context.json from "miao-viz data analyze".'
  })
}
