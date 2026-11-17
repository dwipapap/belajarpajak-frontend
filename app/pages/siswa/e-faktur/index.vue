<script setup lang="ts">
import type { TaxInputSummary, TaxInvoiceSummary } from '~/types/api'

definePageMeta({ middleware: 'role', roles: ['siswa'] })

const { apiFetch } = useApi()

const { data: summary, status, refresh } = useAsyncData(
  'siswa-e-faktur-dashboard-summary',
  () => apiFetch<TaxInvoiceSummary>('/api/v1/faktur-keluaran/summary'),
  { default: () => ({ draft: 0, issued: 0, invalid: 0, total: 0 }) }
)

const { data: masukanSummary } = useAsyncData(
  'siswa-e-faktur-masukan-summary',
  () => apiFetch<TaxInputSummary>('/api/v1/faktur-masukan/summary'),
  { default: () => ({ draft: 0, credited: 0, not_credited: 0, invalid: 0, total: 0 }) }
)

/** Entries the simulator does not model yet: empty lists, mirroring the reference menu. */
const placeholders = [
  { title: 'Retur Pajak Keluaran', to: '/siswa/e-faktur/retur-keluaran', icon: 'i-lucide-undo-2' },
  { title: 'Retur Pajak Masukan', to: '/siswa/e-faktur/retur-masukan', icon: 'i-lucide-undo-2' },
  { title: 'Dokumen Lain - Pajak Keluaran', to: '/siswa/e-faktur/dokumen-lain-keluaran', icon: 'i-lucide-files' },
  { title: 'Dokumen Lain - Pajak Masukan', to: '/siswa/e-faktur/dokumen-lain-masukan', icon: 'i-lucide-files' }
]
</script>

<template>
  <div class="bupot-page">
    <div class="bupot-breadcrumb">
      <NuxtLink to="/siswa">Beranda</NuxtLink>
      <UIcon name="i-lucide-chevron-right" class="size-3.5" />
      <strong>e-Faktur</strong>
    </div>

    <div class="bupot-main">
      <div class="bupot-main__header">
        <h1>Dashboard e-Faktur</h1>
        <UButton
          icon="i-lucide-refresh-cw"
          color="info"
          variant="soft"
          :loading="status === 'pending'"
          @click="refresh()"
        />
      </div>

      <div class="p-4">
        <div class="faktur-cards">
          <NuxtLink to="/siswa/e-faktur/keluaran" class="faktur-card faktur-card--active">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-file-output" class="size-5 text-primary" />
              <h2>Pajak Keluaran</h2>
            </div>
            <p>Buat dan terbitkan faktur pajak atas penyerahan barang atau jasa.</p>
            <div class="faktur-card__counts">
              <UBadge
                v-for="tab in statusTabs"
                :key="tab.value"
                :color="statusColor[tab.value]"
                variant="subtle"
              >
                {{ tab.label }}: {{ summary[tab.value] }}
              </UBadge>
              <UBadge color="neutral" variant="subtle">
                Total: {{ summary.total }}
              </UBadge>
            </div>
          </NuxtLink>

          <NuxtLink to="/siswa/e-faktur/masukan" class="faktur-card faktur-card--active">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-file-input" class="size-5 text-primary" />
              <h2>Pajak Masukan</h2>
            </div>
            <p>Faktur pajak yang diterima dari penjual.</p>
            <div class="faktur-card__counts">
              <UBadge
                v-for="tab in creditTabs"
                :key="tab.value"
                :color="creditStatusColor[tab.value]"
                variant="subtle"
              >
                {{ tab.label }}: {{ masukanSummary[tab.value === 'credited' ? 'credited' : 'not_credited'] }}
              </UBadge>
              <UBadge color="neutral" variant="subtle">Total: {{ masukanSummary.total }}</UBadge>
            </div>
          </NuxtLink>

          <NuxtLink
            v-for="item in placeholders"
            :key="item.title"
            :to="item.to"
            class="faktur-card faktur-card--disabled"
          >
            <div class="flex items-center gap-2">
              <UIcon :name="item.icon" class="size-5" />
              <h2>{{ item.title }}</h2>
            </div>
            <p>Fitur ini belum tersedia di simulator.</p>
            <div class="faktur-card__counts">
              <UBadge color="neutral" variant="subtle">Segera hadir</UBadge>
            </div>
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>
