import { agentError, isAgentError } from './errors'
import { compactArtifactPlan } from './artifact-plan-schema'
import { planArtifact } from './artifact-planner'
import { parseAnalyzeContext } from './context-schema'
import { draftOutcomeBriefSchema } from './outcome-brief-schema'
import { resolveOutcomeBrief } from './outcome-brief-resolver'
import {
  fail, readJson, requiredFlag, stringFlag, writeOutput, type CliArgs
} from './cli-utils'

export function runArtifactCommand(args: CliArgs): unknown {
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

  const plan = planArtifact(resolveOutcomeBrief(parsedBrief.data), context)
  const value = args.flags['compact'] === true ? compactArtifactPlan(plan) : plan
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
  return { ok: true, value: { output: outputPath, status: plan.status, briefHash: plan.briefHash } }
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
