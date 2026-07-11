import { describe, expect, it } from 'vitest'
import { AUTO_REPLY_BODIES, getAutoReply, isAutoReplyBody } from '@/features/chat/autoReply'

describe('autoReply', () => {
  it('returns a reply for payment-related messages', () => {
    expect(getAutoReply('When will my payment be confirmed?')).toContain('payment')
  })

  it('identifies known auto-reply bodies', () => {
    const reply = getAutoReply('hello there')
    expect(reply).not.toBeNull()
    expect(isAutoReplyBody(reply!)).toBe(true)
    expect(AUTO_REPLY_BODIES.has(reply!)).toBe(true)
  })

  it('does not mark arbitrary admin text as auto-reply', () => {
    expect(isAutoReplyBody('Please upload the survey report by Friday.')).toBe(false)
  })
})
