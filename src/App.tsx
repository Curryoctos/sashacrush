import { Toaster } from 'react-hot-toast'
import { OfflineBanner } from '@/components/OfflineBanner'
import { AppRouter } from '@/routes'
import { AuthProvider } from '@/contexts/AuthProvider'
import { ThemeProvider } from '@/contexts/ThemeProvider'

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <OfflineBanner />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            className: 'border border-border bg-surface-elevated text-ink',
            style: {
              borderRadius: '10px',
              fontSize: '14px',
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
    </ThemeProvider>
  )
}
