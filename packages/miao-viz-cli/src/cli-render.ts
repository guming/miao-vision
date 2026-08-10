import { join } from 'node:path'
import { agentError, isAgentError } from './errors'
import { profileDataset } from './data-profiler'
import { validateReportSpec } from './spec-validator'
import { parseAnalyzeContext } from './context-schema'
import { renderChartSvg } from './svg-renderer'
import { collectArtifactSizeWarnings } from './artifact-budget'
import { resolveChartEvidence } from './chart-evidence'
import { runArticle } from './cli-article'
import { runDeckRender } from './cli-deck'
import { formatOutputPath, writeOutput, fail, printJson, readSpec, readJson, normalizeSpec, parseFormats, requiredFlag, stringFlag, numberFlag } from './cli-utils'
import { firstInput, loadCliDataset } from './cli-dataset'
import { resolveDirectives } from './directive-resolver'
import { mapInsightText } from './insight-utils'
import { validateProvenance } from './provenance-validator'
import type { CliArgs } from './cli-utils'
import { exportHtmlToPdf } from './pdf-export'
import { exportHtmlToPng } from './png-export'
import { renderReportHtmlWithTrust } from './trusted-html-render'
import { deliverReportArtifact } from './report-delivery'

export async function runRenderGroup(args: CliArgs): Promise<void> {
  switch (args.subcommand) {
    case 'report':
      printJson(await runRender(args))
      return
    case 'deck':
      printJson(await runDeckRender(args))
      return
    case 'article':
      printJson(await runArticle(args))
      return
    default:
      printJson(fail(agentError('UNKNOWN_SUBCOMMAND',
        `Unknown render subcommand: ${args.subcommand ?? '(none)'}. Available: report, deck, article`,
        { subcommand: args.subcommand, available: ['report', 'deck', 'article'] }
      )))
  }
}

