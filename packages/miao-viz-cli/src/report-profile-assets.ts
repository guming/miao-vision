import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync } from 'node:fs'
import { basename, dirname, extname, join, resolve } from 'node:path'
import { agentError } from './errors'
import type { ReportProfileV1 } from './report-profile'
import type { ReportReviewReason } from './report-review'
import type { AgentError } from './types'

export interface ResolvedReportProfileAssets {
  profile: ReportProfileV1
  logoSource?: string
  logoTarget?: string
  warnings: ReportReviewReason[]
}

export function resolveReportProfileAssets(
  profile: ReportProfileV1,
  profilePath: string
): ResolvedReportProfileAssets | AgentError {
  const logo = profile.presentation?.logo
  if (!logo) return { profile, warnings: [] }
  if (/^[a-z][a-z0-9+.-]*:/i.test(logo)) {
    return agentError('REPORT_PROFILE_ASSET_INVALID', 'Report profile assets must be local files.', { asset: logo })
  }
  const source = resolve(dirname(profilePath), logo)
  if (!existsSync(source) || !statSync(source).isFile()) {
    return {
      profile: withoutLogo(profile),
      warnings: [{ code: 'OPTIONAL_LOGO_MISSING', message: `Optional logo '${basename(logo)}' was not found.` }]
    }
  }
  const extension = extname(source).toLowerCase()
  if (!['.png', '.jpg', '.jpeg', '.svg', '.webp'].includes(extension)) {
    return agentError('REPORT_PROFILE_ASSET_INVALID', 'Logo must be PNG, JPEG, SVG, or WebP.', { asset: logo })
  }
  const logoTarget = `assets/logo${extension === '.jpeg' ? '.jpg' : extension}`
  return {
    profile: { ...profile, presentation: { ...profile.presentation, logo: logoTarget } },
    logoSource: source,
    logoTarget,
    warnings: []
  }
}

export function copyReportProfileAssets(assets: ResolvedReportProfileAssets, projectRoot: string): void {
  if (!assets.logoSource || !assets.logoTarget) return
  const target = join(projectRoot, assets.logoTarget)
  mkdirSync(dirname(target), { recursive: true })
  copyFileSync(assets.logoSource, target)
}

export function loadReportLogoDataUri(profile: ReportProfileV1, projectRoot: string): string | undefined {
  const logo = profile.presentation?.logo
  if (!logo) return undefined
  const path = join(projectRoot, logo)
  if (!existsSync(path) || !statSync(path).isFile()) return undefined
  const mime = ({
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml', '.webp': 'image/webp'
  } as Record<string, string>)[extname(path).toLowerCase()]
  return mime ? `data:${mime};base64,${readFileSync(path).toString('base64')}` : undefined
}

function withoutLogo(profile: ReportProfileV1): ReportProfileV1 {
  if (!profile.presentation) return profile
  const { logo: _logo, ...presentation } = profile.presentation
  return { ...profile, presentation }
}
