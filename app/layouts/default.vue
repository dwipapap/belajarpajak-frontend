<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const auth = useAuth()
const route = useRoute()

const homePath = computed(() => roleHome(auth.user.value?.role))

function modulePath(slug: string) {
  switch (auth.user.value?.role) {
    case 'guru':
      return `/guru/${slug}`
    case 'siswa':
      return `/siswa/${slug}`
    case 'admin':
    case 'superadmin':
      return '/admin'
    default:
      return homePath.value
  }
}

const moduleItems = computed<NavigationMenuItem[]>(() => [
  {
    label: 'Portal Saya',
    icon: 'i-lucide-shield-user',
    to: homePath.value,
    active: route.path === homePath.value
  },
  {
    label: 'e-Faktur',
    icon: 'i-lucide-receipt-text',
    disabled: true
  },
  {
    label: 'eBUPOT',
    icon: 'i-lucide-scroll-text',
    active: route.path.includes('/bp21') || route.path.includes('/bp26'),
    children: [
      { label: 'Bukti Potong Saya', icon: 'i-lucide-file-user', disabled: true },
      { label: 'BPPU', icon: 'i-lucide-files', disabled: true },
      { label: 'BPNR', icon: 'i-lucide-files', disabled: true },
      { label: 'Penyetoran Sendiri', icon: 'i-lucide-wallet-cards', disabled: true },
      { label: 'Pemotongan Secara Digunggung', icon: 'i-lucide-layers-3', disabled: true },
      { label: 'Dokumen yang Dipersamakan dengan Bukti Potong', icon: 'i-lucide-file-check-2', disabled: true },
      { label: 'BP 21 - Bukti Pemotongan Selain Pegawai Tetap', icon: 'i-lucide-file-text', to: modulePath('bp21') },
      { label: 'BP 26 - Bukti Pemotongan Wajib Pajak Luar Negeri', icon: 'i-lucide-globe', to: modulePath('bp26') },
      { label: 'BP A1 - Bukti Pemotongan A1 Masa Pajak Terakhir', icon: 'i-lucide-file-lock-2', disabled: true },
      { label: 'BP A2 - Bukti Pemotongan A2 Masa Pajak Terakhir', icon: 'i-lucide-file-lock-2', disabled: true },
      { label: 'Bukti Pemotongan Bulanan Pegawai Tetap', icon: 'i-lucide-file-stack', disabled: true }
    ]
  },
  {
    label: 'SPT',
    icon: 'i-lucide-clipboard-list',
    children: [
      { label: 'Surat Pemberitahuan (SPT)', icon: 'i-lucide-file-spreadsheet', disabled: true },
      { label: 'Coretax Form', icon: 'i-lucide-clipboard-pen', disabled: true },
      { label: 'Pencatatan', icon: 'i-lucide-book-text', disabled: true },
      { label: 'Dasbor Kompensasi', icon: 'i-lucide-layout-dashboard', disabled: true },
      { label: 'Pengungkapan Ketidakbenaran SPT', icon: 'i-lucide-file-warning', disabled: true }
    ]
  },
  {
    label: 'Pembayaran',
    icon: 'i-lucide-badge-dollar-sign',
    children: [
      { label: 'Permohonan Pemindahbukuan', icon: 'i-lucide-arrow-left-right', disabled: true },
      { label: 'Layanan Mandiri Kode Billing', icon: 'i-lucide-receipt', disabled: true },
      { label: 'Pembuatan Kode Billing atas Tagihan Pajak', icon: 'i-lucide-file-plus-2', disabled: true },
      { label: 'Daftar Kode Billing Belum Dibayar', icon: 'i-lucide-list-checks', disabled: true },
      { label: 'Formulir Restitusi Pajak', icon: 'i-lucide-file-input', disabled: true },
      { label: 'Permohonan Pemberian Imbalan Bunga', icon: 'i-lucide-circle-dollar-sign', disabled: true },
      { label: 'Permohonan PPh DTP atas Penghasilan PDAM', icon: 'i-lucide-landmark', disabled: true }
    ]
  },
  {
    label: 'Buku Besar',
    icon: 'i-lucide-book-open-check',
    disabled: true
  },
  {
    label: 'Layanan WP',
    icon: 'i-lucide-layout-grid',
    children: [
      { label: 'Profil Wajib Pajak', icon: 'i-lucide-id-card', disabled: true },
      { label: 'Permohonan', icon: 'i-lucide-inbox', disabled: true }
    ]
  },
  {
    label: 'Manajemen Akses',
    icon: 'i-lucide-key-round',
    children: [
      { label: 'Role Akses', icon: 'i-lucide-key-round', disabled: true },
      { label: 'Pengguna', icon: 'i-lucide-users', disabled: true }
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
  <div class="app-shell">
    <header class="app-shell__header">
      <div class="app-shell__topbar">
        <div class="app-shell__brand" aria-label="Identitas aplikasi">
          <div class="app-shell__crest" aria-hidden="true">
            <UIcon name="i-lucide-landmark" class="size-5" />
          </div>
          <span class="app-shell__divider" aria-hidden="true" />
          <strong class="app-shell__title"><span>Sistem Pembelajaran Pajak Online</span></strong>
        </div>

        <UInput
          model-value=""
          icon="i-lucide-search"
          placeholder="Cari layanan..."
          readonly
          aria-label="Cari layanan"
          class="app-shell__search"
          :ui="{ base: 'h-10 text-[0.86rem]' }"
        >
          <template #trailing>
            <div class="app-shell__search-kbd" aria-hidden="true">
              <UKbd value="Ctrl" />
              <UKbd value="K" />
            </div>
          </template>
        </UInput>

        <div class="app-shell__actions">
          <UButton
            icon="i-lucide-chevron-left"
            color="neutral"
            variant="ghost"
            aria-label="Kembali"
            class="app-shell__icon-button"
          />
          <UButton
            icon="i-lucide-bell"
            color="neutral"
            variant="ghost"
            aria-label="Notifikasi"
            class="app-shell__icon-button"
          />
          <UButton
            icon="i-lucide-circle"
            label="ID"
            color="neutral"
            variant="ghost"
            trailing-icon="i-lucide-chevron-down"
            class="app-shell__language"
          />
          <UDropdownMenu :items="userMenuItems">
            <UButton
              color="neutral"
              variant="outline"
              trailing-icon="i-lucide-chevron-down"
              class="app-shell__account"
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
            class="app-shell__icon-button"
          />
        </div>
      </div>

      <div class="app-shell__menubar">
        <UNavigationMenu
          :items="moduleItems"
          highlight
          highlight-color="warning"
          class="app-shell__nav"
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

    <main class="app-shell__main">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.app-shell {
  min-height: 100dvh;
  background:
    radial-gradient(circle at 95% 0%, oklch(0.93 0.035 255 / 0.62), transparent 26rem),
    oklch(0.972 0.008 250);
  color: oklch(0.28 0.075 270);
  padding-top: 1rem;
}

.app-shell__header {
  position: sticky;
  z-index: 20;
  top: 0.75rem;
  border: 1px solid oklch(0.88 0.014 255);
  border-radius: 0.55rem;
  background: oklch(0.99 0.004 250 / 0.98);
  box-shadow: 0 0.65rem 1.6rem oklch(0.42 0.03 255 / 0.12);
  margin: 0 1.5rem;
}

.app-shell__topbar {
  display: grid;
  min-height: 4.08rem;
  grid-template-columns: minmax(16rem, 1fr) minmax(16rem, 28rem) minmax(25rem, auto);
  align-items: center;
  gap: clamp(0.9rem, 2vw, 2.5rem);
  border-bottom: 1px solid oklch(0.9 0.013 255);
  padding: 0 1.15rem;
}

.app-shell__brand,
.app-shell__actions {
  display: flex;
  align-items: center;
}

.app-shell__brand {
  gap: 0.6rem;
  min-width: 0;
}

.app-shell__crest {
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

.app-shell__divider {
  width: 1px;
  height: 2.2rem;
  background: oklch(0.82 0.018 258);
}

.app-shell__title {
  font-size: 1.12rem;
  font-weight: 900;
  white-space: nowrap;
}

.app-shell__title span {
  color: oklch(0.31 0.095 270);
}

.app-shell__actions {
  justify-content: end;
  gap: 0.55rem;
  min-width: 0;
}

.app-shell__search {
  width: 100%;
  min-width: 0;
}

.app-shell__search-kbd {
  display: flex;
  gap: 0.25rem;
}

.app-shell__icon-button {
  border-radius: 0.55rem;
}

.app-shell__language {
  border-radius: 0.55rem;
  font-weight: 750;
}

.app-shell__account {
  min-width: 13.7rem;
  justify-content: flex-start;
  border-radius: 0.62rem;
  padding-inline: 0.7rem;
}

.app-shell__account span {
  display: grid;
  min-width: 0;
  text-align: left;
  line-height: 1.05;
}

.app-shell__account small {
  color: oklch(0.45 0.045 260);
  font-size: 0.67rem;
  font-weight: 750;
}

.app-shell__account strong {
  overflow: hidden;
  color: oklch(0.28 0.075 270);
  font-size: 0.78rem;
  font-weight: 850;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.app-shell__menubar {
  padding: 0.42rem 1rem 0.33rem;
}

.app-shell__nav {
  min-width: 0;
}

.app-shell__nav :deep(a),
.app-shell__nav :deep(button) {
  align-items: center;
  color: oklch(0.31 0.095 270);
  line-height: 1;
}

.app-shell__nav :deep(svg) {
  display: block;
  flex-shrink: 0;
  color: oklch(0.31 0.095 270);
}

.app-shell__nav :deep(span) {
  line-height: 1;
}

.app-shell__nav :deep([aria-disabled="true"]),
.app-shell__nav :deep([data-disabled]) {
  opacity: 0.58;
}

.app-shell__nav :deep([role="menuitem"]:hover),
.app-shell__nav :deep(a:hover),
.app-shell__nav :deep(button:hover) {
  color: oklch(0.27 0.095 270);
}

.app-shell__nav :deep([aria-current="page"]),
.app-shell__nav :deep([data-active]),
.app-shell__nav :deep([data-state="open"]) {
  color: oklch(0.22 0.08 270);
}

.app-shell__nav :deep([aria-current="page"]::before),
.app-shell__nav :deep([data-active]::before) {
  background: oklch(0.88 0.15 88);
}

.app-shell__nav :deep([aria-current="page"]::after),
.app-shell__nav :deep([data-active]::after) {
  background: oklch(0.79 0.16 82);
  height: 0.13rem;
}

.app-shell__main {
  min-height: calc(100dvh - 7.2rem);
  padding: 1.25rem 1.5rem 2rem;
}

@media (max-width: 1180px) {
  .app-shell__topbar {
    grid-template-columns: 1fr auto;
    gap: 1rem;
    padding-block: 0.75rem;
  }

  .app-shell__search {
    grid-column: 1 / -1;
    grid-row: 2;
  }

  .app-shell__actions {
    grid-column: 2;
  }
}

@media (max-width: 720px) {
  .app-shell__topbar {
    grid-template-columns: 1fr;
    padding: 0.8rem 1rem;
  }

  .app-shell__header {
    margin: 0 0.75rem;
  }

  .app-shell__brand {
    justify-content: space-between;
  }

  .app-shell__title {
    display: none;
  }

  .app-shell__actions {
    grid-column: 1;
    justify-content: flex-start;
    overflow-x: auto;
    padding-bottom: 0.1rem;
  }

  .app-shell__search {
    grid-column: 1;
    grid-row: 2;
  }

  .app-shell__account {
    min-width: 12rem;
  }

  .app-shell__menubar {
    padding-inline: 0.8rem;
  }

  .app-shell__main {
    padding: 1rem;
  }
}
</style>
