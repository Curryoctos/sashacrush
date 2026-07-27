/**
 * Minimal Deno typings for Supabase Edge Functions.
 * Used by the IDE / TypeScript language service — the Edge Runtime provides these APIs at runtime.
 *
 * The `jsr:@supabase/functions-js/edge-runtime.d.ts` import only augments Deno errors and does
 * not declare `Deno.serve`, so editors using the Node TS server need this file.
 */

declare namespace Deno {
  export function serve(
    handler: (request: Request) => Response | Promise<Response>,
    options?: {
      port?: number
      hostname?: string
      onListen?: (params: { port: number; hostname: string }) => void
    },
  ): void

  export const env: {
    get(key: string): string | undefined
    set(key: string, value: string): void
    delete(key: string): void
    toObject(): Record<string, string>
  }
}
