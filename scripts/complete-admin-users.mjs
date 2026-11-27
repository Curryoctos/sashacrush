/**
 * Admin Users use-case smoke:
 *   create (staff + seller) → invite/send_access → update → set password (staff) →
 *   login → deactivate / reactivate → last-admin guard
 *
 * Note: Admin UI does not type a password. Staff get a set-password (recovery) link;
 * sellers get a magic link. This script exercises the same edge actions, then
 * simulates completing the staff password step via Auth Admin API.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_ANON_KEY=... SUPABASE_SERVICE_ROLE_KEY=... \
 *   ADMIN_PASSWORD='...' node scripts/complete-admin-users.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'node:crypto'

const URL = process.env.SUPABASE_URL?.replace(/\/$/, '')
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
const ANON = process.env.SUPABASE_ANON_KEY
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? 'admin@sashacrush.com').toLowerCase()
const ADMIN_PASSWORD =
  process.env.ADMIN_PASSWORD ?? `Admin-Users-${randomBytes(9).toString('base64url')}`
const STAMP = Date.now()
// Resend rejects disposable/example.com recipients in live; use project domain.
const AGENT_EMAIL = (process.env.TEST_AGENT_EMAIL ?? `uat.agent.${STAMP}@sashacrush.com`).toLowerCase()
const SELLER_EMAIL = (process.env.TEST_SELLER_EMAIL ?? `uat.seller.${STAMP}@sashacrush.com`).toLowerCase()
const STAFF_PASSWORD = `Staff-${randomBytes(9).toString('base64url')}!a1`

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

function record(name, pass, detail = '') {
  results.push({ name, pass, detail })
  if (pass) ok(name, detail)
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

async function invokeDetail(error) {
  if (error?.context instanceof Response) {
    const body = await error.context.clone().json().catch(() => null)
    return body?.error ?? error.message
  }
  return error?.message ?? 'unknown'
}

async function ensureAdmin() {
  const { data: listed, error } = await service.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  })
  if (error) throw error
  let user = listed.users.find((u) => u.email?.toLowerCase() === ADMIN_EMAIL)
  if (!user) {
    const { data, error: createError } = await service.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: { role: 'admin', full_name: 'SashaCrush Admin' },
    })
    if (createError || !data.user) throw createError ?? new Error('create admin failed')
    user = data.user
  } else {
    const { error: updateError } = await service.auth.admin.updateUserById(user.id, {
      password: ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: { ...(user.user_metadata ?? {}), role: 'admin' },
    })
    if (updateError) throw updateError
  }
  const { error: profileError } = await service.from('users').upsert(
    {
      id: user.id,
      email: ADMIN_EMAIL,
      role: 'admin',
      full_name: 'SashaCrush Admin',
      is_active: true,
    },
    { onConflict: 'id' },
  )
  if (profileError) throw profileError
  return user.id
}

async function adminClient() {
  const client = browser()
  const { error } = await client.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  })
  if (error) throw error
  return client
}

async function manage(client, body) {
  const { data, error } = await client.functions.invoke('admin-manage-users', { body })
  if (error) {
    throw new Error(await invokeDetail(error))
  }
  if (data?.error) throw new Error(String(data.error))
  return data
}

async function main() {
  console.log(`\nAdmin Users workflow against ${URL}\n`)

  await ensureAdmin()
  const admin = await adminClient()
  ok('Admin signed in', ADMIN_EMAIL)

  section('1. Create staff (agent) with invite')
  let agent
  try {
    const created = await manage(admin, {
      action: 'create',
      email: AGENT_EMAIL,
      fullName: 'UAT Agent User',
      role: 'agent',
      sendInvite: true,
    })
    agent = created.user
    record(
      'create-agent',
      Boolean(agent?.id && agent.role === 'agent' && agent.is_active),
      agent?.id,
    )
  } catch (err) {
    record('create-agent', false, err instanceof Error ? err.message : String(err))
    fail('Cannot continue without agent create')
  }

  section('2. Create seller with invite (magic link path)')
  let seller
  try {
    const created = await manage(admin, {
      action: 'create',
      email: SELLER_EMAIL,
      fullName: 'UAT Seller User',
      role: 'seller',
      sendInvite: true,
    })
    seller = created.user
    record(
      'create-seller',
      Boolean(seller?.id && seller.role === 'seller' && seller.is_active),
      seller?.id,
    )
  } catch (err) {
    record('create-seller', false, err instanceof Error ? err.message : String(err))
    fail('Cannot continue without seller create')
  }

  section('3. Profiles visible to admin list query')
  {
    const { data, error } = await admin
      .from('users')
      .select('id, email, role, is_active')
      .in('id', [agent.id, seller.id])
    record(
      'admin-list-profiles',
      !error && (data?.length ?? 0) === 2,
      error?.message ?? `rows=${data?.length ?? 0}`,
    )
  }

  section('4. Resend access (staff reset + seller magic link)')
  try {
    await manage(admin, { action: 'send_access', userId: agent.id })
    record('send-access-agent', true, 'recovery/set-password email path')
  } catch (err) {
    record('send-access-agent', false, err instanceof Error ? err.message : String(err))
  }
  try {
    await manage(admin, { action: 'send_access', userId: seller.id })
    record('send-access-seller', true, 'magic-link email path')
  } catch (err) {
    record('send-access-seller', false, err instanceof Error ? err.message : String(err))
  }

  section('5. Update profile (name + role stay agent)')
  try {
    const updated = await manage(admin, {
      action: 'update',
      userId: agent.id,
      fullName: 'UAT Agent Updated',
      role: 'agent',
    })
    record(
      'update-agent',
      updated.user?.full_name === 'UAT Agent Updated',
      updated.user?.full_name,
    )
  } catch (err) {
    record('update-agent', false, err instanceof Error ? err.message : String(err))
  }

  section('6. Staff completes password (simulates invite link) → login')
  {
    const { error: pwError } = await service.auth.admin.updateUserById(agent.id, {
      password: STAFF_PASSWORD,
      email_confirm: true,
    })
    if (pwError) {
      record('staff-set-password', false, pwError.message)
    } else {
      record('staff-set-password', true, 'Auth Admin update (invite completion stand-in)')
      const staff = browser()
      const { data: session, error: loginError } = await staff.auth.signInWithPassword({
        email: AGENT_EMAIL,
        password: STAFF_PASSWORD,
      })
      record(
        'staff-login',
        !loginError && session.user?.id === agent.id,
        loginError?.message ?? session.user?.id,
      )
      await staff.auth.signOut()
    }
  }

  section('7. Seller magic-link generate (Auth Admin)')
  {
    const { data: linkData, error: linkError } = await service.auth.admin.generateLink({
      type: 'magiclink',
      email: SELLER_EMAIL,
    })
    record(
      'seller-magic-link',
      !linkError && Boolean(linkData?.properties?.action_link),
      linkError?.message ?? 'action_link present',
    )
  }

  section('8. Duplicate create rejected')
  {
    try {
      await manage(admin, {
        action: 'create',
        email: AGENT_EMAIL,
        role: 'agent',
        sendInvite: false,
      })
      record('duplicate-create', false, 'expected 409')
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      record('duplicate-create', /already exists/i.test(msg), msg)
    }
  }

  section('9. Deactivate → reactivate agent')
  try {
    const off = await manage(admin, {
      action: 'set_active',
      userId: agent.id,
      isActive: false,
    })
    record('deactivate-agent', off.user?.is_active === false, String(off.user?.is_active))

    const { data: profile } = await service
      .from('users')
      .select('is_active')
      .eq('id', agent.id)
      .single()
    record('deactivate-persisted', profile?.is_active === false, String(profile?.is_active))

    const on = await manage(admin, {
      action: 'set_active',
      userId: agent.id,
      isActive: true,
    })
    record('reactivate-agent', on.user?.is_active === true, String(on.user?.is_active))
  } catch (err) {
    record('deactivate-reactivate', false, err instanceof Error ? err.message : String(err))
  }

  section('10. Last-admin self-deactivate blocked')
  {
    const { data: session } = await admin.auth.getUser()
    const adminId = session.user?.id
    try {
      await manage(admin, {
        action: 'set_active',
        userId: adminId,
        isActive: false,
      })
      record('self-deactivate-blocked', false, 'should have failed')
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      record('self-deactivate-blocked', /cannot deactivate your own/i.test(msg), msg)
    }
  }

  section('11. Audit trail for create')
  {
    const { data: audits, error } = await service
      .from('audit_log')
      .select('id, action, entity_id, created_at')
      .eq('entity_type', 'user')
      .in('entity_id', [agent.id, seller.id])
      .order('created_at', { ascending: false })
      .limit(20)
    const actions = new Set((audits ?? []).map((a) => a.action))
    record(
      'audit-user-events',
      !error && actions.has('user_created'),
      error?.message ?? [...actions].join(', '),
    )
  }

  const failed = results.filter((r) => !r.pass)
  console.log('\n══ Summary')
  for (const r of results) {
    console.log(`  ${r.pass ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? ` — ${r.detail}` : ''}`)
  }
  console.log(
    failed.length
      ? `\n❌ Admin Users workflow finished with ${failed.length} failure(s).\n`
      : '\n✅ Admin Users workflow complete.\n',
  )
  console.log(`  Agent:  ${AGENT_EMAIL}`)
  console.log(`  Seller: ${SELLER_EMAIL}`)
  if (!process.env.ADMIN_PASSWORD) {
    console.log(`  Admin password (generated): ${ADMIN_PASSWORD}`)
  }
  console.log('')
  if (failed.length) process.exit(1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
