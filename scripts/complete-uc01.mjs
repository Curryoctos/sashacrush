/**
 * UC-01: seed Mubende land + seller, create manual payout, confirm → receipt PDF.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... SUPABASE_ANON_KEY=... \
 *   UC01_ADMIN_PASSWORD='...' node scripts/complete-uc01.mjs
 *
 * Optional:
 *   UC01_ADMIN_EMAIL (default admin@sashacrush.com)
 *   UC01_SELLER_EMAIL (default seller@sashacrush.com)
 *   UC01_AMOUNT_USD (default 100)
 */
import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'node:crypto'

const URL = process.env.SUPABASE_URL?.replace(/\/$/, '')
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
const ANON = process.env.SUPABASE_ANON_KEY
const ADMIN_EMAIL = (process.env.UC01_ADMIN_EMAIL ?? 'admin@sashacrush.com').toLowerCase()
const SELLER_EMAIL = (process.env.UC01_SELLER_EMAIL ?? 'seller@sashacrush.com').toLowerCase()
const ADMIN_PASSWORD =
  process.env.UC01_ADMIN_PASSWORD ?? `Uc01-${randomBytes(9).toString('base64url')}`
const AMOUNT_USD = Number(process.env.UC01_AMOUNT_USD ?? 100)

const LAND_ID = 'e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55'
const PROJECT_ID = 'a4eebc99-9c0b-4ef8-bb6d-6bb9bd380a77'
const RATE_UGX = 3700

function fail(message) {
  console.error(`❌ ${message}`)
  process.exit(1)
}

function ok(message, detail = '') {
  console.log(`✅ ${message}${detail ? ` — ${detail}` : ''}`)
}

if (!URL || !SERVICE || !ANON) {
  fail('Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and SUPABASE_ANON_KEY')
}

const service = createClient(URL, SERVICE, {
  auth: { autoRefreshToken: false, persistSession: false },
})

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
    if (error || !data.user) {
      throw error ?? new Error(`Could not create ${email}`)
    }
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
  ok(`Upserted public.users ${role}`, email)
  return user.id
}

async function ensureReceiptsBucket() {
  const { data: buckets, error } = await service.storage.listBuckets()
  if (error) throw error
  if (!buckets?.some((b) => b.name === 'receipts')) {
    const { error: createError } = await service.storage.createBucket('receipts', {
      public: false,
      fileSizeLimit: 10_485_760,
      allowedMimeTypes: ['application/pdf'],
    })
    if (createError && !/already exists/i.test(createError.message)) {
      throw createError
    }
    ok('Created receipts storage bucket')
  } else {
    ok('Receipts bucket ready')
  }
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
      boundary_geojson: {
        type: 'Polygon',
        coordinates: [
          [
            [31.39, 0.557],
            [31.4, 0.557],
            [31.4, 0.564],
            [31.39, 0.564],
            [31.39, 0.557],
          ],
        ],
      },
    },
    { onConflict: 'id' },
  )
  if (landError) throw landError
  ok('Mubende land_records ready', LAND_ID)

  const { error: projectError } = await service.from('projects').upsert(
    {
      id: PROJECT_ID,
      title: 'Mubende Land Acquisition',
      slug: 'mubende-land',
      description:
        'Cross-border land acquisition for the Mubende parcel — partial payments, receipts, and title progress tracked in SashaCrush.',
      cause: 'Secure and clear title for the $300,000 Mubende land deal.',
      type: 'land_acquisition',
      visibility: 'public',
      funding_goal_usd: 300000,
      funding_raised_usd: 0,
      min_contribution_usd: 25,
      location_name: 'Mubende District, Uganda',
      country: 'Uganda',
      latitude: 0.5605,
      longitude: 31.395,
      status: 'active',
      tags: ['land', 'mubende', 'uganda'],
      land_id: LAND_ID,
      owner_id: sellerId,
      created_by: adminId,
    },
    { onConflict: 'id' },
  )
  if (projectError) throw projectError
  ok('Mubende project linked to land + seller')
}

