/**
 * BR-01 / C-30 UAT: seller JWT must not read payments, capital, cargo, media vault.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_ANON_KEY=... SUPABASE_SERVICE_ROLE_KEY=... \
 *   ISOLATION_SELLER_PASSWORD='...' node scripts/complete-seller-isolation.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'node:crypto'

const URL = process.env.SUPABASE_URL?.replace(/\/$/, '')
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
const ANON = process.env.SUPABASE_ANON_KEY
const SELLER_EMAIL = (process.env.ISOLATION_SELLER_EMAIL ?? 'seller@sashacrush.com').toLowerCase()
const SELLER_PASSWORD =
  process.env.ISOLATION_SELLER_PASSWORD ??
  `Isolation-${randomBytes(9).toString('base64url')}`

/** Must stay empty / denied for seller (SECURITY.md BR-01). */
const DENIED = [
  ['payments', 'payments'],
  ['investments', 'capital'],
  ['transactions_crypto', 'wallet/crypto'],
  ['media_videos', 'media vault'],
  ['cargo_shipments', 'cargo'],
  ['cargo_documents', 'cargo docs'],
  ['cargo_approvals', 'cargo approvals'],
  ['audit_log', 'audit'],
  ['gateway_webhook_events', 'gateway webhooks'],
  ['suggestions', 'suggestions'],
]

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

async function ensureSeller() {
  const { data: listed, error } = await service.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  })
  if (error) throw error
  let user = listed.users.find((u) => u.email?.toLowerCase() === SELLER_EMAIL)
  if (!user) {
    const { data, error: createError } = await service.auth.admin.createUser({
      email: SELLER_EMAIL,
      password: SELLER_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: 'Mubende Seller', role: 'seller' },
    })
    if (createError || !data.user) throw createError ?? new Error('create seller failed')
    user = data.user
    ok('Created seller', SELLER_EMAIL)
  } else {
    const { error: updateError } = await service.auth.admin.updateUserById(user.id, {
      password: SELLER_PASSWORD,
      email_confirm: true,
      user_metadata: { ...(user.user_metadata ?? {}), role: 'seller' },
    })
    if (updateError) throw updateError
    ok('Updated seller password', SELLER_EMAIL)
  }

  const { error: profileError } = await service.from('users').upsert(
    {
      id: user.id,
      email: SELLER_EMAIL,
      role: 'seller',
      full_name: 'Mubende Seller',
      is_active: true,
    },
    { onConflict: 'id' },
  )
  if (profileError) throw profileError
  return user.id
}

const LAND_ID = process.env.ISOLATION_LAND_ID ?? 'e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55'

async function ensureStaffForSeed() {
  const { data: listed } = await service.auth.admin.listUsers({ page: 1, perPage: 200 })
  let admin = listed.users.find((u) => u.email?.toLowerCase() === 'admin@sashacrush.com')
  if (!admin) {
    const { data } = await service.auth.admin.createUser({
      email: 'admin@sashacrush.com',
      password: `Tmp-${randomBytes(8).toString('base64url')}`,
      email_confirm: true,
      user_metadata: { role: 'admin' },
    })
    admin = data.user
  }
  await service.from('users').upsert(
    {
      id: admin.id,
      email: 'admin@sashacrush.com',
      role: 'admin',
      full_name: 'SashaCrush Admin',
      is_active: true,
    },
    { onConflict: 'id' },
  )

  let agent = listed.users.find((u) => u.email?.toLowerCase() === 'agent@sashacrush.com')
  if (!agent) {
    const { data } = await service.auth.admin.createUser({
      email: 'agent@sashacrush.com',
      password: `Tmp-${randomBytes(8).toString('base64url')}`,
      email_confirm: true,
      user_metadata: { role: 'agent' },
    })
    agent = data.user
  }
  await service.from('users').upsert(
    {
      id: agent.id,
      email: 'agent@sashacrush.com',
      role: 'agent',
      full_name: 'SashaCrush Agent',
      is_active: true,
    },
    { onConflict: 'id' },
  )

  await service.from('land_records').upsert(
    {
      id: LAND_ID,
      title: 'Mubende Land',
      location: 'Mubende District, Uganda',
      total_value_usd: 300000,
      status: 'active',
    },
    { onConflict: 'id' },
  )

  return { adminId: admin.id, agentId: agent.id }
}

