import { Toaster } from 'react-hot-toast'
import { AppRouter } from '@/routes'
import { AuthProvider } from '@/contexts/AuthProvider'

export function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
      <AppRouter />
    </AuthProvider>
  )
}
