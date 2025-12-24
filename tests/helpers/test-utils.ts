/**
 * E2E Test Utilities
 *
 * Helper functions for Playwright tests to simplify common operations.
 */

import type { Page } from '@playwright/test'

/**
 * Load a markdown file and wait for it to render
 */
export async function loadMarkdownFile(page: Page, filepath: string) {
  // Navigate to the root and load the file
  await page.goto('/')

  // Wait for the app to be ready
  await page.waitForSelector('#app', { state: 'visible' })

  // TODO: Implement file loading mechanism
  // For now, we'll navigate directly if there's a way to load files
  await page.waitForLoadState('networkidle')
}

/**
 * Wait for a chart component to render completely
 */
export async function waitForChart(page: Page, chartSelector: string, timeout = 5000) {
  await page.waitForSelector(chartSelector, { state: 'visible', timeout })

  // Wait for any animations to complete
  await page.waitForTimeout(500)
}

/**
 * Take a screenshot of a specific element
 */
export async function screenshotElement(page: Page, selector: string, name: string) {
  const element = page.locator(selector)
  await element.screenshot({ path: `test-results/screenshots/${name}.png` })
}

/**
 * Get the count of elements matching a selector
 */
export async function getElementCount(page: Page, selector: string): Promise<number> {
  return await page.locator(selector).count()
}

/**
 * Check if element exists and is visible
 */
export async function isVisible(page: Page, selector: string): Promise<boolean> {
  try {
    await page.waitForSelector(selector, { state: 'visible', timeout: 2000 })
    return true
  } catch {
    return false
  }
}

/**
 * Get text content from an element
 */
export async function getTextContent(page: Page, selector: string): Promise<string | null> {
  const element = page.locator(selector)
  return await element.textContent()
}

/**
 * Hover over an element and wait for effects
 */
export async function hoverAndWait(page: Page, selector: string, waitMs = 300) {
  await page.locator(selector).hover()
  await page.waitForTimeout(waitMs)
}

/**
 * Navigate to a demo file by name
 */
export async function loadDemo(page: Page, demoName: string) {
  // Construct the path to the demo file
  const demoPath = `/test_data/${demoName}.md`

  // For now, we need to load the file through the app's file loading mechanism
  // This will depend on how the app handles file loading
  await page.goto('/')
  await page.waitForSelector('#app', { state: 'visible' })

  console.log(`Loading demo: ${demoPath}`)
  // TODO: Implement actual file loading once the mechanism is clear
}