async function seedSensitiveIfEmpty(adminId, agentId) {
  const { count: invCount } = await service
    .from('investments')
    .select('id', { count: 'exact', head: true })
  if (!invCount) {
    const { error } = await service.from('investments').insert({
      agent_id: agentId,
      land_id: LAND_ID,
      amount_usd: 1000,
      method: 'bank_transfer',
      reference: `ISO-INV-${Date.now()}`,
      status: 'confirmed',
      notes: 'seller-isolation seed',
    })
    if (error) console.warn(`⚠️  seed investments: ${error.message}`)
    else ok('Seeded investments row for isolation proof')
  }

  const { count: mediaCount } = await service
    .from('media_videos')
    .select('id', { count: 'exact', head: true })
  if (!mediaCount) {
    const { error } = await service.from('media_videos').insert({
      land_id: LAND_ID,
      uploader_id: adminId,
      title: 'Isolation vault seed',
      land_title: 'Mubende Land',
      file_path: `isolation/${Date.now()}-seed.mp4`,
      mime_type: 'video/mp4',
      size_bytes: 1024,
    })
    if (error) console.warn(`⚠️  seed media_videos: ${error.message}`)
    else ok('Seeded media_videos row for isolation proof')
  }

  const { count: cargoCount } = await service
    .from('cargo_shipments')
    .select('id', { count: 'exact', head: true })
  if (!cargoCount) {
    const { error } = await service.from('cargo_shipments').insert({
      origin: 'Guangzhou',
      destination: 'Kampala',
      description: 'Isolation cargo seed',
      expected_at: '2026-12-31',
      status: 'ordered',
      created_by: adminId,
      assignee_id: agentId,
    })
    if (error) console.warn(`⚠️  seed cargo_shipments: ${error.message}`)
    else ok('Seeded cargo_shipments row for isolation proof')
  }
}

async function assertServiceHasSensitiveData() {
  const checks = [
    ['payments', 'id'],
    ['investments', 'id'],
    ['media_videos', 'id'],
    ['cargo_shipments', 'id'],
  ]
  for (const [table, col] of checks) {
    const { count, error } = await service
      .from(table)
      .select(col, { count: 'exact', head: true })
    if (error) {
      console.warn(`⚠️  service count ${table}: ${error.message}`)
      continue
    }
    ok(`service can see ${table}`, `count=${count ?? 0}`)
  }
}

function isDeniedError(message) {
  return /permission|policy|denied|rls|not accept|forbidden/i.test(message)
}

async function main() {
  console.log(`\nSeller isolation UAT against ${URL}\n`)

  const sellerId = await ensureSeller()
  const { adminId, agentId } = await ensureStaffForSeed()
  await seedSensitiveIfEmpty(adminId, agentId)
  await assertServiceHasSensitiveData()

  const seller = createClient(URL, ANON, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: session, error: signError } = await seller.auth.signInWithPassword({
    email: SELLER_EMAIL,
    password: SELLER_PASSWORD,
  })
  if (signError || !session.user) throw signError ?? new Error('seller sign-in failed')
  if (session.user.id !== sellerId) {
    throw new Error('signed-in seller id mismatch')
  }
  ok('Seller JWT session', session.user.id)

  const results = []

  for (const [table, label] of DENIED) {
    const { data, error } = await seller.from(table).select('*')
    let pass = false
    let detail = ''
    if (error) {
      pass = isDeniedError(error.message)
      detail = error.message
    } else {
      pass = Array.isArray(data) && data.length === 0
      detail = `rows=${data?.length ?? 'null'}`
    }
    results.push({ table, label, pass, detail })
    if (pass) ok(`seller blocked: ${label} (${table})`, detail)
    else console.error(`❌ seller LEAK: ${label} (${table}) — ${detail}`)
  }

  // users: only self
  const { data: users, error: usersError } = await seller
    .from('users')
    .select('id, role, email')
  const usersPass =
    !usersError &&
    Array.isArray(users) &&
    users.every((row) => row.id === sellerId)
  results.push({
    table: 'users',
    label: 'profiles',
    pass: usersPass,
    detail: usersError?.message ?? `rows=${users?.length ?? 0}`,
  })
  if (usersPass) ok('seller users scope = self only', `rows=${users.length}`)
  else console.error(`❌ seller users leak — ${usersError?.message ?? JSON.stringify(users)}`)

  // Positive control: assigned receipts/docs may be readable — just land assigned
  const { data: lands, error: landError } = await seller.from('land_records').select('id, title')
  if (landError) {
    console.warn(`⚠️  seller land_records: ${landError.message}`)
  } else {
    ok('seller can query own land scope', `rows=${lands?.length ?? 0}`)
  }

  const failed = results.filter((r) => !r.pass)
  console.log('\n══ Summary')
  for (const r of results) {
    console.log(
      `  ${r.pass ? 'PASS' : 'FAIL'}  ${r.label} (${r.table})${r.detail ? ` — ${r.detail}` : ''}`,
    )
  }
  console.log(
    failed.length
      ? `\n❌ Seller isolation failed (${failed.length}).\n`
      : '\n✅ Seller isolation UAT passed — payments / capital / cargo / media vault blocked.\n',
  )
  if (!process.env.ISOLATION_SELLER_PASSWORD) {
    console.log(`Seller password (generated): ${SELLER_PASSWORD}`)
  }
  if (failed.length) process.exit(1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
