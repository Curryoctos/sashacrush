const required = (key: string): string => {
  const value = import.meta.env[key]
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`)
  }
  return value
}

export const env = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL ?? '',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
  appUrl: import.meta.env.VITE_APP_URL ?? 'http://localhost:5173',
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
  requireSupabase: () => ({
    url: required('VITE_SUPABASE_URL'),
    anonKey: required('VITE_SUPABASE_ANON_KEY'),
  }),
}
