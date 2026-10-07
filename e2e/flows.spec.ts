import { expect, test, type Page } from '@playwright/test'

const password = 'CorrectHorse!42'
const signIn = async (page: Page, email: string) => {
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
}

test('customer: hero, variant to cart, COD checkout, session survives reload', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Autumn Rituals' })).toBeVisible()

  await signIn(page, 'asha@e2e.test')
  await expect(page).toHaveURL(/\/account$/)

  await page.goto('/product/amber-silk')
  await expect(page.getByText('SKU: AMBER-200')).toBeVisible()
  await page.getByText('400g').click()
  await expect(page.getByRole('button', { name: 'Out of stock' })).toBeDisabled()
  await page.getByText('200g').click()
  await page.getByRole('button', { name: 'Add to cart' }).click()
  await expect(page.getByRole('button', { name: /Cart, 1 items/ })).toBeVisible()

  await page.goto('/cart')
  await expect(page.getByText('₹1,499 each')).toBeVisible()
  await page.getByRole('link', { name: 'Proceed to checkout' }).click()

  await page.getByLabel(/Full name/).fill('Asha Rao')
  await page.getByLabel(/^Phone/).fill('+91 98765 43210')
  await page.getByLabel(/Address line 1/).fill('12 MG Road')
  await page.getByLabel(/^City/).fill('Bengaluru')
  await page.getByLabel(/^State/).fill('Karnataka')
  await page.getByLabel(/PIN code/).fill('560001')
  await page.getByRole('button', { name: 'Save and use this address' }).click()

  // Razorpay is not configured in this environment, so the server reports it unavailable.
  await expect(page.getByRole('radio', { name: /Pay online/ })).toBeDisabled()
  await expect(page.locator('.summary-row.total')).toContainText('₹1,499')
  await page.getByRole('button', { name: 'Place order' }).click()
  await expect(page.getByRole('heading', { name: /your order is confirmed/i })).toBeVisible()

  await page.reload()
  await expect(page.getByRole('heading', { name: /Order CAN-/ })).toBeVisible()
  await page.goto('/admin/dashboard')
  await expect(page.getByRole('heading', { name: 'Access denied' })).toBeVisible()
})

test('admin: shared login, hero manager changes appear on the homepage', async ({ page }) => {
  await signIn(page, 'admin@e2e.test')
  await expect(page).toHaveURL(/\/admin\/dashboard/)
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()

  await page.goto('/admin/cms/hero')
  await page.getByRole('button', { name: 'Move Gift the Glow up' }).click()
  await expect(page.getByText('Order saved')).toBeVisible()
  await page.getByRole('listitem').filter({ hasText: 'Autumn Rituals' }).getByRole('button', { name: 'Deactivate' }).click()
  await expect(page.getByRole('listitem').filter({ hasText: 'Autumn Rituals' }).getByText('Inactive')).toBeVisible()

  await page.getByRole('button', { name: 'Add slide' }).click()
  const form = page.getByRole('form', { name: 'New slide' })
  await form.getByLabel(/^Heading/).fill('Winter Warmth')
  await form.getByRole('button', { name: 'Create slide' }).click()
  await expect(page.getByRole('listitem').filter({ hasText: 'Winter Warmth' }).getByText('Needs media')).toBeVisible()

  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Gift the Glow' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Autumn Rituals' })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Winter Warmth' })).toHaveCount(0)
})

test('catalog filters are URL driven @mobile', async ({ page }) => {
  await page.goto('/category/luxury-candles?sort=price_high_low')
  const names = page.locator('.product-card h3')
  await expect(names).toHaveText(['Amber Silk', 'Cedar Smoke'])
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(1)
})
