import type { AccessTokenResponse, LoginResponse, Me, Role } from '~/types/api'

// Current dev tradeoff (documented in README): access token in memory, refresh token in
// localStorage. Revisit with httpOnly cookies before production.
const REFRESH_TOKEN_KEY = 'pajaksim.refresh_token'

/** Landing page for each role. */
export function roleHome(role: Role | undefined | null): string {
  switch (role) {
    case 'superadmin':
    case 'admin':
      return '/admin'
    case 'guru':
      return '/guru'
    case 'siswa':
      return '/siswa'
    default:
      return '/login'
  }
}

export function useAuth() {
  const config = useRuntimeConfig()
  const apiBase = config.public.apiBase

  const user = useState<Me | null>('auth.user', () => null)
  const accessToken = useState<string | null>('auth.accessToken', () => null)
  const initialized = useState<boolean>('auth.initialized', () => false)

  const isLoggedIn = computed(() => user.value !== null)

  function getRefreshToken(): string | null {
    return import.meta.client ? localStorage.getItem(REFRESH_TOKEN_KEY) : null
  }

  function setRefreshToken(token: string | null) {
    if (!import.meta.client) return
    if (token) localStorage.setItem(REFRESH_TOKEN_KEY, token)
    else localStorage.removeItem(REFRESH_TOKEN_KEY)
  }

  async function fetchMe(): Promise<Me> {
    const me = await $fetch<Me>(`${apiBase}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken.value}` }
    })
    user.value = me
    return me
  }

  async function login(email: string, password: string, tenantSlug?: string): Promise<Me> {
    const body: Record<string, string> = { email, password }
    if (tenantSlug) body.tenant_slug = tenantSlug
    const tokens = await $fetch<LoginResponse>(`${apiBase}/api/v1/auth/login`, {
      method: 'POST',
      body
    })
    accessToken.value = tokens.access_token
    setRefreshToken(tokens.refresh_token)
    initialized.value = true
    return await fetchMe()
  }

  /** Get a fresh access token using the stored refresh token. */
  async function refresh(): Promise<boolean> {
    const refreshToken = getRefreshToken()
    if (!refreshToken) return false
    try {
      const res = await $fetch<AccessTokenResponse>(`${apiBase}/api/v1/auth/refresh`, {
        method: 'POST',
        body: { refresh_token: refreshToken }
      })
      accessToken.value = res.access_token
      return true
    } catch {
      setRefreshToken(null)
      return false
    }
  }

  /** On app boot: silently restore the session if a refresh token exists. */
  async function init(): Promise<void> {
    if (initialized.value) return
    initialized.value = true
    if (await refresh()) {
      try {
        await fetchMe()
      } catch {
        clearSession()
      }
    }
  }

  function clearSession() {
    user.value = null
    accessToken.value = null
    setRefreshToken(null)
  }

  async function logout(): Promise<void> {
    clearSession()
    await navigateTo('/login')
  }

  return {
    user,
    accessToken,
    isLoggedIn,
    login,
    logout,
    refresh,
    init,
    fetchMe,
    clearSession
  }
}
