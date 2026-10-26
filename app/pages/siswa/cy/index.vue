<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { CyListResponse, CyRead, CyStatus, CySummary } from '~/types/api'

definePageMeta({ middleware: 'role', roles: ['siswa'] })

const auth = useAuth()
const { apiFetch } = useApi()
const toast = useToast()

const activeStatus = ref<CyStatus>('draft')
const page = ref(1)
const pageSize = 10

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
    return apiFetch<CyListResponse>(`/api/v1/cy?${query.toString()}`)
  },
  { watch: [activeStatus, page] }
)

watch(activeStatus, () => {
  page.value = 1
})

const columns: TableColumn<CyRead>[] = [
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
      title: 'cy diterbitkan',
      description: `BPE-SIM dibuat untuk ${pendingSlip.value.recipient_name}.`,
      color: 'success',
      icon: 'i-lucide-check-circle'
    })
    showIssueModal.value = false
    pendingSlip.value = null
    await Promise.all([refreshList(), refreshSummary()])
  } catch (error) {
    toast.add({
      title: 'Gagal menerbitkan cy',
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
          <h1>EBUPOT cy {{ activeStatus === 'draft' ? 'NOT ISSUED' : statusLabel[activeStatus].toUpperCase() }}</h1>
          <div class="bupot-actions">
            <UButton
              to="/siswa/cy/create"
              icon="i-lucide-plus"
              label="Create eBupot cy"
              class="bupot-primary-button"
            />
            <UButton icon="i-lucide-trash-2" label="Hapus" color="neutral" disabled />
            <UButton icon="i-lucide-send" label="Terbitkan" color="neutral" disabled />
            <UButton icon="i-lucide-refresh-cw" color="neutral" variant="soft" @click="refreshAll" />
          </div>
        </div>

        <div class="bupot-toolbar">
          <UButton icon="i-lucide-refresh-cw" color="info" variant="soft" @click="refreshAll" />
          <UButton icon="i-lucide-file" color="neutral" variant="solid" disabled />
          <UButton icon="i-lucide-file-spreadsheet" color="success" variant="solid" disabled />
          <UButton icon="i-lucide-file-text" color="error" variant="solid" disabled />
          <UButton icon="i-lucide-filter-x" color="neutral" variant="soft" disabled />
        </div>

        <div class="bupot-table">
          <UTable
            :data="cyList?.items ?? []"
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

            <template #tax_object_code-cell="{ row }">
              <UBadge color="neutral" variant="subtle">
                {{ row.original.tax_object_code }}
              </UBadge>
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

    <UModal v-model:open="showIssueModal" title="Terbitkan cy (simulasi TTE)">
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
