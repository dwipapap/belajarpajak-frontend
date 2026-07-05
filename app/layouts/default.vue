<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const auth = useAuth()

const homePath = computed(() => roleHome(auth.user.value?.role))

const bp21Path = computed(() => {
  switch (auth.user.value?.role) {
    case 'guru':
      return '/guru/bp21'
    case 'siswa':
      return '/siswa/bp21'
    case 'admin':
    case 'superadmin':
      return '/admin'
    default:
      return homePath.value
  }
})

const moduleItems = computed<NavigationMenuItem[]>(() => [
  {
    label: 'Portal Saya',
    icon: 'i-lucide-shield-user'
  },
  {
    label: 'e-Faktur',
    icon: 'i-lucide-receipt-text',
    to: homePath.value,
    active: true
  },
  {
    label: 'eBUPOT',
    icon: 'i-lucide-scroll-text',
    children: [
      { label: 'BP 21 - Selain Pegawai Tetap', icon: 'i-lucide-file-text', to: bp21Path.value },
      { label: 'Bupot PPh 23', icon: 'i-lucide-file-check-2' }
    ]
  },
  {
    label: 'SPT',
    icon: 'i-lucide-clipboard-list',
    children: [
      { label: 'Draft SPT', icon: 'i-lucide-files' },
      { label: 'Pelaporan', icon: 'i-lucide-send' }
    ]
  },
  {
    label: 'Pembayaran',
    icon: 'i-lucide-badge-dollar-sign'
  },
  {
    label: 'Buku Besar',
    icon: 'i-lucide-book-open-check'
  },
  {
    label: 'Layanan WP',
    icon: 'i-lucide-layout-grid',
    children: [
      { label: 'Profil Wajib Pajak', icon: 'i-lucide-id-card' },
      { label: 'Permohonan', icon: 'i-lucide-inbox' }
    ]
  },
  {
    label: 'Manajemen Akses',
    icon: 'i-lucide-key-round',
    children: [
      { label: 'Role Akses', icon: 'i-lucide-key-round' },
      { label: 'Pengguna', icon: 'i-lucide-users' }
    ]
  }
])

const roleLabel = computed(() => {
  switch (auth.user.value?.role) {
    case 'superadmin': return 'Super Admin'
    case 'admin': return 'Admin'
    case 'guru': return 'Guru'
    case 'siswa': return 'Siswa'
    default: return ''
  }
})

const displayName = computed(() => auth.user.value?.full_name || 'Pengguna')

const shortDisplayName = computed(() => {
  const name = displayName.value.toUpperCase()
  return name.length > 20 ? `${name.slice(0, 20)}...` : name
})

const userMenuItems = computed(() => [
  [
    {
      label: displayName.value,
      icon: 'i-lucide-user',
      disabled: true
    },
    {
      label: auth.user.value?.tenant_name || 'Semua Institusi',
      icon: 'i-lucide-building-2',
      disabled: true
    }
  ],
  [
    {
      label: 'Keluar',
      icon: 'i-lucide-log-out',
      color: 'error' as const,
      onSelect: onLogout
    }
  ]
])

async function onLogout() {
  await auth.logout()
}
</script>

