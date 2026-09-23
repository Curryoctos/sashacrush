/// <reference path="../_shared/deno.d.ts" />
import { errorResponse, jsonResponse } from '../_shared/http.ts'
import { RateLimitError, assertRateLimit } from '../_shared/rateLimit.ts'
import { createServiceClient } from '../_shared/supabaseAdmin.ts'

interface RegisterPayload {
  email?: string
  password?: string
  displayName?: string
  location?: string
  bio?: string
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405)
  }

  try {
    const body = (await req.json()) as RegisterPayload
    const email = typeof body.email === 'string' ? normalizeEmail(body.email) : ''
    const password = typeof body.password === 'string' ? body.password : ''
    const displayName = typeof body.displayName === 'string' ? body.displayName.trim() : ''
    const location = typeof body.location === 'string' ? body.location.trim() : ''
    const bio = typeof body.bio === 'string' ? body.bio.trim() : ''

    if (!email || !email.includes('@')) {
      return errorResponse('A valid email is required.', 400)
    }
    if (password.length < 8) {
      return errorResponse('Password must be at least 8 characters.', 400)
    }
    if (!displayName) {
      return errorResponse('Display name is required.', 400)
    }

    const supabase = createServiceClient()

    try {
      await assertRateLimit(supabase, `register-community:${email}`, 5, 3_600)
    } catch (error) {
      if (error instanceof RateLimitError) {
        return errorResponse(error.message, 429)
      }
      throw error
    }

    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (existing) {
      return errorResponse('An account with this email already exists.', 409)
    }

    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: 'community', display_name: displayName },
    })

    if (createError || !created.user) {
      return errorResponse(createError?.message ?? 'Could not create account.', 400)
    }

    const userId = created.user.id

    const { error: profileError } = await supabase.from('users').insert({
      id: userId,
      email,
      role: 'community',
      full_name: displayName,
      is_active: true,
    })

    if (profileError) {
      await supabase.auth.admin.deleteUser(userId)
      return errorResponse(profileError.message, 400)
    }

    const { error: memberError } = await supabase.from('community_members').insert({
      user_id: userId,
      display_name: displayName,
      location: location || null,
      bio: bio || null,
    })

    if (memberError) {
      await supabase.from('users').delete().eq('id', userId)
      await supabase.auth.admin.deleteUser(userId)
      return errorResponse(memberError.message, 400)
    }

    return jsonResponse({ success: true, userId })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error'
    return errorResponse(message, 500)
  }
})
