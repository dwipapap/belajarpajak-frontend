<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type {
  TaxReturnType,
  TaxReturnListResponse,
  TaxReturnRead,
  TaxReturnStatus,
  TaxReturnSummary
} from '~/types/api'
import { sptStatusColor, sptStatusLabel, sptStatusTabs, sptTypeLabel } from '~/utils/spt'

definePageMeta({ middleware: 'role', roles: ['siswa'] })

const auth = useAuth()
const { apiFetch } = useApi()
const toast = useToast()

const activeStatus = ref<TaxReturnStatus>('draft')
const page = ref(1)
const pageSize = ref(50)
const filterType = ref<TaxReturnType | undefined>(undefined)
const filterYear = ref<number | undefined>(undefined)

const { data: summary, refresh: refreshSummary } = useAsyncData(
  'siswa-spt-summary',
  () => apiFetch<TaxReturnSummary>('/api/v1/spt/summary'),
  { default: () => ({ draft: 0, awaiting_payment: 0, reported: 0, total: 0 }) }
)

const { data: sptList, status: listStatus, refresh: refreshList } = useAsyncData(
  'siswa-spt-list',
  () => {
    const query = new URLSearchParams({
      status: activeStatus.value,
      page: String(page.value),
      size: String(pageSize.value)
    })
    if (filterType.value) query.set('return_type', filterType.value)
    if (filterYear.value) query.set('tax_year', String(filterYear.value))
    return apiFetch<TaxReturnListResponse>(`/api/v1/spt?${query.toString()}`)
  },
  { watch: [activeStatus, page, pageSize, filterType, filterYear] }
)

watch([activeStatus, pageSize, filterType, filterYear], () => {
  page.value = 1
})

async function refreshAll() {
  await Promise.all([refreshList(), refreshSummary()])
}

const yearFilterOptions = [
  { label: 'Semua Tahun', value: undefined as number | undefined },
  ...Array.from({ length: 5 }, (_, index) => {
    const year = new Date().getFullYear() - index
    return { label: String(year), value: year as number | undefined }
  })
]

const typeFilterOptions = [
  { label: 'Semua Jenis', value: undefined as TaxReturnType | undefined },
  { label: 'SPT Masa PPN', value: 'ppn' as TaxReturnType | undefined },
  { label: 'SPT Masa PPh Unifikasi', value: 'pph_unifikasi' as TaxReturnType | undefined },
  { label: 'SPT Masa PPh 21/26', value: 'pph_21_26' as TaxReturnType | undefined },
  { label: 'SPT Masa PPh 21/26 (SIM-TER)', value: 'pph21_26' as TaxReturnType | undefined }
]

const columns: TableColumn<TaxReturnRead>[] = [
  { accessorKey: 'return_type', header: 'Jenis Pajak' },
  { accessorKey: 'tax_month', header: 'Masa Pajak' },
  { accessorKey: 'tax_year', header: 'Tahun' },
  { accessorKey: 'kind', header: 'Jenis SPT' },
  { accessorKey: 'status', header: 'Status' },
  { id: 'amount', header: 'Jumlah Tagihan (Rp)' },
  { accessorKey: 'submitted_at', header: 'Tanggal Submit SPT' },
  { accessorKey: 'received_at', header: 'Tanggal Penerimaan' },
  { accessorKey: 'bpe_number', header: 'Nomor Bukti Terima' },
  { id: 'actions' }
]

function sptRowLabel(row: TaxReturnRead) {
  const base = sptTypeLabel[row.return_type]
  return row.correction_no > 0 ? `${base} Pembetulan ${row.correction_no}` : base
}

