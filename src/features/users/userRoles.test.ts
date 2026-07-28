import { describe, expect, it } from 'vitest'
import {
  evaluateDeactivate,
  evaluateRoleChange,
} from '@/features/users/userRoles'

describe('userRoles', () => {
  it('blocks changing your own role', () => {
    expect(evaluateRoleChange('admin', 'agent', { isSelf: true }).kind).toBe(
      'blocked',
    )
  })

  it('requires confirm to promote to admin', () => {
    const result = evaluateRoleChange('agent', 'admin', { isSelf: false })
    expect(result.kind).toBe('confirm')
    if (result.kind === 'confirm') {
      expect(result.tone).toBe('danger')
    }
  })

  it('blocks self-deactivate', () => {
    expect(
      evaluateDeactivate({ isSelf: true, isActive: true }).kind,
    ).toBe('blocked')
  })
})
