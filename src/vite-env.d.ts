/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_APP_URL: string
  readonly VITE_STRIPE_PUBLIC_KEY?: string
  readonly VITE_FLUTTERWAVE_PUBLIC_KEY?: string
  readonly VITE_WALLETCONNECT_PROJECT_ID?: string
  readonly VITE_CRYPTO_TREASURY_ADDRESS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
