import { Toaster } from 'react-hot-toast'
import { AppRouter } from '@/routes'
import { AuthProvider } from '@/contexts/AuthProvider'

export function App() {
  return (
    <AuthProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            borderRadius: '10px',
            border: '1px solid #d9e2db',
            background: '#ffffff',
            color: '#121a14',
            fontSize: '14px',
            boxShadow: '0 12px 40px rgb(18 26 20 / 0.12)',
          },
          success: {
            iconTheme: { primary: '#176539', secondary: '#ffffff' },
          },
          error: {
            iconTheme: { primary: '#b42318', secondary: '#ffffff' },
          },
        }}
      />
      <AppRouter />
    </AuthProvider>
  )
}
