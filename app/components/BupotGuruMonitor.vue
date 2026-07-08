<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { Bp21Status, Bp21Summary, Paginated, SchoolClass } from '~/types/api'

// Fields shared by every bupot read schema that this monitor renders.
interface BupotRow {
  id: number
  tax_month: number
  tax_year: number
  status: Bp21Status
  withholding_number: string | null
  recipient_name: string
  tax_object_code: string
  dpp: number
  income_tax: number
  score: number | null
  teacher_feedback: string | null
}

const props = defineProps<{ module: 'bp21' | 'bp26' }>()

const label = props.module.toUpperCase()
const apiBase = `/api/v1/${props.module}`

const { apiFetch } = useApi()
const toast = useToast()

const activeStatus = ref<Bp21Status | 'all'>('all')
const selectedClassId = ref<number | undefined>(undefined)
const page = ref(1)
const pageSize = 10

const statusOptions: { label: string, value: Bp21Status | 'all' }[] = [
  { label: 'Semua Status', value: 'all' },
  ...statusTabs
]

const { data: classes } = useAsyncData(
  `guru-${props.module}-classes`,
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
  `guru-${props.module}-summary`,
  () => apiFetch<Bp21Summary>(`${apiBase}/summary`),
  { default: () => ({ draft: 0, issued: 0, invalid: 0, total: 0 }) }
)

const { data: slipList, status: listStatus, refresh: refreshList } = useAsyncData(
  `guru-${props.module}-list`,
  () => {
    const query = new URLSearchParams({
      page: String(page.value),
      size: String(pageSize)
    })
    if (activeStatus.value !== 'all') query.set('status', activeStatus.value)
    if (selectedClassId.value !== undefined) query.set('class_id', String(selectedClassId.value))
    return apiFetch<Paginated<BupotRow>>(`${apiBase}?${query.toString()}`)
  },
  { watch: [activeStatus, selectedClassId, page] }
)

watch([activeStatus, selectedClassId], () => {
  page.value = 1
})

const columns: TableColumn<BupotRow>[] = [
  { accessorKey: 'tax_month', header: 'Masa Pajak' },
  { accessorKey: 'withholding_number', header: 'Nomor Pemotongan' },
  { accessorKey: 'status', header: 'Status' },
  { accessorKey: 'recipient_name', header: 'Nama' },
  { accessorKey: 'tax_object_code', header: 'Kode Objek Pajak' },
  { accessorKey: 'dpp', header: 'DPP (Rp)' },
  { accessorKey: 'income_tax', header: 'PPh (Rp)' },
  { accessorKey: 'score', header: 'Nilai' },
  { id: 'actions' }
]

const selectedSlip = ref<BupotRow | null>(null)
const reviewOpen = ref(false)
const savingReview = ref(false)
const reviewError = ref<string | null>(null)

const reviewState = reactive({
  score: undefined as number | undefined,
  teacher_feedback: ''
})

function openReview(slip: BupotRow) {
  selectedSlip.value = slip
  reviewState.score = slip.score ?? undefined
  reviewState.teacher_feedback = slip.teacher_feedback ?? ''
  reviewError.value = null
  reviewOpen.value = true
}

function validateReview(state: Partial<typeof reviewState>) {
  const errors: { name: string, message: string }[] = []
  if (state.score === undefined || state.score === null) {
    errors.push({ name: 'score', message: 'Nilai wajib diisi' })
  } else if (Number(state.score) < 0 || Number(state.score) > 100) {
    errors.push({ name: 'score', message: 'Nilai harus 0 sampai 100' })
  }
  return errors
}

function closeReview() {
  reviewOpen.value = false
}

async function saveReview() {
  if (!selectedSlip.value) return
  savingReview.value = true
  reviewError.value = null
  try {
    await apiFetch(`${apiBase}/${selectedSlip.value.id}/review`, {
      method: 'PATCH',
      body: {
        score: Number(reviewState.score),
        teacher_feedback: reviewState.teacher_feedback || null
      }
    })
    toast.add({
      title: 'Review tersimpan',
      description: selectedSlip.value.recipient_name,
      color: 'success',
      icon: 'i-lucide-check-circle'
    })
    reviewOpen.value = false
    await refreshList()
  } catch (error) {
    reviewError.value = apiErrorMessage(error, 'Gagal menyimpan review.')
  } finally {
    savingReview.value = false
  }
}

