import type { UserRole } from '@/types'
import { ROLE_LABELS } from '@/types'

export const USER_ROLE_ORDER: UserRole[] = ['admin', 'executive', 'agent', 'seller']

export const USER_ROLE_LABELS = ROLE_LABELS

export type UserRoleTransition =
  | { kind: 'allowed' }
  | { kind: 'confirm'; reason: string; confirmLabel: string; tone?: 'danger' | 'primary' }
  | { kind: 'blocked'; reason: string }

export function evaluateRoleChange(
  from: UserRole,
  to: UserRole,
  options: { isSelf: boolean },
): UserRoleTransition {
  if (from === to) {
    return { kind: 'allowed' }
  }

  if (options.isSelf) {
    return {
      kind: 'blocked',
      reason: 'You cannot change your own role.',
    }
  }

  if (from === 'admin' && to !== 'admin') {
    return {
      kind: 'confirm',
      reason: `Demote this admin to ${USER_ROLE_LABELS[to]}? Ensure at least one active admin remains.`,
      confirmLabel: 'Change role',
      tone: 'danger',
    }
  }

  if (to === 'admin') {
    return {
      kind: 'confirm',
      reason: 'Grant Admin / Owner access? This person will manage users and the full platform.',
      confirmLabel: 'Make admin',
      tone: 'danger',
    }
  }

  return {
    kind: 'confirm',
    reason: `Change role from ${USER_ROLE_LABELS[from]} to ${USER_ROLE_LABELS[to]}?`,
    confirmLabel: 'Change role',
    tone: 'primary',
  }
}

export function evaluateDeactivate(options: {
  isSelf: boolean
  isActive: boolean
}): UserRoleTransition {
  if (options.isSelf && options.isActive) {
    return {
      kind: 'blocked',
      reason: 'You cannot deactivate your own account.',
    }
  }

  if (options.isActive) {
    return {
      kind: 'confirm',
      reason: 'Deactivate this account? They will lose portal access until reactivated.',
      confirmLabel: 'Deactivate',
      tone: 'danger',
    }
  }

  return {
    kind: 'confirm',
    reason: 'Reactivate this account and restore portal access?',
    confirmLabel: 'Reactivate',
    tone: 'primary',
  }
}
