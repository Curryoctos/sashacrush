/**
 * Supabase FunctionsHttpError.message is always the generic
 * "Edge Function returned a non-2xx status code". The real payload lives on
 * error.context as a Response — read it so callers can show actionable text.
 *
 * FunctionsFetchError ("Failed to send a request to the Edge Function") means
 * the browser never got a usable HTTP response (network, CORS, SW, wrong URL).
 */

const FETCH_FAIL =
  /Failed to send a request to the Edge Function|Failed to fetch|NetworkError|Load failed/i

const GENERIC_HTTP =
  /Edge Function returned a non-2xx status code/i

export async function extractEdgeFunctionError(
  error: unknown,
  data: unknown,
  fallback: string,
): Promise<string> {
  if (data && typeof data === 'object' && 'error' in data && data.error) {
    return String(data.error)
  }

  if (error && typeof error === 'object' && 'context' in error) {
    const context = (error as { context?: unknown }).context

    if (context instanceof Response) {
      try {
        const body: unknown = await context.clone().json()
        if (body && typeof body === 'object' && 'error' in body && body.error) {
          return String(body.error)
        }
      } catch {
        // Fall through to other extractors.
      }
    }

    if (context && typeof context === 'object' && 'body' in context) {
      const body = (context as { body?: unknown }).body
      if (body && typeof body === 'object' && 'error' in body && body.error) {
        return String((body as { error: unknown }).error)
      }
    }
  }

  if (error instanceof Error && error.message) {
    if (FETCH_FAIL.test(error.message)) {
      return (
        `${fallback} Could not reach the server. ` +
        'Check your connection, hard-refresh (clear the site’s service worker), ' +
        'and confirm the app is pointed at the live Supabase project.'
      )
    }
    if (!GENERIC_HTTP.test(error.message)) {
      return error.message
    }
    return `${fallback} (${error.message})`
  }

  return fallback
}

export function isEdgeReachabilityError(message: string): boolean {
  return FETCH_FAIL.test(message) || /Could not reach the server/i.test(message)
}
