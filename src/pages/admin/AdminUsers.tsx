import { PageHeader } from '@/components/ui/PageHeader'
import { UsersBrowser } from '@/features/users/components/UsersBrowser'
import { useAuth } from '@/hooks/useAuth'

export function AdminUsersPage() {
  const { user } = useAuth()

  return (
    <div className="ui-page max-w-6xl">
      <PageHeader
        title="Users"
        description={
          user?.email
            ? `Signed in as ${user.email}. Provision staff and sellers, then manage roles from list or board.`
            : 'Provision staff and sellers, then manage roles from list or board.'
        }
      />
      <UsersBrowser />
    </div>
  )
}