async function downloadBpe(row: TaxReturnRead) {
  try {
    const blob = await apiFetch<Blob>(`/api/v1/spt/${row.id}/bpe`, { responseType: 'blob' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `BPE-${(row.bpe_number ?? String(row.id)).replace('/', '-')}.pdf`
    link.click()
    URL.revokeObjectURL(url)
  } catch (error) {
    toast.add({ title: 'Gagal mengunduh BPE', description: apiErrorMessage(error), color: 'error', icon: 'i-lucide-circle-alert' })
  }
}

async function deleteDraft(row: TaxReturnRead) {
  try {
    await apiFetch(`/api/v1/spt/${row.id}`, { method: 'DELETE' })
    toast.add({ title: 'Konsep SPT dihapus', color: 'success', icon: 'i-lucide-trash-2' })
    await refreshAll()
  } catch (error) {
    toast.add({ title: 'Gagal menghapus', description: apiErrorMessage(error), color: 'error', icon: 'i-lucide-circle-alert' })
  }
}

async function batalSpt(row: TaxReturnRead) {
  try {
    await apiFetch(`/api/v1/spt/${row.id}/batal`, { method: 'POST' })
    toast.add({ title: 'SPT dibatalkan ke konsep', color: 'success', icon: 'i-lucide-undo-2' })
    await refreshAll()
  } catch (error) {
    toast.add({ title: 'Gagal membatalkan SPT', description: apiErrorMessage(error), color: 'error', icon: 'i-lucide-circle-alert' })
  }
}
</script>

<template>
  <div class="bupot-page">
    <div class="bupot-breadcrumb">
      <NuxtLink to="/siswa">Beranda</NuxtLink>
      <UIcon name="i-lucide-chevron-right" class="size-3.5" />
      <strong>Surat Pemberitahuan (SPT)</strong>
    </div>

    <div class="bupot-shell">
      <aside class="bupot-side">
        <div class="bupot-side__identity">
          <strong>{{ auth.user.value?.tenant_id ?? '0000000000000000' }}</strong>
          <span>{{ auth.user.value?.full_name }}</span>
        </div>
        <div class="bupot-side__title">SPT Masa</div>
        <nav class="bupot-side__tabs" aria-label="Status SPT">
          <button
            v-for="tab in sptStatusTabs"
            :key="tab.value"
            type="button"
            :class="{ active: activeStatus === tab.value }"
            @click="activeStatus = tab.value"
          >
            <span>{{ tab.label }}</span>
            <UBadge color="neutral" variant="subtle">{{ summary[tab.value] }}</UBadge>
          </button>
        </nav>
      </aside>

      <section class="bupot-main">
        <div class="bupot-main__header"><h1>SPT Masa</h1></div>
        <p v-if="activeStatus === 'awaiting_payment'" class="mb-3 text-sm text-muted">Gunakan tombol BATAL untuk mengubah status SPT dari MENUNGGU PEMBAYARAN ke KONSEP.</p>

        <div class="faktur-toolbar">
          <UButton to="/siswa/spt/create" icon="i-lucide-plus" label="Buat Konsep SPT" class="bupot-primary-button" />
        </div>

        <div class="bupot-toolbar">
          <UButton icon="i-lucide-refresh-cw" color="info" variant="soft" :loading="listStatus === 'pending'" @click="refreshAll" />
          <UButton icon="i-lucide-filter-x" color="neutral" variant="soft" @click="filterType = undefined; filterYear = undefined" />
        </div>

        <div class="faktur-table__filters">
          <USelect v-model="filterType" :items="typeFilterOptions" placeholder="Semua Jenis" size="xs" class="min-w-56" />
          <USelect v-model="filterYear" :items="yearFilterOptions" placeholder="Semua Tahun" size="xs" class="min-w-36" />
        </div>

        <div class="faktur-table table-sticky-actions" tabindex="0" role="region" aria-label="Tabel SPT, geser ke kanan untuk melihat semua kolom">
          <UTable :data="sptList?.items ?? []" :columns="columns" :loading="listStatus === 'pending'">
            <template #return_type-cell="{ row }">{{ sptRowLabel(row.original) }}</template>
            <template #tax_month-cell="{ row }">{{ monthLabels[row.original.tax_month] }}</template>
            <template #kind-cell="{ row }">
              <UBadge color="neutral" variant="subtle">{{ row.original.kind === 'pembetulan' ? `Pembetulan ${row.original.correction_no}` : 'Normal' }}</UBadge>
            </template>
            <template #status-cell="{ row }">
              <UBadge :color="sptStatusColor[row.original.status]" variant="subtle">{{ sptStatusLabel[row.original.status] }}</UBadge>
            </template>
            <template #amount-cell="{ row }">Rp {{ formatCurrency(row.original.amount_due) }}</template>
            <template #submitted_at-cell="{ row }">
              <span v-if="row.original.submitted_at">{{ new Date(row.original.submitted_at).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }) }}</span>
              <span v-else>—</span>
            </template>
            <template #received_at-cell="{ row }">
              <span v-if="row.original.received_at">{{ new Date(row.original.received_at).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }) }}</span>
              <span v-else>—</span>
            </template>
            <template #bpe_number-cell="{ row }">
              <span v-if="row.original.bpe_number" class="font-mono text-xs">{{ row.original.bpe_number }}</span>
              <span v-else>—</span>
            </template>
            <template #actions-cell="{ row }">
              <div class="flex justify-end gap-1">
                <UButton :to="`/siswa/spt/${row.original.id}`" icon="i-lucide-eye" size="xs" label="Buka" />
                <UButton
                  v-if="row.original.status === 'reported'"
                  icon="i-lucide-file-down"
                  size="xs"
                  variant="soft"
                  label="BPE"
                  @click="downloadBpe(row.original)"
                />
                <UButton
                  v-if="row.original.status === 'draft'"
                  icon="i-lucide-trash-2"
                  size="xs"
                  color="error"
                  variant="soft"
                  label="Hapus"
                  @click="deleteDraft(row.original)"
                />
                <UButton
                  v-if="row.original.status === 'awaiting_payment'"
                  icon="i-lucide-undo-2"
                  size="xs"
                  color="neutral"
                  variant="soft"
                  label="Batal"
                  title="Kembalikan SPT ke konsep"
                  @click="batalSpt(row.original)"
                />
              </div>
            </template>
            <template #empty><p class="py-8 text-center text-sm text-muted">Tidak ada data yang ditemukan.</p></template>
          </UTable>
        </div>

        <div class="bupot-footer">
          <p>Total: {{ sptList?.total ?? 0 }} data</p>
          <div class="flex items-center gap-3">
            <UPagination v-model:page="page" :total="sptList?.total ?? 0" :items-per-page="pageSize" />
            <USelect v-model="pageSize" :items="pageSizeOptions" size="xs" class="w-20" />
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
