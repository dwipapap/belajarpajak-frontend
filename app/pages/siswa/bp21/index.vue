<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { Bp21ListResponse, Bp21Read, Bp21Status, Bp21Summary } from '~/types/api'

definePageMeta({ middleware: 'role', roles: ['siswa'] })

const auth = useAuth()
const { apiFetch } = useApi()
const toast = useToast()

const activeStatus = ref<Bp21Status>('draft')
const page = ref(1)
const pageSize = 10

const statusTabs: { label: string, value: Bp21Status }[] = [
  { label: 'Belum Terbit', value: 'draft' },
  { label: 'Telah Terbit', value: 'issued' },
  { label: 'Tidak Valid', value: 'invalid' }
]

const monthLabels = [
  '',
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember'
]

const { data: summary, refresh: refreshSummary } = useAsyncData(
  'siswa-bp21-summary',
  () => apiFetch<Bp21Summary>('/api/v1/bp21/summary'),
  { default: () => ({ draft: 0, issued: 0, invalid: 0, total: 0 }) }
)

const { data: bp21List, status: listStatus, refresh: refreshList } = useAsyncData(
  'siswa-bp21-list',
  () => {
    const query = new URLSearchParams({
      status: activeStatus.value,
      page: String(page.value),
      size: String(pageSize)
    })
    return apiFetch<Bp21ListResponse>(`/api/v1/bp21?${query.toString()}`)
  },
  { watch: [activeStatus, page] }
)

watch(activeStatus, () => {
  page.value = 1
})

const columns: TableColumn<Bp21Read>[] = [
  { accessorKey: 'tax_month', header: 'Masa Pajak' },
  { accessorKey: 'withholding_number', header: 'Nomor Pemotongan' },
  { accessorKey: 'status', header: 'Status' },
  { accessorKey: 'recipient_identity_number', header: 'Nomor Identitas WP' },
  { accessorKey: 'recipient_name', header: 'Nama' },
  { accessorKey: 'tax_object_code', header: 'Kode Objek Pajak' },
  { accessorKey: 'dpp', header: 'DPP (Rp)' },
  { accessorKey: 'income_tax', header: 'PPh (Rp)' },
  { id: 'actions' }
]

const statusLabel = {
  draft: 'Belum Terbit',
  issued: 'Telah Terbit',
  invalid: 'Tidak Valid'
} satisfies Record<Bp21Status, string>

const statusColor = {
  draft: 'warning',
  issued: 'success',
  invalid: 'error'
} as const satisfies Record<Bp21Status, 'warning' | 'success' | 'error'>

function formatCurrency(value: number) {
  return new Intl.NumberFormat('id-ID').format(value)
}

function formatPeriod(row: Bp21Read) {
  return `${monthLabels[row.tax_month]} ${row.tax_year}`
}

