/// <reference path="../_shared/deno.d.ts" />
import { requireAuthenticatedAdmin, type UserRole } from '../_shared/auth.ts'
import {
  sellerWelcomeEmail,
  staffInviteEmail,
  staffPasswordResetEmail,
} from '../_shared/emailTemplates.ts'
import { errorResponse, jsonResponse } from '../_shared/http.ts'
import { getEnv } from '../_shared/env.ts'
import { sendEmail } from '../_shared/resend.ts'
import { createServiceClient, getAppUrl } from '../_shared/supabaseAdmin.ts'
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'

type ManageAction = 'create' | 'update' | 'set_active' | 'send_access'

interface ManagePayload {
  action: ManageAction
  userId?: string
  email?: string
  fullName?: string | null
  role?: UserRole
  isActive?: boolean
  sendInvite?: boolean
}

const VALID_ROLES: UserRole[] = ['admin', 'executive', 'agent', 'seller']

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin / Owner',
  executive: 'Executive',
  agent: 'Agent',
  seller: 'Seller / Land Owner',
}

const ROLE_DASHBOARD: Record<UserRole, string> = {
  admin: '/admin/dashboard',
  executive: '/executive/dashboard',
  agent: '/agent/dashboard',
  seller: '/seller/dashboard',
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function isValidRole(role: unknown): role is UserRole {
  return typeof role === 'string' && VALID_ROLES.includes(role as UserRole)
}

function randomPassword(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24))
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

async function writeUserAudit(
  supabase: SupabaseClient,
  actorId: string,
  action: string,
  entityId: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  try {
    const { error } = await supabase.rpc('write_audit_log_as', {
      p_actor_id: actorId,
      p_action: action,
      p_entity_type: 'user',
      p_entity_id: entityId,
      p_metadata: metadata,
    })
    if (error) {
      console.error('write_audit_log_as failed (non-fatal):', error.message)
    }
  } catch (err) {
    console.error('writeUserAudit failed (non-fatal):', err)
  }
}

async function countActiveAdmins(
  supabase: SupabaseClient,
  excludeUserId?: string,
): Promise<number> {
  let query = supabase
    .from('users')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'admin')
    .eq('is_active', true)

  if (excludeUserId) {
    query = query.neq('id', excludeUserId)
  }

  const { count, error } = await query
  if (error) {
    throw new Error(`Could not verify admin count: ${error.message}`)
  }
  return count ?? 0
}

async function deliverLink(params: {
  to: string
  subject: string
  html: string
  actionLink: string
  label: string
}): Promise<void> {
  if (!getEnv('RESEND_API_KEY')) {
    console.log(`[dev] ${params.label} for ${params.to}: ${params.actionLink}`)
    return
  }

  await sendEmail({
    to: params.to,
    subject: params.subject,
    html: params.html,
  })
}

