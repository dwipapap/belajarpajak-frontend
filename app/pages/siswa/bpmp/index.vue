<script setup lang="ts">
import type { DropdownMenuItem, TableColumn } from '@nuxt/ui'
import type {
  BpmpBulkIssueResult,
  BpmpImportResult,
  BpmpListResponse,
  BpmpRead,
  BpmpSptFlag,
  BpmpStatus,
  BpmpSummary,
  BpmpTaxFacility
} from '~/types/api'

definePageMeta({ middleware: 'role', roles: ['siswa'] })

const auth = useAuth()
const { apiFetch } = useApi()
const toast = useToast()

const activeStatus = ref<BpmpStatus>('draft')
const page = ref(1)
const pageSize = 10

const filterMonth = ref<number | undefined>(undefined)
const filterYear = ref<number | undefined>(undefined)
const filterFacility = ref<BpmpTaxFacility | undefined>(undefined)
const filterSptFlag = ref<BpmpSptFlag | undefined>(undefined)

const headingByStatus = {
  draft: 'e-Bupot BPMP',
  issued: 'e-Bupot BPMP',
  invalid: 'e-Bupot BPMP'
} satisfies Record<BpmpStatus, string>

const { data: summary, refresh: refreshSummary } = useAsyncData(
  'siswa-bpmp-summary',
  () => apiFetch<BpmpSummary>('/api/v1/bpmp/summary'),
  { default: () => ({ draft: 0, issued: 0, invalid: 0, total: 0 }) }
)

const { data: bpmpList, status: listStatus, refresh: refreshList } = useAsyncData(
  'siswa-bpmp-list',
  () => {
    const query = new URLSearchParams({
      status: activeStatus.value,
      page: String(page.value),
      size: String(pageSize)
    })
    if (filterMonth.value !== undefined) query.set('tax_month', String(filterMonth.value))
    if (filterYear.value) query.set('tax_year', String(filterYear.value))
    if (filterFacility.value !== undefined) query.set('tax_facility', filterFacility.value)
    if (filterSptFlag.value !== undefined) query.set('spt_flag', filterSptFlag.value)
    return apiFetch<BpmpListResponse>(`/api/v1/bpmp?${query.toString()}`)
  },
  { watch: [activeStatus, page, filterMonth, filterYear, filterFacility, filterSptFlag] }
)

const selectedIds = ref(new Set<number>())
const { cancelling, cancelSelected } = useBupotBulkCancel('bpmp', selectedIds, () => refreshAll())

watch([activeStatus, filterMonth, filterYear, filterFacility, filterSptFlag], () => {
  page.value = 1
  selectedIds.value = new Set()
})

watch(bpmpList, () => {
  selectedIds.value = new Set()
})

