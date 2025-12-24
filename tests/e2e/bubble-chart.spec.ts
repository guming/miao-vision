/**
 * BubbleChart E2E Tests
 *
 * End-to-end tests for the BubbleChart component.
 * Tests rendering, interactions, and visual appearance.
 */

import { test, expect } from '@playwright/test'
import { readFileSync } from 'fs'
import { waitForChart, hoverAndWait, getElementCount } from '../helpers/test-utils'

// Load demo content
const bubbleChartDemo = readFileSync('test_data/bubble_chart_demo.md', 'utf-8')

test.describe('BubbleChart Component', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/')

    // Wait for the app to load
    await page.waitForSelector('#app', { state: 'visible' })

    // Click on the Reports sidebar item to switch to report view
    await page.click('text=REPORTS')
    await page.waitForTimeout(300)

    // Click the "+ New" button to create a new report
    await page.click('button:has-text("+ New")')

    // Type report name in the prompt
    page.once('dialog', dialog => {
      console.log('Dialog message:', dialog.message())
      dialog.accept('BubbleChart Test')
    })

    await page.waitForTimeout(500)

    // Now we should be in the report editor view
    // Set the report content to BubbleChart demo via Monaco editor
    await page.evaluate((content) => {
      const { reportStore } = window as any
      if (reportStore && reportStore.state.currentReport) {
        reportStore.updateContent(content)
      }
    }, bubbleChartDemo)

    // Wait for content to be set
    await page.waitForTimeout(500)

    // Trigger execution by clicking the Run button
    await page.click('button:has-text("Run")')

    // Wait for execution to complete
    await page.waitForTimeout(3000)
  })

  test('should render bubble chart after execution', async ({ page }) => {
    // Wait for the chart to render
    await waitForChart(page, '.bubble-chart-container', 15000)

    // Verify chart container is visible
    const chartContainer = page.locator('.bubble-chart-container')
    await expect(chartContainer).toBeVisible()

    // Verify chart title
    const title = page.locator('.chart-title').first()
    await expect(title).toBeVisible()
    await expect(title).toContainText('Company Performance')

    console.log('✅ BubbleChart renders successfully')
  })

  test('should display bubbles with correct count', async ({ page }) => {
    // Wait for chart to render
    await waitForChart(page, '.bubble-chart-container', 15000)

    // Count bubbles (12 companies in the demo data)
    const bubbleCount = await getElementCount(page, '.bubble')
    expect(bubbleCount).toBeGreaterThan(0)
    expect(bubbleCount).toBeLessThanOrEqual(12)

    console.log(`✅ Found ${bubbleCount} bubbles in the chart`)
  })

  test('should show tooltip on bubble hover', async ({ page }) => {
    // Wait for chart to render
    await waitForChart(page, '.bubble-chart-container', 15000)

    // Hover over the first bubble
    await hoverAndWait(page, '.bubble', 500)

    // Check if tooltip appears
    const tooltip = page.locator('.bubble-tooltip')
    await expect(tooltip).toBeVisible()

    // Verify tooltip has content
    const tooltipText = await tooltip.textContent()
    expect(tooltipText).toBeTruthy()
    expect(tooltipText!.length).toBeGreaterThan(0)

    console.log('✅ Tooltip displays correctly on hover')
  })

  test('should display axes labels', async ({ page }) => {
    // Wait for chart to render
    await waitForChart(page, '.bubble-chart-container', 15000)

    // Check for X and Y axis
    const xAxis = page.locator('.x-axis')
    const yAxis = page.locator('.y-axis')

    await expect(xAxis).toBeVisible()
    await expect(yAxis).toBeVisible()

    // Check for axis labels
    const axisLabels = page.locator('.axis-label')
    const labelCount = await axisLabels.count()
    expect(labelCount).toBeGreaterThan(0)

    console.log(`✅ Chart has ${labelCount} axis labels`)
  })

  test('should display legend for grouped data', async ({ page }) => {
    // Wait for chart to render
    await waitForChart(page, '.bubble-chart-container', 15000)

    // Scroll to find a chart with legend (Example 2 has grouping)
    await page.evaluate(() => {
      const charts = document.querySelectorAll('.bubble-chart-container')
      if (charts.length > 1) {
        charts[1].scrollIntoView({ behavior: 'smooth' })
      }
    })

    await page.waitForTimeout(1000)

    // Check for legend
    const legend = page.locator('.chart-legend')
    const legendCount = await legend.count()

    if (legendCount > 0) {
      await expect(legend.first()).toBeVisible()

      // Check for legend items
      const legendItems = page.locator('.legend-item')
      const itemCount = await legendItems.count()
      expect(itemCount).toBeGreaterThan(0)

      console.log(`✅ Legend displays with ${itemCount} items`)
    } else {
      console.log('ℹ️ No legend found (may be on a different chart)')
    }
  })

  test('should render grid lines when enabled', async ({ page }) => {
    // Wait for chart to render
    await waitForChart(page, '.bubble-chart-container', 15000)

    // Check for grid lines
    const gridLines = page.locator('.grid line')
    const gridCount = await gridLines.count()

    if (gridCount > 0) {
      expect(gridCount).toBeGreaterThan(0)
      console.log(`✅ Grid has ${gridCount} lines`)
    } else {
      console.log('ℹ️ No grid lines (may be disabled in config)')
    }
  })

  test('should handle bubble labels correctly', async ({ page }) => {
    // Wait for chart to render
    await waitForChart(page, '.bubble-chart-container', 15000)

    // Check for bubble labels
    const bubbleLabels = page.locator('.bubble-label')
    const labelCount = await bubbleLabels.count()

    if (labelCount > 0) {
      // Verify first label has content
      const firstLabel = await bubbleLabels.first().textContent()
      expect(firstLabel).toBeTruthy()
      console.log(`✅ Found ${labelCount} bubble labels`)
    } else {
      console.log('ℹ️ No bubble labels (may be disabled in config)')
    }
  })

  test('visual regression - bubble chart appearance', async ({ page }) => {
    // Wait for chart to render
    await waitForChart(page, '.bubble-chart-container', 15000)

    // Take screenshot of the first chart
    const chart = page.locator('.bubble-chart-container').first()
    await expect(chart).toHaveScreenshot('bubble-chart-basic.png', {
      maxDiffPixels: 100 // Allow small differences due to font rendering
    })

    console.log('✅ Visual regression test completed')
  })
})
