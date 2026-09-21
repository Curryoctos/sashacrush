import { useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { PageBackLink, PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { DocumentsBrowser } from '@/features/documents/components/DocumentsBrowser'
import { notifySuccess } from '@/features/notifications/useNotifications'
import { useAuth } from '@/hooks/useAuth'

export function ExecutiveDocumentsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const signDocumentId = searchParams.get('sign')

  useEffect(() => {
    if (!signDocumentId || !user?.id) {
      return
    }

    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        let changed = false
        if (next.get('land') !== user.id) {
          next.set('land', user.id)
          changed = true
        }
        if (next.get('stages') !== 'sent') {
          next.set('stages', 'sent')
          changed = true
        }
        return changed ? next : prev
      },
      { replace: true },
    )
  }, [signDocumentId, user?.id, setSearchParams])

  const lands = user
    ? [
        {
          id: user.id,
          title: 'My investment agreements',
          location: user.email,
          seller_id: user.id,
        },
      ]
    : []

  return (
    <div className="ui-page max-w-6xl">
      <div>
        <PageBackLink to="/executive/investments" label="Investments" />
        <PageHeader
          className="mt-3"
          title="Agreements"
          description={
            user?.email
              ? `Signed in as ${user.email}. Open an agreement awaiting signature, then sign with your hand.`
              : 'Open an agreement awaiting signature, then sign with your hand.'
          }
          actions={
            <Link to="/executive/investments">
              <Button variant="secondary" size="sm">
                Back to investments
              </Button>
            </Link>
          }
        />
      </div>

      <DocumentsBrowser
        mode="investor"
        lands={lands}
        isLoadingLands={!user}
        highlightDocumentId={signDocumentId}
        emptyTitle="No agreements yet"
        emptyDescription="When admin sends you an investment agreement, it will appear here to sign."
        onSigned={() => {
          void queryClient.invalidateQueries({
            queryKey: ['investor-pending-agreements', user?.id],
          })
          setSearchParams(
            (prev) => {
              const next = new URLSearchParams(prev)
              next.delete('sign')
              return next
            },
            { replace: true },
          )
          notifySuccess('Agreement signed. Continue to Investments when you are ready to contribute.')
          window.setTimeout(() => {
            navigate('/executive/investments')
          }, 900)
        }}
      />
    </div>
  )
}
