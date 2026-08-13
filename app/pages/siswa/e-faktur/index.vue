<script setup lang="ts">
import type { TaxInvoiceSummary } from '~/types/api'

definePageMeta({ middleware: 'role', roles: ['siswa'] })

const { apiFetch } = useApi()

const { data: summary, status, refresh } = useAsyncData(
  'siswa-e-faktur-dashboard-summary',
  () => apiFetch<TaxInvoiceSummary>('/api/v1/faktur-keluaran/summary'),
  { default: () => ({ draft: 0, issued: 0, invalid: 0, total: 0 }) }
)

/** Mirrors the reference portal's e-Faktur menu; only Pajak Keluaran is live so far. */
const placeholders = [
  {
    title: 'Pajak Masukan',
    description: 'Faktur pajak yang diterima dari penjual.',
    icon: 'i-lucide-file-input'
  },
  {
    title: 'Retur',
    description: 'Nota retur dan nota pembatalan.',
    icon: 'i-lucide-undo-2'
  },
  {
    title: 'Dokumen Lain',
    description: 'Dokumen yang dipersamakan dengan faktur pajak.',
    icon: 'i-lucide-files'
  },
  {
    title: 'Prepopulated',
    description: 'Data faktur yang tersedia otomatis dari sistem.',
    icon: 'i-lucide-database'
  }
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

          <div
            v-for="item in placeholders"
            :key="item.title"
            class="faktur-card faktur-card--disabled"
          >
            <div class="flex items-center gap-2">
              <UIcon :name="item.icon" class="size-5" />
              <h2>{{ item.title }}</h2>
            </div>
            <p>{{ item.description }}</p>
            <div class="faktur-card__counts">
              <UBadge color="neutral" variant="subtle">Segera hadir</UBadge>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
