/**
 * Docs e-sign smoke: upload PDF → send to seller → hand-sign → hash + lock.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... SUPABASE_ANON_KEY=... \
 *   ESIGN_ADMIN_PASSWORD='...' ESIGN_SELLER_PASSWORD='...' \
 *   node scripts/complete-docs-esign.mjs
 *
 * Optional:
 *   ESIGN_ADMIN_EMAIL / ESIGN_SELLER_EMAIL
 *   ESIGN_SKIP_NOTIFY=1  — mark sent without notify-document-sent
 *     (use when Resend FROM domain is unverified; core sign+lock still runs)
 *   ESIGN_LAND_ID — default Mubende land from UC-01
 */
import { createClient } from '@supabase/supabase-js'
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

const URL = process.env.SUPABASE_URL?.replace(/\/$/, '')
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
const ANON = process.env.SUPABASE_ANON_KEY
const ADMIN_EMAIL = (process.env.ESIGN_ADMIN_EMAIL ?? 'admin@sashacrush.com').toLowerCase()
const SELLER_EMAIL = (process.env.ESIGN_SELLER_EMAIL ?? 'seller@sashacrush.com').toLowerCase()
const ADMIN_PASSWORD =
  process.env.ESIGN_ADMIN_PASSWORD ?? `Esign-Admin-${randomBytes(9).toString('base64url')}`
const SELLER_PASSWORD =
  process.env.ESIGN_SELLER_PASSWORD ?? `Esign-Seller-${randomBytes(9).toString('base64url')}`
const SKIP_NOTIFY = process.env.ESIGN_SKIP_NOTIFY === '1'
const LAND_ID = process.env.ESIGN_LAND_ID ?? 'e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55'
const PROJECT_ID = 'a4eebc99-9c0b-4ef8-bb6d-6bb9bd380a77'
const BUCKET = 'documents'

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

/** Minimal valid PNG bytes (1×1) — product requires non-empty handwritten PNG. */
function buildSignaturePng() {
  return new Uint8Array(
    Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64',
    ),
  )
}

async function buildSourcePdf() {
  const pdf = await PDFDocument.create()
  const page = pdf.addPage([612, 792])
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  page.drawText('SashaCrush — Mubende settlement terms (e-sign smoke)', {
    x: 50,
    y: 720,
    size: 14,
    font,
    color: rgb(0.1, 0.15, 0.12),
  })
  page.drawText('Partial payment acknowledgment for land acquisition.', {
    x: 50,
    y: 690,
    size: 11,
    font,
  })
  page.drawText(`Generated: ${new Date().toISOString()}`, {
    x: 50,
    y: 660,
    size: 10,
    font,
    color: rgb(0.4, 0.4, 0.4),
  })
  return pdf.save()
}

async function stampSignedPdf(originalBytes, signerName, documentId, signaturePng) {
  const pdfDoc = await PDFDocument.load(originalBytes)
  const page = pdfDoc.getPages().at(-1) ?? pdfDoc.addPage([612, 792])
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const image = await pdfDoc.embedPng(signaturePng)
  const { width } = page.getSize()
  const boxWidth = Math.min(320, width - 72)
  const boxX = 50
  const boxBottom = 36
  const imageH = 36
  const boxHeight = 110

  page.drawRectangle({
    x: boxX,
    y: boxBottom,
    width: boxWidth,
    height: boxHeight,
    borderColor: rgb(0.75, 0.8, 0.76),
    borderWidth: 1,
    color: rgb(1, 1, 1),
  })
  page.drawText('AUTHORIZED SIGNATURE', {
    x: boxX + 12,
    y: boxBottom + boxHeight - 18,
    size: 7,
    font: bold,
    color: rgb(0.36, 0.42, 0.38),
  })
  page.drawImage(image, {
    x: boxX + 12,
    y: boxBottom + 48,
    width: Math.min(180, image.width),
    height: imageH,
  })
  const lines = [
    `Signed by: ${signerName}`,
    `Date: ${new Date().toISOString()}`,
    `Document ID: ${documentId.slice(0, 8)}…${documentId.slice(-6)}`,
  ]
  lines.forEach((line, i) => {
    page.drawText(line, {
      x: boxX + 12,
      y: boxBottom + 32 - i * 11,
      size: 8,
      font,
      color: rgb(0.18, 0.22, 0.19),
    })
  })
  return pdfDoc.save()
}

