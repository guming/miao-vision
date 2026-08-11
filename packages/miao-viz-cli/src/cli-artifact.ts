import { agentError, isAgentError } from './errors'
import { resolve } from 'node:path'
import * as YAML from 'yaml'
import { verifyArtifact } from './artifact-verifier'
import { instantiateArtifactPlan } from './artifact-instantiator'
import { compactArtifactPlanV2 } from './artifact-plan-v2-schema'
import { planArtifact } from './artifact-planner'
import { parseAnalyzeContext } from './context-schema'
import { draftOutcomeBriefSchema } from './outcome-brief-schema'
import { resolveOutcomeBrief } from './outcome-brief-resolver'
import { loadOutcomeMemorySync, OutcomeMemoryStorageError } from './outcome-memory-storage'
import { runArtifactMemory } from './cli-artifact-memory'
import { guidanceFromPlan, guidanceFromVerification } from './artifact-guidance'
import { loadDataset } from './data-loader'
import {
  fail, readJson, readSpec, requiredFlag, stringFlag, writeOutput, type CliArgs
} from './cli-utils'

export function runArtifactCommand(args: CliArgs): unknown {
  if (args.subcommand === 'plan') return runArtifactPlan(args)
  if (args.subcommand === 'instantiate') return runArtifactInstantiate(args)
  if (args.subcommand === 'validate') return runArtifactValidate(args)
  if (args.subcommand === 'memory') return runArtifactMemory(args)
  return fail(agentError(
    'UNKNOWN_SUBCOMMAND',
    `Unknown artifact subcommand: ${args.subcommand ?? '(none)'}. Available: plan, instantiate, validate, memory`,
    { subcommand: args.subcommand, available: ['plan', 'instantiate', 'validate', 'memory'] }
  ))
}

function runArtifactValidate(args: CliArgs): unknown {
  const planPath = requiredFlag(args, 'plan')
  const contextPath = requiredFlag(args, 'context')
  const inputPath = requiredFlag(args, 'input')
  const specPath = requiredFlag(args, 'spec')
  if (isAgentError(planPath)) return fail(planPath)
  if (isAgentError(contextPath)) return fail(contextPath)
  if (isAgentError(inputPath)) return fail(inputPath)
  if (isAgentError(specPath)) return fail(specPath)

  const rawPlan = readArtifactInput(planPath, 'ARTIFACT_PLAN_READ_FAILED')
  if (isAgentError(rawPlan)) return fail(rawPlan)
  const rawContext = readArtifactInput(contextPath, 'ANALYZE_CONTEXT_READ_FAILED')
  if (isAgentError(rawContext)) return fail(rawContext)
  const context = parseAnalyzeContext(unwrapResult(rawContext))
  if (!context) return fail(agentError('INVALID_ANALYZE_CONTEXT', 'Analyze Context format is invalid.', { contextPath }))

  const dataset = loadDataset(inputPath, { sheet: stringFlag(args, 'sheet') })
  if (isAgentError(dataset)) return fail(dataset)
  let spec: unknown
  try {
    spec = unwrapResult(readSpec(specPath))
  } catch (error) {
    return fail(agentError('ARTIFACT_SPEC_READ_FAILED', `Could not read ${specPath}.`, {
      specPath, detail: error instanceof Error ? error.message : String(error)
    }))
  }

  const verification = verifyArtifact({ plan: unwrapResult(rawPlan), context, dataset: dataset.value, spec })
  if (isAgentError(verification)) return fail(verification)
  const summary = args.flags.summary === true
  const value = summary
    ? guidanceFromVerification(verification, localeFromPlan(unwrapResult(rawPlan)))
    : args.flags.compact === true ? compactVerification(verification) : verification
  const result = { ok: true as const, value }
  const outputPath = stringFlag(args, 'output')
  if (!outputPath) return result
  if ([planPath, contextPath, inputPath, specPath].some(path => resolve(path) === resolve(outputPath))) {
    return fail(agentError('ARTIFACT_VERIFICATION_WRITE_FAILED', 'Verification output cannot overwrite an input file.', {
      outputPath
    }))
  }
  try {
    writeOutput(outputPath, `${JSON.stringify(result, null, 2)}\n`)
  } catch (error) {
    return fail(agentError('ARTIFACT_VERIFICATION_WRITE_FAILED', 'Could not write Artifact Verification.', {
      outputPath, detail: error instanceof Error ? error.message : String(error)
    }))
  }
  return summary
    ? { ok: true, value: { output: outputPath, state: value.state } }
    : { ok: true, value: { output: outputPath, status: verification.status, specHash: verification.specHash } }
}

function compactVerification(verification: ReturnType<typeof verifyArtifact>): unknown {
  if (isAgentError(verification)) return verification
  return {
    ...verification,
    checks: verification.checks.map(({ code, status, path }) => ({ code, status, ...(path ? { path } : {}) })),
    warnings: verification.warnings.map(({ code, path }) => ({ code, ...(path ? { path } : {}) })),
    repairHints: verification.repairHints.map(({ code, path, action }) => ({ code, path, action }))
  }
}

