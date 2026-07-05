<script setup lang="ts">
import type { DropdownMenuItem, TableColumn } from '@nuxt/ui'
import type {
  Bp26BulkIssueResult,
  Bp26ImportResult,
  Bp26ListResponse,
  Bp26Read,
  Bp26Status,
  Bp26Summary,
  Bp26TaxFacility
} from '~/types/api'

definePageMeta({ middleware: 'role', roles: ['siswa'] })

const auth = useAuth()
const config = useRuntimeConfig()
const { apiFetch } = useApi()
const toast = useToast()

const activeStatus = ref<Bp26Status>('draft')
const page = ref(1)
const pageSize = 10

const filterMonth = ref<number | undefined>(undefined)
const filterYear = ref<number | undefined>(undefined)
const filterFacility = ref<Bp26TaxFacility | undefined>(undefined)

const headingByStatus = {
  draft: 'EBUPOT BP26 NOT ISSUED',
  issued: 'EBUPOT BP26 ISSUED',
  invalid: 'EBUPOT BP26 TIDAK VALID'
} satisfies Record<Bp26Status, string>

const { data: summary, refresh: refreshSummary } = useAsyncData(
  'siswa-bp26-summary',
  () => apiFetch<Bp26Summary>('/api/v1/bp26/summary'),
  { default: () => ({ draft: 0, issued: 0, invalid: 0, total: 0 }) }
)

const { data: bp26List, status: listStatus, refresh: refreshList } = useAsyncData(
  'siswa-bp26-list',
  () => {
    const query = new URLSearchParams({
      status: activeStatus.value,
      page: String(page.value),
      size: String(pageSize)
    })
    if (filterMonth.value !== undefined) query.set('tax_month', String(filterMonth.value))
    if (filterYear.value) query.set('tax_year', String(filterYear.value))
    if (filterFacility.value !== undefined) query.set('tax_facility', filterFacility.value)
    return apiFetch<Bp26ListResponse>(`/api/v1/bp26?${query.toString()}`)
  },
  { watch: [activeStatus, page, filterMonth, filterYear, filterFacility] }
)

const selectedIds = ref(new Set<number>())

watch([activeStatus, filterMonth, filterYear, filterFacility], () => {
  page.value = 1
  selectedIds.value = new Set()
})

watch(bp26List, () => {
  selectedIds.value = new Set()
})

