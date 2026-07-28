// @vitest-environment node
/**
 * E2E smoke tests — require preview server + Supabase local.
 *
 * Local:
 *   npx supabase start && npx supabase db reset
 *   npm run build && npm run preview &
 *   npm run test:e2e
 */
import puppeteer from 'puppeteer'
import { describe, expect, it } from 'vitest'

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'
const DEV_PASSWORD = 'changeme-local-only'

async function isReachable(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(3000) })
    return response.ok
  } catch {
    return false
  }
}

function launchBrowser() {
  // GitHub-hosted runners disable the Chromium user-namespace sandbox.
  const args = process.env.CI
    ? ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    : []

  return puppeteer.launch({ headless: true, args })
}

describe('E2E smoke', () => {
  it('login page renders staff and seller modes', async () => {
    if (!(await isReachable(BASE_URL))) {
      console.warn(`Skipping E2E: ${BASE_URL} not reachable`)
      return
    }

    const browser = await launchBrowser()
    const page = await browser.newPage()

    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0' })
    const bodyText = await page.evaluate(() => document.body.innerText)

    expect(bodyText).toContain('Sign in')
    expect(bodyText).toContain('Seller Login')

    await browser.close()
  })

  it('admin can sign in and reach dashboard', async () => {
    if (!(await isReachable(BASE_URL))) {
      console.warn(`Skipping E2E: ${BASE_URL} not reachable`)
      return
    }

    const browser = await launchBrowser()
    const page = await browser.newPage()

    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0' })
    await page.type('#email', 'admin@sashacrush.com')
    await page.type('#password', DEV_PASSWORD)
    await page.click('button[type="submit"]')

    await page.waitForFunction(
      () => window.location.pathname.includes('/admin'),
      { timeout: 15_000 },
    )

    const path = page.url()
    expect(path).toMatch(/\/admin/)

    await browser.close()
  })
})
