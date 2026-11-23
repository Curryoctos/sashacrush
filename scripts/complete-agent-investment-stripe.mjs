/**
 * Agent capital investment Stripe E2E:
 *   terms consent → initiate-investment-checkout → test PI → webhook → capital pool
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_ANON_KEY=... SUPABASE_SERVICE_ROLE_KEY=... \
 *   STRIPE_SECRET_KEY=sk_test_... \
 *   AGENT_PASSWORD='...' node scripts/complete-agent-investment-stripe.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { randomBytes } from 'node:crypto'

const URL = process.env.SUPABASE_URL?.replace(/\/$/, '')
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
const ANON = process.env.SUPABASE_ANON_KEY
const AGENT_EMAIL = (process.env.AGENT_EMAIL ?? 'agent@sashacrush.com').toLowerCase()
const AGENT_PASSWORD =
  process.env.AGENT_PASSWORD ?? `Agent-Invest-${randomBytes(9).toString('base64url')}`
const LAND_ID = process.env.INVEST_LAND_ID ?? 'e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55'
const AMOUNT_USD = Number(process.env.INVEST_AMOUNT_USD ?? 100)
const TERMS_FALLBACK = '2026-09-21'

function fail(message) {
  console.error(`❌ ${message}`)
  process.exit(1)
}

function ok(message, detail = '') {
  console.log(`✅ ${message}${detail ? ` — ${detail}` : ''}`)
}

function loadStripeSecret() {
  if (process.env.STRIPE_SECRET_KEY?.startsWith('sk_')) {
    return process.env.STRIPE_SECRET_KEY.trim()
  }
  for (const rel of ['supabase/functions/.env', 'supabase/.env', '.env.local']) {
    const path = resolve(process.cwd(), rel)
    if (!existsSync(path)) continue
    const line = readFileSync(path, 'utf8')
      .split('\n')
      .find((l) => l.startsWith('STRIPE_SECRET_KEY='))
    if (!line) continue
    const value = line.slice('STRIPE_SECRET_KEY='.length).trim().replace(/^['"]|['"]$/g, '')
    if (value.startsWith('sk_')) return value
  }
  return null
}

if (!URL || !SERVICE || !ANON) {
  fail('Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and SUPABASE_ANON_KEY')
}

const stripeKey = loadStripeSecret()
if (!stripeKey) fail('Set STRIPE_SECRET_KEY (test key matching Edge)')

const service = createClient(URL, SERVICE, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function stripeForm(path, params) {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${stripeKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(params),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json?.error?.message ?? `Stripe ${path} failed`)
  return json
}

async function ensureAgent() {
  const { data: listed, error } = await service.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  })
  if (error) throw error
  let user = listed.users.find((u) => u.email?.toLowerCase() === AGENT_EMAIL)
  if (!user) {
    const { data, error: createError } = await service.auth.admin.createUser({
      email: AGENT_EMAIL,
      password: AGENT_PASSWORD,
      email_confirm: true,
      user_metadata: { role: 'agent', full_name: 'SashaCrush Agent' },
    })
    if (createError || !data.user) throw createError ?? new Error('create agent failed')
    user = data.user
    ok('Created agent', AGENT_EMAIL)
  } else {
    const { error: updateError } = await service.auth.admin.updateUserById(user.id, {
      password: AGENT_PASSWORD,
      email_confirm: true,
      user_metadata: { ...(user.user_metadata ?? {}), role: 'agent' },
    })
    if (updateError) throw updateError
    ok('Updated agent', AGENT_EMAIL)
  }

  const { error: profileError } = await service.from('users').upsert(
    {
      id: user.id,
      email: AGENT_EMAIL,
      role: 'agent',
      full_name: 'SashaCrush Agent',
      is_active: true,
    },
    { onConflict: 'id' },
  )
  if (profileError) throw profileError
  return user.id
}

async function ensureLand() {
  const { error } = await service.from('land_records').upsert(
    {
      id: LAND_ID,
      title: 'Mubende Land',
      location: 'Mubende District, Uganda',
      total_value_usd: 300000,
      status: 'active',
    },
    { onConflict: 'id' },
  )
  if (error) throw error
  ok('Deal ready', LAND_ID)
}

async function ensureConsent(agentId) {
  let termsVersion = TERMS_FALLBACK
  const { data: rpcVersion } = await service.rpc('current_investment_terms_version')
  if (typeof rpcVersion === 'string' && rpcVersion.trim()) {
    termsVersion = rpcVersion.trim()
  }

  const { data: existing } = await service
    .from('investor_consents')
    .select('id')
    .eq('agent_id', agentId)
    .eq('terms_version', termsVersion)
    .maybeSingle()

  if (!existing) {
    const { error } = await service.from('investor_consents').insert({
      agent_id: agentId,
      terms_version: termsVersion,
    })
    if (error) throw error
    ok('Accepted investment terms', termsVersion)
  } else {
    ok('Terms already accepted', termsVersion)
  }

  // Clear any blocking unsigned agreements assigned to agent
  const { data: pendingDocs } = await service
    .from('documents')
    .select('id')
    .eq('investor_id', agentId)
    .eq('assigned_to', agentId)
    .eq('status', 'sent')
  if (pendingDocs?.length) {
    const { error } = await service
      .from('documents')
      .update({ status: 'draft', assigned_to: null })
      .in(
        'id',
        pendingDocs.map((d) => d.id),
      )
    if (error) throw error
    ok('Cleared pending investment agreements', String(pendingDocs.length))
  }

  const { data: blockReason, error: gateError } = await service.rpc(
    'agent_contribution_block_reason',
    { p_agent_id: agentId },
  )
  if (gateError) throw gateError
  if (blockReason) fail(`Gate still blocked: ${blockReason}`)
  ok('Investment gate open')
}

async function capitalSnapshot() {
  const { data: investments } = await service
    .from('investments')
    .select('amount_usd, status')
  const { data: payments } = await service
    .from('payments')
    .select('amount_usd, status')
  const raised = (investments ?? [])
    .filter((r) => r.status === 'confirmed')
    .reduce((s, r) => s + Number(r.amount_usd), 0)
  const disbursed = (payments ?? [])
    .filter((r) => r.status === 'confirmed')
    .reduce((s, r) => s + Number(r.amount_usd), 0)
  return {
    raisedUsd: raised,
    disbursedUsd: disbursed,
    availableUsd: Math.max(0, raised - disbursed),
    investmentCount: investments?.length ?? 0,
  }
}

async function main() {
  console.log(`\nAgent investment Stripe E2E against ${URL}\n`)

  const agentId = await ensureAgent()
  await ensureLand()
  await ensureConsent(agentId)

  const before = await capitalSnapshot()
  ok(
    'Capital before',
    `raised=${before.raisedUsd} disbursed=${before.disbursedUsd} available=${before.availableUsd}`,
  )

  const agent = createClient(URL, ANON, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { error: signError } = await agent.auth.signInWithPassword({
    email: AGENT_EMAIL,
    password: AGENT_PASSWORD,
  })
  if (signError) throw signError
  ok('Agent signed in')

  const { data, error } = await agent.functions.invoke('initiate-investment-checkout', {
    body: {
      landId: LAND_ID,
      amountUsd: AMOUNT_USD,
      notes: 'Agent investment Stripe E2E',
    },
  })
  if (error) {
    const body =
      error.context instanceof Response
        ? await error.context.clone().json().catch(() => null)
        : null
    throw new Error(body?.error ?? error.message)
  }
  if (!data?.investmentId || !data?.checkoutUrl) {
    throw new Error(`Bad initiate response: ${JSON.stringify(data)}`)
  }
  ok('Checkout started', `${data.investmentId} · ${data.reference}`)
  ok('Checkout URL', String(data.checkoutUrl).slice(0, 64) + '…')

  const pi = await stripeForm('payment_intents', {
    amount: String(Math.round(AMOUNT_USD * 100)),
    currency: 'usd',
    'payment_method_types[0]': 'card',
    payment_method: 'pm_card_visa',
    confirm: 'true',
    'metadata[investment_id]': data.investmentId,
    'metadata[land_id]': LAND_ID,
  })
  if (pi.status !== 'succeeded') {
    throw new Error(`PaymentIntent not succeeded: ${pi.status}`)
  }
  ok('Test PaymentIntent succeeded', pi.id)

  let confirmed = null
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 1500))
    const { data: inv } = await service
      .from('investments')
      .select(
        'id, status, amount_usd, method, stripe_payment_intent_id, stripe_checkout_session_id, land_id',
      )
      .eq('id', data.investmentId)
      .single()
    if (inv?.status === 'confirmed') {
      confirmed = inv
      break
    }
    process.stdout.write('.')
  }
  if (!confirmed) fail('Timed out waiting for stripe-webhook to confirm investment')
  console.log('')
  ok('Investment confirmed', confirmed.id)

  const after = await capitalSnapshot()
  ok(
    'Capital after',
    `raised=${after.raisedUsd} disbursed=${after.disbursedUsd} available=${after.availableUsd}`,
  )

  if (after.raisedUsd < before.raisedUsd + AMOUNT_USD - 0.01) {
    fail(
      `raisedUsd did not increase by ${AMOUNT_USD} (${before.raisedUsd} → ${after.raisedUsd})`,
    )
  }

  console.log('\nAgent investment Stripe E2E complete.')
  console.log(`  Investment: ${confirmed.id}`)
  console.log(`  PaymentIntent: ${pi.id}`)
  console.log(`  Deal: ${LAND_ID}`)
  console.log(`  Capital raised: ${before.raisedUsd} → ${after.raisedUsd}`)
  console.log(`  Capital available: ${before.availableUsd} → ${after.availableUsd}`)
  if (!process.env.AGENT_PASSWORD) {
    console.log(`  Agent password (generated): ${AGENT_PASSWORD}`)
  }
  console.log('')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
