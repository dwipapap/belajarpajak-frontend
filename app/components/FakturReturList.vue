<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { StatusFaktur, TaxReturListResponse, TaxReturRead } from '~/types/api'

/**
 * Retur Pajak Masukan (buyer: create / submit / delete) and Retur Pajak Keluaran
 * (seller: read-only view of the returns buyers issued against our faktur).
 * Columns and toolbar follow docs/PARITAS_CORETAX_BUPOT_EFAKTUR.md section 2.4.
 */
const props = defineProps<{ side: 'masukan' | 'keluaran' }>()

const auth = useAuth()
const { apiFetch } = useApi()
const toast = useToast()

const isMasukan = computed(() => props.side === 'masukan')
const isSiswa = computed(() => auth.user.value?.role === 'siswa')
const base = computed(() => (auth.user.value?.role === 'guru' ? '/guru' : '/siswa'))
const apiBase = computed(() =>
  isMasukan.value ? '/api/v1/retur-pajak-masukan' : '/api/v1/retur-pajak-keluaran'
)
const title = computed(() => (isMasukan.value ? 'Retur Pajak Masukan' : 'Retur Pajak Keluaran'))
const notAvailable = 'Belum tersedia di simulator'

const page = ref(1)
const pageSize = ref(50)
const filterStatusFaktur = ref<StatusFaktur[]>(['CREATED', 'APPROVED'])
const filterCounterparty = ref('')
const filterInvoiceNumber = ref('')
const filterMonth = ref<number | undefined>(undefined)
const filterYear = ref<number | undefined>(undefined)

const selectedIds = ref(new Set<number>())
const busy = ref(false)
const confirmDeleteOpen = ref(false)
const signOpen = ref(false)

const { data: list, status: listStatus, refresh } = useAsyncData(
  `${auth.user.value?.role ?? 'x'}-retur-${props.side}-list`,
  () => {
    const query = new URLSearchParams({ page: String(page.value), size: String(pageSize.value) })
    if (isMasukan.value) {
      for (const value of filterStatusFaktur.value) query.append('status_faktur', value)
      if (filterCounterparty.value) query.set('seller_name', filterCounterparty.value)
    } else if (filterCounterparty.value) {
      query.set('buyer_name', filterCounterparty.value)
    }
    if (filterInvoiceNumber.value) query.set('invoice_number', filterInvoiceNumber.value)
    if (filterMonth.value) query.set('tax_month', String(filterMonth.value))
    if (filterYear.value) query.set('tax_year', String(filterYear.value))
    return apiFetch<TaxReturListResponse>(`${apiBase.value}?${query.toString()}`)
  },
  { watch: [page, pageSize, filterStatusFaktur, filterCounterparty, filterInvoiceNumber, filterMonth, filterYear] }
)

watch([pageSize, filterStatusFaktur, filterCounterparty, filterInvoiceNumber, filterMonth, filterYear], () => {
  page.value = 1
})
watch(list, () => {
  selectedIds.value = new Set()
})

function clearFilters() {
  filterStatusFaktur.value = ['CREATED', 'APPROVED']
  filterCounterparty.value = ''
  filterInvoiceNumber.value = ''
  filterMonth.value = undefined
  filterYear.value = undefined
}

