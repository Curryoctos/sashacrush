export async function computeSHA256(bytes: Uint8Array): Promise<string> {
  const normalized = new Uint8Array(bytes)
  const digest = await crypto.subtle.digest('SHA-256', normalized)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}
