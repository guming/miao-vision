# E2E Tests Documentation

End-to-end tests for Miaoshou Vision components using Playwright.

## ✅ Phase 2 Status

**Completed:**
- ✅ Playwright configuration and setup
- ✅ Test utilities and helper functions
- ✅ Smoke tests (passing - validates setup)
- ✅ BubbleChart test structure created

**Smoke Test Results:**
```
✅ Playwright Setup Verification › should load the application homepage
✅ Playwright Setup Verification › should load a test data markdown file
```

**Notes on BubbleChart Tests:**
The BubbleChart component tests require complex app workflow simulation (creating reports, switching views, triggering execution). These tests demonstrate the testing approach but require additional refinement to work with the app's state management system.

## 📁 Structure

```
tests/
├── e2e/                    # E2E test files
│   ├── smoke.spec.ts       # Smoke tests (verify setup)
│   └── bubble-chart.spec.ts # BubbleChart component tests
├── helpers/                # Test utilities
│   └── test-utils.ts       # Helper functions
└── README.md              # This file
```

## 🚀 Running Tests

### Interactive UI Mode (Recommended)

```bash
npm run test:e2e:ui
```

Features:
- 👁️ Watch tests run in real-time
- 🎬 See step-by-step execution with screenshots
- 🐛 Time-travel debugging
- 📊 Detailed test reports

### Headless Mode (CI/Local)

```bash
npm run test:e2e
```

### Debug Mode

```bash
npm run test:e2e:debug
```

### View Test Reports

```bash
npm run test:e2e:report
```

## 🧪 Test Structure

### Smoke Tests (`smoke.spec.ts`)

Basic tests to verify the Playwright setup is working:
- Application loads correctly
- Can navigate to pages
- Basic DOM elements are present

### BubbleChart Tests (`bubble-chart.spec.ts`)

Comprehensive tests for the BubbleChart component:

1. **Rendering Tests**
   - Chart container renders
   - Title displays correctly
   - Bubbles appear with correct count

2. **Interaction Tests**
   - Tooltip shows on hover
   - Bubbles respond to mouse events

3. **Visual Tests**
   - Axes and labels display
   - Legend appears for grouped data
   - Grid lines render when enabled
   - Bubble labels show correctly

4. **Visual Regression**
   - Screenshot comparison to detect visual changes

## 📝 Writing New Tests

### Basic Test Template

```typescript
import { test, expect } from '@playwright/test'
import { waitForChart } from '../helpers/test-utils'

test.describe('Component Name', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('#app', { state: 'visible' })
  })

  test('should render component', async ({ page }) => {
    // Upload demo file
    const fileInput = page.locator('input[type="file"]').first()
    await fileInput.setInputFiles('test_data/your_demo.md')

    // Wait for component
    await waitForChart(page, '.your-component', 10000)

    // Assertions
    await expect(page.locator('.your-component')).toBeVisible()
  })
})
```

### Using Test Helpers

Import helpers from `../helpers/test-utils`:

```typescript
import {
  waitForChart,      // Wait for chart to render
  hoverAndWait,      // Hover and wait for effects
  getElementCount,   // Count matching elements
  isVisible,         // Check if element is visible
  getTextContent,    // Get element text
  screenshotElement  // Screenshot specific element
} from '../helpers/test-utils'
```

## 🎯 Best Practices

### 1. Use Descriptive Test Names

```typescript
// ❌ Bad
test('test 1', async ({ page }) => { ... })

// ✅ Good
test('should display tooltip on bubble hover', async ({ page }) => { ... })
```

### 2. Wait for Elements Properly

```typescript
// ❌ Bad
await page.waitForTimeout(5000)

// ✅ Good
await page.waitForSelector('.chart', { state: 'visible' })
await waitForChart(page, '.chart-container', 10000)
```

### 3. Use Specific Selectors

```typescript
// ❌ Bad
await page.locator('div').first()

// ✅ Good
await page.locator('.bubble-chart-container')
```

### 4. Add Helpful Logging

```typescript
console.log('✅ Chart renders successfully')
console.log(`✅ Found ${count} bubbles`)
```

## 📊 Visual Regression Testing

Screenshot tests detect visual changes:

```typescript
test('visual regression', async ({ page }) => {
  await expect(page).toHaveScreenshot('component-name.png')
})
```

On first run, Playwright creates baseline screenshots.
On subsequent runs, it compares against baselines.

Update baselines:
```bash
npm run test:e2e -- --update-snapshots
```

## 🔍 Debugging Failed Tests

### 1. Use UI Mode

```bash
npm run test:e2e:ui
```

- Click on failed test
- See step-by-step execution
- View screenshots at each step

### 2. Use Debug Mode

```bash
npm run test:e2e:debug
```

- Tests run with Playwright Inspector
- Step through test line by line
- Inspect page state

### 3. Check Screenshots

Failed tests save screenshots to `test-results/`:
```
test-results/
└── bubble-chart-should-render/
    ├── test-failed-1.png
    └── trace.zip
```

## 📈 CI Integration

Tests run automatically in CI when configured.

GitHub Actions example:

```yaml
- name: Install Playwright
  run: npx playwright install --with-deps chromium

- name: Run E2E tests
  run: npm run test:e2e

- name: Upload test results
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: playwright-report/
```

## 🛠️ Configuration

Edit `playwright.config.ts` to customize:

- Test timeout
- Browser types
- Screenshot/video settings
- Report format
- Web server settings

## 📚 Resources

- [Playwright Documentation](https://playwright.dev)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Assertions Guide](https://playwright.dev/docs/test-assertions)
- [Selectors Guide](https://playwright.dev/docs/selectors)
