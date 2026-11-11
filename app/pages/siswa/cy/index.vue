<script setup lang="ts">
import type { DropdownMenuItem, TableColumn } from '@nuxt/ui'
import type { Bp26BulkIssueResult, CyListResponse, CyRead, CyStatus, CySummary } from '~/types/api'

definePageMeta({ middleware: 'role', roles: ['siswa'] })

const auth = useAuth()
const { apiFetch } = useApi()
const toast = useToast()

const activeStatus = ref<CyStatus>('draft')
const page = ref(1)
const pageSize = 10

const filterMonth = ref<number | undefined>(undefined)
const filterYear = ref<number | undefined>(undefined)

const { data: summary, refresh: refreshSummary } = useAsyncData(
  'siswa-cy-summary',
  () => apiFetch<CySummary>('/api/v1/cy/summary'),
  { default: () => ({ draft: 0, issued: 0, invalid: 0, total: 0 }) }
)

const { data: cyList, status: listStatus, refresh: refreshList } = useAsyncData(
  'siswa-cy-list',
  () => {
    const query = new URLSearchParams({
      status: activeStatus.value,
      page: String(page.value),
      size: String(pageSize)
    })
    if (filterMonth.value !== undefined) query.set('tax_month', String(filterMonth.value))
    if (filterYear.value) query.set('tax_year', String(filterYear.value))
    return apiFetch<CyListResponse>(`/api/v1/cy?${query.toString()}`)
  },
  { watch: [activeStatus, page, filterMonth, filterYear] }
)

const selectedIds = ref(new Set<number>())
const { cancelling, cancelSelected } = useBupotBulkCancel('cy', selectedIds, () => refreshAll())

watch([activeStatus, filterMonth, filterYear], () => {
  page.value = 1
  selectedIds.value = new Set()
})

watch(cyList, () => {
  selectedIds.value = new Set()
})

