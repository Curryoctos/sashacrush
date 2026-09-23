/// <reference path="../_shared/deno.d.ts" />
import { requireAuthenticatedStaff } from '../_shared/auth.ts'
import { suggestionStatusEmail } from '../_shared/emailTemplates.ts'
import { claimNotificationEvent } from '../_shared/idempotency.ts'
import { errorResponse, jsonResponse } from '../_shared/http.ts'
import { RateLimitError, assertRateLimit } from '../_shared/rateLimit.ts'
import { sendEmail } from '../_shared/resend.ts'
import { createServiceClient, getAppUrl } from '../_shared/supabaseAdmin.ts'

interface NotifyPayload {
  suggestionId: string
}

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  under_review: 'Under review',
  approved: 'Approved',
  rejected: 'Rejected',
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405)
  }

  try {
    const caller = await requireAuthenticatedStaff(req)
    if (caller.role !== 'admin') {
      return errorResponse('Forbidden', 403)
    }

    const body = (await req.json()) as NotifyPayload
    if (!body.suggestionId) {
      return errorResponse('Invalid payload: suggestionId is required', 400)
    }

    const supabase = createServiceClient()

    try {
      await assertRateLimit(
        supabase,
        `notify-suggestion-status:${caller.userId}:${body.suggestionId}`,
        20,
        3_600,
      )
    } catch (error) {
      if (error instanceof RateLimitError) {
        return errorResponse(error.message, 429)
      }
      throw error
    }

    const { data: suggestion, error: suggestionError } = await supabase
      .from('suggestions')
      .select('id, title, status, land_id, submitter_id')
      .eq('id', body.suggestionId)
      .single()

    if (suggestionError || !suggestion) {
      return errorResponse(
        `Suggestion not found: ${suggestionError?.message ?? 'unknown error'}`,
        404,
      )
    }

    const eventKey = `suggestion-status:${suggestion.id}:${suggestion.status}`
    const shouldSend = await claimNotificationEvent(
      supabase,
      eventKey,
      'notify-suggestion-status',
    )

    if (!shouldSend) {
      return jsonResponse({ success: true, skipped: true })
    }

    const [{ data: submitter }, { data: land }, { data: latestComment }] = await Promise.all([
      supabase
        .from('users')
        .select('email, full_name, role')
        .eq('id', suggestion.submitter_id)
        .single(),
      supabase.from('land_records').select('title').eq('id', suggestion.land_id).single(),
      supabase
        .from('suggestion_comments')
        .select('body, status_to, created_at')
        .eq('suggestion_id', suggestion.id)
        .eq('status_to', suggestion.status)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

    if (!submitter?.email) {
      return errorResponse('Submitter email not found', 404)
    }

    // Don't email the admin about their own transitions when they are the submitter.
    if (submitter.email && suggestion.submitter_id === caller.userId) {
      return jsonResponse({ success: true, skipped: true, reason: 'submitter_is_actor' })
    }

    const portalPath = submitter.role === 'agent' ? '/agent/suggestions' : '/admin/suggestions'
    const html = suggestionStatusEmail({
      recipientName: submitter.full_name ?? submitter.email,
      suggestionTitle: suggestion.title,
      landTitle: land?.title ?? 'Land deal',
      statusLabel: STATUS_LABEL[suggestion.status] ?? suggestion.status,
      comment: latestComment?.body ?? null,
      portalUrl: `${getAppUrl()}${portalPath}`,
    })

    await sendEmail({
      to: submitter.email,
      subject: `Suggestion ${STATUS_LABEL[suggestion.status] ?? suggestion.status} — ${suggestion.title}`,
      html,
    })

    return jsonResponse({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error'
    const status = message === 'Unauthorized' || message === 'Forbidden' ? 403 : 500
    return errorResponse(message, status)
  }
})
