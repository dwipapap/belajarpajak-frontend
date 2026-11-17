// The separate BP23 module was merged into BPPU (PPh 23 = BPPU with a Pasal 23
// object). Keep old bookmarks working.
export default defineNuxtRouteMiddleware((to) => {
  const match = /^\/(siswa|guru)\/bp23(?:\/|$)/.exec(to.path)
  if (match) {
    return navigateTo(`/${match[1]}/bppu`, { replace: true })
  }
})
