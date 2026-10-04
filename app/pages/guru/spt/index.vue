<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type {
  SchoolClass,
  TaxReturnType,
  TaxReturnListResponse,
  TaxReturnRead,
  TaxReturnStatus,
  TaxReturnSummary
} from '~/types/api'
import { sptKindLabel, sptStatusLabel, sptTypeLabel } from '~/utils/spt'

definePageMeta({ middleware: 'role', roles: ['guru'] })

const auth = useAuth()
const { apiFetch } = useApi()
const toast = useToast()

const page = ref(1)
const pageSize = ref(25)
const filterStatus = ref<TaxReturnStatus | undefined>(undefined)
const filterClassId = ref<number | undefined>(undefined)

const statusOptions = [
  { label: 'Semua Status', value: undefined as TaxReturnStatus | undefined },
  ...Object.entries(sptStatusLabel).map(([value, label]) => ({
    label,
    value: value as TaxReturnStatus | undefined
  }))
]

const { data: classes } = useAsyncData(
  'guru-spt-classes',
  () => apiFetch<SchoolClass[]>('/api/v1/classes'),
  { default: () => [] as SchoolClass[] }
)

const classOptions = computed(() => [
  { label: 'Semua Kelas', value: undefined as number | undefined },
  ...classes.value.map(item => ({
    label: `${item.name} (${item.academic_year})`,
    value: item.id as number | undefined
  }))
])

const { data: summary, refresh: refreshSummary } = useAsyncData(
  'guru-spt-summary',
  () => apiFetch<TaxReturnSummary>('/api/v1/spt/summary'),
  { default: () => ({ draft: 0, awaiting_payment: 0, reported: 0, total: 0 }) }
)

const { data: sptList, status: listStatus, refresh: refreshList } = useAsyncData(
  'guru-spt-list',
  () => {
    const query = new URLSearchParams({
      page: String(page.value),
      size: String(pageSize.value)
    })
    if (filterStatus.value) query.set('status', filterStatus.value)
    if (filterClassId.value) query.set('class_id', String(filterClassId.value))
    return apiFetch<TaxReturnListResponse>(`/api/v1/spt?${query.toString()}`)
  },
  { watch: [page, pageSize, filterStatus, filterClassId] }
)

watch([filterStatus, filterClassId, pageSize], () => {
  page.value = 1
})

async function refreshAll() {
  await Promise.all([refreshList(), refreshSummary()])
}

const reviewTarget = ref<TaxReturnRead | null>(null)
const reviewOpen = ref(false)
const reviewScore = ref<number | undefined>(undefined)
const reviewFeedback = ref('')
const busy = ref(false)

function openReview(row: TaxReturnRead) {
  reviewTarget.value = row
  reviewScore.value = row.score ?? undefined
  reviewFeedback.value = row.teacher_feedback ?? ''
  reviewOpen.value = true
}

function closeReview() {
  reviewTarget.value = null
  reviewOpen.value = false
}

async function saveReview() {
  const target = reviewTarget.value
  if (!target || reviewScore.value === undefined) {
    toast.add({ title: 'Isi skor terlebih dahulu', color: 'error', icon: 'i-lucide-circle-alert' })
    return
  }
  busy.value = true
  try {
    await apiFetch(`/api/v1/spt/${target.id}/review`, {
      method: 'PATCH',
      body: { score: reviewScore.value, teacher_feedback: reviewFeedback.value || null }
    })
    toast.add({ title: 'Penilaian tersimpan', color: 'success', icon: 'i-lucide-check-circle' })
    reviewTarget.value = null
    await refreshAll()
  } catch (error) {
    toast.add({ title: 'Gagal menyimpan penilaian', description: apiErrorMessage(error), color: 'error', icon: 'i-lucide-circle-alert' })
  } finally {
    busy.value = false
  }
}

