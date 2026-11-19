<script setup lang="ts">
import type { TenantOverview } from '~/types/api'

/** Admin: overview of the admin's own institution (period, quota meters, active classes). */
const { apiFetch } = useApi()

const { data: tenant, status, error, refresh } = useAsyncData(
  'admin-tenant-overview',
  () => apiFetch<TenantOverview>('/api/v1/dashboard/tenant')
)

const typeLabel: Record<string, string> = {
  smk: 'SMK',
  kampus: 'Kampus',
  lembaga: 'Lembaga Pelatihan',
  pt: 'PT / Perusahaan'
}

const loading = computed(() => status.value === 'pending' && !tenant.value)

const periodState = computed(() => {
  const t = tenant.value
  if (!t || t.days_remaining === null) return { color: 'neutral' as const, label: 'Tanpa batas waktu' }
  if (t.expired) return { color: 'error' as const, label: 'Masa berlaku habis' }
  if (t.expired_soon) return { color: 'warning' as const, label: `Sisa ${t.days_remaining} hari` }
  return { color: 'success' as const, label: `Sisa ${t.days_remaining} hari` }
})
</script>

<template>
  <section class="dash-panel" aria-labelledby="admin-tenant-title">
    <div class="dash-panel__head">
      <h2 id="admin-tenant-title">Ringkasan Institusi</h2>
      <div v-if="tenant" class="flex items-center gap-2">
        <UBadge color="neutral" variant="subtle">{{ typeLabel[tenant.type] ?? tenant.type }}</UBadge>
        <UBadge :color="tenant.is_active ? 'success' : 'error'" variant="subtle">{{ tenant.is_active ? 'Aktif' : 'Nonaktif' }}</UBadge>
      </div>
    </div>

    <div v-if="loading" class="dash-panel__body grid gap-4 md:grid-cols-3">
      <USkeleton v-for="n in 3" :key="n" class="h-20 w-full" />
    </div>

    <div v-else-if="error" class="dash-panel__body">
      <UAlert
        color="error"
        variant="subtle"
        icon="i-lucide-circle-alert"
        title="Ringkasan institusi gagal dimuat."
        :description="apiErrorMessage(error, 'Coba lagi beberapa saat.')"
        :actions="[{ label: 'Coba lagi', color: 'neutral', variant: 'outline', onClick: () => refresh() }]"
      />
    </div>

    <div v-else-if="tenant" class="dash-panel__body grid gap-5 lg:grid-cols-[1.1fr_1.4fr]">
      <div class="grid content-start gap-3">
        <div>
          <p class="text-lg font-extrabold">{{ tenant.name }}</p>
          <p class="text-xs dash-muted">Kode: {{ tenant.slug }}</p>
        </div>
        <dl class="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <div>
            <dt class="dash-muted text-xs font-bold">Periode aktif</dt>
            <dd class="font-semibold">
              <template v-if="tenant.berlaku_sampai">{{ formatDateId(tenant.berlaku_dari) }} - {{ formatDateId(tenant.berlaku_sampai) }}</template>
              <template v-else>Tanpa batas</template>
            </dd>
          </div>
          <div>
            <dt class="dash-muted text-xs font-bold">Sisa masa berlaku</dt>
            <dd><UBadge :color="periodState.color" variant="subtle">{{ periodState.label }}</UBadge></dd>
          </div>
          <div>
            <dt class="dash-muted text-xs font-bold">Kelas aktif</dt>
            <dd class="text-xl font-extrabold">{{ tenant.active_classes }}</dd>
          </div>
        </dl>
        <div class="flex flex-wrap gap-2">
          <UButton to="/admin/kelas" size="sm" color="neutral" variant="outline" icon="i-lucide-book-open" label="Kelola Kelas" />
          <UButton to="/admin/pengaturan" size="sm" color="neutral" variant="outline" icon="i-lucide-sliders-horizontal" label="Pengaturan Instansi" />
          <UButton to="/admin/audit" size="sm" color="neutral" variant="outline" icon="i-lucide-scroll-text" label="Log Audit" />
        </div>
      </div>

      <div class="grid content-start gap-3.5">
        <p class="text-xs font-extrabold uppercase tracking-wide dash-muted">Pemakaian kuota</p>
        <DashQuotaMeter label="Guru" :usage="tenant.guru" />
        <DashQuotaMeter label="Siswa" :usage="tenant.siswa" />
        <DashQuotaMeter label="Kelas" :usage="tenant.kelas" />
      </div>
    </div>
  </section>
</template>