async function issueSlip(slip: Bp21Read) {
  try {
    await apiFetch<Bp21Read>(`/api/v1/bp21/${slip.id}/issue`, { method: 'POST' })
    toast.add({
      title: 'BP21 diterbitkan',
      description: `Nomor pemotongan dibuat untuk ${slip.recipient_name}.`,
      color: 'success',
      icon: 'i-lucide-check-circle'
    })
    await Promise.all([refreshList(), refreshSummary()])
  } catch (error) {
    toast.add({
      title: 'Gagal menerbitkan BP21',
      description: apiErrorMessage(error),
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
  }
}

async function refreshAll() {
  await Promise.all([refreshList(), refreshSummary()])
}
</script>

<template>
  <div class="bp21-page">
    <div class="bp21-breadcrumb">
      <NuxtLink to="/siswa">Beranda</NuxtLink>
      <UIcon name="i-lucide-chevron-right" class="size-3.5" />
      <span>eBupot</span>
      <UIcon name="i-lucide-chevron-right" class="size-3.5" />
      <strong>BP 21 - Bukti Pemotongan Selain Pegawai Tetap</strong>
    </div>

    <div class="bp21-shell">
      <aside class="bp21-side">
        <div class="bp21-side__identity">
          <strong>{{ auth.user.value?.tenant_id ?? '0000000000000000' }}</strong>
          <span>{{ auth.user.value?.full_name }}</span>
        </div>
        <div class="bp21-side__title">
          BP 21 - Bukti Pemotongan Selain Pegawai Tetap
        </div>
        <nav class="bp21-side__tabs" aria-label="Status BP21">
          <button
            v-for="tab in statusTabs"
            :key="tab.value"
            type="button"
            :class="{ active: activeStatus === tab.value }"
            @click="activeStatus = tab.value"
          >
            <span>{{ tab.label }}</span>
            <UBadge color="neutral" variant="subtle">
              {{ summary[tab.value] }}
            </UBadge>
          </button>
        </nav>
      </aside>

      <section class="bp21-main">
        <div class="bp21-main__header">
          <h1>EBUPOT BP21 {{ activeStatus === 'draft' ? 'NOT ISSUED' : statusLabel[activeStatus].toUpperCase() }}</h1>
          <div class="bp21-actions">
            <UButton
              to="/siswa/bp21/create"
              icon="i-lucide-plus"
              label="Create eBupot BP21"
              class="bp21-primary-button"
            />
            <UButton icon="i-lucide-trash-2" label="Hapus" color="neutral" disabled />
            <UButton icon="i-lucide-send" label="Terbitkan" color="neutral" disabled />
            <UButton icon="i-lucide-refresh-cw" color="neutral" variant="soft" @click="refreshAll" />
          </div>
        </div>

        <div class="bp21-toolbar">
          <UButton icon="i-lucide-refresh-cw" color="info" variant="soft" @click="refreshAll" />
          <UButton icon="i-lucide-file" color="neutral" variant="solid" disabled />
          <UButton icon="i-lucide-file-spreadsheet" color="success" variant="solid" disabled />
          <UButton icon="i-lucide-file-text" color="error" variant="solid" disabled />
          <UButton icon="i-lucide-filter-x" color="neutral" variant="soft" disabled />
        </div>

        <div class="bp21-table">
          <UTable
            :data="bp21List?.items ?? []"
            :columns="columns"
            :loading="listStatus === 'pending'"
          >
            <template #tax_month-cell="{ row }">
              <span class="font-medium">{{ formatPeriod(row.original) }}</span>
            </template>

            <template #withholding_number-cell="{ row }">
              <span>{{ row.original.withholding_number || '-' }}</span>
            </template>

            <template #status-cell="{ row }">
              <UBadge :color="statusColor[row.original.status]" variant="subtle">
                {{ statusLabel[row.original.status] }}
              </UBadge>
            </template>

            <template #dpp-cell="{ row }">
              Rp {{ formatCurrency(row.original.dpp) }}
            </template>

            <template #income_tax-cell="{ row }">
              Rp {{ formatCurrency(row.original.income_tax) }}
            </template>

            <template #actions-cell="{ row }">
              <div class="flex justify-end gap-1">
                <UButton
                  v-if="row.original.status === 'draft'"
                  icon="i-lucide-send"
                  label="Terbitkan"
                  size="xs"
                  @click="issueSlip(row.original)"
                />
                <UBadge
                  v-else-if="row.original.score !== null"
                  color="success"
                  variant="subtle"
                >
                  Nilai {{ row.original.score }}
                </UBadge>
              </div>
            </template>

            <template #empty>
              <p class="py-8 text-center text-sm text-muted">
                Tidak ada data yang ditemukan.
              </p>
            </template>
          </UTable>
        </div>

        <div class="bp21-footer">
          <p>Total: {{ bp21List?.total ?? 0 }} data</p>
          <UPagination
            v-model:page="page"
            :total="bp21List?.total ?? 0"
            :items-per-page="pageSize"
          />
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.bp21-page {
  display: grid;
  gap: 1rem;
}

.bp21-breadcrumb {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  color: oklch(0.39 0.05 265);
  font-size: 0.78rem;
}

.bp21-breadcrumb a {
  color: oklch(0.42 0.065 265);
  text-decoration: none;
}

.bp21-breadcrumb strong {
  color: oklch(0.27 0.075 270);
}

.bp21-shell {
  display: grid;
  grid-template-columns: minmax(15rem, 18.75rem) minmax(0, 1fr);
  gap: 1rem;
}

.bp21-side,
.bp21-main {
  border: 1px solid oklch(0.89 0.014 255);
  border-radius: 0.35rem;
  background: oklch(0.99 0.004 250);
}

.bp21-side {
  overflow: hidden;
  align-self: start;
}

.bp21-side__identity {
  display: grid;
  gap: 0.2rem;
  background: oklch(0.28 0.09 270);
  color: oklch(0.98 0.005 250);
  padding: 1rem;
}

.bp21-side__identity strong {
  font-size: 1.35rem;
  line-height: 1;
}

.bp21-side__identity span {
  font-weight: 650;
}

.bp21-side__title {
  min-height: 5.8rem;
  color: oklch(0.26 0.055 270);
  font-weight: 750;
  padding: 0.95rem 1rem;
}

.bp21-side__tabs {
  display: grid;
  border-top: 1px solid oklch(0.91 0.012 255);
}

.bp21-side__tabs button {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 0;
  border-bottom: 1px solid oklch(0.91 0.012 255);
  background: transparent;
  color: oklch(0.39 0.04 265);
  font-weight: 650;
  padding: 0.75rem 1rem;
  text-align: left;
}

.bp21-side__tabs button.active {
  background: oklch(0.93 0.025 210);
  color: oklch(0.28 0.08 270);
}

.bp21-main {
  overflow: hidden;
}

.bp21-main__header {
  display: flex;
  min-height: 7.2rem;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border-bottom: 1px solid oklch(0.9 0.013 255);
  padding: 1rem;
}

.bp21-main__header h1 {
  color: oklch(0.26 0.02 265);
  font-size: 1.35rem;
  font-weight: 800;
}

.bp21-actions,
.bp21-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.45rem;
}

.bp21-primary-button {
  background: oklch(0.28 0.09 270);
  color: oklch(0.98 0.005 250);
}

.bp21-toolbar {
  padding: 1rem 1rem 0.35rem;
}

.bp21-table {
  overflow-x: auto;
  padding-inline: 1rem;
}

.bp21-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid oklch(0.91 0.012 255);
  color: oklch(0.45 0.035 260);
  font-size: 0.85rem;
  padding: 0.9rem 1rem;
}

@media (max-width: 980px) {
  .bp21-shell {
    grid-template-columns: 1fr;
  }

  .bp21-main__header {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
