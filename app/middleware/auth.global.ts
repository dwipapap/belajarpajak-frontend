import { isRouteAllowedForUser } from '~/utils/modules'

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

  // Freshly provisioned accounts must set a personal password before
  // anything else — the only escape hatches are the change screen and logout.
  if (
    auth.user.value?.must_change_password
    && to.path !== '/ganti-password'
  ) {
    return navigateTo('/ganti-password', { replace: true })
  }

  // Guard routes belonging to modules disabled for the user's institution.
  if (!isRouteAllowedForUser(to.path, auth.user.value)) {
    if (import.meta.client) {
      const toast = useToast()
      toast.add({
        title: 'Modul tidak aktif',
        description: 'Modul ini tidak aktif untuk instansi Anda',
        color: 'warning',
      })
    }
    return navigateTo(roleHome(auth.user.value?.role), { replace: true })
  }
})
