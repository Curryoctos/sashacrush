import { describe, expect, it } from 'vitest'
import { getAutoReply, shouldAutoReply } from '@/features/chat/autoReply'
import { countUnreadMessages } from '@/features/chat/chat-utils'
import type { ChatMessage } from '@/types'

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

describe('countUnreadMessages', () => {
  const messages: ChatMessage[] = [
    {
      id: '1',
      channel: 'seller_channel',
      land_id: 'land-1',
      sender_id: 'admin-1',
      body: 'Hello',
      created_at: '2026-07-01T10:00:00.000Z',
    },
  ]

  it('counts messages from others when lastReadAt is null', () => {
    expect(countUnreadMessages(messages, 'seller-1', null)).toBe(1)
  })

  it('returns zero for own messages only when never read', () => {
    const ownMessages = [{ ...messages[0], sender_id: 'seller-1' }]
    expect(countUnreadMessages(ownMessages, 'seller-1', null)).toBe(0)
  })
})
