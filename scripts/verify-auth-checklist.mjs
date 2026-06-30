/**
 * Pre-Prompt-3 auth verification (run: node scripts/verify-auth-checklist.mjs)
 * Requires: npm run dev, npx supabase start, npx puppeteer (via npx)
 */
import puppeteer from 'puppeteer'

const BASE = 'http://localhost:5173'
const PASSWORD = 'changeme-local-only'
const ROLES = [
  { email: 'admin@sashacrush.com', dashboard: '/admin/dashboard', heading: 'Admin Dashboard' },
  { email: 'executive@sashacrush.com', dashboard: '/executive/dashboard', heading: 'Executive Dashboard' },
  { email: 'agent@sashacrush.com', dashboard: '/agent/dashboard', heading: 'Agent Dashboard' },
]

async function clearSession(page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle0' })
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle0' })
}

async function staffLogin(page, email) {
  await clearSession(page)
  await page.waitForSelector('button')
  const tabs = await page.$$('button')
  await tabs[0].click()
  await page.type('#email', email, { delay: 10 })
  await page.type('#password', PASSWORD, { delay: 10 })
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle0' }),
    page.click('button[type="submit"]'),
  ])
}

async function getMagicLinkFromMailpit(sellerEmail) {
  for (let attempt = 0; attempt < 10; attempt++) {
    const res = await fetch('http://127.0.0.1:54324/api/v1/messages')
    const data = await res.json()
    const msg = data.messages?.find((m) => m.To?.some((t) => t.Address === sellerEmail))
    if (msg) {
      const detail = await fetch(`http://127.0.0.1:54324/api/v1/message/${msg.ID}`)
      const body = await detail.json()
      const html = body.HTML ?? ''
      const match = html.match(/href="([^"]+type=magiclink[^"]+)"/)
      return match?.[1]?.replace(/&amp;/g, '&') ?? null
    }
    await new Promise((r) => setTimeout(r, 1000))
  }
  return null
}

const results = []

function pass(name, detail) {
  results.push({ name, ok: true, detail })
  console.log(`✅ ${name}${detail ? ` — ${detail}` : ''}`)
}

function fail(name, detail) {
  results.push({ name, ok: false, detail })
  console.log(`❌ ${name}${detail ? ` — ${detail}` : ''}`)
}

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] })
const page = await browser.newPage()

try {
  for (const role of ROLES) {
    await staffLogin(page, role.email)
    await page.waitForFunction(
      (expected) =>
        window.location.pathname.includes(expected) &&
        document.body.innerText.includes('@sashacrush.com'),
      { timeout: 10000 },
      role.dashboard,
    )
    const url = page.url()
    const text = await page.evaluate(() => document.body.innerText)
    if (url.includes(role.dashboard) && text.includes(role.heading) && text.includes(role.email)) {
      pass(`Login as ${role.email}`, `landed on ${role.dashboard}`)
    } else {
      fail(`Login as ${role.email}`, `url=${url}`)
    }
  }

  await staffLogin(page, 'seller@sashacrush.com')
  if (page.url().includes('/seller/dashboard')) {
    pass('Seller staff-password login lands on seller dashboard', page.url())
  } else {
    fail('Seller login', page.url())
  }

  await page.goto(`${BASE}/admin/dashboard`, { waitUntil: 'networkidle0' })
  const afterRedirect = page.url()
  const adminLeak = await page.evaluate(() => document.body.innerText.includes('Admin Dashboard'))
  if (afterRedirect.includes('/seller/dashboard') && !adminLeak) {
    pass('Seller /admin/dashboard redirect', 'redirected to seller portal, no admin content')
  } else {
    fail('Seller /admin/dashboard redirect', `url=${afterRedirect}, adminVisible=${adminLeak}`)
  }

  await page.reload({ waitUntil: 'networkidle0' })
  const afterRefresh = page.url()
  const stillSeller = await page.evaluate(() =>
    document.body.innerText.includes('seller@sashacrush.com'),
  )
  if (afterRefresh.includes('/seller/dashboard') && stillSeller) {
    pass('Session persists after refresh', afterRefresh)
  } else {
    fail('Session persists after refresh', `url=${afterRefresh}`)
  }

  await clearSession(page)
  const sellerTabs = await page.$$('button')
  await sellerTabs[1].click()
  await page.type('#seller-email', 'seller@sashacrush.com', { delay: 10 })
  await fetch('http://127.0.0.1:54324/api/v1/messages', { method: 'DELETE' })
  await Promise.all([
    page.waitForFunction(() => document.body.innerText.includes('Link sent'), { timeout: 10000 }),
    page.click('button[type="submit"]'),
  ])
  pass('Magic link request sent', 'UI confirmed')

  await new Promise((r) => setTimeout(r, 2000))
  const magicLink = await getMagicLinkFromMailpit('seller@sashacrush.com')
  if (!magicLink) {
    fail('Magic link in Mailpit', 'no email found')
  } else {
    await page.goto(magicLink, { waitUntil: 'networkidle0' })
    await page.waitForFunction(
      () => window.location.pathname.includes('/seller/dashboard'),
      { timeout: 15000 },
    )
    const magicUrl = page.url()
    const magicText = await page.evaluate(() => document.body.innerText)
    if (magicUrl.includes('/seller/dashboard') && magicText.includes('seller@sashacrush.com')) {
      pass('Magic link login for seller', magicUrl)
    } else {
      fail('Magic link login for seller', magicUrl)
    }
  }
} catch (err) {
  fail('Script error', err instanceof Error ? err.message : String(err))
} finally {
  await browser.close()
}

const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} checks passed`)
process.exit(failed.length > 0 ? 1 : 0)
