import type { Role } from '~/types/api'

/**
 * Per-page role guard. Usage:
 *   definePageMeta({ middleware: 'role', roles: ['admin', 'superadmin'] })
 * Wrong-role access redirects to the user's own dashboard (no error page).
 */
export default defineNuxtRouteMiddleware((to) => {
  const auth = useAuth()
  const role = auth.user.value?.role
  if (!role) {
    return navigateTo('/login', { replace: true })
  }
  const allowed = (to.meta.roles as Role[] | undefined) ?? []
  if (allowed.length > 0 && !allowed.includes(role)) {
    return navigateTo(roleHome(role), { replace: true })
  }
})
