import { existsSync, mkdtempSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { tmpdir } from 'node:os'
import { agentError } from './errors'
import type { AgentResult } from './types'

type PlaywrightModule = { chromium: import('playwright-core').BrowserType<import('playwright-core').Browser> }

export async function exportHtmlToPng(
  html: string,
  outputPath: string,
  options: { width?: number; height?: number; scale?: number; timeout?: number; keepTemp?: boolean; selector?: string } = {}
): Promise<AgentResult<{ output: string; tempDir?: string }>> {
  const workspaceRequire = createRequire(join(process.cwd(), 'package.json'))
  let playwright: PlaywrightModule | null = null
  for (const name of ['playwright', 'playwright-core', '@playwright/test']) {
    try { playwright = workspaceRequire(name) as PlaywrightModule; break } catch {}
  }
  if (!playwright) return agentError('PNG_PLAYWRIGHT_MISSING', 'Playwright is required for report PNG export.')
  const tempDir = mkdtempSync(join(tmpdir(), 'miao-viz-png-'))
  const htmlPath = join(tempDir, 'source.html')
  writeFileSync(htmlPath, html, 'utf8')
  let browser: import('playwright-core').Browser | undefined
  try {
    browser = await playwright.chromium.launch()
    const page = await browser.newPage({
      viewport: { width: options.width ?? 1440, height: options.height ?? 900 },
      deviceScaleFactor: options.scale ?? 1
    })
    const timeout = options.timeout ?? 30_000
    await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'networkidle', timeout })
    await page.waitForFunction(() => document.documentElement.dataset.miaoRenderReady === 'true', undefined, { timeout })
    await page.evaluate(() => document.fonts.ready)
    if (options.selector) {
      const target = page.locator(options.selector).first()
      await target.waitFor({ state: 'visible', timeout })
      await target.screenshot({ path: outputPath })
    } else {
      await page.screenshot({ path: outputPath, fullPage: true })
    }
    if (!existsSync(outputPath) || statSync(outputPath).size === 0) {
      return agentError('PNG_OUTPUT_FAILED', 'PNG output was not created or is empty.', { outputPath })
    }
    return { ok: true, value: { output: outputPath, ...(options.keepTemp ? { tempDir } : {}) } }
  } catch (error) {
    const timeout = error instanceof Error && /timeout/i.test(error.message)
    return agentError(timeout ? 'PNG_RENDER_TIMEOUT' : 'PNG_OUTPUT_FAILED',
      error instanceof Error ? error.message : 'PNG export failed.', { outputPath })
  } finally {
    await browser?.close().catch(() => {})
    if (!options.keepTemp) rmSync(tempDir, { recursive: true, force: true })
  }
}
