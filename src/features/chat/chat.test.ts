import { describe, expect, it } from 'vitest'
import { getAutoReply, shouldAutoReply } from '@/features/chat/autoReply'

describe('getAutoReply', () => {
  it('returns payment response for payment keywords', () => {
    expect(getAutoReply('When is my payment due?')).toContain('payment')
  })

  it('returns receipt response for receipt keywords', () => {
    expect(getAutoReply('I need my receipt please')).toContain('Receipts section')
  })

  it('returns document response for document keywords', () => {
    expect(getAutoReply('Please send the contract to sign')).toContain('Documents section')
  })

  it('returns land response for land keywords', () => {
    expect(getAutoReply('Tell me about the Mubende property')).toContain('property')
  })

  it('returns greeting response for hello keywords', () => {
    expect(getAutoReply('Hello there')).toContain('Welcome to SashaCrush')
  })

  it('returns null for unrecognised message', () => {
    expect(getAutoReply('What is the weather today?')).toBeNull()
  })

  it('is case-insensitive', () => {
    expect(getAutoReply('PAYMENT status')).toContain('payment')
    expect(getAutoReply('Hi!')).toContain('Welcome to SashaCrush')
  })
})

describe('shouldAutoReply', () => {
  it('does not fire for executive conversations', () => {
    expect(shouldAutoReply('executive_channel')).toBe(false)
  })

  it('fires only for land-owner conversations', () => {
    expect(shouldAutoReply('seller_channel')).toBe(true)
  })
})