async function invalidateSlip(slip: BupotRow) {
  try {
    await apiFetch(`${apiBase}/${slip.id}/invalidate`, {
      method: 'POST',
      body: { invalid_reason: 'Ditandai tidak valid oleh guru saat review.' }
    })
    toast.add({
      title: `${label} ditandai tidak valid`,
      description: slip.recipient_name,
      color: 'warning',
      icon: 'i-lucide-triangle-alert'
    })
    await Promise.all([refreshList(), refreshSummary()])
  } catch (error) {
    toast.add({
      title: 'Gagal menandai tidak valid',
      description: apiErrorMessage(error),
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
  }
}

async function refreshAll() {
  await Promise.all([refreshList(), refreshSummary()])
}
</script>

<template>
  <div class="guru-bupot">
    <div class="guru-bupot__header">
      <div>
        <div class="bupot-breadcrumb">
          <NuxtLink to="/guru">Beranda</NuxtLink>
          <UIcon name="i-lucide-chevron-right" class="size-3.5" />
          <span>eBupot</span>
          <UIcon name="i-lucide-chevron-right" class="size-3.5" />
          <strong>{{ label }} Siswa</strong>
        </div>
        <h1>Monitoring eBupot {{ label }}</h1>
      </div>
      <UButton icon="i-lucide-refresh-cw" color="neutral" variant="soft" @click="refreshAll" />
    </div>

    <div class="guru-bupot__stats">
      <div>
        <span>Belum Terbit</span>
        <strong>{{ summary.draft }}</strong>
      </div>
      <div>
        <span>Telah Terbit</span>
        <strong>{{ summary.issued }}</strong>
      </div>
      <div>
        <span>Tidak Valid</span>
        <strong>{{ summary.invalid }}</strong>
      </div>
      <div>
        <span>Total</span>
        <strong>{{ summary.total }}</strong>
      </div>
    </div>

    <UCard>
      <template #header>
        <div class="guru-bupot__toolbar">
          <div>
            <h2>Daftar {{ label }}</h2>
            <p>Dokumen siswa dari kelas yang Anda ajar.</p>
          </div>
          <div class="guru-bupot__filters">
            <USelect v-model="selectedClassId" :items="classOptions" class="w-64" />
            <USelect v-model="activeStatus" :items="statusOptions" class="w-44" />
          </div>
        </div>
      </template>

      <div class="overflow-x-auto">
        <UTable
          :data="slipList?.items ?? []"
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

          <template #income_tax-cell="{ row }">
            Rp {{ formatCurrency(row.original.income_tax) }}
          </template>

          <template #score-cell="{ row }">
            <span>{{ row.original.score ?? '-' }}</span>
          </template>

          <template #actions-cell="{ row }">
            <div class="flex justify-end gap-1">
              <UButton
                icon="i-lucide-clipboard-check"
                label="Review"
                size="xs"
                @click="openReview(row.original)"
              />
              <UButton
                icon="i-lucide-ban"
                color="error"
                variant="soft"
                size="xs"
                :disabled="row.original.status === 'invalid'"
                @click="invalidateSlip(row.original)"
              />
            </div>
          </template>

          <template #empty>
            <p class="py-8 text-center text-sm text-muted">
              Tidak ada data yang ditemukan.
            </p>
          </template>
        </UTable>
      </div>

      <template #footer>
        <div class="guru-bupot__footer">
          <p>Total: {{ slipList?.total ?? 0 }} data</p>
          <UPagination
            v-model:page="page"
            :total="slipList?.total ?? 0"
            :items-per-page="pageSize"
          />
        </div>
      </template>
    </UCard>

    <UModal
      v-model:open="reviewOpen"
      :title="`Review ${label}`"
      description="Berikan nilai dan umpan balik untuk dokumen siswa."
    >
      <template #body>
        <div v-if="selectedSlip" class="space-y-4">
          <div class="guru-bupot__detail">
            <div>
              <span>Nama</span>
              <strong>{{ selectedSlip.recipient_name }}</strong>
            </div>
            <div>
              <span>Masa Pajak</span>
              <strong>{{ formatPeriod(selectedSlip) }}</strong>
            </div>
            <div>
              <span>DPP</span>
              <strong>Rp {{ formatCurrency(selectedSlip.dpp) }}</strong>
            </div>
            <div>
              <span>PPh</span>
              <strong>Rp {{ formatCurrency(selectedSlip.income_tax) }}</strong>
            </div>
          </div>

          <UForm :state="reviewState" :validate="validateReview" class="space-y-4" @submit="saveReview">
            <UAlert
              v-if="reviewError"
              color="error"
              variant="subtle"
              icon="i-lucide-circle-alert"
              :title="reviewError"
            />

            <UFormField name="score" label="Nilai" required>
              <UInput v-model="reviewState.score" type="number" min="0" max="100" class="w-full" />
            </UFormField>

            <UFormField name="teacher_feedback" label="Feedback">
              <UTextarea
                v-model="reviewState.teacher_feedback"
                autoresize
                class="w-full"
              />
            </UFormField>

            <div class="flex justify-end gap-2">
              <UButton label="Batal" color="neutral" variant="ghost" @click="closeReview" />
              <UButton type="submit" label="Simpan Review" :loading="savingReview" />
            </div>
          </UForm>
        </div>
      </template>
    </UModal>
  </div>
</template>

<style scoped>
.guru-bupot {
  display: grid;
  gap: 1rem;
}

.guru-bupot__header,
.guru-bupot__toolbar,
.guru-bupot__filters,
.guru-bupot__footer {
  display: flex;
  align-items: center;
}

.guru-bupot__header,
.guru-bupot__toolbar,
.guru-bupot__footer {
  justify-content: space-between;
  gap: 1rem;
}

.guru-bupot__header h1 {
  margin-top: 0.35rem;
  color: oklch(0.25 0.025 265);
  font-size: 1.5rem;
  font-weight: 850;
}

.guru-bupot__stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.85rem;
}

.guru-bupot__stats div {
  display: grid;
  gap: 0.2rem;
  border: 1px solid oklch(0.89 0.014 255);
  border-radius: 0.35rem;
  background: oklch(0.99 0.004 250);
  padding: 0.85rem 1rem;
}

.guru-bupot__stats span,
.guru-bupot__toolbar p,
.guru-bupot__footer {
  color: oklch(0.45 0.035 260);
  font-size: 0.85rem;
}

.guru-bupot__stats strong {
  color: oklch(0.27 0.075 270);
  font-size: 1.45rem;
  line-height: 1;
}

.guru-bupot__toolbar h2 {
  color: oklch(0.27 0.075 270);
  font-weight: 800;
}

.guru-bupot__filters {
  flex-wrap: wrap;
  justify-content: end;
  gap: 0.5rem;
}

.guru-bupot__detail {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.6rem;
}

.guru-bupot__detail div {
  display: grid;
  gap: 0.15rem;
  border: 1px solid oklch(0.91 0.012 255);
  border-radius: 0.35rem;
  padding: 0.7rem;
}

.guru-bupot__detail span {
  color: oklch(0.45 0.035 260);
  font-size: 0.78rem;
}

.guru-bupot__detail strong {
  color: oklch(0.28 0.075 270);
  font-size: 0.92rem;
}

@media (max-width: 980px) {
  .guru-bupot__header,
  .guru-bupot__toolbar,
  .guru-bupot__footer {
    align-items: flex-start;
    flex-direction: column;
  }

  .guru-bupot__stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .guru-bupot__filters {
    justify-content: flex-start;
  }
}

@media (max-width: 620px) {
  .guru-bupot__stats,
  .guru-bupot__detail {
    grid-template-columns: 1fr;
  }
}
</style>
