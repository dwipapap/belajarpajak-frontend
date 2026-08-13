<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type {
  TaxInvoiceBulkIssueResult,
  TaxInvoiceListResponse,
  TaxInvoiceRead,
  TaxInvoiceStatus,
  TaxInvoiceSummary
} from '~/types/api'

definePageMeta({ middleware: 'role', roles: ['siswa'] })

const auth = useAuth()
const { apiFetch } = useApi()
const toast = useToast()

const activeStatus = ref<TaxInvoiceStatus>('draft')
const page = ref(1)
const pageSize = ref(50)

const filterBuyerIdentity = ref('')
const filterBuyerName = ref('')
const filterTransactionCode = ref<string | undefined>(undefined)

const selectedIds = ref(new Set<number>())
const confirmDeleteOpen = ref(false)
const busy = ref(false)

const { data: summary, refresh: refreshSummary } = useAsyncData(
  'siswa-faktur-keluaran-summary',
  () => apiFetch<TaxInvoiceSummary>('/api/v1/faktur-keluaran/summary'),
  { default: () => ({ draft: 0, issued: 0, invalid: 0, total: 0 }) }
)

const { data: invoiceList, status: listStatus, refresh: refreshList } = useAsyncData(
  'siswa-faktur-keluaran-list',
  () => {
    const query = new URLSearchParams({
      status: activeStatus.value,
      page: String(page.value),
      size: String(pageSize.value)
    })
    if (filterBuyerIdentity.value) {
      query.set('buyer_identity_number', filterBuyerIdentity.value)
    }
    if (filterBuyerName.value) query.set('buyer_name', filterBuyerName.value)
    if (filterTransactionCode.value) {
      query.set('transaction_code', filterTransactionCode.value)
    }
    return apiFetch<TaxInvoiceListResponse>(`/api/v1/faktur-keluaran?${query.toString()}`)
  },
  { watch: [activeStatus, page, pageSize, filterBuyerIdentity, filterBuyerName, filterTransactionCode] }
)

