export function validateCommunityRegister(input: {
  email: string
  password: string
  displayName: string
}): string | null {
  if (!input.email.trim() || !input.email.includes('@')) {
    return 'A valid email is required.'
  }
  if (input.password.length < 8) {
    return 'Password must be at least 8 characters.'
  }
  if (!input.displayName.trim()) {
    return 'Display name is required.'
  }
  return null
}

export function validateCommunityPostBody(body: string): string | null {
  const value = body.trim()
  if (!value) {
    return 'Write something before posting.'
  }
  if (value.length > 4000) {
    return 'Post must be 4000 characters or fewer.'
  }
  return null
}

export function nestCommunityPosts<
  T extends { id: string; parent_id: string | null; is_pinned: boolean; created_at: string },
>(rows: T[]): Array<T & { replies: T[] }> {
  const roots = rows
    .filter((row) => row.parent_id == null)
    .sort((a, b) => {
      if (a.is_pinned !== b.is_pinned) {
        return a.is_pinned ? -1 : 1
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

  return roots.map((root) => ({
    ...root,
    replies: rows
      .filter((row) => row.parent_id === root.id)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
  }))
}
