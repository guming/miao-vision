import { test, expect } from '@playwright/test'
import { execFileSync } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

function renderEvidenceReport(): string {
  const dir = mkdtempSync(join(tmpdir(), 'miao-evidence-e2e-'))
  const input = resolve('test_data/report_workflow_sales.csv')
  const context = join(dir, 'context.json')
  const spec = join(dir, 'report.yaml')
  const html = join(dir, 'report.html')
  const run = (args: string[]) => execFileSync(process.execPath, ['scripts/miao-viz.mjs', ...args], { encoding: 'utf8' })
  run(['data', 'analyze', input, '--intent', 'sales performance', '--output', context])
  run(['spec', 'block', 'instantiate', 'trend-ranking', '--context', context, '--output', spec])
  run(['render', 'report', '--input', input, '--spec', spec, '--context', context, '--output', html])
  return html
}

test('evidence drawer is accessible and print appendix remains visible', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(pathToFileURL(renderEvidenceReport()).href)

  const triggers = page.locator('.evidence-trigger')
  await expect(triggers.first()).toBeVisible()
  await triggers.first().click()
  const drawer = page.locator('#miao-evidence-drawer')
  await expect(drawer).toBeVisible()
  await expect(drawer).toContainText('How this result was calculated')
  await expect(drawer).toContainText('Verified: the displayed value matches the source calculation.')
  await expect(drawer.locator('details')).not.toHaveAttribute('open', '')
  await expect(drawer).toContainText('Current view')
  await page.keyboard.press('Escape')
  await expect(drawer).toBeHidden()
  await expect(triggers.first()).toBeFocused()

  await page.emulateMedia({ media: 'print' })
  await expect(page.locator('.evidence-appendix')).toBeVisible()
  await expect(drawer).toBeHidden()
  expect(errors).toEqual([])
})