function toggleSelected(id: number) {
  const next = new Set(selectedIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selectedIds.value = next
}

const baseColumns: TableColumn<CyRead>[] = [
  { id: 'select' },
  { accessorKey: 'tax_month', header: 'Masa Pajak' },
  { accessorKey: 'withholding_number', header: 'Nomor Pemotongan' },
  { accessorKey: 'status', header: 'Status' },
  { accessorKey: 'document_nitku', header: 'NITKU/Nomor Identitas Sub Unit Organisasi' },
  { accessorKey: 'tax_type', header: 'Jenis Pajak' },
  { accessorKey: 'tax_object_code', header: 'Kode Objek Pajak' },
  { accessorKey: 'dpp', header: 'Dasar Pengenaan Pajak (Rp)' },
  { accessorKey: 'income_tax', header: 'Pajak Penghasilan (Rp)' },
  { accessorKey: 'tax_facility', header: 'Fasilitas Pajak' }
]
const columns = computed<TableColumn<CyRead>[]>(() => [...baseColumns, ...(activeStatus.value === 'issued' ? sptFlagColumns.map(flag => ({ id: flag.value, accessorKey: 'spt_flag', header: flag.label })) : []), { id: 'actions' }])

async function issueSlip(slip: CyRead) {
  pendingSlip.value = slip
  signerName.value = auth.user.value?.full_name || ''
  kodeOtorisasi.value = ''
  showIssueModal.value = true
}

async function confirmIssue() {
  if (!pendingSlip.value) return
  issuing.value = true
  try {
    await apiFetch<CyRead>(`/api/v1/cy/${pendingSlip.value.id}/issue`, {
      method: 'POST',
      body: { signer_name: signerName.value || undefined, kode_otorisasi: kodeOtorisasi.value || undefined }
    })
    toast.add({
      title: 'CY diterbitkan',
      description: 'BPE-SIM dibuat.',
      color: 'success',
      icon: 'i-lucide-check-circle'
    })
    showIssueModal.value = false
    pendingSlip.value = null
    activeStatus.value = 'issued' as typeof activeStatus.value
    await Promise.all([refreshList(), refreshSummary()])
  } catch (error) {
    toast.add({
      title: 'Gagal menerbitkan CY',
      description: apiErrorMessage(error),
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
  } finally {
    issuing.value = false
  }
}

async function downloadPdf(slip: CyRead) {
  try {
    const blob = await apiFetch<Blob>(`/api/v1/cy/${slip.id}/pdf`, { responseType: 'blob' } as never)
    window.open(URL.createObjectURL(blob), '_blank')
  } catch (error) {
    toast.add({
      title: 'Gagal mengunduh BPE',
      description: apiErrorMessage(error),
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
  }
}

const showIssueModal = ref(false)
const issuing = ref(false)
const pendingSlip = ref<CyRead | null>(null)
const signerName = ref('')
const kodeOtorisasi = ref('')

async function refreshAll() {
  await Promise.all([refreshList(), refreshSummary()])
}

function clearFilters() {
  filterMonth.value = undefined
  filterYear.value = undefined
}

async function deleteSelected() {
  const ids = [...selectedIds.value]
  if (!ids.length) return
  let deleted = 0
  for (const id of ids) {
    try {
      await apiFetch(`/api/v1/cy/${id}`, { method: 'DELETE' })
      deleted += 1
    } catch {
      // keep going; report the aggregate below
    }
  }
  toast.add({
    title: `${deleted} dari ${ids.length} CY dihapus`,
    color: deleted === ids.length ? 'success' : 'warning',
    icon: 'i-lucide-trash-2'
  })
  await refreshAll()
}

async function issueSelected() {
  const ids = [...selectedIds.value]
  if (!ids.length) return
  try {
    const result = await apiFetch<Bp26BulkIssueResult>('/api/v1/cy/bulk-issue', {
      method: 'POST',
      body: { ids }
    })
    toast.add({
      title: `${result.issued} CY diterbitkan`,
      description: result.failed ? `${result.failed} gagal diterbitkan.` : undefined,
      color: result.failed ? 'warning' : 'success',
      icon: 'i-lucide-send'
    })
    activeStatus.value = 'issued' as typeof activeStatus.value
    await refreshAll()
  } catch (error) {
    toast.add({
      title: 'Terbitkan massal gagal',
      description: apiErrorMessage(error),
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
  }
}

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

function exportQuery(withStatus?: CyStatus) {
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
    onSelect: () => downloadFile(`/api/v1/cy/export-xml${exportQuery(activeStatus.value)}`, 'cy_export.xml')
  },
  {
    label: 'Diterbitkan Masa Pajak',
    icon: 'i-lucide-calendar-check',
    onSelect: () => downloadFile(`/api/v1/cy/export-xml${exportQuery('issued')}`, 'cy_issued.xml')
  },
  {
    label: 'Unduh CSV per Masa',
    icon: 'i-lucide-file-spreadsheet',
    onSelect: () => downloadFile(`/api/v1/cy/export-csv${exportQuery(activeStatus.value)}`, 'cy_export.csv')
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
    label: 'Unduh CSV per Masa',
    icon: 'i-lucide-file-spreadsheet',
    onSelect: () => downloadFile(`/api/v1/cy/export-csv${exportQuery(activeStatus.value)}`, 'cy_export.csv')
  }
])
</script>

<template>
  <div class="bupot-page">
    <div class="bupot-breadcrumb">
      <NuxtLink to="/siswa">Beranda</NuxtLink>
      <UIcon name="i-lucide-chevron-right" class="size-3.5" />
      <span>eBupot</span>
      <UIcon name="i-lucide-chevron-right" class="size-3.5" />
      <strong>CY - Pemotongan Digunggung</strong>
    </div>

    <div class="bupot-shell">
      <aside class="bupot-side">
        <div class="bupot-side__identity">
          <strong>{{ auth.user.value?.tenant_id ?? '0000000000000000' }}</strong>
          <span>{{ auth.user.value?.full_name }}</span>
        </div>
        <div class="bupot-side__title">
          CY - Pemotongan Digunggung
        </div>
        <nav class="bupot-side__tabs" aria-label="Status cy">
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
          <h1>{{ bupotTitle('cy', activeStatus) }}</h1>
          <div class="bupot-actions">
            <UButton v-if="bupotToolbarVisible('create', activeStatus)"
              to="/siswa/cy/create"
              icon="i-lucide-plus"
              label="Create eBupot CY"
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
              @click="issueSelected"
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
          <UButton
            icon="i-lucide-filter-x"
            color="neutral"
            variant="soft"
            @click="clearFilters"
          />
        </div>

        <div class="bupot-table">
          <UTable
            :data="cyList?.items ?? []"
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

            <template #document_nitku-cell="{ row }">
              <span>{{ row.original.document_nitku || row.original.withholder_nitku || '-' }}</span>
            </template>

            <template #tax_type-cell="{ row }">
              {{ row.original.tax_type || row.original.income_type || '-' }}
            </template>

            <template #tax_facility-cell="{ row }">
              {{ facilityLabel[row.original.tax_facility] }}
            </template>

            <template #dpp-cell="{ row }">
              Rp {{ formatCurrency(row.original.dpp) }}
            </template>

            <template #tax_object_code-cell="{ row }">
              <UBadge color="neutral" variant="subtle">
                {{ row.original.tax_object_code }}
              </UBadge>
            </template>

            <template #income_tax-cell="{ row }">
              <span :title="`Bruto Rp ${formatCurrency(row.original.gross_income ?? row.original.dpp)} • PPh Rp ${formatCurrency(row.original.income_tax)}`">Rp {{ formatCurrency(row.original.income_tax) }}</span>
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
                  @click="issueSlip(row.original)"
                />
                <UButton
                  v-else-if="row.original.status === 'issued'"
                  icon="i-lucide-file-down"
                  label="BPE"
                  size="xs"
                  color="neutral"
                  variant="soft"
                  @click="downloadPdf(row.original)"
                />
                <UBadge
                  v-if="row.original.status !== 'draft' && row.original.score !== null"
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
          <p>Total: {{ cyList?.total ?? 0 }} data</p>
          <UPagination
            v-model:page="page"
            :total="cyList?.total ?? 0"
            :items-per-page="pageSize"
          />
        </div>
      </section>
    </div>

    <UModal v-model:open="showIssueModal" title="Terbitkan CY (simulasi TTE)">
      <template #body>
        <p class="text-sm text-muted mb-3">
          Penandatangan simulasi + Kode Otorisasi simulasi (min 6 karakter). Bukan TTE resmi.
        </p>
        <UFormField name="signer_name" label="Nama penandatangan" required>
          <UInput v-model="signerName" class="w-full" />
        </UFormField>
        <UFormField name="kode_otorisasi" label="Kode Otorisasi (simulasi)" required class="mt-3">
          <UInput v-model="kodeOtorisasi" type="password" placeholder="min 6 karakter" class="w-full" />
        </UFormField>
      </template>
      <template #footer>
        <UButton color="neutral" variant="ghost" label="Batal" @click="() => { showIssueModal = false }" />
        <UButton label="Terbitkan + Tanda tangani" icon="i-lucide-pen-line" :loading="issuing" @click="confirmIssue" />
      </template>
    </UModal>
  </div>
</template>