function sha256Hex(bytes) {
  return createHash('sha256').update(Buffer.from(bytes)).digest('hex')
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
  ok(`Upserted public.users ${role}`, email)
  return user.id
}

async function ensureLand(sellerId, adminId) {
  const { data: existing } = await service
    .from('land_records')
    .select('id')
    .eq('id', LAND_ID)
    .maybeSingle()

  if (!existing) {
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
    ok('Seeded Mubende land_records', LAND_ID)
  } else {
    const { error } = await service
      .from('land_records')
      .update({ seller_id: sellerId, status: 'active' })
      .eq('id', LAND_ID)
    if (error) throw error
    ok('Mubende land ready', LAND_ID)
  }

  await service.from('projects').upsert(
    {
      id: PROJECT_ID,
      title: 'Mubende Land Acquisition',
      slug: 'mubende-land',
      description: 'Cross-border land acquisition — e-sign smoke.',
      cause: 'Title package for Mubende.',
      type: 'land_acquisition',
      visibility: 'public',
      funding_goal_usd: 300000,
      funding_raised_usd: 0,
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
}

async function ensureDocumentsBucket() {
  const { data: buckets, error } = await service.storage.listBuckets()
  if (error) throw error
  if (!buckets?.some((b) => b.name === BUCKET)) {
    const { error: createError } = await service.storage.createBucket(BUCKET, {
      public: false,
      fileSizeLimit: 52_428_800,
      allowedMimeTypes: [
        'application/pdf',
        'image/png',
        'image/jpeg',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ],
    })
    if (createError && !/already exists/i.test(createError.message)) throw createError
    ok('Created documents bucket')
  } else {
    ok('Documents bucket ready')
  }
}

function browserClient() {
  return createClient(URL, ANON, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

async function main() {
  console.log(`\nDocs e-sign against ${URL}\n`)

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

  await ensureDocumentsBucket()
  await ensureLand(sellerId, adminId)

  const admin = browserClient()
  const { error: adminSignError } = await admin.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  })
  if (adminSignError) throw adminSignError
  ok('Admin signed in')

  const pdfBytes = await buildSourcePdf()
  const objectId = randomUUID()
  const title = `mubende-esign-smoke-${Date.now()}.pdf`
  const storagePath = `${LAND_ID}/${objectId}-${title}`

  const { error: uploadError } = await admin.storage.from(BUCKET).upload(storagePath, pdfBytes, {
    contentType: 'application/pdf',
    upsert: false,
  })
  if (uploadError) throw uploadError
  ok('Uploaded draft PDF', storagePath)

  const { data: doc, error: insertError } = await admin
    .from('documents')
    .insert({
      land_id: LAND_ID,
      uploader_id: adminId,
      file_path: storagePath,
      title,
      status: 'draft',
    })
    .select('id, status, file_path, assigned_to')
    .single()
  if (insertError || !doc) throw insertError ?? new Error('Document insert failed')
  ok('Document draft created', doc.id)

  const { data: sentDoc, error: sendError } = await admin
    .from('documents')
    .update({ status: 'sent', assigned_to: sellerId })
    .eq('id', doc.id)
    .select('id, status, assigned_to')
    .single()
  if (sendError || !sentDoc) throw sendError ?? new Error('Send for signing failed')
  ok('Marked sent + assigned to seller')

  if (SKIP_NOTIFY) {
    ok('Skipped notify-document-sent (ESIGN_SKIP_NOTIFY=1)')
  } else {
    const { data: notifyData, error: notifyError } = await admin.functions.invoke(
      'notify-document-sent',
      { body: { documentId: doc.id, assigneeId: sellerId, sellerId } },
    )
    if (notifyError) {
      const body =
        notifyError.context instanceof Response
          ? await notifyError.context.clone().json().catch(() => null)
          : null
      // Roll back like the UI would
      await admin
        .from('documents')
        .update({ status: 'draft', assigned_to: null })
        .eq('id', doc.id)
      throw new Error(
        body?.error ??
          notifyError.message ??
          'notify-document-sent failed (set ESIGN_SKIP_NOTIFY=1 to bypass)',
      )
    }
    ok('notify-document-sent', JSON.stringify(notifyData ?? {}))
  }

  const seller = browserClient()
  const { error: sellerSignError } = await seller.auth.signInWithPassword({
    email: SELLER_EMAIL,
    password: SELLER_PASSWORD,
  })
  if (sellerSignError) throw sellerSignError
  ok('Seller signed in')

  const { data: assigned, error: fetchError } = await seller
    .from('documents')
    .select('id, status, assigned_to, file_path, title')
    .eq('id', doc.id)
    .single()
  if (fetchError || !assigned) throw fetchError ?? new Error('Seller cannot see assigned doc')
  if (assigned.status !== 'sent' || assigned.assigned_to !== sellerId) {
    throw new Error('Document not in sent/assigned state for seller')
  }
  ok('Seller sees document via ?sign= path', `/seller/documents?sign=${doc.id}`)

  const { data: fileBlob, error: downloadError } = await seller.storage
    .from(BUCKET)
    .download(assigned.file_path)
  if (downloadError || !fileBlob) throw downloadError ?? new Error('Seller download failed')

  const originalBytes = new Uint8Array(await fileBlob.arrayBuffer())
  const signaturePng = await buildSignaturePng()
  const signedBytes = await stampSignedPdf(
    originalBytes,
    'Mubende Seller',
    doc.id,
    signaturePng,
  )
  const signatureHash = sha256Hex(signedBytes)

  const { error: reuploadError } = await seller.storage.from(BUCKET).upload(
    assigned.file_path,
    signedBytes,
    { contentType: 'application/pdf', upsert: true },
  )
  if (reuploadError) throw reuploadError
  ok('Seller uploaded signed PDF')

  const signedAt = new Date().toISOString()
  const { data: signedRow, error: signUpdateError } = await seller
    .from('documents')
    .update({
      status: 'signed',
      signature_hash: signatureHash,
      signed_at: signedAt,
      signed_by: sellerId,
    })
    .eq('id', doc.id)
    .select('id, status, signature_hash, signed_by, signed_at, file_path')
    .single()
  if (signUpdateError || !signedRow) throw signUpdateError ?? new Error('Sign update failed')
  ok('Document status=signed', signatureHash.slice(0, 16) + '…')

  // Immutability: admin must not overwrite signed storage object
  const { error: lockError } = await admin.storage.from(BUCKET).upload(
    assigned.file_path,
    pdfBytes,
    { contentType: 'application/pdf', upsert: true },
  )
  if (!lockError) {
    fail('Signed document storage was still writable (BR-04 broken)')
  }
  ok('Signed storage immutable (admin overwrite blocked)', lockError.message)

  const { data: verify } = await service
    .from('documents')
    .select('id, status, signature_hash, signed_by')
    .eq('id', doc.id)
    .single()
  if (verify?.status !== 'signed' || verify.signature_hash !== signatureHash) {
    throw new Error('Final verification failed')
  }

  // Best-effort admin notify (UI fires and forgets)
  const { error: signedNotifyError } = await seller.functions.invoke('notify-document-signed', {
    body: { documentId: doc.id },
  })
  if (signedNotifyError) {
    console.warn('⚠️  notify-document-signed:', signedNotifyError.message)
  } else {
    ok('notify-document-signed invoked')
  }

  console.log('\nDocs e-sign complete.')
  console.log(`  Document:     ${doc.id}`)
  console.log(`  Seller path:  /seller/documents?sign=${doc.id}`)
  console.log(`  Hash:         ${signatureHash}`)
  console.log(`  Admin:        ${ADMIN_EMAIL}`)
  console.log(`  Seller:       ${SELLER_EMAIL}`)
  if (!process.env.ESIGN_ADMIN_PASSWORD) {
    console.log(`  Admin password (generated): ${ADMIN_PASSWORD}`)
  }
  if (!process.env.ESIGN_SELLER_PASSWORD) {
    console.log(`  Seller password (generated): ${SELLER_PASSWORD}`)
  }
  console.log('')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
