import { test, expect } from '@playwright/test'

test('landing page routes visitors into the first Report path', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'CSV / Excel → 业务报告' })).toBeVisible()
  await expect(page.getByRole('link', { name: '生成第一份报告' })).toHaveAttribute('href', '#first-report')
  await expect(page.getByRole('link', { name: '查看真实报告' })).toHaveAttribute('href', '#report-example')
  await expect(page.getByRole('link', { name: '打开示例报告' })).toHaveAttribute('href', '/examples/report.html')
  await expect(page.getByRole('link', { name: '下载样例数据' })).toHaveAttribute('href', '/examples/sales.csv')
})

test('install router exposes one clear path per host', async ({ page }) => {
  await page.goto('/#install')
  const tabs = page.getByRole('tab')
  await expect(tabs).toHaveCount(4)
  await tabs.getByText('纯 CLI').click()
  await expect(page.getByRole('tabpanel')).toContainText('npm install -g @miao-vision/cli@0.6.0')
  await expect(page.getByRole('tabpanel')).toContainText('miao-viz --version && which miao-viz')
  await expect(page.getByRole('link', { name: '查看稳定 Release 和 checksum' })).toHaveAttribute('href', /releases\/download\/skill-v0\.6\.0/)
})

test('primary actions remain usable at a 390px viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await expect(page.getByRole('link', { name: '生成第一份报告' })).toBeVisible()
  await expect(page.getByRole('link', { name: '查看真实报告' })).toBeVisible()
  await expect(page.getByRole('heading', { name: '选择你的环境' })).not.toBeVisible()
  const dimensions = await page.evaluate(() => ({ body: document.body.scrollWidth, viewport: window.innerWidth }))
  expect(dimensions.body).toBeLessThanOrEqual(dimensions.viewport)
})
