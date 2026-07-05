/**
 * Global auth guard.
 *
 * On first navigation, attempts a silent session restore (refresh token → access
 * token → /auth/me). Unauthenticated users are redirected to /login; authenticated
 * users visiting /login are sent to their role dashboard.
 */
export default defineNuxtRouteMiddleware(async (to) => {
  const auth = useAuth()
  await auth.init()

  if (to.path === '/login') {
    if (auth.isLoggedIn.value) {
      return navigateTo(roleHome(auth.user.value?.role), { replace: true })
    }
    return
  }

  if (!auth.isLoggedIn.value) {
    return navigateTo('/login', { replace: true })
  }
})
