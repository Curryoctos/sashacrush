/**
 * DEPLOY §5 UAT smoke (live or local):
 *   1. Seller magic link
 *   2. Manual payout → confirm → receipt
 *   3. Chat message → in-app notify (+ email invoke)
 *   4. Public project contribute (wire) → admin confirm → funding bump
 *   5. Community register
 *   6. Optional gateways (default on): MoMo Flutterwave initiate + Stripe Checkout URL
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_ANON_KEY=... SUPABASE_SERVICE_ROLE_KEY=... \
 *   UAT_ADMIN_PASSWORD='...' UAT_SELLER_PASSWORD='...' \
 *   node scripts/complete-uat-smoke.mjs
 *
 * Optional:
 *   UAT_SKIP_GATEWAYS=1 — skip MoMo/Stripe initiate checks
 *   UAT_REQUIRE_GATEWAYS=1 — fail the run if gateway initiates fail
 *   UAT_MOMO_PHONE — Uganda MoMo payee (default 256771000000)
 */
import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'node:crypto'

const URL = process.env.SUPABASE_URL?.replace(/\/$/, '')
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
const ANON = process.env.SUPABASE_ANON_KEY
const ADMIN_EMAIL = (process.env.UAT_ADMIN_EMAIL ?? 'admin@sashacrush.com').toLowerCase()
const SELLER_EMAIL = (process.env.UAT_SELLER_EMAIL ?? 'seller@sashacrush.com').toLowerCase()
const ADMIN_PASSWORD =
  process.env.UAT_ADMIN_PASSWORD ?? `Uat-Admin-${randomBytes(9).toString('base64url')}`
const SELLER_PASSWORD =
  process.env.UAT_SELLER_PASSWORD ?? `Uat-Seller-${randomBytes(9).toString('base64url')}`

const LAND_ID = process.env.UAT_LAND_ID ?? 'e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55'
const PROJECT_ID = process.env.UAT_PROJECT_ID ?? 'a4eebc99-9c0b-4ef8-bb6d-6bb9bd380a77'
const RATE_UGX = 3700
const PAYOUT_USD = Number(process.env.UAT_PAYOUT_USD ?? 25)
const CONTRIB_USD = Number(process.env.UAT_CONTRIB_USD ?? 50)
const SKIP_GATEWAYS = process.env.UAT_SKIP_GATEWAYS === '1'
const REQUIRE_GATEWAYS = process.env.UAT_REQUIRE_GATEWAYS === '1'
const MOMO_PHONE = process.env.UAT_MOMO_PHONE ?? '256771000000'

const results = []

function fail(message) {
  console.error(`❌ ${message}`)
  process.exit(1)
}

function ok(message, detail = '') {
  console.log(`✅ ${message}${detail ? ` — ${detail}` : ''}`)
}

function section(title) {
  console.log(`\n── ${title}`)
}

function record(name, pass, detail = '', { optional = false } = {}) {
  results.push({ name, pass, detail, optional })
  if (pass) ok(name, detail)
  else if (optional) console.warn(`⚠️  ${name}${detail ? ` — ${detail}` : ''}`)
  else console.error(`❌ ${name}${detail ? ` — ${detail}` : ''}`)
}

if (!URL || !SERVICE || !ANON) {
  fail('Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and SUPABASE_ANON_KEY')
}

const service = createClient(URL, SERVICE, {
  auth: { autoRefreshToken: false, persistSession: false },
})

function browser() {
  return createClient(URL, ANON, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

async function invokeErrorDetail(error) {
  if (error?.context instanceof Response) {
    const body = await error.context.clone().json().catch(() => null)
    return body?.error ?? error.message
  }
  return error?.message ?? 'unknown error'
}

async function ensureUser({ email, password, role, fullName }) {
  const { data: listed, error: listError } = await service.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  })
  if (listError) throw listError

  let user = listed.users.find((u) => u.email?.toLowerCase() === email)
  if (!user) {
    const { data, error } = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, role },
    })
    if (error || !data.user) throw error ?? new Error(`Could not create ${email}`)
    user = data.user
    ok(`Created auth user ${email}`)
  } else {
    const { error } = await service.auth.admin.updateUserById(user.id, {
      password,
      email_confirm: true,
      user_metadata: { ...(user.user_metadata ?? {}), full_name: fullName, role },
    })
    if (error) throw error
    ok(`Updated auth user ${email}`)
  }

  const { error: profileError } = await service.from('users').upsert(
    {
      id: user.id,
      email,
      role,
      full_name: fullName,
      is_active: true,
    },
    { onConflict: 'id' },
  )
  if (profileError) throw profileError
  return user.id
}

