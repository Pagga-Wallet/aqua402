import { test, expect } from '@playwright/test'

test.describe('Aqua x402 Demo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000')
  })

  test('should load the application', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Aqua x402 Finance Layer')
  })

  test('should connect wallet', async ({ page }) => {
    // This would require actual wallet connection setup
    // For now, just check that the wallet connect button exists
    await expect(page.locator('text=Connect Wallet')).toBeVisible()
  })

  test('should navigate between sections', async ({ page }) => {
    await page.click('text=Borrower')
    await expect(page).toHaveURL(/.*borrower/)
    
    await page.click('text=Lender')
    await expect(page).toHaveURL(/.*lender/)
    
    await page.click('text=Auction')
    await expect(page).toHaveURL(/.*auction/)
  })

  test('should display RFQ form', async ({ page }) => {
    await page.goto('http://localhost:3000/borrower')
    await expect(page.locator('text=Create RFQ')).toBeVisible()
  })
})

