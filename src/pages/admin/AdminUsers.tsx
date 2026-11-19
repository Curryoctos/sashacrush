import { PageHeader } from '@/components/ui/PageHeader'
import { UsersBrowser } from '@/features/users/components/UsersBrowser'

export function AdminUsersPage() {
  return (
    <div className="ui-page">
      <PageHeader
        title="Users"
        description="Provision staff and sellers, then manage roles from list or board."
      />
      <UsersBrowser />
    </div>
  )
}
