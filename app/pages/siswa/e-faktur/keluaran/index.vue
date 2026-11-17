<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type {
  StatusFaktur,
  TaxInvoiceBulkIssueResult,
  TaxInvoiceListResponse,
  TaxInvoiceRead
} from '~/types/api'

definePageMeta({ middleware: 'role', roles: ['siswa'] })

const auth = useAuth()
const { apiFetch } = useApi()
const toast = useToast()

const now = new Date()
const page = ref(1)
const pageSize = ref(50)

const filterBuyerIdentity = ref('')
const filterBuyerName = ref('')
const filterTransactionCode = ref<string | undefined>(undefined)
const filterStatusFaktur = ref<StatusFaktur[]>(defaultStatusFaktur())
const filterMonth = ref<number | undefined>(now.getMonth() + 1)
const filterYear = ref<number | undefined>(now.getFullYear())

const selectedIds = ref(new Set<number>())
const confirmDeleteOpen = ref(false)
const busy = ref(false)

const { data: invoiceList, status: listStatus, refresh: refreshList } = useAsyncData(
  'siswa-faktur-keluaran-list',
  () => {
    const query = new URLSearchParams({
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
    for (const value of filterStatusFaktur.value) query.append('status_faktur', value)
    if (filterMonth.value) query.set('tax_month', String(filterMonth.value))
    if (filterYear.value) query.set('tax_year', String(filterYear.value))
    return apiFetch<TaxInvoiceListResponse>(`/api/v1/faktur-keluaran?${query.toString()}`)
  },
  { watch: [page, pageSize, filterBuyerIdentity, filterBuyerName, filterTransactionCode, filterStatusFaktur, filterMonth, filterYear] }
)

watch([pageSize, filterBuyerIdentity, filterBuyerName, filterTransactionCode, filterStatusFaktur, filterMonth, filterYear], () => {
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
  filterStatusFaktur.value = defaultStatusFaktur()
  filterMonth.value = now.getMonth() + 1
  filterYear.value = now.getFullYear()
}

// Column order follows the reference list. Columns the simulator has no data
// for show "-".
const columns: TableColumn<TaxInvoiceRead>[] = [
  { id: 'select' },
  { accessorKey: 'buyer_identity_number', header: 'NPWP Pembeli / Identitas lainnya' },
  { accessorKey: 'buyer_name', header: 'Nama Pembeli' },
  { accessorKey: 'transaction_code', header: 'Kode Transaksi' },
  { accessorKey: 'invoice_number', header: 'Nomor Faktur Pajak' },
  { accessorKey: 'invoice_date', header: 'Tanggal Faktur Pajak' },
  { accessorKey: 'tax_month', header: 'Masa Pajak' },
  { accessorKey: 'tax_year', header: 'Tahun' },
  { accessorKey: 'status_faktur', header: 'Status Faktur' },
  { accessorKey: 'electronic_signature_status', header: 'ESignStatus' },
  { accessorKey: 'total_dpp', header: 'Harga Jual/Penggantian/DPP' },
  { accessorKey: 'total_dpp_other', header: 'DPP Nilai Lain/DPP' },
  { accessorKey: 'total_ppn', header: 'PPN' },
  { accessorKey: 'total_ppnbm', header: 'PPnBM' },
  { accessorKey: 'signer_name', header: 'Penandatangan' },
  { accessorKey: 'reference', header: 'Referensi' },
  { id: 'input_method', header: 'Metode Input' },
  { id: 'reported_by_seller', header: 'Dilaporkan oleh Penjual' },
  { id: 'reported_by_collector', header: 'Dilaporkan oleh Pemungut PPN' },
  { id: 'actions' }
]

async function refreshAll() {
  await refreshList()
}

/** Upload Faktur — bulk-issues every selected draft after signing. */
const signOpen = ref(false)
const signing = ref(false)
const pendingBulk = ref(false)
const pendingInvoice = ref<TaxInvoiceRead | null>(null)

function requestUploadSelected() {
  if (!selectedIds.value.size) return
  pendingBulk.value = true
  pendingInvoice.value = null
  signOpen.value = true
}

function requestIssueOne(invoice: TaxInvoiceRead) {
  pendingBulk.value = false
  pendingInvoice.value = invoice
  signOpen.value = true
}

async function confirmSign(payload: { signer_name?: string; kode_otorisasi: string }) {
  signing.value = true
  try {
    if (pendingBulk.value) {
      const result = await apiFetch<TaxInvoiceBulkIssueResult>(
        '/api/v1/faktur-keluaran/bulk-issue',
        {
          method: 'POST',
          body: {
            ids: [...selectedIds.value],
            signer_name: payload.signer_name,
            kode_otorisasi: payload.kode_otorisasi
          }
        }
      )
      toast.add({
        title: `${result.issued} faktur diterbitkan`,
        description: result.skipped
          ? `${result.skipped} dilewati: ${result.errors.slice(0, 2).join('; ')}`
          : 'Status faktur menjadi APPROVED.',
        color: result.issued ? 'success' : 'warning',
        icon: 'i-lucide-send'
      })
    } else if (pendingInvoice.value) {
      await apiFetch<TaxInvoiceRead>(
        `/api/v1/faktur-keluaran/${pendingInvoice.value.id}/issue`,
        {
          method: 'POST',
          body: {
            signer_name: payload.signer_name,
            kode_otorisasi: payload.kode_otorisasi
          }
        }
      )
      toast.add({
        title: 'Faktur diterbitkan',
        description: `Nomor faktur dibuat untuk ${pendingInvoice.value.buyer_name}. Status faktur menjadi APPROVED.`,
        color: 'success',
        icon: 'i-lucide-check-circle'
      })
    }
    signOpen.value = false
    pendingInvoice.value = null
    await refreshAll()
  } catch (error) {
    toast.add({
      title: 'Gagal menerbitkan faktur',
      description: apiErrorMessage(error),
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
  } finally {
    signing.value = false
  }
}

async function downloadPdf(invoice: { id: number }) {
  try {
    const blob = await apiFetch<Blob>(`/api/v1/faktur-keluaran/${invoice.id}/pdf`, { responseType: 'blob' } as never)
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

// Upload/Hapus only apply to drafts (CREATED): every selected row must be one.
const canActOnSelection = computed(() => {
  if (!selectedIds.value.size) return false
  const rows = invoiceList.value?.items ?? []
  return [...selectedIds.value].every(id => rows.find(row => row.id === id)?.status === 'draft')
})
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
          <UTooltip text="Impor Data belum tersedia di simulator">
            <span>
              <UButton
                icon="i-lucide-upload"
                trailing-icon="i-lucide-chevron-down"
                label="Impor Data"
                class="bupot-primary-button"
                disabled
              />
            </span>
          </UTooltip>
          <FakturListMenus
            api-base="/api/v1/faktur-keluaran"
            filename="faktur_keluaran_export.csv"
            :tax-month="filterMonth"
            :tax-year="filterYear"
          />
          <UIcon name="i-lucide-info" class="size-4 text-muted" />
          <UButton
            icon="i-lucide-send"
            label="Upload Faktur"
            class="bupot-primary-button"
            :loading="signing"
            :disabled="!canActOnSelection"
            @click="requestUploadSelected"
          />
          <UButton
            icon="i-lucide-trash-2"
            label="Hapus Dokumen"
            color="error"
            :disabled="!canActOnSelection"
            @click="confirmDeleteOpen = true;"
          />
        </div>

        <FakturTableIcons
          api-base="/api/v1/faktur-keluaran"
          filename="faktur_keluaran_export.csv"
          :tax-month="filterMonth"
          :tax-year="filterYear"
          :loading="listStatus === 'pending'"
          @refresh="refreshAll"
          @reset="clearFilters"
        />

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
          <USelectMenu
            v-model="filterStatusFaktur"
            :items="statusFakturOptions"
            value-key="value"
            multiple
            placeholder="Status Faktur"
            size="xs"
            class="min-w-64"
          />
          <USelect
            v-model="filterMonth"
            :items="monthFilterOptions"
            placeholder="Masa Pajak"
            size="xs"
            class="min-w-40"
          />
          <UInput v-model="filterYear" type="number" placeholder="Tahun" size="xs" class="w-28" />
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

            <template #status_faktur-cell="{ row }">
              <UBadge :color="statusFakturColor[row.original.status_faktur]" variant="subtle">
                {{ row.original.status_faktur }}
              </UBadge>
            </template>

            <template #electronic_signature_status-cell="{ row }">
              {{ esignLabel(row.original.electronic_signature_status) }}
            </template>

            <template #total_dpp-cell="{ row }">
              {{ formatCurrency(row.original.total_dpp) }}
            </template>

            <template #total_dpp_other-cell="{ row }">
              {{ formatCurrency(row.original.total_dpp_other) }}
            </template>

            <template #total_ppn-cell="{ row }">
              {{ formatCurrency(row.original.total_ppn) }}
            </template>

            <template #total_ppnbm-cell="{ row }">
              {{ formatCurrency(row.original.total_ppnbm) }}
            </template>

            <template #signer_name-cell="{ row }">
              {{ dashIfEmpty(row.original.signer_name) }}
            </template>

            <template #reference-cell="{ row }">
              {{ dashIfEmpty(row.original.reference) }}
            </template>

            <template #input_method-cell>
              Manual
            </template>

            <template #reported_by_seller-cell>
              -
            </template>

            <template #reported_by_collector-cell>
              -
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
                  @click="requestIssueOne(row.original)"
                />
                <UButton
                  v-if="row.original.status !== 'draft'"
                  icon="i-lucide-file-down"
                  label="PDF"
                  size="xs"
                  color="neutral"
                  variant="soft"
                  @click="downloadPdf(row.original)"
                />
                <UBadge
                  v-if="row.original.score !== null"
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

    <DocumentSignModal v-model:open="signOpen" :loading="signing" @confirm="confirmSign" />
  </div>
</template>