function runArtifactPlan(args: CliArgs): unknown {
  if (args.subcommand !== 'plan') {
    return fail(agentError(
      'UNKNOWN_SUBCOMMAND',
      `Unknown artifact subcommand: ${args.subcommand ?? '(none)'}. Available: plan`,
      { subcommand: args.subcommand, available: ['plan'] }
    ))
  }

  const briefPath = requiredFlag(args, 'brief')
  const contextPath = requiredFlag(args, 'context')
  if (isAgentError(briefPath)) return fail(briefPath)
  if (isAgentError(contextPath)) return fail(contextPath)

  const rawBrief = readArtifactInput(briefPath, 'OUTCOME_BRIEF_READ_FAILED')
  if (isAgentError(rawBrief)) return fail(rawBrief)
  const parsedBrief = draftOutcomeBriefSchema.safeParse(unwrapResult(rawBrief))
  if (!parsedBrief.success) {
    return fail(agentError('INVALID_OUTCOME_BRIEF', 'Outcome Brief format is invalid.', {
      briefPath,
      issues: parsedBrief.error.issues.map(issue => ({
        code: issue.code, path: issue.path.join('.'), message: issue.message
      }))
    }))
  }

  const rawContext = readArtifactInput(contextPath, 'ANALYZE_CONTEXT_READ_FAILED')
  if (isAgentError(rawContext)) return fail(rawContext)
  const context = parseAnalyzeContext(unwrapResult(rawContext))
  if (!context) {
    return fail(agentError('INVALID_ANALYZE_CONTEXT', 'Analyze Context format is invalid.', { contextPath }))
  }

  const memoryPath = stringFlag(args, 'memory')
  let memory
  if (memoryPath) {
    try {
      memory = loadOutcomeMemorySync(memoryPath)
    } catch (error) {
      if (error instanceof OutcomeMemoryStorageError) {
        return fail(agentError(error.code, error.message, error.issues === undefined ? {} : { issues: error.issues }))
      }
      return fail(agentError('INVALID_OUTCOME_MEMORY', `Could not load Outcome Memory: ${memoryPath}.`))
    }
  }
  const plan = planArtifact(resolveOutcomeBrief(parsedBrief.data, { memory }), context)
  const summary = args.flags.summary === true
  const value = summary ? guidanceFromPlan(plan)
    : args.flags.compact === true ? compactArtifactPlanV2(plan) : plan
  const result = { ok: true as const, value }
  const outputPath = stringFlag(args, 'output')
  if (!outputPath) return result

  try {
    writeOutput(outputPath, `${JSON.stringify(result, null, 2)}\n`)
  } catch (error) {
    return fail(agentError('ARTIFACT_PLAN_WRITE_FAILED', 'Could not write Artifact Plan.', {
      outputPath, detail: error instanceof Error ? error.message : String(error)
    }))
  }
  return summary
    ? { ok: true, value: { output: outputPath, state: value.state } }
    : { ok: true, value: { output: outputPath, status: plan.status, briefHash: plan.briefHash } }
}

function runArtifactInstantiate(args: CliArgs): unknown {
  const planPath = requiredFlag(args, 'plan')
  const contextPath = requiredFlag(args, 'context')
  if (isAgentError(planPath)) return fail(planPath)
  if (isAgentError(contextPath)) return fail(contextPath)

  const rawPlan = readArtifactInput(planPath, 'ARTIFACT_PLAN_READ_FAILED')
  if (isAgentError(rawPlan)) return fail(rawPlan)
  const rawContext = readArtifactInput(contextPath, 'ANALYZE_CONTEXT_READ_FAILED')
  if (isAgentError(rawContext)) return fail(rawContext)
  const context = parseAnalyzeContext(unwrapResult(rawContext))
  if (!context) {
    return fail(agentError('INVALID_ANALYZE_CONTEXT', 'Analyze Context format is invalid.', { contextPath }))
  }

  const instantiated = instantiateArtifactPlan(unwrapResult(rawPlan), context, {
    confirmPlan: args.flags['confirm-plan'] === true
  })
  if (isAgentError(instantiated)) return fail(instantiated)
  const outputPath = stringFlag(args, 'output')
  if (!outputPath) return { ok: true, value: instantiated }

  try {
    writeOutput(outputPath, YAML.stringify(instantiated.spec))
  } catch (error) {
    return fail(agentError('ARTIFACT_SPEC_WRITE_FAILED', 'Could not write instantiated Artifact Spec.', {
      outputPath, detail: error instanceof Error ? error.message : String(error)
    }))
  }
  const { spec: _spec, ...summary } = instantiated
  return { ok: true, value: { ...summary, output: outputPath } }
}

function readArtifactInput(path: string, code: string): unknown {
  try {
    return readJson<unknown>(path)
  } catch (error) {
    return agentError(code, `Could not read ${path}.`, {
      path, detail: error instanceof Error ? error.message : String(error)
    })
  }
}

function unwrapResult(value: unknown): unknown {
  if (value && typeof value === 'object' && (value as { ok?: unknown }).ok === true) {
    return (value as { value?: unknown }).value
  }
  return value
}

function localeFromPlan(value: unknown): string {
  if (!value || typeof value !== 'object') return 'en'
  const brief = (value as { resolvedBrief?: unknown }).resolvedBrief
  if (!brief || typeof brief !== 'object') return 'en'
  const presentation = (brief as { presentation?: unknown }).presentation
  if (!presentation || typeof presentation !== 'object') return 'en'
  const locale = (presentation as { locale?: unknown }).locale
  return typeof locale === 'string' && locale.trim() ? locale : 'en'
}