async function runRender(args: CliArgs): Promise<unknown> {
  const input = stringFlag(args, 'input') ?? firstInput(args) ?? agentError('MISSING_FLAG', 'Missing --input <file> or --inputs <a,b,...>.')
  const specPath = requiredFlag(args, 'spec')
  if (isAgentError(input)) return fail(input)
  if (isAgentError(specPath)) return fail(specPath)

  const formats = parseFormats(stringFlag(args, 'format'))
  if (isAgentError(formats)) return fail(formats)
  const outputDir = stringFlag(args, 'output-dir')
  const output = stringFlag(args, 'output')
  if (formats.length > 1 && !outputDir) return fail(agentError('MISSING_FLAG', 'Multiple formats require --output-dir <directory>.'))
  if (formats.length === 1 && !output) return fail(agentError('MISSING_FLAG', 'Missing required flag --output.'))

  const dataset = loadCliDataset(args, input)
  if (isAgentError(dataset)) return fail(dataset)

  const profile = profileDataset(dataset.value)
  const spec = readSpec(specPath)
  const normalized = normalizeSpec(spec)
  if (isAgentError(normalized)) return fail(normalized)

  const contextPath = stringFlag(args, 'context')
  let renderContext: ReturnType<typeof parseAnalyzeContext> = null
  if (contextPath) {
    const raw = readJson<unknown>(contextPath)
    const unwrapped = (raw as { ok?: unknown; value?: unknown }).ok === true ? (raw as { value: unknown }).value : raw
    renderContext = parseAnalyzeContext(unwrapped)
    if (!renderContext) return fail(agentError('INVALID_CONTEXT', 'context.json format is invalid.', { contextPath }))
  }

  const resolvedSpec = renderContext ? resolveChartEvidence(normalized, renderContext) : normalized
  const validation = validateReportSpec(resolvedSpec, profile, formats, renderContext ?? undefined)
  if (isAgentError(validation)) return fail(validation)

  if (renderContext && validation.value.insights && validation.value.insights.length > 0) {
    validation.value.insights = validation.value.insights.map(insight =>
      mapInsightText(insight, text => resolveDirectives(text, renderContext!.evidence))
    )
  }

  const themeFlag = stringFlag(args, 'theme') as 'standard-white' | 'magazine' | 'standard-dark' | 'minimal' | 'nyt' | 'bloomberg' | 'tableau' | undefined
  const interactive = args.flags['no-interactive'] !== true
  const renderProvenance = renderContext ? validateProvenance(validation.value, renderContext) : undefined

  const written: string[] = []
  const warnings: string[] = []
  const provenanceVerified = renderProvenance ? renderProvenance.issues.length === 0 : undefined
  const rendered = renderReportHtmlWithTrust(validation.value, profile, dataset.value.rows, {
    interactive,
    context: renderContext ?? undefined,
    evidenceVerified: provenanceVerified,
    coverage: renderProvenance?.coverage,
    theme: themeFlag
  })
  const html = rendered.html
  const finalTrust = rendered.trust
  const hardBudgetIssue = finalTrust.shareSafety.checks.find(check => check.id === 'artifact_budget')?.issues.find(issue => issue.severity === 'error')
  if (interactive && validation.value.interactions?.dataPolicy && hardBudgetIssue) {
    return fail(agentError(hardBudgetIssue.code, hardBudgetIssue.message, { path: hardBudgetIssue.path, shareSafety: finalTrust.shareSafety }))
  }
  if (interactive && args.flags['trusted'] === true && !finalTrust.shareSafe) {
    const firstIssue = finalTrust.shareSafety.checks.flatMap(check => check.issues)[0]
    return fail(agentError(firstIssue?.code ?? 'INTERACTION_NOT_SHARE_SAFE', firstIssue?.message ?? 'Interactive artifact is not share-safe.', {
      shareSafety: finalTrust.shareSafety
    }))
  }
  for (const format of formats) {
    if (format === 'html') {
      const htmlPath = outputDir ? join(outputDir, 'report.html') : formatOutputPath(output!, 'html', false)
      warnings.push(...collectArtifactSizeWarnings(html, interactive))
      writeOutput(htmlPath, html)
      written.push(htmlPath)
    } else if (format === 'pdf') {
      const pdfPath = outputDir ? join(outputDir, 'report.pdf') : formatOutputPath(output!, 'pdf', false)
      const result = await exportHtmlToPdf(html, pdfPath, {
        mode: 'report',
        pageSize: stringFlag(args, 'page-size') as 'A4' | 'Letter' | undefined,
        orientation: stringFlag(args, 'orientation') as 'portrait' | 'landscape' | undefined,
        margin: stringFlag(args, 'margin'),
        timeout: numberFlag(args, 'pdf-timeout'),
        keepTemp: args.flags['keep-temp'] === true
      })
      if (!result.ok) return fail(result)
      written.push(pdfPath)
      warnings.push(...result.value.warnings.map(issue => issue.message))
    } else if (format === 'png') {
      const pngPath = outputDir ? join(outputDir, 'report.png') : formatOutputPath(output!, 'png', false)
      const result = await exportHtmlToPng(html, pngPath, {
        width: numberFlag(args, 'viewport-width'),
        height: numberFlag(args, 'viewport-height'),
        scale: numberFlag(args, 'scale'),
        timeout: numberFlag(args, 'png-timeout'),
        keepTemp: args.flags['keep-temp'] === true
      })
      if (!result.ok) return fail(result)
      written.push(pngPath)
    } else if (format === 'svg') {
      const svgPath = outputDir ? join(outputDir, 'report.svg') : formatOutputPath(output!, 'svg', false)
      if (validation.value.charts.length !== 1) {
        return fail(agentError('SVG_REQUIRES_SINGLE_CHART', 'SVG output currently supports a single chart spec.'))
      }
      writeOutput(svgPath, renderChartSvg(validation.value.charts[0], dataset.value.rows))
      written.push(svgPath)
    } else {
      return fail(agentError('OUTPUT_FORMAT_NOT_IMPLEMENTED', `Output format '${format}' is not implemented yet.`, {
        implementedFormats: ['html', 'svg', 'png', 'pdf']
      }))
    }
  }

  if (interactive) {
    warnings.push(...finalTrust.shareSafety.checks.flatMap(check => check.issues.map(issue => `${issue.code}: ${issue.message}`)))
  }

  const primaryPath = formats.includes('html') ? written.find(path => path.endsWith('.html'))! : written[0]
  const verified = renderProvenance ? renderProvenance.issues.length === 0 : false
  const delivered = await deliverReportArtifact({
    kind: 'report', html, spec: validation.value, context: renderContext, outputs: written, primaryPath,
    verified, coverage: renderProvenance?.coverage, shareSafe: interactive ? finalTrust.shareSafe : undefined,
    shareStatus: interactive ? finalTrust.shareSafety.status : undefined,
    contentWarnings: warnings.filter(warning => !warning.startsWith('PNG_')),
    previewName: outputDir ? 'report.preview.png' : undefined,
    previewWidth: numberFlag(args, 'viewport-width'), previewHeight: numberFlag(args, 'viewport-height'), previewTimeout: numberFlag(args, 'png-timeout')
  })
  if (delivered.previewWarning) warnings.push(delivered.previewWarning)

  return {
    ok: true,
    value: {
      output: written,
      profile,
      interactive: formats.includes('html') ? interactive : false,
      coverage: renderProvenance?.coverage,
      verified,
      shareSafe: interactive ? finalTrust.shareSafe : undefined,
      shareSafety: interactive ? finalTrust.shareSafety : undefined,
      exposureManifest: interactive ? finalTrust.manifest : undefined,
      delivery: delivered.delivery
    },
    ...(warnings.length ? { warnings } : {})
  }
}
