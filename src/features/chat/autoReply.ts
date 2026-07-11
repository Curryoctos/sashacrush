import type { ChatChannel } from '@/types/database'

const PAYMENT_PATTERN = /\b(payment|paid|money)\b/i
const RECEIPT_PATTERN = /\b(receipt|invoice)\b/i
const DOCUMENT_PATTERN = /\b(document|sign|contract)\b/i
const LAND_PATTERN = /\b(land|property|mubende)\b/i
const GREETING_PATTERN = /\b(hello|hi|hey)\b/i

const AUTO_REPLIES: Array<{ pattern: RegExp; reply: string }> = [
  {
    pattern: PAYMENT_PATTERN,
    reply:
      'Thank you for your message about payment. The admin will confirm your payment status shortly.',
  },
  {
    pattern: RECEIPT_PATTERN,
    reply:
      'Your receipts are available in the Receipts section of your portal. Please check there first.',
  },
  {
    pattern: DOCUMENT_PATTERN,
    reply:
      'Your documents are in the Documents section. Please check for any pending signatures.',
  },
  {
    pattern: LAND_PATTERN,
    reply:
      'Thank you for your enquiry about the property. The admin will respond to your specific question shortly.',
  },
  {
    pattern: GREETING_PATTERN,
    reply: 'Hello! Welcome to SashaCrush. How can we help you today?',
  },
]

export function getAutoReply(message: string): string | null {
  const trimmed = message.trim()
  if (!trimmed) {
    return null
  }

  for (const rule of AUTO_REPLIES) {
    if (rule.pattern.test(trimmed)) {
      return rule.reply
    }
  }

  return null
}

/** Auto-replies only apply to land-owner conversations, never executive chat. */
export function shouldAutoReply(channel: ChatChannel): boolean {
  return channel === 'seller_channel'
}

export const AUTO_REPLY_BODIES = new Set(AUTO_REPLIES.map((rule) => rule.reply))

export function isAutoReplyBody(body: string): boolean {
  return AUTO_REPLY_BODIES.has(body.trim())
}
