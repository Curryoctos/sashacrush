import { describe, expect, it } from 'vitest'
import {
  nestCommunityPosts,
  validateCommunityPostBody,
  validateCommunityRegister,
} from '@/features/community/validation'

describe('community validation', () => {
  it('validates register payloads', () => {
    expect(validateCommunityRegister({ email: '', password: 'x', displayName: '' })).toMatch(/email/i)
    expect(
      validateCommunityRegister({ email: 'a@b.co', password: 'short', displayName: 'Ada' }),
    ).toMatch(/8/)
    expect(
      validateCommunityRegister({ email: 'a@b.co', password: 'password1', displayName: 'Ada' }),
    ).toBeNull()
  })

  it('validates post body', () => {
    expect(validateCommunityPostBody('   ')).toMatch(/write/i)
    expect(validateCommunityPostBody('Hello community')).toBeNull()
  })

  it('nests replies under pinned roots first', () => {
    const nested = nestCommunityPosts([
      { id: '1', parent_id: null, is_pinned: false, created_at: '2026-01-02T00:00:00Z' },
      { id: '2', parent_id: null, is_pinned: true, created_at: '2026-01-01T00:00:00Z' },
      { id: '3', parent_id: '2', is_pinned: false, created_at: '2026-01-03T00:00:00Z' },
    ])
    expect(nested.map((row) => row.id)).toEqual(['2', '1'])
    expect(nested[0]?.replies.map((row) => row.id)).toEqual(['3'])
  })
})
