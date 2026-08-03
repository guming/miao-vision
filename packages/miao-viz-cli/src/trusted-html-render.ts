import { renderStaticHtml } from './html-export'
import { packageTrustedArtifact, projectProfileForArtifact, type TrustedArtifactResult } from './trusted-artifact'
import type { AnalyzeContext } from './context-schema'
import type { ProvenanceCoverage } from './provenance-validator'
import type { ThemeName } from './themes/types'
import type { AgentReportSpec, DataProfile } from './types'

export interface TrustedHtmlRenderOptions {
  interactive: boolean
  context?: AnalyzeContext
  coverage?: ProvenanceCoverage
  evidenceVerified?: boolean
  theme?: ThemeName
}

export function renderReportHtmlWithTrust(
  spec: AgentReportSpec,
  profile: DataProfile,
  rows: Record<string, unknown>[],
  options: TrustedHtmlRenderOptions
): { html: string; trust: TrustedArtifactResult } {
  let trust = packageTrustedArtifact(spec, profile, rows, { context: options.context, evidenceVerified: options.evidenceVerified })
  let html = renderPass(spec, profile, trust, options)
  if (!options.interactive) return { html, trust }

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const artifactBytes = Buffer.byteLength(html, 'utf8')
    if (artifactBytes === trust.manifest.artifactBytes) break
    trust = packageTrustedArtifact(spec, profile, rows, {
      context: options.context, evidenceVerified: options.evidenceVerified, artifactBytes
    })
    html = renderPass(spec, profile, trust, options)
  }
  return { html, trust }
}

function renderPass(
  spec: AgentReportSpec,
  profile: DataProfile,
  trust: TrustedArtifactResult,
  options: TrustedHtmlRenderOptions
): string {
  const artifactProfile = options.interactive ? projectProfileForArtifact(profile, trust.manifest) : profile
  return renderStaticHtml(spec, artifactProfile, trust.rows, options.theme, {
    enabled: options.interactive,
    context: options.context,
    coverage: options.coverage,
    exposureManifest: options.interactive ? trust.manifest : undefined,
    shareSafetyChecks: options.interactive ? trust.shareSafety.checks : undefined
  })
}
