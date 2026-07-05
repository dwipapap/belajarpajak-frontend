<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const auth = useAuth()

const navItems = computed<NavigationMenuItem[]>(() => {
  const role = auth.user.value?.role
  const items: NavigationMenuItem[] = []
  if (role === 'superadmin' || role === 'admin') {
    items.push({ label: 'Dasbor', icon: 'i-lucide-layout-dashboard', to: '/admin' })
  }
  if (role === 'guru') {
    items.push({ label: 'Dasbor', icon: 'i-lucide-layout-dashboard', to: '/guru' })
  }
  if (role === 'siswa') {
    items.push({ label: 'Dasbor', icon: 'i-lucide-layout-dashboard', to: '/siswa' })
  }
  return items
})

const roleLabel = computed(() => {
  switch (auth.user.value?.role) {
    case 'superadmin': return 'Super Admin'
    case 'admin': return 'Admin'
    case 'guru': return 'Guru'
    case 'siswa': return 'Siswa'
    default: return ''
  }
})

async function onLogout() {
  await auth.logout()
}
</script>

<template>
  <div class="flex min-h-dvh">
    <!-- Sidebar -->
    <aside class="hidden w-60 shrink-0 flex-col border-r border-default bg-elevated/25 md:flex">
      <div class="flex h-14 items-center gap-2 border-b border-default px-4">
        <UIcon name="i-lucide-calculator" class="size-6 text-primary" />
        <span class="font-semibold text-default">Simulator Pajak</span>
      </div>
      <div class="flex-1 overflow-y-auto p-3">
        <UNavigationMenu :items="navItems" orientation="vertical" />
      </div>
      <div class="border-t border-default p-3">
        <UButton
          icon="i-lucide-log-out"
          label="Keluar"
          color="neutral"
          variant="ghost"
          block
          @click="onLogout"
        />
      </div>
    </aside>

    <!-- Main column -->
    <div class="flex min-w-0 flex-1 flex-col">
      <!-- Topbar -->
      <header class="flex h-14 items-center justify-between gap-3 border-b border-default px-4">
        <div class="flex items-center gap-2 md:hidden">
          <UIcon name="i-lucide-calculator" class="size-5 text-primary" />
          <span class="font-semibold text-default">Simulator Pajak</span>
        </div>
        <div class="hidden items-center gap-2 md:flex">
          <UBadge v-if="auth.user.value?.tenant_name" color="primary" variant="subtle">
            {{ auth.user.value.tenant_name }}
          </UBadge>
          <UBadge v-else color="neutral" variant="subtle">Semua Institusi</UBadge>
        </div>
        <div class="flex items-center gap-3">
          <div class="text-right">
            <p class="text-sm font-medium text-default">{{ auth.user.value?.full_name }}</p>
            <p class="text-xs text-muted">{{ roleLabel }}</p>
          </div>
          <UButton
            icon="i-lucide-log-out"
            color="neutral"
            variant="ghost"
            class="md:hidden"
            aria-label="Keluar"
            @click="onLogout"
          />
        </div>
      </header>

      <main class="flex-1 overflow-y-auto p-4 md:p-6">
        <slot />
      </main>
    </div>
  </div>
</template>