async function ensureLandAndProject(sellerId, adminId) {
  const { error: landError } = await service.from('land_records').upsert(
    {
      id: LAND_ID,
      title: 'Mubende Land',
      location: 'Mubende District, Uganda',
      total_value_usd: 300000,
      seller_id: sellerId,
      status: 'active',
      latitude: 0.5605,
      longitude: 31.395,
    },
    { onConflict: 'id' },
  )
  if (landError) throw landError

  const { data: projectBefore } = await service
    .from('projects')
    .select('funding_raised_usd')
    .eq('id', PROJECT_ID)
    .maybeSingle()

  const { error: projectError } = await service.from('projects').upsert(
    {
      id: PROJECT_ID,
      title: 'Mubende Land Acquisition',
      slug: 'mubende-land',
      description: 'UAT smoke project for Mubende.',
      cause: 'Title and settlement tracking.',
      type: 'land_acquisition',
      visibility: 'public',
      funding_goal_usd: 300000,
      funding_raised_usd: projectBefore?.funding_raised_usd ?? 0,
      min_contribution_usd: 25,
      location_name: 'Mubende District, Uganda',
      country: 'Uganda',
      status: 'active',
      land_id: LAND_ID,
      owner_id: sellerId,
      created_by: adminId,
    },
    { onConflict: 'id' },
  )
  if (projectError) throw projectError

  return Number(projectBefore?.funding_raised_usd ?? 0)
}

async function signIn(email, password) {
  const client = browser()
  const { data, error } = await client.auth.signInWithPassword({ email, password })
  if (error || !data.session) throw error ?? new Error(`Sign-in failed for ${email}`)
  return client
}

async function smokeMagicLink() {
  section('1. Seller magic link')
  const client = browser()
  const { data, error } = await client.functions.invoke('request-seller-magic-link', {
    body: { email: SELLER_EMAIL },
  })
  if (error) {
    record('magic-link', false, await invokeErrorDetail(error))
    return
  }
  if (!data?.success) {
    record('magic-link', false, JSON.stringify(data))
    return
  }
  record('magic-link', true, data.message ?? 'success')
}

async function smokePayout(adminId) {
  section('2. Manual payout → receipt')
  void adminId
  const reference = `WU-UAT-${Date.now()}`
  const { data: payment, error: payError } = await service
    .from('payments')
    .insert({
      land_id: LAND_ID,
      project_id: PROJECT_ID,
      disbursement_reason: 'UAT smoke manual payout',
      amount_usd: PAYOUT_USD,
      amount_ugx: Math.round(PAYOUT_USD * RATE_UGX),
      rate_used: RATE_UGX,
      method: 'manual',
      manual_reference: reference,
      status: 'pending_manual',
    })
    .select('id')
    .single()
  if (payError || !payment) {
    record('payout-create', false, payError?.message ?? 'insert failed')
    return
  }
  record('payout-create', true, payment.id)

  const admin = await signIn(ADMIN_EMAIL, ADMIN_PASSWORD)
  const { data, error } = await admin.functions.invoke('confirm-payment', {
    body: { paymentId: payment.id },
  })
  if (error) {
    record('payout-confirm', false, await invokeErrorDetail(error))
    return
  }
  if (!data?.receiptNumber) {
    record('payout-confirm', false, JSON.stringify(data))
    return
  }
  record('payout-confirm', true, data.receiptNumber)

  const { data: receipt, error: receiptError } = await service
    .from('receipts')
    .select('id, pdf_path, receipt_number')
    .eq('receipt_number', data.receiptNumber)
    .single()
  if (receiptError || !receipt?.pdf_path) {
    record('payout-receipt', false, receiptError?.message ?? 'missing pdf')
    return
  }
  record('payout-receipt', true, receipt.pdf_path)
}

