<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type {
  StatusFaktur,
  TaxInputBulkCreditResult,
  TaxInputBulkDecisionResult,
  TaxInputBulkDeleteResult,
  TaxInputBulkUncreditResult,
  TaxInputListResponse,
  TaxInputRead
} from '~/types/api'

definePageMeta({ middleware: 'role', roles: ['siswa'] })

const auth = useAuth()
const { apiFetch } = useApi()
const toast = useToast()

const now = new Date()
const page = ref(1)
const pageSize = ref(50)

const filterSellerName = ref('')
const filterInvoiceNumber = ref('')
const filterTransactionCode = ref<string | undefined>(undefined)
const filterStatusFaktur = ref<StatusFaktur[]>(defaultStatusFaktur())
const filterTaxMonth = ref<number | undefined>(now.getMonth() + 1)
const filterTaxYear = ref<number | undefined>(now.getFullYear())

const selectedIds = ref(new Set<number>())
const confirmDeleteOpen = ref(false)
const busy = ref(false)

const { data: invoiceList, status: listStatus, refresh: refreshList } = useAsyncData(
  'siswa-faktur-masukan-list',
  () => {
    const query = new URLSearchParams({
      page: String(page.value),
      size: String(pageSize.value)
    })
    if (filterSellerName.value) query.set('seller_name', filterSellerName.value)
    if (filterInvoiceNumber.value) query.set('invoice_number', filterInvoiceNumber.value)
    if (filterTransactionCode.value) query.set('transaction_code', filterTransactionCode.value)
    for (const value of filterStatusFaktur.value) query.append('status_faktur', value)
    if (filterTaxMonth.value) query.set('tax_month', String(filterTaxMonth.value))
    if (filterTaxYear.value) query.set('tax_year', String(filterTaxYear.value))
    return apiFetch<TaxInputListResponse>(`/api/v1/faktur-masukan?${query.toString()}`)
  },
  { watch: [filterStatusFaktur, page, pageSize, filterSellerName, filterInvoiceNumber, filterTransactionCode, filterTaxMonth, filterTaxYear] }
)