<template>
  <div class="coretax-shell">
    <header class="coretax-shell__header">
      <div class="coretax-shell__topbar">
        <div class="coretax-shell__brand" aria-label="Identitas aplikasi">
          <div class="coretax-shell__crest" aria-hidden="true">
            <UIcon name="i-lucide-landmark" class="size-5" />
          </div>
          <span class="coretax-shell__divider" aria-hidden="true" />
          <span class="coretax-shell__brand-chip" aria-label="DJP">
            <span aria-hidden="true" />
            djp
          </span>
          <span class="coretax-shell__divider coretax-shell__divider--soft" aria-hidden="true" />
          <strong class="coretax-shell__coretax"><span>CORE</span>TAX</strong>
        </div>

        <UInput
          icon="i-lucide-search"
          placeholder="Cari layanan..."
          class="coretax-shell__search"
          :ui="{ root: 'w-full', base: 'h-10 rounded-lg bg-elevated/60 text-sm' }"
        >
          <template #trailing>
            <div class="coretax-shell__kbd">
              <UKbd value="Ctrl" />
              <UKbd value="K" />
            </div>
          </template>
        </UInput>

        <div class="coretax-shell__actions">
          <UButton
            icon="i-lucide-chevron-left"
            color="neutral"
            variant="ghost"
            aria-label="Kembali"
            class="coretax-shell__icon-button"
          />
          <UButton
            icon="i-lucide-bell"
            color="neutral"
            variant="ghost"
            aria-label="Notifikasi"
            class="coretax-shell__icon-button"
          />
          <button class="coretax-shell__language" type="button" aria-label="Pilih bahasa">
            <span class="coretax-shell__flag" aria-hidden="true" />
            <span>ID</span>
            <UIcon name="i-lucide-chevron-down" class="size-4" />
          </button>

          <UDropdownMenu :items="userMenuItems">
            <UButton
              color="neutral"
              variant="outline"
              trailing-icon="i-lucide-chevron-down"
              class="coretax-shell__account"
            >
              <template #leading>
                <UIcon name="i-lucide-badge-check" class="size-5" />
              </template>
              <span>
                <strong>{{ shortDisplayName }}</strong>
                <small>{{ roleLabel }}</small>
              </span>
            </UButton>
          </UDropdownMenu>

          <UButton
            :to="homePath"
            icon="i-lucide-house"
            color="neutral"
            variant="ghost"
            aria-label="Beranda"
            class="coretax-shell__icon-button"
          />
        </div>
      </div>

      <div class="coretax-shell__menubar">
        <UNavigationMenu
          :items="moduleItems"
          highlight
          highlight-color="warning"
          class="coretax-shell__nav"
          :ui="{
            root: 'w-full',
            list: 'w-full justify-between gap-2',
            item: 'min-w-max',
            link: 'h-11 px-5 text-[0.92rem] font-semibold rounded-lg text-default items-center',
            linkLeadingIcon: 'size-5 text-default self-center',
            linkTrailingIcon: 'size-4 text-default self-center'
          }"
        />
      </div>
    </header>

    <main class="coretax-shell__main">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.coretax-shell {
  min-height: 100dvh;
  background:
    radial-gradient(circle at 95% 0%, oklch(0.93 0.035 255 / 0.62), transparent 26rem),
    oklch(0.972 0.008 250);
  color: oklch(0.28 0.075 270);
  padding-top: 1rem;
}

.coretax-shell__header {
  position: sticky;
  z-index: 20;
  top: 0.75rem;
  overflow: hidden;
  border: 1px solid oklch(0.88 0.014 255);
  border-radius: 0.55rem;
  background: oklch(0.99 0.004 250 / 0.98);
  box-shadow: 0 0.65rem 1.6rem oklch(0.42 0.03 255 / 0.12);
  margin: 0 1.5rem;
}

.coretax-shell__topbar {
  display: grid;
  min-height: 4.08rem;
  grid-template-columns: minmax(16rem, 24rem) minmax(18rem, 29rem) auto;
  align-items: center;
  gap: clamp(1.2rem, 4vw, 7rem);
  border-bottom: 1px solid oklch(0.9 0.013 255);
  padding: 0 1.15rem;
}

.coretax-shell__brand,
.coretax-shell__brand-chip,
.coretax-shell__actions,
.coretax-shell__language {
  display: flex;
  align-items: center;
}

.coretax-shell__brand {
  gap: 0.6rem;
  min-width: 0;
}

.coretax-shell__crest {
  display: grid;
  width: 2rem;
  height: 2rem;
  place-items: center;
  border: 1px solid oklch(0.81 0.05 83);
  border-radius: 0.36rem;
  background: linear-gradient(145deg, oklch(0.46 0.13 257), oklch(0.3 0.1 265));
  color: oklch(0.9 0.14 92);
  box-shadow: inset 0 0 0 2px oklch(0.98 0.005 250 / 0.3);
}

.coretax-shell__divider {
  width: 1px;
  height: 2.2rem;
  background: oklch(0.82 0.018 258);
}

.coretax-shell__divider--soft {
  background: oklch(0.88 0.014 255);
}

.coretax-shell__brand-chip {
  gap: 0.32rem;
  color: oklch(0.31 0.095 270);
  font-size: 1.22rem;
  font-weight: 800;
  letter-spacing: 0;
}

.coretax-shell__brand-chip span {
  width: 1.08rem;
  height: 1.08rem;
  border-radius: 0.25rem;
  background:
    linear-gradient(90deg, oklch(0.88 0.16 88) 0 44%, transparent 44%),
    linear-gradient(180deg, transparent 0 48%, oklch(0.34 0.13 263) 48%),
    oklch(0.95 0.006 250);
  box-shadow: inset 0 0 0 0.13rem oklch(0.97 0.007 250);
}