async function createManualPayment() {
  const reference = `WU-UC01-${Date.now()}`
  const { data, error } = await service
    .from('payments')
    .insert({
      land_id: LAND_ID,
      project_id: PROJECT_ID,
      disbursement_reason: 'UC-01 partial payment toward Mubende land settlement',
      amount_usd: AMOUNT_USD,
      amount_ugx: Math.round(AMOUNT_USD * RATE_UGX),
      rate_used: RATE_UGX,
      method: 'manual',
      manual_reference: reference,
      status: 'pending_manual',
    })
    .select('id, status, manual_reference')
    .single()
  if (error || !data) throw error ?? new Error('Payment insert failed')
  ok('Created pending_manual payment', `${data.id} · ${reference}`)
  return data
}

async function confirmAsAdmin(paymentId) {
  const browser = createClient(URL, ANON, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: sessionData, error: signInError } =
    await browser.auth.signInWithPassword({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    })
  if (signInError || !sessionData.session) {
    throw signInError ?? new Error('Admin sign-in failed')
  }
  ok('Admin signed in for confirm-payment')

  const { data, error } = await browser.functions.invoke('confirm-payment', {
    body: { paymentId },
  })
  if (error) {
    const body =
      error.context instanceof Response
        ? await error.context.clone().json().catch(() => null)
        : null
    throw new Error(
      body?.error ?? error.message ?? 'confirm-payment failed',
    )
  }
  if (!data?.receiptNumber) {
    throw new Error(`confirm-payment returned no receiptNumber: ${JSON.stringify(data)}`)
  }
  ok('Payment confirmed', data.receiptNumber)
  return data.receiptNumber
}

async function verifySellerReceipt(sellerId, receiptNumber) {
  const { data: receipt, error } = await service
    .from('receipts')
    .select('id, receipt_number, pdf_path, seller_id, land_id, amount_usd, payment_id')
    .eq('receipt_number', receiptNumber)
    .single()
  if (error || !receipt) throw error ?? new Error('Receipt row missing')
  if (receipt.seller_id !== sellerId) {
    throw new Error('Receipt seller_id does not match Mubende seller')
  }
  if (!receipt.pdf_path) throw new Error('Receipt missing pdf_path')
  if (receipt.land_id !== LAND_ID) throw new Error('Receipt not linked to Mubende land')

  const { data: signed, error: signError } = await service.storage
    .from('receipts')
    .createSignedUrl(receipt.pdf_path, 300)
  if (signError || !signed?.signedUrl) {
    throw signError ?? new Error('Could not sign receipt PDF URL')
  }

  const pdfRes = await fetch(signed.signedUrl)
  if (!pdfRes.ok) throw new Error(`PDF fetch failed: ${pdfRes.status}`)
  const bytes = await pdfRes.arrayBuffer()
  if (bytes.byteLength < 100) throw new Error('PDF too small / empty')

  ok('Seller receipt PDF downloadable', `${receipt.receipt_number} · ${bytes.byteLength} bytes`)
  return receipt
}

async function main() {
  console.log(`\nUC-01 against ${URL}\n`)

  const adminId = await ensureUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    role: 'admin',
    fullName: 'SashaCrush Admin',
  })
  const sellerId = await ensureUser({
    email: SELLER_EMAIL,
    password: `Seller-${randomBytes(9).toString('base64url')}`,
    role: 'seller',
    fullName: 'Mubende Seller',
  })

  await ensureReceiptsBucket()
  await ensureLandAndProject(sellerId, adminId)
  const payment = await createManualPayment()
  const receiptNumber = await confirmAsAdmin(payment.id)
  await verifySellerReceipt(sellerId, receiptNumber)

  console.log('\nUC-01 complete.')
  console.log(`  Admin login:  ${ADMIN_EMAIL}`)
  if (!process.env.UC01_ADMIN_PASSWORD) {
    console.log(`  Admin password (generated): ${ADMIN_PASSWORD}`)
  }
  console.log(`  Seller email: ${SELLER_EMAIL} (use magic link in UI)`)
  console.log(`  Receipt:      ${receiptNumber}`)
  console.log('  Seller path:  /seller/receipts\n')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