function toggleSelected(id: number) {
  const next = new Set(selectedIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selectedIds.value = next
}

const columns: TableColumn<Bp26Read>[] = [
  { id: 'select' },
  { accessorKey: 'tax_month', header: 'Masa Pajak' },
  { accessorKey: 'withholding_number', header: 'Nomor Pemotongan' },
  { accessorKey: 'status', header: 'Status' },
  { accessorKey: 'electronic_signature_status', header: 'Status TTE' },
  { accessorKey: 'document_nitku', header: 'NITKU' },
  { accessorKey: 'tax_type', header: 'Jenis Pajak' },
  { accessorKey: 'tax_object_code', header: 'Kode Objek Pajak' },
  { accessorKey: 'recipient_identity_number', header: 'Nomor Identitas WP' },
  { accessorKey: 'recipient_name', header: 'Nama' },
  { accessorKey: 'dpp', header: 'DPP (Rp)' },
  { accessorKey: 'income_tax', header: 'PPh (Rp)' },
  { accessorKey: 'tax_facility', header: 'Fasilitas Pajak' },
  { id: 'actions' }
]

async function refreshAll() {
  await Promise.all([refreshList(), refreshSummary()])
}

function clearFilters() {
  filterMonth.value = undefined
  filterYear.value = undefined
  filterFacility.value = undefined
}

// --- Toolbar actions ---------------------------------------------------------

async function issueSlip(slip: Bp26Read) {
  try {
    await apiFetch<Bp26Read>(`/api/v1/bp26/${slip.id}/issue`, { method: 'POST' })
    toast.add({
      title: 'BP26 diterbitkan',
      description: `Nomor pemotongan dibuat untuk ${slip.recipient_name}.`,
      color: 'success',
      icon: 'i-lucide-check-circle'
    })
    await refreshAll()
  } catch (error) {
    toast.add({
      title: 'Gagal menerbitkan BP26',
      description: apiErrorMessage(error),
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
  }
}

async function cancelSlip(slip: Bp26Read) {
  try {
    await apiFetch<Bp26Read>(`/api/v1/bp26/${slip.id}/cancel`, {
      method: 'POST',
      body: { reason: 'Dibatalkan oleh pemotong' }
    })
    toast.add({
      title: 'BP26 dibatalkan',
      description: 'Dokumen dipindahkan ke tab Tidak Valid.',
      color: 'warning',
      icon: 'i-lucide-ban'
    })
    await refreshAll()
  } catch (error) {
    toast.add({
      title: 'Gagal membatalkan BP26',
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
      await apiFetch(`/api/v1/bp26/${id}`, { method: 'DELETE' })
      deleted += 1
    } catch {
      // keep going; report the aggregate below
    }
  }
  toast.add({
    title: `${deleted} dari ${ids.length} BP26 dihapus`,
    color: deleted === ids.length ? 'success' : 'warning',
    icon: 'i-lucide-trash-2'
  })
  await refreshAll()
}

async function issueSelected() {
  const ids = [...selectedIds.value]
  if (!ids.length) return
  try {
    const result = await apiFetch<Bp26BulkIssueResult>('/api/v1/bp26/bulk-issue', {
      method: 'POST',
      body: { ids }
    })
    toast.add({
      title: `${result.issued} BP26 diterbitkan`,
      description: result.failed ? `${result.failed} gagal diterbitkan.` : undefined,
      color: result.failed ? 'warning' : 'success',
      icon: 'i-lucide-send'
    })
    await refreshAll()
  } catch (error) {
    toast.add({
      title: 'Bulk terbitkan gagal',
      description: apiErrorMessage(error),
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
  }
}

// --- Downloads (Monitoring / Bulk Process / template) ------------------------

async function downloadFile(path: string, filename: string) {
  try {
    const blob = await $fetch<Blob>(`${config.public.apiBase}${path}`, {
      responseType: 'blob',
      headers: auth.accessToken.value
        ? { Authorization: `Bearer ${auth.accessToken.value}` }
        : {}
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
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

function exportQuery(withStatus?: Bp26Status) {
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
    onSelect: () => downloadFile(`/api/v1/bp26/export-xml${exportQuery(activeStatus.value)}`, 'bp26_export.xml')
  },
  {
    label: 'Diterbitkan Masa Pajak',
    icon: 'i-lucide-calendar-check',
    onSelect: () => downloadFile(`/api/v1/bp26/export-xml${exportQuery('issued')}`, 'bp26_issued.xml')
  },
  {
    label: 'Download CSV by Period',
    icon: 'i-lucide-file-spreadsheet',
    onSelect: () => downloadFile(`/api/v1/bp26/export-csv${exportQuery(activeStatus.value)}`, 'bp26_export.csv')
  }
])

const bulkProcessItems = computed<DropdownMenuItem[]>(() => [
  {
    label: 'Diterbitkan Masa Pajak',
    icon: 'i-lucide-send',
    disabled: activeStatus.value !== 'draft' || selectedIds.value.size === 0,
    onSelect: () => issueSelected()
  },
  {
    label: 'Download CSV by Period',
    icon: 'i-lucide-file-spreadsheet',
    onSelect: () => downloadFile(`/api/v1/bp26/export-csv${exportQuery(activeStatus.value)}`, 'bp26_export.csv')
  }
])

// --- Import modal -------------------------------------------------------------

const importOpen = ref(false)
const importFile = ref<File | null>(null)
const importing = ref(false)
const importResult = ref<Bp26ImportResult | null>(null)
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
    importResult.value = await apiFetch<Bp26ImportResult>('/api/v1/bp26/import-xml', {
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
      <strong>BP 26 - Bukti Pemotongan WP Luar Negeri</strong>
    </div>

    <div class="bupot-shell">
      <aside class="bupot-side">
        <div class="bupot-side__identity">
          <strong>{{ auth.user.value?.tenant_id ?? '0000000000000000' }}</strong>
          <span>{{ auth.user.value?.full_name }}</span>
        </div>
        <div class="bupot-side__title">
          BP 26 - Bukti Pemotongan Wajib Pajak Luar Negeri
        </div>
        <nav class="bupot-side__tabs" aria-label="Status BP26">
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
          <h1>{{ headingByStatus[activeStatus] }}</h1>
          <div class="bupot-actions">
            <UButton
              to="/siswa/bp26/create"
              icon="i-lucide-plus"
              label="Create eBupot BP26"
              class="bupot-primary-button"
            />
            <UButton
              icon="i-lucide-trash-2"
              label="Hapus"
              color="neutral"
              :disabled="activeStatus !== 'draft' || selectedIds.size === 0"
              @click="deleteSelected"
            />
            <UButton
              icon="i-lucide-send"
              label="Terbitkan"
              color="neutral"
              :disabled="activeStatus !== 'draft' || selectedIds.size === 0"
              @click="issueSelected"
            />
            <UDropdownMenu :items="monitoringItems">
              <UButton icon="i-lucide-monitor" label="Monitoring" color="neutral" variant="soft" />
            </UDropdownMenu>
            <UButton
              icon="i-lucide-upload"
              label="Impor data"
              color="neutral"
              variant="soft"
              @click="openImport"
            />
            <UDropdownMenu :items="bulkProcessItems">
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
          <UButton
            icon="i-lucide-filter-x"
            color="neutral"
            variant="soft"
            @click="clearFilters"
          />
        </div>

        <div class="bupot-table">
          <UTable
            :data="bp26List?.items ?? []"
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
              <span>{{ row.original.electronic_signature_status === 'signed' ? 'Ditandatangani' : 'Belum' }}</span>
            </template>

            <template #document_nitku-cell="{ row }">
              <span>{{ row.original.document_nitku || '-' }}</span>
            </template>

            <template #dpp-cell="{ row }">
              Rp {{ formatCurrency(row.original.dpp) }}
            </template>

            <template #income_tax-cell="{ row }">
              Rp {{ formatCurrency(row.original.income_tax) }}
            </template>

            <template #tax_facility-cell="{ row }">
              {{ facilityLabel[row.original.tax_facility] }}
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
          <p>Total: {{ bp26List?.total ?? 0 }} data</p>
          <UPagination
            v-model:page="page"
            :total="bp26List?.total ?? 0"
            :items-per-page="pageSize"
          />
        </div>
      </section>
    </div>

    <UModal
      v-model:open="importOpen"
      title="Impor data BP26"
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
              class="bp26-file-input"
              @change="onImportFileChange"
            >
          </UFormField>

          <div class="flex flex-wrap gap-2">
            <UButton
              icon="i-lucide-download"
              label="Unduh Format Data"
              color="neutral"
              variant="soft"
              @click="downloadFile('/api/v1/bp26/import-template', 'bp26_import_template.xml')"
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
            <ul class="bp26-import-results">
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
  </div>
</template>

<style scoped>
/* Import modal is BP26-only for now; shared shell styles live in main.css. */
.bp26-file-input {
  display: block;
  width: 100%;
  border: 1px solid oklch(0.89 0.014 255);
  border-radius: 0.35rem;
  font-size: 0.85rem;
  padding: 0.5rem;
}

.bp26-import-results {
  display: grid;
  gap: 0.3rem;
  max-height: 12rem;
  overflow-y: auto;
  font-size: 0.83rem;
}

.bp26-import-results li {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
</style>