function toggleSelected(id: number) {
  const next = new Set(selectedIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selectedIds.value = next
}

const columns = computed<TableColumn<TaxReturRead>[]>(() => {
  const counterparty: TableColumn<TaxReturRead>[] = isMasukan.value
    ? [
        { accessorKey: 'seller_npwp', header: 'NPWP Penjual' },
        { accessorKey: 'seller_name', header: 'Nama Penjual' }
      ]
    : [
        { accessorKey: 'buyer_identity_number', header: 'NPWP Pembeli' },
        { accessorKey: 'buyer_name', header: 'Nama Pembeli' }
      ]
  return [
    ...(isMasukan.value ? [{ id: 'select' } as TableColumn<TaxReturRead>] : []),
    ...counterparty,
    { accessorKey: 'invoice_number', header: 'Nomor Faktur' },
    { accessorKey: 'invoice_date', header: 'Tanggal Faktur' },
    { accessorKey: 'return_number', header: 'Nomor Retur' },
    { accessorKey: 'return_date', header: 'Tanggal Retur' },
    { accessorKey: 'tax_month', header: 'Masa Pajak' },
    { accessorKey: 'tax_year', header: 'Tahun' },
    { accessorKey: 'status_faktur', header: 'Status' },
    ...(isMasukan.value
      ? [
          { accessorKey: 'electronic_signature_status', header: 'ESignStatus' },
          { id: 'creditable', header: 'Dikreditkan' }
        ] as TableColumn<TaxReturRead>[]
      : []),
    { accessorKey: 'total_dpp', header: 'Harga Jual/Penggantian/DPP' },
    { accessorKey: 'total_dpp_other', header: 'DPP Nilai Lain/DPP' },
    { accessorKey: 'total_ppn', header: 'PPN' },
    { accessorKey: 'total_ppnbm', header: 'PPnBM' },
    { accessorKey: 'signer_name', header: 'Perekam' },
    { id: 'reported', header: 'Dilaporkan' },
    ...(isMasukan.value && isSiswa.value ? [{ id: 'actions' } as TableColumn<TaxReturRead>] : [])
  ]
})

const selectedRows = computed(() =>
  (list.value?.items ?? []).filter(row => selectedIds.value.has(row.id))
)
const canActOnSelection = computed(
  () => selectedRows.value.length > 0 && selectedRows.value.every(row => row.status === 'draft')
)

async function deleteSelected() {
  busy.value = true
  let removed = 0
  try {
    for (const row of selectedRows.value) {
      await apiFetch(`${apiBase.value}/${row.id}`, { method: 'DELETE' })
      removed += 1
    }
    toast.add({ title: `${removed} retur dihapus`, color: 'success', icon: 'i-lucide-trash-2' })
  } catch (error) {
    toast.add({ title: 'Gagal menghapus retur', description: apiErrorMessage(error), color: 'error', icon: 'i-lucide-circle-alert' })
  } finally {
    busy.value = false
    confirmDeleteOpen.value = false
    await refresh()
  }
}

async function confirmSign(payload: { signer_name?: string, kode_otorisasi: string }) {
  busy.value = true
  let sent = 0
  try {
    for (const row of selectedRows.value) {
      await apiFetch(`${apiBase.value}/${row.id}/issue`, { method: 'POST', body: payload })
      sent += 1
    }
    toast.add({ title: `${sent} retur dikirim`, description: 'Status retur menjadi APPROVED.', color: 'success', icon: 'i-lucide-send' })
    signOpen.value = false
  } catch (error) {
    toast.add({ title: 'Gagal mengirim retur', description: apiErrorMessage(error), color: 'error', icon: 'i-lucide-circle-alert' })
  } finally {
    busy.value = false
    await refresh()
  }
}
</script>

<template>
  <div class="bupot-page">
    <div class="bupot-breadcrumb">
      <NuxtLink :to="base">Beranda</NuxtLink>
      <UIcon name="i-lucide-chevron-right" class="size-3.5" />
      <NuxtLink :to="`${base}/e-faktur`">e-Faktur</NuxtLink>
      <UIcon name="i-lucide-chevron-right" class="size-3.5" />
      <strong>{{ title }}</strong>
    </div>

    <div class="bupot-shell">
      <section class="bupot-main">
        <div class="bupot-main__header">
          <h1>{{ title }}</h1>
        </div>

        <div class="faktur-toolbar">
          <template v-if="isMasukan">
            <UButton
              v-if="isSiswa"
              to="/siswa/e-faktur/retur-masukan/create"
              icon="i-lucide-plus"
              label="Buat Retur"
              class="bupot-primary-button"
            />
            <UTooltip :text="notAvailable">
              <span>
                <UButton icon="i-lucide-upload" trailing-icon="i-lucide-chevron-down" label="Impor Data" class="bupot-primary-button" disabled />
              </span>
            </UTooltip>
          </template>
          <UTooltip :text="notAvailable">
            <span>
              <UButton icon="i-lucide-info" trailing-icon="i-lucide-chevron-down" label="Monitoring" class="bupot-primary-button" disabled />
            </span>
          </UTooltip>
          <UTooltip :text="notAvailable">
            <span>
              <UButton icon="i-lucide-layers" trailing-icon="i-lucide-chevron-down" label="Bulk Process" class="bupot-primary-button" disabled />
            </span>
          </UTooltip>
          <template v-if="isMasukan && isSiswa">
            <UButton
              icon="i-lucide-send"
              label="Upload Retur"
              class="bupot-primary-button"
              :loading="busy"
              :disabled="!canActOnSelection"
              @click="signOpen = true;"
            />
            <UButton
              icon="i-lucide-trash-2"
              label="Hapus Retur"
              color="error"
              :disabled="!canActOnSelection"
              @click="confirmDeleteOpen = true;"
            />
          </template>
        </div>

        <div class="faktur-table__filters">
          <UInput
            v-model="filterCounterparty"
            :placeholder="isMasukan ? 'Nama Penjual' : 'Nama Pembeli'"
            icon="i-lucide-search"
            size="xs"
          />
          <UInput v-model="filterInvoiceNumber" placeholder="Nomor Faktur" icon="i-lucide-search" size="xs" />
          <USelectMenu
            v-if="isMasukan"
            v-model="filterStatusFaktur"
            :items="statusFakturOptions"
            value-key="value"
            multiple
            placeholder="Status"
            size="xs"
            class="min-w-64"
          />
          <USelect v-model="filterMonth" :items="monthFilterOptions" placeholder="Masa Pajak" size="xs" class="min-w-40" />
          <UInput v-model="filterYear" type="number" placeholder="Tahun" size="xs" class="w-28" />
          <UButton icon="i-lucide-filter-x" label="Reset" color="neutral" variant="ghost" size="xs" @click="clearFilters" />
        </div>

        <div class="faktur-table">
          <UTable :data="list?.items ?? []" :columns="columns" :loading="listStatus === 'pending'">
            <template #select-cell="{ row }">
              <UCheckbox
                :model-value="selectedIds.has(row.original.id)"
                @update:model-value="toggleSelected(row.original.id)"
              />
            </template>
            <template #invoice_number-cell="{ row }">
              <span class="font-medium">{{ formatInvoiceNumber(row.original.invoice_number) }}</span>
            </template>
            <template #invoice_date-cell="{ row }">{{ formatInvoiceDate(row.original.invoice_date) }}</template>
            <template #return_date-cell="{ row }">{{ formatInvoiceDate(row.original.return_date) }}</template>
            <template #seller_npwp-cell="{ row }">{{ dashIfEmpty(row.original.seller_npwp) }}</template>
            <template #tax_month-cell="{ row }">{{ monthLabels[row.original.tax_month] }}</template>
            <template #status_faktur-cell="{ row }">
              <UBadge :color="statusFakturColor[row.original.status_faktur]" variant="subtle">
                {{ row.original.status_faktur }}
              </UBadge>
            </template>
            <template #electronic_signature_status-cell="{ row }">
              {{ esignLabel(row.original.electronic_signature_status) }}
            </template>
            <template #creditable-cell="{ row }">{{ row.original.is_creditable ? 'Ya' : 'Tidak' }}</template>
            <template #total_dpp-cell="{ row }">{{ formatCurrency(row.original.total_dpp) }}</template>
            <template #total_dpp_other-cell="{ row }">{{ formatCurrency(row.original.total_dpp_other) }}</template>
            <template #total_ppn-cell="{ row }">{{ formatCurrency(row.original.total_ppn) }}</template>
            <template #total_ppnbm-cell="{ row }">{{ formatCurrency(row.original.total_ppnbm) }}</template>
            <template #signer_name-cell="{ row }">{{ dashIfEmpty(row.original.signer_name) }}</template>
            <template #reported-cell>-</template>
            <template #actions-cell="{ row }">
              <div class="flex justify-end gap-1">
                <UButton
                  v-if="isSiswa && row.original.status === 'draft'"
                  :to="`/siswa/e-faktur/retur-masukan/${row.original.id}`"
                  icon="i-lucide-pencil"
                  label="Ubah"
                  size="xs"
                  color="neutral"
                  variant="soft"
                />
                <UButton
                  v-else
                  :to="`/siswa/e-faktur/retur-masukan/${row.original.id}`"
                  icon="i-lucide-eye"
                  label="Lihat"
                  size="xs"
                  color="neutral"
                  variant="soft"
                />
              </div>
            </template>
            <template #empty>
              <p class="py-8 text-center text-sm text-muted">Tidak ada data yang ditemukan.</p>
            </template>
          </UTable>
        </div>

        <div class="bupot-footer">
          <p>Total: {{ list?.total ?? 0 }} data</p>
          <div class="flex items-center gap-3">
            <UPagination v-model:page="page" :total="list?.total ?? 0" :items-per-page="pageSize" />
            <USelect v-model="pageSize" :items="pageSizeOptions" size="xs" class="w-20" />
          </div>
        </div>
      </section>
    </div>

    <UModal v-model:open="confirmDeleteOpen" title="Hapus Retur">
      <template #body>
        <p class="text-sm">Hapus {{ selectedIds.size }} retur draft yang dipilih? Tindakan ini tidak dapat dibatalkan.</p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton label="Batal" color="neutral" variant="ghost" @click="confirmDeleteOpen = false;" />
          <UButton label="Hapus" color="error" :loading="busy" @click="deleteSelected" />
        </div>
      </template>
    </UModal>

    <DocumentSignModal v-model:open="signOpen" :loading="busy" @confirm="confirmSign" />
  </div>
</template>
