import { buildDelivery, reportDeliverySummary, type DeliveryManifest } from './artifact-delivery'
import { createArtifactPreview } from './artifact-preview'
import type { AnalyzeContext } from './context-schema'
import type { ProvenanceCoverage } from './provenance-validator'
import type { AgentReportSpec } from './types'

export async function deliverReportArtifact(options: {
  kind: 'report' | 'recurring-report'
  html: string
  spec: AgentReportSpec
  context: AnalyzeContext | null
  outputs: string[]
  primaryPath: string
  verified: boolean
  coverage?: ProvenanceCoverage
  shareSafe?: boolean
  shareStatus?: 'safe' | 'review' | 'restricted'
  contentWarnings?: string[]
  previewName?: string
  previewWidth?: number
  previewHeight?: number
  previewTimeout?: number
  period?: string
  changeCounts?: DeliveryManifest['summary']['changeCounts']
}): Promise<{ delivery: DeliveryManifest; previewPath?: string; previewWarning?: string }> {
  const preview = await createArtifactPreview(options.html, options.primaryPath, {
    fixedName: options.previewName, width: options.previewWidth,
    height: options.previewHeight, timeout: options.previewTimeout
  })
  const summary = reportDeliverySummary(options.spec, options.context, options.verified)
  return {
    previewPath: preview.path, previewWarning: preview.warning,
    delivery: buildDelivery({
      kind: options.kind, title: options.spec.title ?? 'Miao Vision Report', outputs: options.outputs,
      primaryPath: options.primaryPath, previewPath: preview.path, verified: options.verified,
      coverage: options.coverage, shareSafe: options.shareSafe, shareStatus: options.shareStatus,
      warnings: options.contentWarnings, period: options.period, changeCounts: options.changeCounts,
      recurring: options.kind === 'recurring-report', ...summary
    })
  }
}
