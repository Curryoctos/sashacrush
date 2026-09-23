import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/PageHeader'
import { useCommunityBoard } from '@/features/community/useCommunity'
import { notifyInfo, notifySuccess } from '@/features/notifications/useNotifications'
import { useAuth } from '@/hooks/useAuth'
import { formatDateTime } from '@/lib/formatters'
import { formatSupabaseError } from '@/lib/supabase-errors'

export function CommunityBoardPage() {
  const { user } = useAuth()
  const { posts, isLoading, error, canPost, isAdmin, createPost, setPinned, deletePost } =
    useCommunityBoard()
  const [body, setBody] = useState('')
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    try {
      await createPost(body, replyTo)
      notifySuccess(replyTo ? 'Reply posted.' : 'Post published.')
      setBody('')
      setReplyTo(null)
    } catch (err) {
      notifyInfo(err instanceof Error ? err.message : 'Could not post.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold text-ink">Community board</h1>
        <p className="mt-2 text-sm text-muted">
          Updates from incubation visitors and collaborators. Public to read — members can post and
          reply.
        </p>
      </div>

      {canPost ? (
        <Card>
          <CardHeader
            title={replyTo ? 'Write a reply' : 'Share an update'}
            description={
              replyTo
                ? 'Replying to a thread. Clear reply to start a new post.'
                : 'Visible to everyone on the community board.'
            }
          />
          <form className="space-y-3" onSubmit={(event) => void onSubmit(event)}>
            {replyTo ? (
              <button
                type="button"
                className="text-sm text-brand-800 underline"
                onClick={() => setReplyTo(null)}
              >
                Cancel reply
              </button>
            ) : null}
            <textarea
              className="ui-input min-h-28"
              value={body}
              disabled={busy}
              onChange={(event) => setBody(event.target.value)}
              placeholder="What’s happening in the pipeline?"
              required
            />
            <Button type="submit" disabled={busy}>
              {busy ? 'Posting…' : replyTo ? 'Post reply' : 'Post update'}
            </Button>
          </form>
        </Card>
      ) : (
        <Card>
          <p className="text-sm text-muted">
            {user ? (
              'Your account cannot post here. Join as a community member to contribute.'
            ) : (
              <>
                <Link className="font-medium text-brand-800 underline" to="/community/register">
                  Register
                </Link>{' '}
                or{' '}
                <Link className="font-medium text-brand-800 underline" to="/community/login">
                  sign in
                </Link>{' '}
                to post updates.
              </>
            )}
          </p>
        </Card>
      )}

      {isLoading ? <p className="text-sm text-muted">Loading posts…</p> : null}
      {error ? (
        <p className="ui-alert-danger" role="alert">
          {formatSupabaseError(error as Error)}
        </p>
      ) : null}

      {!isLoading && !error && posts.length === 0 ? (
        <EmptyState title="No posts yet." description="Be the first to share an incubation update." />
      ) : null}

      <div className="space-y-4">
        {posts.map((post) => (
          <Card key={post.id}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium text-ink">{post.author_name}</p>
                <p className="text-xs text-muted">{formatDateTime(post.created_at)}</p>
              </div>
              {post.is_pinned ? <Badge tone="brand">Pinned</Badge> : null}
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm text-ink">{post.body}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {canPost ? (
                <Button type="button" size="sm" variant="secondary" onClick={() => setReplyTo(post.id)}>
                  Reply
                </Button>
              ) : null}
              {isAdmin ? (
                <>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      void setPinned(post.id, !post.is_pinned).then(
                        () => notifySuccess(post.is_pinned ? 'Unpinned.' : 'Pinned.'),
                        (err: unknown) =>
                          notifyInfo(err instanceof Error ? err.message : 'Could not update pin.'),
                      )
                    }}
                  >
                    {post.is_pinned ? 'Unpin' : 'Pin'}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="danger"
                    onClick={() => {
                      void deletePost(post.id).then(
                        () => notifySuccess('Post deleted.'),
                        (err: unknown) =>
                          notifyInfo(err instanceof Error ? err.message : 'Could not delete.'),
                      )
                    }}
                  >
                    Delete
                  </Button>
                </>
              ) : null}
            </div>

            {post.replies.length > 0 ? (
              <ul className="mt-4 space-y-3 border-t border-border pt-4">
                {post.replies.map((reply) => (
                  <li key={reply.id} className="rounded-md bg-surface px-3 py-2">
                    <div className="flex flex-wrap justify-between gap-2">
                      <p className="text-sm font-medium text-ink">{reply.author_name}</p>
                      <p className="text-xs text-muted">{formatDateTime(reply.created_at)}</p>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-ink">{reply.body}</p>
                    {isAdmin ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="mt-2"
                        onClick={() => {
                          void deletePost(reply.id).then(
                            () => notifySuccess('Reply deleted.'),
                            (err: unknown) =>
                              notifyInfo(err instanceof Error ? err.message : 'Could not delete.'),
                          )
                        }}
                      >
                        Delete reply
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </Card>
        ))}
      </div>
    </div>
  )
}