function toggleSelected(id: number) {
  const next = new Set(selectedIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selectedIds.value = next
}

const baseColumns: TableColumn<BpmpRead>[] = [
  { id: 'select' },
  { accessorKey: 'tax_month', header: 'Masa Pajak' },
  { accessorKey: 'withholding_number', header: 'Nomor Pemotongan' },
  { accessorKey: 'status', header: 'Status' },
  { accessorKey: 'electronic_signature_status', header: 'Status Tanda Tangan Elektronik' },
  { accessorKey: 'recipient_identity_number', header: 'Nomor Identitas WP' },
  { accessorKey: 'recipient_name', header: 'Nama' },
  { accessorKey: 'tax_object_code', header: 'Kode Objek Pajak' },
  { accessorKey: 'gross_income', header: 'Penghasilan Bruto (Rp)' },
  { accessorKey: 'income_tax', header: 'Pajak Penghasilan (Rp)' },
  { accessorKey: 'tax_facility', header: 'Fasilitas Pajak' }
]
const columns = computed<TableColumn<BpmpRead>[]>(() => [...baseColumns, ...(activeStatus.value === 'issued' ? sptFlagColumns.map(flag => ({ id: flag.value, accessorKey: 'spt_flag', header: flag.label })) : []), { id: 'actions' }])

async function refreshAll() {
  await Promise.all([refreshList(), refreshSummary()])
}

function clearFilters() {
  filterMonth.value = undefined
  filterYear.value = undefined
  filterFacility.value = undefined
  filterSptFlag.value = undefined
}

// --- Toolbar actions (signing modal fixes B1: kode_otorisasi is required) --------

const signOpen = ref(false)
const signing = ref(false)
const pendingSlip = ref<BpmpRead | null>(null)
const pendingBulk = ref(false)

function requestIssueSlip(slip: BpmpRead) {
  pendingSlip.value = slip
  pendingBulk.value = false
  signOpen.value = true
}

function requestIssueSelected() {
  if (!selectedIds.value.size) return
  pendingSlip.value = null
  pendingBulk.value = true
  signOpen.value = true
}

async function confirmSign(payload: { signer_name?: string; kode_otorisasi: string }) {
  signing.value = true
  try {
    if (pendingBulk.value) {
      const result = await apiFetch<BpmpBulkIssueResult>('/api/v1/bpmp/bulk-issue', {
        method: 'POST',
        body: {
          ids: [...selectedIds.value],
          signer_name: payload.signer_name,
          kode_otorisasi: payload.kode_otorisasi
        }
      })
      toast.add({
        title: `${result.issued} BPMP diterbitkan`,
        description: result.failed ? `${result.failed} gagal diterbitkan.` : undefined,
        color: result.failed ? 'warning' : 'success',
        icon: 'i-lucide-send'
      })
    } else if (pendingSlip.value) {
      await apiFetch<BpmpRead>(`/api/v1/bpmp/${pendingSlip.value.id}/issue`, {
        method: 'POST',
        body: { signer_name: payload.signer_name, kode_otorisasi: payload.kode_otorisasi }
      })
      toast.add({
        title: 'BPMP diterbitkan',
        description: `Nomor pemotongan dibuat untuk ${pendingSlip.value.recipient_name}.`,
        color: 'success',
        icon: 'i-lucide-check-circle'
      })
    }
    signOpen.value = false
    pendingSlip.value = null
    activeStatus.value = 'issued' as typeof activeStatus.value
    await refreshAll()
  } catch (error) {
    toast.add({
      title: pendingBulk.value ? 'Terbitkan massal gagal' : 'Gagal menerbitkan BPMP',
      description: apiErrorMessage(error),
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
  } finally {
    signing.value = false
  }
}

async function cancelSlip(slip: BpmpRead) {
  try {
    await apiFetch<BpmpRead>(`/api/v1/bpmp/${slip.id}/cancel`, {
      method: 'POST',
      body: { reason: 'Dibatalkan oleh pemotong' }
    })
    toast.add({
      title: 'BPMP dibatalkan',
      description: 'Dokumen dipindahkan ke tab Tidak Valid.',
      color: 'warning',
      icon: 'i-lucide-ban'
    })
    await refreshAll()
  } catch (error) {
    toast.add({
      title: 'Gagal membatalkan BPMP',
      description: apiErrorMessage(error),
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
  }
}

async function deleteSelected() {
  const ids = [...selectedIds.value]
  if (!ids.length) return
  let deleted = 0
  for (const id of ids) {
    try {
      await apiFetch(`/api/v1/bpmp/${id}`, { method: 'DELETE' })
      deleted += 1
    } catch {
      // keep going; report the aggregate below
    }
  }
  toast.add({
    title: `${deleted} dari ${ids.length} BPMP dihapus`,
    color: deleted === ids.length ? 'success' : 'warning',
    icon: 'i-lucide-trash-2'
  })
  await refreshAll()
}

// --- Downloads (Monitoring / Bulk Process / template) ------------------------

async function downloadFile(path: string, filename: string) {
  try {
    const blob = await apiFetch<Blob>(path, { responseType: 'blob' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  } catch (error) {
    toast.add({
      title: 'Unduhan gagal',
      description: apiErrorMessage(error),
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
  }
}

function exportQuery(withStatus?: BpmpStatus) {
  const query = new URLSearchParams()
  if (withStatus) query.set('status', withStatus)
  if (filterMonth.value !== undefined) query.set('tax_month', String(filterMonth.value))
  if (filterYear.value) query.set('tax_year', String(filterYear.value))
  const text = query.toString()
  return text ? `?${text}` : ''
}

const monitoringItems = computed<DropdownMenuItem[]>(() => [
  {
    label: 'XML',
    icon: 'i-lucide-file-code',
    onSelect: () => downloadFile(`/api/v1/bpmp/export-xml${exportQuery(activeStatus.value)}`, 'bpmp_export.xml')
  },
  {
    label: 'Diterbitkan Masa Pajak',
    icon: 'i-lucide-calendar-check',
    onSelect: () => downloadFile(`/api/v1/bpmp/export-xml${exportQuery('issued')}`, 'bpmp_issued.xml')
  },
  {
    label: 'Unduh CSV per Masa',
    icon: 'i-lucide-file-spreadsheet',
    onSelect: () => downloadFile(`/api/v1/bpmp/export-csv${exportQuery(activeStatus.value)}`, 'bpmp_export.csv')
  }
])

const bulkProcessItems = computed<DropdownMenuItem[]>(() => [
  {
    label: 'Diterbitkan Masa Pajak',
    icon: 'i-lucide-send',
    disabled: activeStatus.value !== 'draft' || selectedIds.value.size === 0,
    onSelect: () => requestIssueSelected()
  },
  {
    label: 'Unduh CSV per Masa',
    icon: 'i-lucide-file-spreadsheet',
    onSelect: () => downloadFile(`/api/v1/bpmp/export-csv${exportQuery(activeStatus.value)}`, 'bpmp_export.csv')
  }
])

// --- Import modal -------------------------------------------------------------

const importOpen = ref(false)
const importFile = ref<File | null>(null)
const importing = ref(false)
const importResult = ref<BpmpImportResult | null>(null)
const importError = ref<string | null>(null)

function openImport() {
  importOpen.value = true
}

function onImportFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  importFile.value = input.files?.[0] ?? null
  importResult.value = null
  importError.value = null
}

async function submitImport() {
  if (!importFile.value) return
  importing.value = true
  importError.value = null
  importResult.value = null
  try {
    const body = new FormData()
    body.append('file', importFile.value)
    importResult.value = await apiFetch<BpmpImportResult>('/api/v1/bpmp/import-xml', {
      method: 'POST',
      body
    })
    await refreshAll()
  } catch (error) {
    importError.value = apiErrorMessage(error, 'Impor gagal. Periksa format file.')
  } finally {
    importing.value = false
  }
}

function closeImport() {
  importOpen.value = false
  importFile.value = null
  importResult.value = null
  importError.value = null
}
</script>

<template>
  <div class="bupot-page">
    <div class="bupot-breadcrumb">
      <NuxtLink to="/siswa">Beranda</NuxtLink>
      <UIcon name="i-lucide-chevron-right" class="size-3.5" />
      <span>eBupot</span>
      <UIcon name="i-lucide-chevron-right" class="size-3.5" />
      <strong>BPMP - Bukti Pemotongan Bulanan Pegawai Tetap</strong>
    </div>

    <div class="bupot-shell">
      <aside class="bupot-side">
        <div class="bupot-side__identity">
          <strong>{{ auth.user.value?.tenant_id ?? '0000000000000000' }}</strong>
          <span>{{ auth.user.value?.full_name }}</span>
        </div>
        <div class="bupot-side__title">
          BPMP - Bukti Pemotongan Bulanan Pegawai Tetap
        </div>
        <nav class="bupot-side__tabs" aria-label="Status BPMP">
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
          <h1>{{ bupotTitle('bpmp', activeStatus) }}</h1>
          <div class="bupot-actions">
            <UButton v-if="bupotToolbarVisible('create', activeStatus)"
              to="/siswa/bpmp/create"
              icon="i-lucide-plus"
              label="Create eBupot MP"
              class="bupot-primary-button"
            />
            <UButton v-if="bupotToolbarVisible('delete', activeStatus)"
              icon="i-lucide-trash-2"
              label="Hapus"
              color="neutral"
              :disabled="activeStatus !== 'draft' || selectedIds.size === 0"
              @click="deleteSelected"
            />
            <UButton v-if="bupotToolbarVisible('issue', activeStatus)"
              icon="i-lucide-send"
              label="Terbitkan"
              color="neutral"
              :disabled="activeStatus !== 'draft' || selectedIds.size === 0"
              @click="requestIssueSelected"
            />
            <UButton v-if="bupotToolbarVisible('cancel', activeStatus)"
              icon="i-lucide-ban"
              label="Batal"
              color="neutral"
              :loading="cancelling"
              :disabled="selectedIds.size === 0"
              @click="cancelSelected"
            />
            <UDropdownMenu v-if="bupotToolbarVisible('monitoring', activeStatus)" :items="monitoringItems">
              <UButton icon="i-lucide-monitor" label="Monitoring" color="neutral" variant="soft" />
            </UDropdownMenu>
            <UButton v-if="bupotToolbarVisible('import', activeStatus)"
              icon="i-lucide-upload"
              label="Impor data"
              color="neutral"
              variant="soft"
              @click="openImport"
            />
            <UDropdownMenu v-if="bupotToolbarVisible('bulk', activeStatus)" :items="bulkProcessItems">
              <UButton icon="i-lucide-layers" label="Bulk Process" color="neutral" variant="soft" />
            </UDropdownMenu>
            <UButton icon="i-lucide-refresh-cw" color="neutral" variant="soft" @click="refreshAll" />
          </div>
        </div>

        <div class="bupot-toolbar">
          <USelect v-model="filterMonth" :items="monthFilterOptions" class="w-40" />
          <UInput
            v-model="filterYear"
            type="number"
            placeholder="Tahun Pajak"
            class="w-32"
          />
          <USelect v-model="filterFacility" :items="facilityFilterOptions" class="w-48" />
          <USelect v-model="filterSptFlag" :items="sptFlagFilterOptions" class="w-48" />
          <UButton
            icon="i-lucide-filter-x"
            color="neutral"
            variant="soft"
            @click="clearFilters"
          />
        </div>

        <div class="bupot-table">
          <UTable
            :data="bpmpList?.items ?? []"
            :columns="columns"
            :loading="listStatus === 'pending'"
          >
            <template #select-cell="{ row }">
              <UCheckbox
                :model-value="selectedIds.has(row.original.id)"
                @update:model-value="toggleSelected(row.original.id)"
              />
            </template>

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

            <template #electronic_signature_status-cell="{ row }">
              <span>{{ electronicSignatureLabel(row.original.electronic_signature_status) }}</span>
            </template>

            <template #document_nitku-cell="{ row }">
              <span>{{ row.original.document_nitku || row.original.withholder_nitku || '-' }}</span>
            </template>

            <template #dpp-cell="{ row }">
              Rp {{ formatCurrency(row.original.dpp) }}
            </template>

            <template #income_tax-cell="{ row }">
              <span :title="`Bruto Rp ${formatCurrency(row.original.gross_income ?? row.original.dpp)} • PPh Rp ${formatCurrency(row.original.income_tax)}`">Rp {{ formatCurrency(row.original.income_tax) }}</span>
            </template>

            <template #tax_facility-cell="{ row }">
              {{ facilityLabel[row.original.tax_facility] }}
            </template>

            <template #reported_in_spt-cell="{ row }">
              <UIcon v-if="row.original.spt_flag === 'reported_in_spt'" name="i-lucide-check" />
            </template>
            <template #objection_in_progress-cell="{ row }">
              <UIcon v-if="row.original.spt_flag === 'objection_in_progress'" name="i-lucide-check" />
            </template>
            <template #objection_completed-cell="{ row }">
              <UIcon v-if="row.original.spt_flag === 'objection_completed'" name="i-lucide-check" />
            </template>
            <template #objection_rejected_formal-cell="{ row }">
              <UIcon v-if="row.original.spt_flag === 'objection_rejected_formal'" name="i-lucide-check" />
            </template>
            <template #objection_withdrawal_review-cell="{ row }">
              <UIcon v-if="row.original.spt_flag === 'objection_withdrawal_review'" name="i-lucide-check" />
            </template>
            <template #objection_withdrawal_accepted-cell="{ row }">
              <UIcon v-if="row.original.spt_flag === 'objection_withdrawal_accepted'" name="i-lucide-check" />
            </template>
            <template #spt_audited-cell="{ row }">
              <UIcon v-if="row.original.spt_flag === 'spt_audited'" name="i-lucide-check" />
            </template>
            <template #spt_legal_process-cell="{ row }">
              <UIcon v-if="row.original.spt_flag === 'spt_legal_process'" name="i-lucide-check" />
            </template>
            <template #actions-cell="{ row }">
              <div class="flex justify-end gap-1">
                <UButton
                  v-if="row.original.status === 'draft'"
                  icon="i-lucide-send"
                  label="Terbitkan"
                  size="xs"
                  @click="requestIssueSlip(row.original)"
                />
                <UButton
                  v-if="row.original.status === 'issued'"
                  icon="i-lucide-ban"
                  label="Batal"
                  color="error"
                  variant="soft"
                  size="xs"
                  @click="cancelSlip(row.original)"
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
          <p>Total: {{ bpmpList?.total ?? 0 }} data</p>
          <UPagination
            v-model:page="page"
            :total="bpmpList?.total ?? 0"
            :items-per-page="pageSize"
          />
        </div>
      </section>
    </div>

    <UModal
      v-model:open="importOpen"
      title="Impor data BPMP"
      description="Unggah file XML sesuai format template."
    >
      <template #body>
        <div class="space-y-4">
          <UAlert
            v-if="importError"
            color="error"
            variant="subtle"
            icon="i-lucide-circle-alert"
            :title="importError"
          />

          <UFormField label="Pilih File" name="import_file" required>
            <input
              type="file"
              accept=".xml"
              class="bpmp-file-input"
              @change="onImportFileChange"
            >
          </UFormField>

          <div class="flex flex-wrap gap-2">
            <UButton
              icon="i-lucide-download"
              label="Unduh Format Data"
              color="neutral"
              variant="soft"
              @click="downloadFile('/api/v1/bpmp/import-template', 'bpmp_import_template.xml')"
            />
            <UButton
              icon="i-lucide-upload"
              label="Impor"
              :disabled="!importFile"
              :loading="importing"
              @click="submitImport"
            />
            <UButton label="Tutup" color="neutral" variant="ghost" @click="closeImport" />
          </div>

          <div v-if="importResult" class="space-y-2">
            <UAlert
              :color="importResult.failed === 0 ? 'success' : 'warning'"
              variant="subtle"
              :icon="importResult.failed === 0 ? 'i-lucide-check-circle' : 'i-lucide-triangle-alert'"
              :title="`${importResult.imported} baris berhasil, ${importResult.failed} gagal dari ${importResult.total_rows} baris.`"
            />
            <ul class="bpmp-import-results">
              <li v-for="item in importResult.results" :key="item.row">
                <UIcon
                  :name="item.success ? 'i-lucide-check' : 'i-lucide-x'"
                  :class="item.success ? 'text-success' : 'text-error'"
                  class="size-4"
                />
                <span>Baris {{ item.row }}: {{ item.success ? `tersimpan (ID ${item.id})` : item.error }}</span>
              </li>
            </ul>
          </div>
        </div>
      </template>
    </UModal>

    <DocumentSignModal v-model:open="signOpen" :loading="signing" @confirm="confirmSign" />
  </div>
</template>

<style scoped>
/* Import modal is BPMP-only for now; shared shell styles live in main.css. */
.bpmp-file-input {
  display: block;
  width: 100%;
  border: 1px solid oklch(0.89 0.014 255);
  border-radius: 0.35rem;
  font-size: 0.85rem;
  padding: 0.5rem;
}

.bpmp-import-results {
  display: grid;
  gap: 0.3rem;
  max-height: 12rem;
  overflow-y: auto;
  font-size: 0.83rem;
}

.bpmp-import-results li {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
</style>
