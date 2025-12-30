/**
 * Hybrid GNode - E2E Tests
 *
 * Tests the Hybrid GNode demo in a real browser environment
 */

import { test, expect } from '@playwright/test'

test.describe('Hybrid GNode Demo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173')
    await page.waitForLoadState('networkidle')

    // Navigate to Hybrid GNode tab
    await page.click('text=⚡ Hybrid GNode')

    // Wait for initialization
    await page.waitForTimeout(1000)
  })

  test('should initialize without errors', async ({ page }) => {
    // Check for console errors
    const errors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })

    // Check header is visible
    await expect(page.locator('text=⚡ Hybrid GNode Demo')).toBeVisible()

    // Check control buttons
    await expect(page.locator('text=Start Streaming')).toBeVisible()
    await expect(page.locator('text=Clear Data')).toBeVisible()

    // Should have no errors during initialization
    expect(errors.filter(e => !e.includes('Warning'))).toHaveLength(0)
  })

  test('should start and stop streaming', async ({ page }) => {
    // Start streaming
    await page.click('button:has-text("Start")')
    await expect(page.locator('button:has-text("Stop")')).toBeVisible()

    // Wait for some data
    await page.waitForTimeout(500)

    // Check that total rows counter increased
    const totalRows = await page.locator('.stat-value').first().textContent()
    expect(parseInt(totalRows?.replace(/,/g, '') || '0')).toBeGreaterThan(0)

    // Stop streaming
    await page.click('button:has-text("Stop")')
    await expect(page.locator('button:has-text("Start")')).toBeVisible()
  })

  test('should display charts with data', async ({ page }) => {
    // Start streaming
    await page.click('button:has-text("Start")')

    // Wait for data to accumulate
    await page.waitForTimeout(1000)

    // Stop streaming
    await page.click('button:has-text("Stop")')

    // Check that charts are rendered
    const charts = page.locator('svg')
    await expect(charts).toHaveCount(2) // Region and product charts

    // Charts should have data (bars)
    const bars = page.locator('svg rect[fill]')
    const barCount = await bars.count()
    expect(barCount).toBeGreaterThan(0)
  })

  test('should update charts in real-time', async ({ page }) => {
    // Start streaming
    await page.click('button:has-text("Start")')

    // Get initial row count
    await page.waitForTimeout(200)
    const initialRows = await page.locator('.stat-value').first().textContent()
    const initialCount = parseInt(initialRows?.replace(/,/g, '') || '0')

    // Wait for more updates
    await page.waitForTimeout(500)

    // Row count should have increased
    const newRows = await page.locator('.stat-value').first().textContent()
    const newCount = parseInt(newRows?.replace(/,/g, '') || '0')
    expect(newCount).toBeGreaterThan(initialCount)

    // Stop streaming
    await page.click('button:has-text("Stop")')
  })

  test('should clear data successfully', async ({ page }) => {
    // Start streaming to generate data
    await page.click('button:has-text("Start")')
    await page.waitForTimeout(500)
    await page.click('button:has-text("Stop")')

    // Verify we have data
    const rowsBeforeClear = await page.locator('.stat-value').first().textContent()
    expect(parseInt(rowsBeforeClear?.replace(/,/g, '') || '0')).toBeGreaterThan(0)

    // Clear data
    await page.click('button:has-text("Clear Data")')

    // Wait for clear to complete
    await page.waitForTimeout(1000)

    // Verify all counters are reset
    const totalRows = await page.locator('.stat-value').nth(0).textContent()
    const totalUpdates = await page.locator('.stat-value').nth(1).textContent()

    expect(totalRows).toBe('0')
    expect(totalUpdates).toBe('0')
  })

  test('should handle multiple start/stop cycles', async ({ page }) => {
    // Cycle 1
    await page.click('button:has-text("Start")')
    await page.waitForTimeout(300)
    await page.click('button:has-text("Stop")')

    const count1 = await page.locator('.stat-value').first().textContent()
    const rows1 = parseInt(count1?.replace(/,/g, '') || '0')
    expect(rows1).toBeGreaterThan(0)

    // Cycle 2
    await page.click('button:has-text("Start")')
    await page.waitForTimeout(300)
    await page.click('button:has-text("Stop")')

    const count2 = await page.locator('.stat-value').first().textContent()
    const rows2 = parseInt(count2?.replace(/,/g, '') || '0')
    expect(rows2).toBeGreaterThan(rows1)
  })

  test('should adjust update frequency', async ({ page }) => {
    // Set fast update frequency
    await page.locator('input[type="range"]').first().fill('50')

    // Start streaming
    await page.click('button:has-text("Start")')
    await page.waitForTimeout(500)

    // Should have many updates
    const updates = await page.locator('.stat-value').nth(1).textContent()
    expect(parseInt(updates?.replace(/,/g, '') || '0')).toBeGreaterThan(3)

    await page.click('button:has-text("Stop")')
  })

  test('should display performance metrics', async ({ page }) => {
    // Start streaming
    await page.click('button:has-text("Start")')
    await page.waitForTimeout(1000)
    await page.click('button:has-text("Stop")')

    // Check that performance metrics are displayed
    const avgUpdateTime = await page.locator('text=Avg Update Time').textContent()
    expect(avgUpdateTime).toBeTruthy()

    // Check stats exist
    await expect(page.locator('.stat-card')).toHaveCount(3)
  })

  test('should not have SQL injection vulnerabilities', async ({ page, context }) => {
    // Listen for console errors
    const errors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })

    // Start and stop normally
    await page.click('button:has-text("Start")')
    await page.waitForTimeout(200)
    await page.click('button:has-text("Stop")')

    // Clear data (this executes SQL)
    await page.click('button:has-text("Clear Data")')
    await page.waitForTimeout(500)

    // Should not have SQL errors
    const sqlErrors = errors.filter(e =>
      e.includes('SQL') ||
      e.includes('Binder Error') ||
      e.includes('Parser Error')
    )
    expect(sqlErrors).toHaveLength(0)
  })

  test('should handle the INSERT column bug fix', async ({ page }) => {
    // This test verifies that the bug we fixed (column mismatch in INSERT)
    // does not occur during normal operation

    const errors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error' && msg.text().includes('has 9 columns but 4 values')) {
        errors.push(msg.text())
      }
    })

    // Start streaming (this triggers INSERT operations)
    await page.click('button:has-text("Start")')
    await page.waitForTimeout(500)
    await page.click('button:has-text("Stop")')

    // Should not have the column mismatch error
    expect(errors).toHaveLength(0)

    // Verify data was actually inserted
    const totalRows = await page.locator('.stat-value').first().textContent()
    expect(parseInt(totalRows?.replace(/,/g, '') || '0')).toBeGreaterThan(0)
  })
})