async function sendAccessEmail(
  supabase: ReturnType<typeof createServiceClient>,
  profile: {
    id: string
    email: string
    full_name: string | null
    role: UserRole
    is_active: boolean
  },
  kind: 'invite' | 'reset',
): Promise<void> {
  if (!profile.is_active) {
    throw Object.assign(new Error('Cannot send access email to a deactivated user'), {
      status: 400,
    })
  }

  const appUrl = getAppUrl()
  const portalUrl = `${appUrl}${ROLE_DASHBOARD[profile.role]}`
  const name = profile.full_name ?? profile.email

  if (profile.role === 'seller') {
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: profile.email,
      options: { redirectTo: portalUrl },
    })

    if (linkError || !linkData.properties?.action_link) {
      throw new Error(linkError?.message ?? 'Could not generate seller magic link')
    }

    const actionLink = linkData.properties.action_link
    await deliverLink({
      to: profile.email,
      subject:
        kind === 'invite'
          ? 'Welcome to SashaCrush — your seller account'
          : 'Your SashaCrush seller sign-in link',
      html: sellerWelcomeEmail({
        sellerName: name,
        magicLink: actionLink,
        portalUrl,
      }),
      actionLink,
      label: 'Seller magic link',
    })
    return
  }

  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: 'recovery',
    email: profile.email,
    options: { redirectTo: `${appUrl}/login` },
  })

  if (linkError || !linkData.properties?.action_link) {
    throw new Error(linkError?.message ?? 'Could not generate password link')
  }

  const actionLink = linkData.properties.action_link

  if (kind === 'invite') {
    await deliverLink({
      to: profile.email,
      subject: 'Welcome to SashaCrush — set your password',
      html: staffInviteEmail({
        recipientName: name,
        roleLabel: ROLE_LABELS[profile.role],
        setPasswordLink: actionLink,
        portalUrl,
      }),
      actionLink,
      label: 'Staff invite link',
    })
  } else {
    await deliverLink({
      to: profile.email,
      subject: 'SashaCrush password reset',
      html: staffPasswordResetEmail({
        recipientName: name,
        resetLink: actionLink,
        portalUrl,
      }),
      actionLink,
      label: 'Staff password reset',
    })
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405)
  }

  try {
    const admin = await requireAuthenticatedAdmin(req)
    const body = (await req.json()) as ManagePayload
    const supabase = createServiceClient()

    if (!body.action) {
      return errorResponse('action is required', 400)
    }

    if (body.action === 'create') {
      if (!body.email || !isValidRole(body.role)) {
        return errorResponse('email and a valid role are required', 400)
      }

      const email = normalizeEmail(body.email)
      const role = body.role
      const fullName = body.fullName?.trim() || null
      const sendInvite = body.sendInvite !== false

      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .maybeSingle()

      if (existing) {
        return errorResponse('A user with this email already exists', 409)
      }

      const { data: created, error: createError } = await supabase.auth.admin.createUser({
        email,
        password: randomPassword(),
        email_confirm: true,
        user_metadata: fullName ? { full_name: fullName } : undefined,
      })

      if (createError || !created.user) {
        return errorResponse(createError?.message ?? 'Could not create auth user', 400)
      }

      const userId = created.user.id

      const { data: profile, error: profileError } = await supabase
        .from('users')
        .insert({
          id: userId,
          email,
          role,
          full_name: fullName,
          is_active: true,
        })
        .select('id, email, role, full_name, is_active, created_at')
        .single()

      if (profileError || !profile) {
        await supabase.auth.admin.deleteUser(userId)
        return errorResponse(
          profileError?.message ?? 'Could not create portal profile',
          500,
        )
      }

      await writeUserAudit(supabase, admin.userId, 'user_created', userId, {
        email,
        role,
        full_name: fullName,
        invite_sent: sendInvite,
      })

      if (sendInvite) {
        await sendAccessEmail(
          supabase,
          {
            id: profile.id,
            email: profile.email,
            full_name: profile.full_name,
            role: profile.role as UserRole,
            is_active: profile.is_active,
          },
          'invite',
        )
        await writeUserAudit(supabase, admin.userId, 'user_access_sent', userId, {
          kind: 'invite',
          role,
        })
      }

      return jsonResponse({ success: true, user: profile })
    }

    if (body.action === 'update') {
      if (!body.userId) {
        return errorResponse('userId is required', 400)
      }

      if (body.userId === admin.userId && body.role && body.role !== 'admin') {
        return errorResponse('You cannot change your own role', 400)
      }

      const { data: current, error: currentError } = await supabase
        .from('users')
        .select('id, email, role, full_name, is_active')
        .eq('id', body.userId)
        .maybeSingle()

      if (currentError || !current) {
        return errorResponse('User not found', 404)
      }

      const updates: {
        full_name?: string | null
        role?: UserRole
        updated_at: string
      } = { updated_at: new Date().toISOString() }

      if (body.fullName !== undefined) {
        updates.full_name = body.fullName?.trim() || null
      }

      if (body.role !== undefined) {
        if (!isValidRole(body.role)) {
          return errorResponse('Invalid role', 400)
        }

        if (
          current.role === 'admin' &&
          body.role !== 'admin' &&
          current.is_active
        ) {
          const remaining = await countActiveAdmins(supabase, current.id)
          if (remaining < 1) {
            return errorResponse('Cannot demote the last active admin', 400)
          }
        }

        updates.role = body.role
      }

      const { data: updated, error: updateError } = await supabase
        .from('users')
        .update(updates)
        .eq('id', body.userId)
        .select('id, email, role, full_name, is_active, created_at, updated_at')
        .single()

      if (updateError || !updated) {
        return errorResponse(updateError?.message ?? 'Could not update user', 500)
      }

      if (updates.full_name !== undefined) {
        await supabase.auth.admin.updateUserById(body.userId, {
          user_metadata: { full_name: updates.full_name },
        })
      }

      await writeUserAudit(supabase, admin.userId, 'user_updated', body.userId, {
        before: {
          role: current.role,
          full_name: current.full_name,
        },
        after: {
          role: updated.role,
          full_name: updated.full_name,
        },
      })

      return jsonResponse({ success: true, user: updated })
    }

    if (body.action === 'set_active') {
      if (!body.userId || typeof body.isActive !== 'boolean') {
        return errorResponse('userId and isActive are required', 400)
      }

      if (body.userId === admin.userId && body.isActive === false) {
        return errorResponse('You cannot deactivate your own account', 400)
      }

      const { data: current, error: currentError } = await supabase
        .from('users')
        .select('id, email, role, full_name, is_active')
        .eq('id', body.userId)
        .maybeSingle()

      if (currentError || !current) {
        return errorResponse('User not found', 404)
      }

      if (current.is_active === body.isActive) {
        return jsonResponse({ success: true, user: current })
      }

      if (
        body.isActive === false &&
        current.role === 'admin' &&
        current.is_active
      ) {
        const remaining = await countActiveAdmins(supabase, current.id)
        if (remaining < 1) {
          return errorResponse('Cannot deactivate the last active admin', 400)
        }
      }

      const { data: updated, error: updateError } = await supabase
        .from('users')
        .update({
          is_active: body.isActive,
          updated_at: new Date().toISOString(),
        })
        .eq('id', body.userId)
        .select('id, email, role, full_name, is_active, created_at, updated_at')
        .single()

      if (updateError || !updated) {
        return errorResponse(updateError?.message ?? 'Could not update status', 500)
      }

      const { error: banError } = await supabase.auth.admin.updateUserById(body.userId, {
        ban_duration: body.isActive ? 'none' : '876000h',
      })

      if (banError) {
        console.error('auth ban update failed:', banError.message)
      }

      await writeUserAudit(
        supabase,
        admin.userId,
        body.isActive ? 'user_reactivated' : 'user_deactivated',
        body.userId,
        { email: current.email, role: current.role },
      )

      return jsonResponse({ success: true, user: updated })
    }

    if (body.action === 'send_access') {
      if (!body.userId) {
        return errorResponse('userId is required', 400)
      }

      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('id, email, full_name, role, is_active')
        .eq('id', body.userId)
        .maybeSingle()

      if (profileError || !profile) {
        return errorResponse('User not found', 404)
      }

      await sendAccessEmail(
        supabase,
        {
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          role: profile.role as UserRole,
          is_active: profile.is_active,
        },
        'reset',
      )

      await writeUserAudit(supabase, admin.userId, 'user_access_sent', profile.id, {
        kind: 'reset',
        role: profile.role,
      })

      return jsonResponse({ success: true })
    }

    return errorResponse(`Unknown action: ${body.action}`, 400)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error'
    const status =
      error && typeof error === 'object' && 'status' in error
        ? Number((error as { status: number }).status)
        : message === 'Unauthorized'
          ? 401
          : message === 'Forbidden'
            ? 403
            : 500
    return errorResponse(message, status)
  }
})
