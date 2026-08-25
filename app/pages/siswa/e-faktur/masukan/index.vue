<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type {
  TaxInputBulkCreditResult,
  TaxInputBulkDeleteResult,
  TaxInputBulkUncreditResult,
  TaxInputCreditStatus,
  TaxInputListResponse,
  TaxInputRead,
  TaxInputSummary
} from '~/types/api'
import { creditStatusColor, creditStatusLabel, creditTabs } from '~/utils/faktur'

definePageMeta({ middleware: 'role', roles: ['siswa'] })

const auth = useAuth()
const { apiFetch } = useApi()
const toast = useToast()

const activeCreditStatus = ref<TaxInputCreditStatus>('not_credited')
const page = ref(1)
const pageSize = ref(50)

const filterSellerName = ref('')
const filterInvoiceNumber = ref('')
const filterTransactionCode = ref<string | undefined>(undefined)

const selectedIds = ref(new Set<number>())
const confirmDeleteOpen = ref(false)
const busy = ref(false)

const { data: summary, refresh: refreshSummary } = useAsyncData(
  'siswa-faktur-masukan-summary',
  () => apiFetch<TaxInputSummary>('/api/v1/faktur-masukan/summary'),
  { default: () => ({ draft: 0, credited: 0, not_credited: 0, invalid: 0, total: 0 }) }
)

const { data: invoiceList, status: listStatus, refresh: refreshList } = useAsyncData(
  'siswa-faktur-masukan-list',
  () => {
    const query = new URLSearchParams({
      credit_status: activeCreditStatus.value,
      page: String(page.value),
      size: String(pageSize.value)
    })
    if (filterSellerName.value) query.set('seller_name', filterSellerName.value)
    if (filterInvoiceNumber.value) query.set('invoice_number', filterInvoiceNumber.value)
    if (filterTransactionCode.value) query.set('transaction_code', filterTransactionCode.value)
    return apiFetch<TaxInputListResponse>(`/api/v1/faktur-masukan?${query.toString()}`)
  },
  { watch: [activeCreditStatus, page, pageSize, filterSellerName, filterInvoiceNumber, filterTransactionCode] }
)

watch([activeCreditStatus, pageSize, filterSellerName, filterInvoiceNumber, filterTransactionCode], () => {
  page.value = 1
  selectedIds.value = new Set()
})

watch(invoiceList, () => {
  selectedIds.value = new Set()
})