watch([activeStatus, pageSize, filterBuyerIdentity, filterBuyerName, filterTransactionCode], () => {
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
  filterBuyerIdentity.value = ''
  filterBuyerName.value = ''
  filterTransactionCode.value = undefined
}

const columns: TableColumn<TaxInvoiceRead>[] = [
  { id: 'select' },
  { accessorKey: 'buyer_identity_number', header: 'NPWP Pembeli / Identitas lainnya' },
  { accessorKey: 'buyer_name', header: 'Nama Pembeli' },
  { accessorKey: 'transaction_code', header: 'Kode Transaksi' },
  { accessorKey: 'invoice_number', header: 'Nomor Faktur' },
  { accessorKey: 'invoice_date', header: 'Tanggal Faktur' },
  { accessorKey: 'tax_month', header: 'Masa Pajak' },
  { accessorKey: 'tax_year', header: 'Tahun' },
  { accessorKey: 'status', header: 'Status' },
  { accessorKey: 'total_dpp', header: 'Harga Jual/DPP (Rp)' },
  { accessorKey: 'total_ppn', header: 'PPN (Rp)' },
  { accessorKey: 'total_ppnbm', header: 'PPnBM (Rp)' },
  { id: 'actions' }
]

async function refreshAll() {
  await Promise.all([refreshList(), refreshSummary()])
}

/** Upload Faktur — bulk-issues every selected draft. */
async function uploadSelected() {
  const ids = [...selectedIds.value]
  if (!ids.length) return
  busy.value = true
  try {
    const result = await apiFetch<TaxInvoiceBulkIssueResult>(
      '/api/v1/faktur-keluaran/bulk-issue',
      { method: 'POST', body: { ids } }
    )
    toast.add({
      title: `${result.issued} faktur diterbitkan`,
      description: result.skipped
        ? `${result.skipped} dilewati: ${result.errors.slice(0, 2).join('; ')}`
        : 'Dokumen masuk ke tab Telah Terbit.',
      color: result.issued ? 'success' : 'warning',
      icon: 'i-lucide-send'
    })
    await refreshAll()
  } catch (error) {
    toast.add({
      title: 'Gagal menerbitkan faktur',
      description: apiErrorMessage(error),
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
  } finally {
    busy.value = false
  }
}

async function deleteSelected() {
  const ids = [...selectedIds.value]
  if (!ids.length) return
  busy.value = true
  let removed = 0
  try {
    for (const id of ids) {
      await apiFetch(`/api/v1/faktur-keluaran/${id}`, { method: 'DELETE' })
      removed += 1
    }
    toast.add({
      title: `${removed} dokumen dihapus`,
      color: 'success',
      icon: 'i-lucide-trash-2'
    })
  } catch (error) {
    toast.add({
      title: 'Gagal menghapus dokumen',
      description: apiErrorMessage(error),
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
  } finally {
    busy.value = false
    confirmDeleteOpen.value = false
    await refreshAll()
  }
}

async function issueOne(invoice: TaxInvoiceRead) {
  try {
    await apiFetch<TaxInvoiceRead>(`/api/v1/faktur-keluaran/${invoice.id}/issue`, {
      method: 'POST'
    })
    toast.add({
      title: 'Faktur diterbitkan',
      description: `Nomor faktur dibuat untuk ${invoice.buyer_name}.`,
      color: 'success',
      icon: 'i-lucide-check-circle'
    })
    await refreshAll()
  } catch (error) {
    toast.add({
      title: 'Gagal menerbitkan faktur',
      description: apiErrorMessage(error),
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
  }
}

const canActOnSelection = computed(
  () => activeStatus.value === 'draft' && selectedIds.value.size > 0
)
</script>

<template>
  <div class="bupot-page">
    <div class="bupot-breadcrumb">
      <NuxtLink to="/siswa">Beranda</NuxtLink>
      <UIcon name="i-lucide-chevron-right" class="size-3.5" />
      <NuxtLink to="/siswa/e-faktur">e-Faktur</NuxtLink>
      <UIcon name="i-lucide-chevron-right" class="size-3.5" />
      <strong>Pajak Keluaran</strong>
    </div>

    <div class="bupot-shell">
      <aside class="bupot-side">
        <div class="bupot-side__identity">
          <strong>{{ auth.user.value?.tenant_id ?? '0000000000000000' }}</strong>
          <span>{{ auth.user.value?.full_name }}</span>
        </div>
        <div class="bupot-side__title">
          Faktur Pajak Keluaran
        </div>
        <nav class="bupot-side__tabs" aria-label="Status faktur">
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

      <section class="bupot-main">
        <div class="bupot-main__header">
          <h1>Pajak Keluaran</h1>
        </div>

        <div class="faktur-toolbar">
          <UButton
            to="/siswa/e-faktur/keluaran/create"
            icon="i-lucide-plus"
            label="Buat Faktur"
            class="bupot-primary-button"
          />
          <UButton
            icon="i-lucide-upload"
            trailing-icon="i-lucide-chevron-down"
            label="Impor Data"
            class="bupot-primary-button"
            disabled
          />
          <UButton
            icon="i-lucide-info"
            trailing-icon="i-lucide-chevron-down"
            label="Monitoring"
            class="bupot-primary-button"
            disabled
          />
          <UButton
            icon="i-lucide-layers"
            trailing-icon="i-lucide-chevron-down"
            label="Bulk Process"
            class="bupot-primary-button"
            disabled
          />
          <UIcon name="i-lucide-info" class="size-4 text-muted" />
          <UButton
            icon="i-lucide-send"
            label="Upload Faktur"
            class="bupot-primary-button"
            :loading="busy"
            :disabled="!canActOnSelection"
            @click="uploadSelected"
          />
          <UButton
            icon="i-lucide-trash-2"
            label="Hapus Dokumen"
            color="error"
            :disabled="!canActOnSelection"
            @click="confirmDeleteOpen = true;"
          />
        </div>

        <div class="bupot-toolbar">
          <UButton
            icon="i-lucide-refresh-cw"
            color="info"
            variant="soft"
            :loading="listStatus === 'pending'"
            @click="refreshAll"
          />
          <UButton icon="i-lucide-file" color="neutral" variant="solid" disabled />
          <UButton icon="i-lucide-file-spreadsheet" color="success" variant="solid" disabled />
          <UButton icon="i-lucide-file-text" color="error" variant="solid" disabled />
          <UButton
            icon="i-lucide-filter-x"
            color="neutral"
            variant="soft"
            @click="clearFilters"
          />
        </div>

        <div class="faktur-table__filters">
          <UInput
            v-model="filterBuyerIdentity"
            placeholder="NPWP Pembeli / Identitas lainnya"
            icon="i-lucide-search"
            size="xs"
          />
          <UInput
            v-model="filterBuyerName"
            placeholder="Nama Pembeli"
            icon="i-lucide-search"
            size="xs"
          />
          <USelect
            v-model="filterTransactionCode"
            :items="transactionCodeFilterOptions"
            placeholder="Pilih Kode Transaksi"
            size="xs"
            class="min-w-56"
          />
        </div>

        <div class="faktur-table">
          <UTable
            :data="invoiceList?.items ?? []"
            :columns="columns"
            :loading="listStatus === 'pending'"
          >
            <template #select-cell="{ row }">
              <UCheckbox
                :model-value="selectedIds.has(row.original.id)"
                @update:model-value="toggleSelected(row.original.id)"
              />
            </template>

            <template #transaction_code-cell="{ row }">
              <UBadge color="neutral" variant="subtle">
                {{ row.original.transaction_code }}
              </UBadge>
            </template>

            <template #invoice_number-cell="{ row }">
              <span class="font-medium">
                {{ formatInvoiceNumber(row.original.invoice_number) }}
              </span>
            </template>

            <template #invoice_date-cell="{ row }">
              {{ formatInvoiceDate(row.original.invoice_date) }}
            </template>

            <template #tax_month-cell="{ row }">
              {{ monthLabels[row.original.tax_month] }}
            </template>

            <template #status-cell="{ row }">
              <UBadge :color="statusColor[row.original.status]" variant="subtle">
                {{ statusLabel[row.original.status] }}
              </UBadge>
            </template>

            <template #total_dpp-cell="{ row }">
              Rp {{ formatCurrency(row.original.total_dpp) }}
            </template>

            <template #total_ppn-cell="{ row }">
              Rp {{ formatCurrency(row.original.total_ppn) }}
            </template>

            <template #total_ppnbm-cell="{ row }">
              Rp {{ formatCurrency(row.original.total_ppnbm) }}
            </template>

            <template #actions-cell="{ row }">
              <div class="flex justify-end gap-1">
                <UButton
                  v-if="row.original.status === 'draft'"
                  :to="`/siswa/e-faktur/keluaran/${row.original.id}`"
                  icon="i-lucide-pencil"
                  size="xs"
                  color="neutral"
                  variant="soft"
                  label="Ubah"
                />
                <UButton
                  v-if="row.original.status === 'draft'"
                  icon="i-lucide-send"
                  label="Terbitkan"
                  size="xs"
                  @click="issueOne(row.original)"
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

        <div class="bupot-footer">
          <p>Total: {{ invoiceList?.total ?? 0 }} data</p>
          <div class="flex items-center gap-3">
            <UPagination
              v-model:page="page"
              :total="invoiceList?.total ?? 0"
              :items-per-page="pageSize"
            />
            <USelect v-model="pageSize" :items="pageSizeOptions" size="xs" class="w-20" />
          </div>
        </div>
      </section>
    </div>

    <UModal v-model:open="confirmDeleteOpen" title="Hapus Dokumen">
      <template #body>
        <p class="text-sm">
          Hapus {{ selectedIds.size }} faktur draft yang dipilih? Tindakan ini tidak dapat
          dibatalkan.
        </p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton
            label="Batal"
            color="neutral"
            variant="ghost"
            @click="confirmDeleteOpen = false;"
          />
          <UButton label="Hapus" color="error" :loading="busy" @click="deleteSelected" />
        </div>
      </template>
    </UModal>
  </div>
</template>
