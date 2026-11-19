/// <reference path="../_shared/deno.d.ts" />
import { createClient } from 'npm:@supabase/supabase-js@2'
import { getEnv, requireEnv } from '../_shared/env.ts'
import { handleCorsPreflight, errorResponse, jsonResponse } from '../_shared/http.ts'
import { assertRateLimit, RateLimitError } from '../_shared/rateLimit.ts'
import {
  createStripeCheckoutSession,
  getStripeSecretKey,
} from '../_shared/stripe.ts'
import { createServiceClient, getAppUrl } from '../_shared/supabaseAdmin.ts'

type ContributionMethod = 'stripe' | 'mobile_money' | 'wire' | 'crypto'

interface Payload {
  projectId?: string
  amountUsd?: number
  method?: ContributionMethod
  contributorName?: string
  contributorEmail?: string
  contributorCountry?: string
  isAnonymous?: boolean
  payerPhone?: string
  mobileMoneyNetwork?: 'mtn' | 'airtel'
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

async function optionalUserId(req: Request): Promise<string | null> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }
  const token = authHeader.slice(7)
  const supabaseUrl = requireEnv('SUPABASE_URL', getEnv('SUPABASE_URL'))
  const anonKey = requireEnv('SUPABASE_ANON_KEY', getEnv('SUPABASE_ANON_KEY'))
  const client = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const {
    data: { user },
  } = await client.auth.getUser(token)
  return user?.id ?? null
}

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req)
  if (preflight) return preflight

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405)
  }

  try {
    const payload = (await req.json()) as Payload
    const projectId = typeof payload.projectId === 'string' ? payload.projectId.trim() : ''
    const amountUsd = Number(payload.amountUsd)
    const method = payload.method
    const contributorName =
      typeof payload.contributorName === 'string' ? payload.contributorName.trim() : ''
    const contributorEmail =
      typeof payload.contributorEmail === 'string'
        ? normalizeEmail(payload.contributorEmail)
        : ''
    const contributorCountry =
      typeof payload.contributorCountry === 'string'
        ? payload.contributorCountry.trim() || null
        : null
    const isAnonymous = Boolean(payload.isAnonymous)
    const payerPhone =
      typeof payload.payerPhone === 'string' ? payload.payerPhone.trim() || null : null
    const mobileMoneyNetwork = payload.mobileMoneyNetwork ?? null

    if (!projectId) {
      return errorResponse('projectId is required', 400)
    }
    if (!method || !['stripe', 'mobile_money', 'wire', 'crypto'].includes(method)) {
      return errorResponse('Invalid payment method', 400)
    }
    if (!Number.isFinite(amountUsd) || amountUsd < 0.5) {
      return errorResponse('Amount must be at least $0.50', 400)
    }
    if (!contributorName) {
      return errorResponse('Contributor name is required', 400)
    }
    if (!contributorEmail || !contributorEmail.includes('@')) {
      return errorResponse('A valid contributor email is required', 400)
    }
    if (method === 'mobile_money' && !payerPhone) {
      return errorResponse('Phone number is required for mobile money', 400)
    }
    if (method === 'stripe' && !getStripeSecretKey()) {
      return errorResponse('STRIPE_SECRET_KEY is not configured', 503)
    }

    const appUrl = getAppUrl().replace(/\/$/, '')
    const supabase = createServiceClient()
    const userId = await optionalUserId(req)

    const clientIp =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      req.headers.get('x-real-ip') ??
      'unknown'

    try {
      await assertRateLimit(supabase, `project-contrib:email:${contributorEmail}`, 10, 3_600)
      await assertRateLimit(supabase, `project-contrib:ip:${clientIp}`, 30, 3_600)
    } catch (error) {
      if (error instanceof RateLimitError) {
        return errorResponse(error.message, 429)
      }
      throw error
    }

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, title, slug, status, visibility, min_contribution_usd')
      .eq('id', projectId)
      .maybeSingle()

    if (projectError || !project) {
      return errorResponse('Project not found', 404)
    }
    if (project.status !== 'active' && project.status !== 'funded') {
      return errorResponse('This project is not accepting contributions', 400)
    }
    if (project.visibility !== 'public') {
      return errorResponse('Only public projects accept open contributions', 400)
    }

    const minContribution = Number(project.min_contribution_usd ?? 10)
    if (amountUsd < minContribution) {
      return errorResponse(`Minimum contribution is $${minContribution}`, 400)
    }

    const contributionId = crypto.randomUUID()
    const reference = `SC-C-${contributionId.replace(/-/g, '').slice(0, 12).toUpperCase()}`
    const displayName = isAnonymous ? 'Anonymous' : contributorName

    const { error: insertError } = await supabase.from('project_contributions').insert({
      id: contributionId,
      project_id: projectId,
      user_id: userId,
      contributor_name: displayName,
      contributor_email: contributorEmail,
      contributor_country: contributorCountry,
      is_anonymous: isAnonymous,
      amount_usd: amountUsd,
      method,
      reference,
      status: 'pending',
      payer_phone: method === 'mobile_money' ? payerPhone : null,
      mobile_money_network: method === 'mobile_money' ? mobileMoneyNetwork : null,
      notes:
        method === 'wire'
          ? 'Awaiting wire transfer reconciliation'
          : method === 'crypto'
            ? 'Awaiting on-chain transfer reconciliation'
            : method === 'mobile_money'
              ? 'Awaiting mobile money confirmation'
              : null,
    })

    if (insertError) {
      return errorResponse(insertError.message || 'Could not create contribution', 400)
    }

    if (method === 'stripe') {
      const successUrl =
        `${appUrl}/projects/${project.slug}?contribution=success&id=${contributionId}`
      const cancelUrl =
        `${appUrl}/projects/${project.slug}?contribution=cancel&id=${contributionId}`

      let session
      try {
        session = await createStripeCheckoutSession({
          amountUsd,
          productName: `SashaCrush — Contribute to ${project.title}`,
          successUrl,
          cancelUrl,
          customerEmail: contributorEmail,
          metadata: {
            contribution_id: contributionId,
            project_id: projectId,
          },
        })
      } catch (sessionError) {
        await supabase
          .from('project_contributions')
          .update({
            status: 'rejected',
            rejection_reason: 'Stripe Checkout could not be started',
            updated_at: new Date().toISOString(),
          })
          .eq('id', contributionId)
          .eq('status', 'pending')
        const message =
          sessionError instanceof Error
            ? sessionError.message
            : 'Stripe Checkout session creation failed'
        return errorResponse(message, 502)
      }

      if (!session.url) {
        await supabase
          .from('project_contributions')
          .update({
            status: 'rejected',
            rejection_reason: 'Stripe Checkout did not return a URL',
            updated_at: new Date().toISOString(),
          })
          .eq('id', contributionId)
          .eq('status', 'pending')
        return errorResponse('Stripe did not return a Checkout URL', 502)
      }

      await supabase
        .from('project_contributions')
        .update({
          stripe_checkout_session_id: session.id,
          stripe_payment_intent_id:
            typeof session.payment_intent === 'string' ? session.payment_intent : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', contributionId)

      return jsonResponse({
        success: true,
        contributionId,
        reference,
        status: 'pending',
        checkoutUrl: session.url,
        sessionId: session.id,
      })
    }

    return jsonResponse({
      success: true,
      contributionId,
      reference,
      status: 'pending',
      checkoutUrl: null,
      message:
        method === 'wire'
          ? 'Use this reference on your wire transfer. Funding updates after admin confirmation.'
          : method === 'mobile_money'
            ? 'Mobile money intent recorded. An admin will confirm after the transfer arrives.'
            : 'Crypto intent recorded. An admin will confirm after the on-chain transfer arrives.',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error'
    return errorResponse(message, 500)
  }
})