.coretax-shell__coretax {
  font-size: 1.12rem;
  font-weight: 900;
  white-space: nowrap;
}

.coretax-shell__coretax span {
  color: oklch(0.31 0.095 270);
}

.coretax-shell__coretax {
  color: oklch(0.86 0.16 86);
}

.coretax-shell__search {
  justify-self: center;
  width: min(100%, 28.5rem);
}

.coretax-shell__kbd {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding-right: 0.1rem;
}

.coretax-shell__actions {
  justify-content: end;
  gap: 0.55rem;
  min-width: 0;
}

.coretax-shell__icon-button {
  border-radius: 0.55rem;
}

.coretax-shell__language {
  gap: 0.35rem;
  border: 0;
  background: transparent;
  color: oklch(0.31 0.095 270);
  font-weight: 700;
  padding: 0.35rem;
}

.coretax-shell__flag {
  width: 1.05rem;
  height: 1.05rem;
  border-radius: 999px;
  background: linear-gradient(180deg, oklch(0.61 0.23 28) 0 50%, oklch(0.99 0.004 250) 50%);
  box-shadow: 0 0 0 1px oklch(0.86 0.01 250);
}

.coretax-shell__account {
  min-width: 13.7rem;
  justify-content: flex-start;
  border-radius: 0.62rem;
  padding-inline: 0.7rem;
}

.coretax-shell__account span {
  display: grid;
  min-width: 0;
  text-align: left;
  line-height: 1.05;
}

.coretax-shell__account small {
  color: oklch(0.45 0.045 260);
  font-size: 0.67rem;
  font-weight: 750;
}

.coretax-shell__account strong {
  overflow: hidden;
  color: oklch(0.28 0.075 270);
  font-size: 0.78rem;
  font-weight: 850;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.coretax-shell__menubar {
  overflow-x: hidden;
  overflow-y: hidden;
  padding: 0.42rem 1rem 0.33rem;
}

.coretax-shell__nav {
  min-width: 0;
}

.coretax-shell__nav :deep(a),
.coretax-shell__nav :deep(button) {
  align-items: center;
  color: oklch(0.31 0.095 270);
  line-height: 1;
}

.coretax-shell__nav :deep(svg) {
  display: block;
  flex-shrink: 0;
  color: oklch(0.31 0.095 270);
}

.coretax-shell__nav :deep(span) {
  line-height: 1;
}

.coretax-shell__nav :deep([role="menuitem"]:hover),
.coretax-shell__nav :deep(a:hover),
.coretax-shell__nav :deep(button:hover) {
  color: oklch(0.27 0.095 270);
}

.coretax-shell__nav :deep([aria-current="page"]),
.coretax-shell__nav :deep([data-active]),
.coretax-shell__nav :deep([data-state="open"]) {
  color: oklch(0.22 0.08 270);
}

.coretax-shell__nav :deep([aria-current="page"]::before),
.coretax-shell__nav :deep([data-active]::before) {
  background: oklch(0.88 0.15 88);
}

.coretax-shell__nav :deep([aria-current="page"]::after),
.coretax-shell__nav :deep([data-active]::after) {
  background: oklch(0.79 0.16 82);
  height: 0.13rem;
}

.coretax-shell__main {
  min-height: calc(100dvh - 7.2rem);
  padding: 1.25rem 1.5rem 2rem;
}

@media (max-width: 1180px) {
  .coretax-shell__topbar {
    grid-template-columns: 1fr auto;
    gap: 1rem;
    padding-block: 0.75rem;
  }

  .coretax-shell__search {
    grid-column: 1 / -1;
    grid-row: 2;
    justify-self: stretch;
    width: 100%;
  }

  .coretax-shell__actions {
    grid-column: 2;
  }
}

@media (max-width: 720px) {
  .coretax-shell__topbar {
    grid-template-columns: 1fr;
    padding: 0.8rem 1rem;
  }

  .coretax-shell__header {
    margin: 0 0.75rem;
  }

  .coretax-shell__brand {
    justify-content: space-between;
  }

  .coretax-shell__divider--soft,
  .coretax-shell__coretax {
    display: none;
  }

  .coretax-shell__actions {
    grid-column: 1;
    justify-content: flex-start;
    overflow-x: auto;
    padding-bottom: 0.1rem;
  }

  .coretax-shell__account {
    min-width: 12rem;
  }

  .coretax-shell__menubar {
    padding-inline: 0.8rem;
  }

  .coretax-shell__main {
    padding: 1rem;
  }
}
</style>