const columns: TableColumn<TaxReturnRead>[] = [
  { accessorKey: 'return_type', header: 'Jenis Pajak' },
  { accessorKey: 'tax_month', header: 'Masa Pajak' },
  { accessorKey: 'tax_year', header: 'Tahun' },
  { accessorKey: 'kind', header: 'Jenis SPT' },
  { accessorKey: 'status', header: 'Status' },
  { id: 'amount', header: 'Jumlah (Rp)' },
  { accessorKey: 'score', header: 'Nilai' },
  { id: 'actions' }
]
</script>

<template>
  <div class="bupot-page">
    <div class="bupot-breadcrumb">
      <NuxtLink to="/guru">Beranda</NuxtLink>
      <UIcon name="i-lucide-chevron-right" class="size-3.5" />
      <strong>SPT Siswa</strong>
    </div>

    <div class="bupot-shell">
      <aside class="bupot-side">
        <div class="bupot-side__identity">
          <strong>{{ auth.user.value?.tenant_id ?? '0000000000000000' }}</strong>
          <span>{{ auth.user.value?.full_name }}</span>
        </div>
        <div class="bupot-side__title">Monitor SPT</div>
        <div class="bupot-side__stats">
          <div><span>Konsep</span><strong>{{ summary.draft }}</strong></div>
          <div><span>Menunggu Bayar</span><strong>{{ summary.awaiting_payment }}</strong></div>
          <div><span>Dilaporkan</span><strong>{{ summary.reported }}</strong></div>
        </div>
      </aside>

      <section class="bupot-main">
        <div class="bupot-main__header"><h1>SPT Siswa</h1></div>

        <div class="bupot-toolbar">
          <UButton icon="i-lucide-refresh-cw" color="info" variant="soft" :loading="listStatus === 'pending'" @click="refreshAll" />
        </div>

        <div class="faktur-table__filters">
          <USelect v-model="filterStatus" :items="statusOptions" placeholder="Semua Status" size="xs" class="min-w-52" />
          <USelect v-model="filterClassId" :items="classOptions" placeholder="Semua Kelas" size="xs" class="min-w-52" />
        </div>

        <div class="faktur-table">
          <UTable :data="sptList?.items ?? []" :columns="columns" :loading="listStatus === 'pending'">
            <template #return_type-cell="{ row }">{{ sptTypeLabel[row.original.return_type] }}</template>
            <template #tax_month-cell="{ row }">{{ monthLabels[row.original.tax_month] }}</template>
            <template #kind-cell="{ row }">
              <UBadge color="neutral" variant="subtle">{{ sptKindLabel[row.original.kind] }}{{ row.original.correction_no > 0 ? ` ${row.original.correction_no}` : '' }}</UBadge>
            </template>
            <template #status-cell="{ row }">
              <UBadge variant="subtle" :color="row.original.status === 'reported' ? 'success' : row.original.status === 'awaiting_payment' ? 'info' : 'warning'">
                {{ sptStatusLabel[row.original.status] }}
              </UBadge>
            </template>
            <template #amount-cell="{ row }">Rp {{ formatCurrency(row.original.amount_due) }}</template>
            <template #score-cell="{ row }">{{ row.original.score ?? '-' }}</template>
            <template #actions-cell="{ row }">
              <div class="flex justify-end gap-1">
                <UButton icon="i-lucide-clipboard-check" size="xs" label="Nilai" @click="openReview(row.original)" />
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

    <UModal v-model:open="reviewOpen" title="Nilai SPT">
      <template #body>
        <div class="flex flex-col gap-3">
          <p v-if="reviewTarget" class="text-sm">
            {{ sptTypeLabel[reviewTarget.return_type] }} — Masa {{ monthLabels[reviewTarget.tax_month] }} {{ reviewTarget.tax_year }}
          </p>
          <UFormField label="Skor (0-100)" required>
            <UInputNumber v-model="reviewScore" :min="0" :max="100" class="w-full" />
          </UFormField>
          <UFormField label="Umpan Balik">
            <UTextarea v-model="reviewFeedback" :rows="3" class="w-full" placeholder="Catatan untuk siswa" />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton label="Batal" color="neutral" variant="ghost" @click="closeReview" />
          <UButton label="Simpan" :loading="busy" @click="saveReview" />
        </div>
      </template>
    </UModal>
  </div>
</template>
