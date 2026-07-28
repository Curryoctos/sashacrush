type EnvHost = {
  Deno?: { env: { get(key: string): string | undefined } }
  process?: { env?: Record<string, string | undefined> }
}

export function getEnv(name: string): string | undefined {
  const host = globalThis as EnvHost

  if (host.Deno?.env) {
    return host.Deno.env.get(name)
  }

  return host.process?.env?.[name]
}

export function requireEnv(name: string, value?: string): string {
  const resolved = value ?? getEnv(name)
  if (!resolved) {
    throw new Error(`${name} environment variable is not set`)
  }

  return resolved
}
