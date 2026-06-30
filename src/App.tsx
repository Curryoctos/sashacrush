import { AppRouter } from '@/routes'
import { AuthProvider } from '@/contexts/AuthProvider'

export function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  )
}
