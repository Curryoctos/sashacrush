import { MediaVaultView } from '@/features/media/components/MediaVaultView'

export function AdminMediaPage() {
  return <MediaVaultView canUpload backTo="/admin/media-hub" backLabel="Media" />
}
