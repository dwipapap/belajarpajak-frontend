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

  async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
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
  const detail = data?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    const first = detail[0]
    if (first && typeof first === 'object') {
      const item = first as { loc?: unknown, msg?: unknown }
      if (typeof item.msg === 'string') {
        if (Array.isArray(item.loc)) {
          const field = item.loc.at(-1)
          if (typeof field === 'string' || typeof field === 'number') return `${field}: ${item.msg}`
        }
        return item.msg
      }
    }
  }
  return fallback
}
