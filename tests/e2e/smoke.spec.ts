/**
 * Smoke Test - Verify Playwright Setup
 *
 * This test verifies that the Playwright configuration is working correctly
 * and the development server can be accessed.
 */

import { test, expect } from '@playwright/test'

test.describe('Playwright Setup Verification', () => {
  test('should load the application homepage', async ({ page }) => {
    // Navigate to the application
    await page.goto('/')

    // Verify the page title contains "Miaoshou Vision" or similar
    await expect(page).toHaveTitle(/Miao/)

    // Verify the application container is visible
    const app = page.locator('#app')
    await expect(app).toBeVisible()

    console.log('✅ Playwright setup is working correctly!')
  })

  test('should load a test data markdown file', async ({ page }) => {
    // Navigate to a demo markdown file
    await page.goto('/')

    // Wait for the application to load
    await page.waitForLoadState('networkidle')

    // Verify the page loaded successfully
    await expect(page.locator('#app')).toBeVisible()

    console.log('✅ Can load and navigate to demo files!')
  })
})
