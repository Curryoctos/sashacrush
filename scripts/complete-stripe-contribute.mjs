/**
 * Stripe contribution E2E: Checkout session → test PaymentIntent → webhook → funding bump.
 *
 * Creates a pending Stripe contribution via the edge function (real Checkout URL),
 * then confirms a matching test PaymentIntent so the Dashboard webhook hits
 * stripe-webhook with contribution_id metadata (same path as a paid Checkout).
 *
 * Requires local Stripe secret that matches the live Edge project (test mode):
 *   STRIPE_SECRET_KEY in env, or supabase/functions/.env
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_ANON_KEY=... SUPABASE_SERVICE_ROLE_KEY=... \
 *   STRIPE_SECRET_KEY=sk_test_... \
 *   node scripts/complete-stripe-contribute.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const URL = process.env.SUPABASE_URL?.replace(/\/$/, '')
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
const ANON = process.env.SUPABASE_ANON_KEY
const PROJECT_ID = process.env.STRIPE_PROJECT_ID ?? 'a4eebc99-9c0b-4ef8-bb6d-6bb9bd380a77'
const AMOUNT_USD = Number(process.env.STRIPE_CONTRIB_USD ?? 25)

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
if (!stripeKey) {
  fail('Set STRIPE_SECRET_KEY (test key matching Edge secrets)')
}

const service = createClient(URL, SERVICE, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function stripeForm(path, params) {
  const body = new URLSearchParams(params)
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${stripeKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  })
  const json = await res.json()
  if (!res.ok) {
    throw new Error(json?.error?.message ?? `Stripe ${path} failed (${res.status})`)
  }
  return json
}

async function main() {
  console.log(`\nStripe contribute E2E against ${URL}\n`)

  const { data: before, error: beforeError } = await service
    .from('projects')
    .select('id, slug, funding_raised_usd, status, visibility')
    .eq('id', PROJECT_ID)
    .single()
  if (beforeError || !before) throw beforeError ?? new Error('Project not found')
  if (before.visibility !== 'public' || !['active', 'funded'].includes(before.status)) {
    fail(`Project not open for contributions (${before.status}/${before.visibility})`)
  }
  const raisedBefore = Number(before.funding_raised_usd ?? 0)
  ok('Project ready', `${before.slug} raised=${raisedBefore}`)

  const anon = createClient(URL, ANON, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data, error } = await anon.functions.invoke('initiate-project-contribution', {
    body: {
      projectId: PROJECT_ID,
      amountUsd: AMOUNT_USD,
      method: 'stripe',
      contributorName: 'Stripe E2E Tester',
      contributorEmail: `stripe.e2e.${Date.now()}@example.com`,
      contributorCountry: 'US',
    },
  })
  if (error) {
    const body =
      error.context instanceof Response
        ? await error.context.clone().json().catch(() => null)
        : null
    throw new Error(body?.error ?? error.message)
  }
  if (!data?.contributionId || !data?.checkoutUrl) {
    throw new Error(`Bad initiate response: ${JSON.stringify(data)}`)
  }
  ok('Checkout session created', `${data.sessionId} · ${data.reference}`)
  ok('Checkout URL', data.checkoutUrl.slice(0, 60) + '…')

  const pi = await stripeForm('payment_intents', {
    amount: String(Math.round(AMOUNT_USD * 100)),
    currency: 'usd',
    'payment_method_types[0]': 'card',
    payment_method: 'pm_card_visa',
    confirm: 'true',
    'metadata[contribution_id]': data.contributionId,
    'metadata[project_id]': PROJECT_ID,
  })
  if (pi.status !== 'succeeded') {
    throw new Error(`PaymentIntent not succeeded: ${pi.status}`)
  }
  ok('Test PaymentIntent succeeded', pi.id)

  let confirmed = null
  let raisedAfter = raisedBefore
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 1500))
    const { data: contrib } = await service
      .from('project_contributions')
      .select(
        'id, status, amount_usd, stripe_payment_intent_id, stripe_checkout_session_id',
      )
      .eq('id', data.contributionId)
      .single()
    const { data: project } = await service
      .from('projects')
      .select('funding_raised_usd')
      .eq('id', PROJECT_ID)
      .single()
    raisedAfter = Number(project?.funding_raised_usd ?? 0)
    if (contrib?.status === 'confirmed' && raisedAfter >= raisedBefore + AMOUNT_USD - 0.01) {
      confirmed = contrib
      break
    }
    process.stdout.write('.')
  }
  if (!confirmed) {
    fail('Timed out waiting for stripe-webhook to confirm contribution')
  }
  console.log('')
  ok('Contribution confirmed', confirmed.id)
  ok('funding_raised_usd', `${raisedBefore} → ${raisedAfter}`)

  console.log('\nStripe contribute E2E complete.')
  console.log(`  Contribution: ${confirmed.id}`)
  console.log(`  PaymentIntent: ${pi.id}`)
  console.log(`  Checkout session: ${data.sessionId}`)
  console.log('')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
