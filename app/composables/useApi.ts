import type { FetchOptions } from 'ofetch'

/**
 * $fetch wrapper for authenticated API calls.
 *
 * - Prefixes the path with the configured API base.
 * - Injects the Bearer access token.
 * - On 401: attempts ONE silent refresh, then retries the request once.
 *   If refresh fails, the session is cleared and the user is sent to /login.
 */
export function useApi() {
  const config = useRuntimeConfig()
  const auth = useAuth()

  async function apiFetch<T>(path: string, options: FetchOptions<'json'> = {}): Promise<T> {
    const doFetch = () =>
      $fetch<T>(`${config.public.apiBase}${path}`, {
        ...options,
        headers: {
          ...(options.headers as Record<string, string> | undefined),
          ...(auth.accessToken.value
            ? { Authorization: `Bearer ${auth.accessToken.value}` }
            : {})
        }
      } as never) as Promise<T>

    try {
      return await doFetch()
    } catch (error: unknown) {
      const status = (error as { statusCode?: number; response?: { status?: number } })
      const code = status.statusCode ?? status.response?.status
      if (code === 401) {
        if (await auth.refresh()) {
          return await doFetch()
        }
        auth.clearSession()
        await navigateTo('/login')
      }
      throw error
    }
  }

  return { apiFetch }
}

/** Extract a human-readable message from a FastAPI error response. */
export function apiErrorMessage(error: unknown, fallback = 'Terjadi kesalahan. Coba lagi.'): string {
  const data = (error as { data?: { detail?: unknown } })?.data
  if (typeof data?.detail === 'string') return data.detail
  return fallback
}
