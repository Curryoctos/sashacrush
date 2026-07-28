/**
 * Supabase FunctionsHttpError.message is always the generic
 * "Edge Function returned a non-2xx status code". The real payload lives on
 * error.context as a Response — read it so callers can show actionable text.
 */
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

  if (error instanceof Error && error.message && !isGenericFunctionsError(error.message)) {
    return error.message
  }

  if (error instanceof Error && error.message) {
    return `${fallback} (${error.message})`
  }

  return fallback
}

function isGenericFunctionsError(message: string): boolean {
  return /Edge Function returned a non-2xx status code/i.test(message)
}