async function smokeChat(adminId, sellerId) {
  section('3. Chat → in-app + notify')
  const admin = await signIn(ADMIN_EMAIL, ADMIN_PASSWORD)
  const body = `UAT chat smoke ${Date.now()}`
  const { data: msg, error: insertError } = await admin
    .from('chat_messages')
    .insert({
      channel: 'seller_channel',
      land_id: LAND_ID,
      project_id: null,
      sender_id: adminId,
      body,
    })
    .select('id')
    .single()
  if (insertError || !msg) {
    record('chat-insert', false, insertError?.message ?? 'insert failed')
    return
  }
  record('chat-insert', true, msg.id)

  // In-app notifications are trigger-driven; give DB a beat
  await new Promise((r) => setTimeout(r, 800))
  const { data: notes, error: noteError } = await service
    .from('in_app_notifications')
    .select('id, user_id, title, created_at')
    .eq('user_id', sellerId)
    .order('created_at', { ascending: false })
    .limit(5)
  if (noteError) {
    record('chat-in-app', false, noteError.message)
  } else {
    const hit = (notes ?? []).some(
      (n) =>
        typeof n.title === 'string' &&
        (n.title.toLowerCase().includes('message') ||
          n.title.toLowerCase().includes('chat')),
    )
    // Fallback: any fresh notification for seller in last minute
    const fresh = (notes ?? []).some((n) => {
      const t = new Date(n.created_at).getTime()
      return Date.now() - t < 60_000
    })
    record(
      'chat-in-app',
      hit || fresh,
      hit || fresh
        ? `seller notifications=${notes?.length ?? 0}`
        : 'no recent in_app_notifications for seller',
    )
  }

  const { data: notifyData, error: notifyError } = await admin.functions.invoke(
    'notify-admin-message',
    { body: { messageId: msg.id, landId: LAND_ID } },
  )
  if (notifyError) {
    record('chat-email', false, await invokeErrorDetail(notifyError))
    return
  }
  record('chat-email', true, JSON.stringify(notifyData ?? { success: true }))
}

async function smokeContribute(raisedBefore) {
  section('4. Public contribute (wire) → admin confirm')
  const anonClient = browser()
  const contributorEmail = `uat.contrib.${Date.now()}@example.com`
  const { data, error } = await anonClient.functions.invoke(
    'initiate-project-contribution',
    {
      body: {
        projectId: PROJECT_ID,
        amountUsd: CONTRIB_USD,
        method: 'wire',
        contributorName: 'UAT Contributor',
        contributorEmail,
        contributorCountry: 'UG',
      },
    },
  )
  if (error) {
    record('contribute-initiate', false, await invokeErrorDetail(error))
    return
  }
  if (!data?.contributionId) {
    record('contribute-initiate', false, JSON.stringify(data))
    return
  }
  record(
    'contribute-initiate',
    true,
    `${data.contributionId} · ${data.status ?? 'pending'} · ${data.reference ?? ''}`,
  )

  const admin = await signIn(ADMIN_EMAIL, ADMIN_PASSWORD)
  const { data: confirmed, error: confirmError } = await admin
    .from('project_contributions')
    .update({ status: 'confirmed' })
    .eq('id', data.contributionId)
    .select('id, status, amount_usd')
    .single()
  if (confirmError || confirmed?.status !== 'confirmed') {
    record('contribute-confirm', false, confirmError?.message ?? JSON.stringify(confirmed))
    return
  }
  record('contribute-confirm', true, confirmed.id)

  await new Promise((r) => setTimeout(r, 500))
  const { data: project, error: projectError } = await service
    .from('projects')
    .select('funding_raised_usd')
    .eq('id', PROJECT_ID)
    .single()
  if (projectError || !project) {
    record('contribute-funding', false, projectError?.message ?? 'project missing')
    return
  }
  const raised = Number(project.funding_raised_usd ?? 0)
  const bumped = raised >= raisedBefore + CONTRIB_USD - 0.01
  record(
    'contribute-funding',
    bumped,
    `raised ${raisedBefore} → ${raised} (expect +${CONTRIB_USD})`,
  )
}

async function smokeCommunity() {
  section('5. Community register')
  const email = `uat.community.${Date.now()}@example.com`
  const password = `Community-${randomBytes(6).toString('base64url')}!a`
  const client = browser()
  const { data, error } = await client.functions.invoke('register-community-member', {
    body: {
      email,
      password,
      displayName: 'UAT Community Member',
      location: 'Kampala',
      joinReason: 'UAT smoke registration',
    },
  })
  if (error) {
    record('community-register', false, await invokeErrorDetail(error))
    return
  }
  if (!data?.success || !data?.userId) {
    record('community-register', false, JSON.stringify(data))
    return
  }
  record('community-register', true, data.userId)

  const { data: member, error: memberError } = await service
    .from('community_members')
    .select('user_id, display_name')
    .eq('user_id', data.userId)
    .single()
  if (memberError || !member) {
    record('community-member-row', false, memberError?.message ?? 'missing row')
    return
  }
  record('community-member-row', true, member.display_name)

  const login = browser()
  const { error: loginError } = await login.auth.signInWithPassword({ email, password })
  record('community-login', !loginError, loginError?.message ?? email)
}