watch([filterStatusFaktur, pageSize, filterSellerName, filterInvoiceNumber, filterTransactionCode, filterTaxMonth, filterTaxYear], () => {
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
  filterStatusFaktur.value = defaultStatusFaktur()
  filterTaxMonth.value = now.getMonth() + 1
  filterTaxYear.value = now.getFullYear()
}

// Column order follows the reference list. Columns the simulator has no data
// for show "-". Pengkreditan period = month/year the faktur was credited.
const columns: TableColumn<TaxInputRead>[] = [
  { id: 'select' },
  { accessorKey: 'seller_npwp', header: 'NPWP Penjual' },
  { accessorKey: 'seller_name', header: 'Nama Penjual' },
  { accessorKey: 'invoice_number', header: 'Nomor Faktur Pajak' },
  { accessorKey: 'invoice_date', header: 'Tanggal Faktur Pajak' },
  { accessorKey: 'tax_month', header: 'Masa Pajak' },
  { accessorKey: 'tax_year', header: 'Tahun' },
  { id: 'credit_month', header: 'Masa Pajak Pengkreditan' },
  { id: 'credit_year', header: 'Tahun Pajak Pengkreditan' },
  { accessorKey: 'status_faktur', header: 'Status Faktur' },
  { accessorKey: 'total_dpp', header: 'Harga Jual/Penggantian/DPP' },
  { accessorKey: 'total_dpp_other', header: 'DPP Nilai Lain/DPP' },
  { accessorKey: 'total_ppn', header: 'PPN' },
  { accessorKey: 'total_ppnbm', header: 'PPnBM' },
  { id: 'recorder', header: 'Perekam' },
  { accessorKey: 'reference', header: 'Referensi' },
  { id: 'sp2d', header: 'Nomor SP2D' },
  { id: 'valid', header: 'Valid' },
  { id: 'reported', header: 'Dilaporkan' },
  { id: 'reported_by_seller', header: 'Dilaporkan oleh Penjual' },
  { id: 'actions' }
]

function creditPeriod(invoice: TaxInputRead) {
  if (invoice.credit_status !== 'credited' || !invoice.credited_at) return null
  const date = new Date(invoice.credited_at)
  return { month: date.getMonth() + 1, year: date.getFullYear() }
}

function validLabel(invoice: TaxInputRead) {
  if (invoice.status === 'draft') return '-'
  return invoice.status === 'issued' ? 'Ya' : 'Tidak'
}

function reportedLabel(invoice: TaxInputRead) {
  if (invoice.status === 'draft') return '-'
  return invoice.spt_flag ? 'Ya' : 'Tidak'
}

async function refreshAll() {
  await refreshList()
}

async function creditSelected() {
  const ids = [...selectedIds.value]
  if (!ids.length) return
  busy.value = true
  try {
    const result = await apiFetch<TaxInputBulkCreditResult>('/api/v1/faktur-masukan/bulk-credit', { method: 'POST', body: { ids } })
    toast.add({
      title: `${result.credited} faktur dikreditkan`,
      description: result.skipped ? `${result.skipped} dilewati: ${result.errors.slice(0, 2).join('; ')}` : 'Status faktur menjadi CREDITED.',
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
      description: result.skipped ? `${result.skipped} dilewati: ${result.errors.slice(0, 2).join('; ')}` : 'Status faktur kembali APPROVED.',
      color: result.uncredited ? 'success' : 'warning',
      icon: 'i-lucide-undo-2'
    })
    await refreshAll()
  } catch (error) {
    toast.add({ title: 'Gagal batal kredit', description: apiErrorMessage(error), color: 'error', icon: 'i-lucide-circle-alert' })
  } finally { busy.value = false }
}

async function tidakKreditkanSelected() {
  const ids = [...selectedIds.value]
  if (!ids.length) return
  busy.value = true
  try {
    const result = await apiFetch<TaxInputBulkDecisionResult>('/api/v1/faktur-masukan/bulk-tidak-kreditkan', { method: 'POST', body: { ids } })
    toast.add({
      title: `${result.updated} faktur tidak dikreditkan`,
      description: result.skipped ? `${result.skipped} dilewati: ${result.errors.slice(0, 2).join('; ')}` : 'Status faktur menjadi UNCREDITED.',
      color: result.updated ? 'success' : 'warning',
      icon: 'i-lucide-circle-slash'
    })
    await refreshAll()
  } catch (error) {
    toast.add({ title: 'Gagal memproses', description: apiErrorMessage(error), color: 'error', icon: 'i-lucide-circle-alert' })
  } finally { busy.value = false }
}

async function kembaliApprovedSelected() {
  const ids = [...selectedIds.value]
  if (!ids.length) return
  busy.value = true
  try {
    const result = await apiFetch<TaxInputBulkDecisionResult>('/api/v1/faktur-masukan/bulk-kembali-approved', { method: 'POST', body: { ids } })
    toast.add({
      title: `${result.updated} faktur kembali Approved`,
      description: result.skipped ? `${result.skipped} dilewati: ${result.errors.slice(0, 2).join('; ')}` : 'Status faktur kembali APPROVED.',
      color: result.updated ? 'success' : 'warning',
      icon: 'i-lucide-undo-2'
    })
    await refreshAll()
  } catch (error) {
    toast.add({ title: 'Gagal memproses', description: apiErrorMessage(error), color: 'error', icon: 'i-lucide-circle-alert' })
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

async function downloadPdf(invoice: { id: number }) {
  try {
    const blob = await apiFetch<Blob>(`/api/v1/faktur-masukan/${invoice.id}/pdf`, { responseType: 'blob' } as never)
    window.open(URL.createObjectURL(blob), '_blank')
  } catch (error) {
    toast.add({
      title: 'Gagal membuka PDF faktur',
      description: apiErrorMessage(error),
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
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

async function tidakKreditkanOne(invoice: TaxInputRead) {
  try {
    await apiFetch(`/api/v1/faktur-masukan/${invoice.id}/tidak-kreditkan`, { method: 'POST' })
    toast.add({ title: 'Faktur tidak dikreditkan', description: `Keputusan untuk faktur ${invoice.seller_name}.`, color: 'success', icon: 'i-lucide-circle-slash' })
    await refreshAll()
  } catch (error) {
    toast.add({ title: 'Gagal memproses', description: apiErrorMessage(error), color: 'error', icon: 'i-lucide-circle-alert' })
  }
}

async function kembaliApprovedOne(invoice: TaxInputRead) {
  try {
    await apiFetch(`/api/v1/faktur-masukan/${invoice.id}/kembali-approved`, { method: 'POST' })
    toast.add({ title: 'Kembali ke status Approved', color: 'success', icon: 'i-lucide-undo-2' })
    await refreshAll()
  } catch (error) {
    toast.add({ title: 'Gagal memproses', description: apiErrorMessage(error), color: 'error', icon: 'i-lucide-circle-alert' })
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
      <section class="bupot-main">
        <div class="bupot-main__header"><h1>Pajak Masukan</h1></div>

        <div class="faktur-toolbar">
          <UButton icon="i-lucide-check-circle" label="Kreditkan Faktur" class="bupot-primary-button" :loading="busy" :disabled="!canActOnSelection" @click="creditSelected" />
          <UButton icon="i-lucide-circle-slash" label="Tidak Kreditkan Faktur" class="bupot-primary-button" :loading="busy" :disabled="!canActOnSelection" @click="tidakKreditkanSelected" />
          <UButton icon="i-lucide-undo-2" label="Kembali ke status Approved" class="bupot-primary-button" :loading="busy" :disabled="!canActOnSelection" @click="kembaliApprovedSelected" />
          <FakturListMenus
            api-base="/api/v1/faktur-masukan"
            filename="faktur_masukan_export.csv"
            :tax-month="filterTaxMonth"
            :tax-year="filterTaxYear"
          />
          <UButton icon="i-lucide-undo-2" label="Batal Kredit" color="neutral" variant="soft" :disabled="!canActOnSelection" @click="uncreditSelected" />
          <UButton icon="i-lucide-trash-2" label="Hapus Dokumen" color="error" :disabled="!canActOnSelection" @click="confirmDeleteOpen = true;" />
        </div>

        <FakturTableIcons
          api-base="/api/v1/faktur-masukan"
          filename="faktur_masukan_export.csv"
          :tax-month="filterTaxMonth"
          :tax-year="filterTaxYear"
          :loading="listStatus === 'pending'"
          @refresh="refreshAll"
          @reset="clearFilters"
        />

        <div class="faktur-table__filters">
          <UInput v-model="filterSellerName" placeholder="Nama Penjual" icon="i-lucide-search" size="xs" />
          <UInput v-model="filterInvoiceNumber" placeholder="Nomor Faktur" icon="i-lucide-search" size="xs" />
          <USelectMenu v-model="filterStatusFaktur" :items="statusFakturOptions" value-key="value" multiple placeholder="Status Faktur" size="xs" class="min-w-64" />
          <USelect v-model="filterTransactionCode" :items="transactionCodeFilterOptions" placeholder="Pilih Kode Transaksi" size="xs" class="min-w-56" />
          <USelect v-model="filterTaxMonth" :items="monthFilterOptions" placeholder="Masa Pajak" size="xs" class="min-w-40" />
          <UInput v-model="filterTaxYear" type="number" placeholder="Tahun" size="xs" class="w-28" />
        </div>

        <div class="faktur-table">
          <UTable :data="invoiceList?.items ?? []" :columns="columns" :loading="listStatus === 'pending'">
            <template #select-cell="{ row }">
              <UCheckbox :model-value="selectedIds.has(row.original.id)" @update:model-value="toggleSelected(row.original.id)" />
            </template>
            <template #invoice_number-cell="{ row }">
              <span class="font-medium">{{ formatInvoiceNumber(row.original.invoice_number) }}</span>
            </template>
            <template #invoice_date-cell="{ row }">{{ formatInvoiceDate(row.original.invoice_date) }}</template>
            <template #tax_month-cell="{ row }">{{ monthLabels[row.original.tax_month] }}</template>
            <template #credit_month-cell="{ row }">{{ creditPeriod(row.original) ? monthLabels[creditPeriod(row.original)!.month] : '-' }}</template>
            <template #credit_year-cell="{ row }">{{ creditPeriod(row.original)?.year ?? '-' }}</template>
            <template #status_faktur-cell="{ row }">
              <UBadge :color="statusFakturColor[row.original.status_faktur]" variant="subtle">{{ row.original.status_faktur }}</UBadge>
            </template>
            <template #total_dpp-cell="{ row }">{{ formatCurrency(row.original.total_dpp) }}</template>
            <template #total_dpp_other-cell="{ row }">{{ formatCurrency(row.original.total_dpp_other) }}</template>
            <template #total_ppn-cell="{ row }">{{ formatCurrency(row.original.total_ppn) }}</template>
            <template #total_ppnbm-cell="{ row }">{{ formatCurrency(row.original.total_ppnbm) }}</template>
            <template #reference-cell="{ row }">{{ dashIfEmpty(row.original.reference) }}</template>
            <template #seller_npwp-cell="{ row }">{{ dashIfEmpty(row.original.seller_npwp) }}</template>
            <!-- Metode Input: "Prepopulated" for copies made when a classmate issues a faktur to us. -->
            <template #recorder-cell="{ row }">{{ taxInputOriginLabel[row.original.origin] }}</template>
            <template #sp2d-cell>-</template>
            <template #valid-cell="{ row }">{{ validLabel(row.original) }}</template>
            <template #reported-cell="{ row }">{{ reportedLabel(row.original) }}</template>
            <template #reported_by_seller-cell>-</template>
            <template #actions-cell="{ row }">
              <div class="flex justify-end gap-1">
                <template v-if="row.original.credit_status === 'not_credited'">
                  <UButton icon="i-lucide-check-circle" label="Kreditkan" size="xs" @click="creditOne(row.original)" />
                  <UButton icon="i-lucide-circle-slash" label="Tidak Kreditkan" size="xs" color="neutral" variant="soft" @click="tidakKreditkanOne(row.original)" />
                </template>
                <template v-else-if="row.original.credit_status === 'uncredited'">
                  <UButton icon="i-lucide-check-circle" label="Kreditkan" size="xs" @click="creditOne(row.original)" />
                  <UButton icon="i-lucide-undo-2" label="Kembali Approved" size="xs" color="neutral" variant="soft" @click="kembaliApprovedOne(row.original)" />
                </template>
                <UButton v-else icon="i-lucide-undo-2" label="Batal Kredit" size="xs" color="neutral" variant="soft" @click="uncreditOne(row.original)" />
                <UButton v-if="row.original.status !== 'draft'" icon="i-lucide-file-down" label="PDF" size="xs" color="neutral" variant="soft" @click="downloadPdf(row.original)" />
                <UButton v-if="row.original.status === 'draft'" :to="`/siswa/e-faktur/masukan/${row.original.id}`" icon="i-lucide-pencil" size="xs" color="neutral" variant="soft" label="Ubah" />
              </div>
            </template>
            <template #empty><p class="py-8 text-center text-sm text-muted">Belum ada faktur masukan. Faktur muncul otomatis di sini saat penjual (teman sekelas) meng-upload faktur dengan Anda sebagai pembeli.</p></template>
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