function toggleSelected(id: number) {
  const next = new Set(selectedIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selectedIds.value = next
}

function clearFilters() {
  filterSellerName.value = ''
  filterInvoiceNumber.value = ''
  filterTransactionCode.value = undefined
}

const columns: TableColumn<TaxInputRead>[] = [
  { id: 'select' },
  { accessorKey: 'seller_name', header: 'Nama Penjual' },
  { accessorKey: 'transaction_code', header: 'Kode Transaksi' },
  { accessorKey: 'invoice_number', header: 'Nomor Faktur' },
  { accessorKey: 'invoice_date', header: 'Tanggal Faktur' },
  { accessorKey: 'tax_month', header: 'Masa Pajak' },
  { accessorKey: 'tax_year', header: 'Tahun' },
  { accessorKey: 'credit_status', header: 'Status Kredit' },
  { accessorKey: 'total_dpp', header: 'Harga Jual/DPP (Rp)' },
  { accessorKey: 'total_ppn', header: 'PPN (Rp)' },
  { accessorKey: 'total_ppnbm', header: 'PPnBM (Rp)' },
  { id: 'actions' }
]

async function refreshAll() {
  await Promise.all([refreshList(), refreshSummary()])
}

async function creditSelected() {
  const ids = [...selectedIds.value]
  if (!ids.length) return
  busy.value = true
  try {
    const result = await apiFetch<TaxInputBulkCreditResult>('/api/v1/faktur-masukan/bulk-credit', { method: 'POST', body: { ids } })
    toast.add({
      title: `${result.credited} faktur dikreditkan`,
      description: result.skipped ? `${result.skipped} dilewati: ${result.errors.slice(0, 2).join('; ')}` : 'Masuk ke tab Dikreditkan.',
      color: result.credited ? 'success' : 'warning',
      icon: 'i-lucide-check-circle'
    })
    await refreshAll()
  } catch (error) {
    toast.add({ title: 'Gagal mengkreditkan', description: apiErrorMessage(error), color: 'error', icon: 'i-lucide-circle-alert' })
  } finally { busy.value = false }
}

async function uncreditSelected() {
  const ids = [...selectedIds.value]
  if (!ids.length) return
  busy.value = true
  try {
    const result = await apiFetch<TaxInputBulkUncreditResult>('/api/v1/faktur-masukan/bulk-uncredit', { method: 'POST', body: { ids } })
    toast.add({
      title: `${result.uncredited} batal kredit`,
      description: result.skipped ? `${result.skipped} dilewati: ${result.errors.slice(0, 2).join('; ')}` : 'Kembali ke Belum Dikreditkan.',
      color: result.uncredited ? 'success' : 'warning',
      icon: 'i-lucide-undo-2'
    })
    await refreshAll()
  } catch (error) {
    toast.add({ title: 'Gagal batal kredit', description: apiErrorMessage(error), color: 'error', icon: 'i-lucide-circle-alert' })
  } finally { busy.value = false }
}

async function deleteSelected() {
  const ids = [...selectedIds.value]
  if (!ids.length) return
  busy.value = true
  try {
    const result = await apiFetch<TaxInputBulkDeleteResult>('/api/v1/faktur-masukan/bulk-delete', { method: 'POST', body: { ids } })
    toast.add({
      title: `${result.deleted} dokumen dihapus`,
      description: result.skipped ? `${result.skipped} dilewati: ${result.errors.slice(0, 2).join('; ')}` : undefined,
      color: result.deleted ? 'success' : 'warning',
      icon: 'i-lucide-trash-2'
    })
  } catch (error) {
    toast.add({ title: 'Gagal menghapus dokumen', description: apiErrorMessage(error), color: 'error', icon: 'i-lucide-circle-alert' })
  } finally {
    busy.value = false
    confirmDeleteOpen.value = false
    await refreshAll()
  }
}

async function creditOne(invoice: TaxInputRead) {
  try {
    await apiFetch(`/api/v1/faktur-masukan/${invoice.id}/credit`, { method: 'POST' })
    toast.add({ title: 'Faktur dikreditkan', description: `Kredit untuk ${invoice.seller_name}.`, color: 'success', icon: 'i-lucide-check-circle' })
    await refreshAll()
  } catch (error) {
    toast.add({ title: 'Gagal kredit', description: apiErrorMessage(error), color: 'error', icon: 'i-lucide-circle-alert' })
  }
}

async function uncreditOne(invoice: TaxInputRead) {
  try {
    await apiFetch(`/api/v1/faktur-masukan/${invoice.id}/uncredit`, { method: 'POST' })
    toast.add({ title: 'Batal kredit', color: 'success', icon: 'i-lucide-undo-2' })
    await refreshAll()
  } catch (error) {
    toast.add({ title: 'Gagal batal kredit', description: apiErrorMessage(error), color: 'error', icon: 'i-lucide-circle-alert' })
  }
}

const canActOnSelection = computed(() => selectedIds.value.size > 0)
</script>

<template>
  <div class="bupot-page">
    <div class="bupot-breadcrumb">
      <NuxtLink to="/siswa">Beranda</NuxtLink>
      <UIcon name="i-lucide-chevron-right" class="size-3.5" />
      <NuxtLink to="/siswa/e-faktur">e-Faktur</NuxtLink>
      <UIcon name="i-lucide-chevron-right" class="size-3.5" />
      <strong>Pajak Masukan</strong>
    </div>

    <div class="bupot-shell">
      <aside class="bupot-side">
        <div class="bupot-side__identity">
          <strong>{{ auth.user.value?.tenant_id ?? '0000000000000000' }}</strong>
          <span>{{ auth.user.value?.full_name }}</span>
        </div>
        <div class="bupot-side__title">Faktur Pajak Masukan</div>
        <nav class="bupot-side__tabs" aria-label="Status kredit">
          <button
            v-for="tab in creditTabs"
            :key="tab.value"
            type="button"
            :class="{ active: activeCreditStatus === tab.value }"
            @click="activeCreditStatus = tab.value"
          >
            <span>{{ tab.label }}</span>
            <UBadge color="neutral" variant="subtle">{{ summary[tab.value === 'credited' ? 'credited' : 'not_credited'] }}</UBadge>
          </button>
        </nav>
      </aside>

      <section class="bupot-main">
        <div class="bupot-main__header"><h1>Pajak Masukan</h1></div>

        <div class="faktur-toolbar">
          <UButton to="/siswa/e-faktur/masukan/create" icon="i-lucide-plus" label="Buat Faktur Masukan" class="bupot-primary-button" />
          <UButton icon="i-lucide-check-circle" label="Kreditkan" class="bupot-primary-button" :loading="busy" :disabled="!canActOnSelection" @click="creditSelected" />
          <UButton icon="i-lucide-undo-2" label="Batal Kredit" color="neutral" variant="soft" :disabled="!canActOnSelection" @click="uncreditSelected" />
          <UButton icon="i-lucide-trash-2" label="Hapus Dokumen" color="error" :disabled="!canActOnSelection" @click="confirmDeleteOpen = true;" />
        </div>

        <div class="bupot-toolbar">
          <UButton icon="i-lucide-refresh-cw" color="info" variant="soft" :loading="listStatus === 'pending'" @click="refreshAll" />
          <UButton icon="i-lucide-file" color="neutral" variant="solid" disabled />
          <UButton icon="i-lucide-file-spreadsheet" color="success" variant="solid" disabled />
          <UButton icon="i-lucide-file-text" color="error" variant="solid" disabled />
          <UButton icon="i-lucide-filter-x" color="neutral" variant="soft" @click="clearFilters" />
        </div>

        <div class="faktur-table__filters">
          <UInput v-model="filterSellerName" placeholder="Nama Penjual" icon="i-lucide-search" size="xs" />
          <UInput v-model="filterInvoiceNumber" placeholder="Nomor Faktur" icon="i-lucide-search" size="xs" />
          <USelect v-model="filterTransactionCode" :items="transactionCodeFilterOptions" placeholder="Pilih Kode Transaksi" size="xs" class="min-w-56" />
        </div>

        <div class="faktur-table">
          <UTable :data="invoiceList?.items ?? []" :columns="columns" :loading="listStatus === 'pending'">
            <template #select-cell="{ row }">
              <UCheckbox :model-value="selectedIds.has(row.original.id)" @update:model-value="toggleSelected(row.original.id)" />
            </template>
            <template #transaction_code-cell="{ row }">
              <UBadge color="neutral" variant="subtle">{{ row.original.transaction_code }}</UBadge>
            </template>
            <template #invoice_number-cell="{ row }">
              <span class="font-medium">{{ formatInvoiceNumber(row.original.invoice_number) }}</span>
            </template>
            <template #invoice_date-cell="{ row }">{{ formatInvoiceDate(row.original.invoice_date) }}</template>
            <template #tax_month-cell="{ row }">{{ monthLabels[row.original.tax_month] }}</template>
            <template #credit_status-cell="{ row }">
              <UBadge :color="creditStatusColor[row.original.credit_status]" variant="subtle">{{ creditStatusLabel[row.original.credit_status] }}</UBadge>
            </template>
            <template #total_dpp-cell="{ row }">Rp {{ formatCurrency(row.original.total_dpp) }}</template>
            <template #total_ppn-cell="{ row }">Rp {{ formatCurrency(row.original.total_ppn) }}</template>
            <template #total_ppnbm-cell="{ row }">Rp {{ formatCurrency(row.original.total_ppnbm) }}</template>
            <template #actions-cell="{ row }">
              <div class="flex justify-end gap-1">
                <UButton v-if="row.original.credit_status === 'not_credited'" icon="i-lucide-check-circle" label="Kreditkan" size="xs" @click="creditOne(row.original)" />
                <UButton v-else icon="i-lucide-undo-2" label="Batal Kredit" size="xs" color="neutral" variant="soft" @click="uncreditOne(row.original)" />
                <UButton v-if="row.original.status === 'draft'" :to="`/siswa/e-faktur/masukan/${row.original.id}`" icon="i-lucide-pencil" size="xs" color="neutral" variant="soft" label="Ubah" />
              </div>
            </template>
            <template #empty><p class="py-8 text-center text-sm text-muted">Tidak ada data yang ditemukan.</p></template>
          </UTable>
        </div>

        <div class="bupot-footer">
          <p>Total: {{ invoiceList?.total ?? 0 }} data</p>
          <div class="flex items-center gap-3">
            <UPagination v-model:page="page" :total="invoiceList?.total ?? 0" :items-per-page="pageSize" />
            <USelect v-model="pageSize" :items="pageSizeOptions" size="xs" class="w-20" />
          </div>
        </div>
      </section>
    </div>

    <UModal v-model:open="confirmDeleteOpen" title="Hapus Dokumen">
      <template #body><p class="text-sm">Hapus {{ selectedIds.size }} faktur draft? Tidak dapat dibatalkan.</p></template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton label="Batal" color="neutral" variant="ghost" @click="confirmDeleteOpen = false;" />
          <UButton label="Hapus" color="error" :loading="busy" @click="deleteSelected" />
        </div>
      </template>
    </UModal>
  </div>
</template>
