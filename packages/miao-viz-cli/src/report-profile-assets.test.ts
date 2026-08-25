import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { describe, expect, it } from 'vitest'
import { copyReportProfileAssets, resolveReportProfileAssets } from './report-profile-assets'
import type { ReportProfileV1 } from './report-profile'

const profile = (logo: string): ReportProfileV1 => ({
  schemaVersion: 1, presentation: { logo },
  metrics: [{ evidenceId: 'total', metric: 'sales', label: 'Sales', materiality: { percent: 0.1 } }]
})

describe('report profile assets', () => {
  it('freezes a valid local logo under a portable relative path', () => {
    const dir = mkdtempSync(join(tmpdir(), 'miao-brand-'))
    const source = join(dir, 'brand.png')
    const project = join(dir, 'project')
    writeFileSync(source, 'png-data')
    const result = resolveReportProfileAssets(profile('./brand.png'), join(dir, 'profile.yaml'))
    expect('code' in result).toBe(false)
    if ('code' in result) return
    expect(result.profile.presentation?.logo).toBe('assets/logo.png')
    copyReportProfileAssets(result, project)
    expect(existsSync(join(project, 'assets/logo.png'))).toBe(true)
    expect(readFileSync(join(project, 'assets/logo.png'), 'utf8')).toBe('png-data')
  })

  it('rejects remote assets', () => {
    expect(resolveReportProfileAssets(profile('https://example.com/logo.png'), '/tmp/profile.yaml'))
      .toMatchObject({ code: 'REPORT_PROFILE_ASSET_INVALID' })
  })

  it('removes a missing optional logo and returns a review warning', () => {
    const result = resolveReportProfileAssets(profile('./missing.png'), '/tmp/profile.yaml')
    expect('code' in result).toBe(false)
    if ('code' in result) return
    expect(result.profile.presentation?.logo).toBeUndefined()
    expect(result.warnings).toEqual([{ code: 'OPTIONAL_LOGO_MISSING', message: "Optional logo 'missing.png' was not found." }])
  })
})