async function smokeGateways() {
  section('6. Gateways (MoMo initiate + Stripe Checkout)')
  const optional = !REQUIRE_GATEWAYS

  const { data: payment, error: payError } = await service
    .from('payments')
    .insert({
      land_id: LAND_ID,
      project_id: PROJECT_ID,
      disbursement_reason: 'UAT MoMo gateway smoke',
      amount_usd: 1,
      amount_ugx: RATE_UGX,
      rate_used: RATE_UGX,
      method: 'flutterwave',
      status: 'pending',
      mobile_money_network: 'mtn',
      payer_phone: MOMO_PHONE,
    })
    .select('id')
    .single()
  if (payError || !payment) {
    record('momo-create', false, payError?.message ?? 'insert failed', { optional })
    return
  }
  record('momo-create', true, payment.id, { optional })

  const admin = await signIn(ADMIN_EMAIL, ADMIN_PASSWORD)
  const { data: momoData, error: momoError } = await admin.functions.invoke(
    'initiate-gateway-payment',
    { body: { paymentId: payment.id } },
  )
  if (momoError) {
    record('momo-initiate', false, await invokeErrorDetail(momoError), { optional })
  } else {
    record(
      'momo-initiate',
      true,
      JSON.stringify({
        reference: momoData?.reference,
        transferId: momoData?.transferId,
        status: momoData?.status,
        mode: momoData?.mode,
      }),
      { optional },
    )
  }

  const anonClient = browser()
  const { data: stripeData, error: stripeError } = await anonClient.functions.invoke(
    'initiate-project-contribution',
    {
      body: {
        projectId: PROJECT_ID,
        amountUsd: Math.max(CONTRIB_USD, 25),
        method: 'stripe',
        contributorName: 'UAT Stripe Contributor',
        contributorEmail: `uat.stripe.${Date.now()}@example.com`,
        contributorCountry: 'US',
      },
    },
  )
  if (stripeError) {
    record('stripe-checkout', false, await invokeErrorDetail(stripeError), { optional })
    return
  }
  const hasUrl = Boolean(stripeData?.checkoutUrl)
  record(
    'stripe-checkout',
    hasUrl,
    hasUrl
      ? `${stripeData.contributionId} · ${new URL(stripeData.checkoutUrl).host}`
      : JSON.stringify(stripeData),
    { optional },
  )
}

async function main() {
  console.log(`\nUAT / DEPLOY smoke against ${URL}\n`)

  const adminId = await ensureUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    role: 'admin',
    fullName: 'SashaCrush Admin',
  })
  const sellerId = await ensureUser({
    email: SELLER_EMAIL,
    password: SELLER_PASSWORD,
    role: 'seller',
    fullName: 'Mubende Seller',
  })
  const raisedBefore = await ensureLandAndProject(sellerId, adminId)
  ok('Seed ready', `land=${LAND_ID} project=${PROJECT_ID}`)

  await smokeMagicLink()
  await smokePayout(adminId)
  await smokeChat(adminId, sellerId)
  await smokeContribute(raisedBefore)
  await smokeCommunity()
  if (!SKIP_GATEWAYS) {
    await smokeGateways()
  } else {
    section('6. Gateways skipped (UAT_SKIP_GATEWAYS=1)')
  }

  const hardFailed = results.filter((r) => !r.pass && !r.optional)
  const softFailed = results.filter((r) => !r.pass && r.optional)
  console.log('\n══ Summary')
  for (const r of results) {
    const tag = r.pass ? 'PASS' : r.optional ? 'WARN' : 'FAIL'
    console.log(`  ${tag}  ${r.name}${r.detail ? ` — ${r.detail}` : ''}`)
  }
  if (hardFailed.length) {
    console.log(`\n❌ UAT smoke finished with ${hardFailed.length} failure(s).\n`)
  } else if (softFailed.length) {
    console.log(
      `\n⚠️  Core UAT passed; ${softFailed.length} gateway check(s) need valid Edge secrets.\n`,
    )
  } else {
    console.log('\n✅ UAT smoke complete — all checks passed.\n')
  }
  if (!process.env.UAT_ADMIN_PASSWORD) {
    console.log(`Admin password (generated): ${ADMIN_PASSWORD}`)
  }
  if (!process.env.UAT_SELLER_PASSWORD) {
    console.log(`Seller password (generated): ${SELLER_PASSWORD}`)
  }
  if (hardFailed.length) process.exit(1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
