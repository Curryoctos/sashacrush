import { describe, expect, it } from 'vitest'
import { getAutoReply, shouldAutoReply } from '@/features/chat/autoReply'
import { countUnreadMessages, filterMessagesByQuery } from '@/features/chat/chat-utils'
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
})

describe('filterMessagesByQuery', () => {
  const messages: ChatMessage[] = [
    {
      id: '1',
      channel: 'executive_channel',
      land_id: null,
      sender_id: 'admin-1',
      body: 'Mubende survey timing',
      sender_name: 'Admin',
      created_at: '2026-07-01T10:00:00.000Z',
    },
    {
      id: '2',
      channel: 'executive_channel',
      land_id: null,
      sender_id: 'exec-1',
      body: 'Approved for next week',
      sender_name: 'Steve',
      created_at: '2026-07-01T11:00:00.000Z',
    },
  ]

  it('returns all messages when query is empty', () => {
    expect(filterMessagesByQuery(messages, '  ')).toHaveLength(2)
  })

  it('filters by body or sender', () => {
    expect(filterMessagesByQuery(messages, 'mubende')).toHaveLength(1)
    expect(filterMessagesByQuery(messages, 'steve')).toHaveLength(1)
  })
})
