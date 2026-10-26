<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { Bp21Status, Bp21Summary, Bp26SptFlag, Paginated, SchoolClass } from '~/types/api'

/**
 * Every document module (bupot, faktur, ...) has the same monitor shape —
 * period, document number, status, counterparty, a code, a base and a tax
 * amount — but names those fields differently. `fields` maps this component's
 * display slots onto the module's row keys so one component serves all of them.
 */
interface DocumentRow {
  id: number
  tax_month: number
  tax_year: number
  status: Bp21Status
  spt_flag: Bp26SptFlag | null
  score: number | null
  teacher_feedback: string | null
  [key: string]: unknown
}

interface MonitorFields {
  number: string
  name: string
  code: string
  base: string
  tax: string
}

const props = withDefaults(
  defineProps<{
    /** Used for the useAsyncData keys and, by default, the API base and label. */
    module: string
    apiBase?: string
    label?: string
    /** Breadcrumb group above the document name, e.g. "eBupot" or "e-Faktur". */
    group?: string
    numberHeader?: string
    codeHeader?: string
    baseHeader?: string
    taxHeader?: string
    fields?: MonitorFields
    /**
     * How this module marks a document invalid. Bupot has /invalidate, faktur
     * cancels an issued document instead; null hides the action.
     */
    invalidate?: { path: string, body: Record<string, unknown> } | null
    /**
     * Whether this module supports the issued-only PATCH .../spt-flag endpoint.
     * Bupot does; faktur does not — pass false (like :invalidate="null") to hide
     * the column and the set-flag action.
     */
    sptFlag?: boolean | null
  }>(),
  {
    apiBase: undefined,
    label: undefined,
    group: 'eBupot',
    numberHeader: 'Nomor Pemotongan',
    codeHeader: 'Kode Objek Pajak',
    baseHeader: 'DPP (Rp)',
    taxHeader: 'PPh (Rp)',
    fields: () => ({
      number: 'withholding_number',
      name: 'recipient_name',
      code: 'tax_object_code',
      base: 'dpp',
      tax: 'income_tax'
    }),
    invalidate: () => ({
      path: 'invalidate',
      body: { invalid_reason: 'Ditandai tidak valid oleh guru saat review.' }
    }),
    sptFlag: true
  }
)

const label = computed(() => props.label ?? props.module.toUpperCase())
const apiBase = computed(() => props.apiBase ?? `/api/v1/${props.module}`)

function text(row: DocumentRow, key: string) {
  const value = row[key]
  return value === null || value === undefined || value === '' ? '-' : String(value)
}

function amount(row: DocumentRow, key: string) {
  return formatCurrency(Number(row[key] ?? 0))
}

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
  () => apiFetch<Bp21Summary>(`${apiBase.value}/summary`),
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
    return apiFetch<Paginated<DocumentRow>>(`${apiBase.value}?${query.toString()}`)
  },
  { watch: [activeStatus, selectedClassId, page] }
)

watch([activeStatus, selectedClassId], () => {
  page.value = 1
})

const columns = computed<TableColumn<DocumentRow>[]>(() => [
  { accessorKey: 'tax_month', header: 'Masa Pajak' },
  { id: 'number', header: props.numberHeader },
  { accessorKey: 'status', header: 'Status' },
  ...(props.sptFlag ? [{ accessorKey: 'spt_flag', header: 'Flag SPT' } as const] : []),
  { id: 'name', header: 'Nama' },
  { id: 'code', header: props.codeHeader },
  { id: 'base', header: props.baseHeader },
  { id: 'tax', header: props.taxHeader },
  { accessorKey: 'score', header: 'Nilai' },
  { id: 'actions' }
])

const selectedSlip = ref<DocumentRow | null>(null)
const reviewOpen = ref(false)
const savingReview = ref(false)
const reviewError = ref<string | null>(null)

const reviewState = reactive({
  score: undefined as number | undefined,
  teacher_feedback: ''
})

function openReview(slip: DocumentRow) {
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
    await apiFetch(`${apiBase.value}/${selectedSlip.value.id}/review`, {
      method: 'PATCH',
      body: {
        score: Number(reviewState.score),
        teacher_feedback: reviewState.teacher_feedback || null
      }
    })
    toast.add({
      title: 'Review tersimpan',
      description: text(selectedSlip.value, props.fields.name),
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

async function invalidateSlip(slip: DocumentRow) {
  if (!props.invalidate) return
  try {
    await apiFetch(`${apiBase.value}/${slip.id}/${props.invalidate.path}`, {
      method: 'POST',
      body: props.invalidate.body
    })
    toast.add({
      title: `${label.value} ditandai tidak valid`,
      description: text(slip, props.fields.name),
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

// --- SPT flag (issued-only; server enforces 409 for other statuses) -------------

const flagSlip = ref<DocumentRow | null>(null)
const flagOpen = ref(false)
const flagValue = ref<Bp26SptFlag | undefined>(undefined)
const savingFlag = ref(false)

const sptFlagModalOptions: { label: string, value: Bp26SptFlag }[] = (
  Object.entries(sptFlagLabel) as [Bp26SptFlag, string][]
).map(([value, label]) => ({ label, value }))

function openFlagModal(slip: DocumentRow) {
  if (!props.sptFlag) return
  if (slip.status !== 'issued') {
    toast.add({
      title: 'Flag SPT hanya untuk dokumen yang telah terbit',
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
    return
  }
  flagSlip.value = slip
  flagValue.value = slip.spt_flag ?? undefined
  flagOpen.value = true
}

function closeFlagModal() {
  flagOpen.value = false
}

async function saveFlag() {
  if (!flagSlip.value) return
  savingFlag.value = true
  try {
    await apiFetch(`${apiBase.value}/${flagSlip.value.id}/spt-flag`, {
      method: 'PATCH',
      body: { spt_flag: flagValue.value ?? null }
    })
    toast.add({
      title: 'Flag SPT tersimpan',
      description: text(flagSlip.value, props.fields.name),
      color: 'success',
      icon: 'i-lucide-check-circle'
    })
    flagOpen.value = false
    await refreshList()
  } catch (error) {
    toast.add({
      title: 'Gagal menyimpan flag SPT',
      description: apiErrorMessage(error),
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
  } finally {
    savingFlag.value = false
  }
}
</script>

<template>
  <div class="guru-bupot">
    <div class="guru-bupot__header">
      <div>
        <div class="bupot-breadcrumb">
          <NuxtLink to="/guru">Beranda</NuxtLink>
          <UIcon name="i-lucide-chevron-right" class="size-3.5" />
          <span>{{ group }}</span>
          <UIcon name="i-lucide-chevron-right" class="size-3.5" />
          <strong>{{ label }} Siswa</strong>
        </div>
        <h1>Monitoring {{ group }} {{ label }}</h1>
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

          <template #number-cell="{ row }">
            <span>{{ text(row.original, fields.number) }}</span>
          </template>

          <template #status-cell="{ row }">
            <UBadge :color="statusColor[row.original.status]" variant="subtle">
              {{ statusLabel[row.original.status] }}
            </UBadge>
          </template>

          <template #spt_flag-cell="{ row }">
            <UBadge v-if="row.original.spt_flag" color="info" variant="subtle">
              {{ sptFlagLabel[row.original.spt_flag] }}
            </UBadge>
            <span v-else>-</span>
          </template>

          <template #name-cell="{ row }">
            {{ text(row.original, fields.name) }}
          </template>

          <template #code-cell="{ row }">
            <UBadge color="neutral" variant="subtle">
              {{ text(row.original, fields.code) }}
            </UBadge>
          </template>

          <template #base-cell="{ row }">
            Rp {{ amount(row.original, fields.base) }}
          </template>

          <template #tax-cell="{ row }">
            Rp {{ amount(row.original, fields.tax) }}
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
                v-if="sptFlag && row.original.status === 'issued'"
                icon="i-lucide-flag"
                label="Flag SPT"
                color="neutral"
                variant="soft"
                size="xs"
                @click="openFlagModal(row.original)"
              />
              <UButton
                v-if="invalidate"
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
              <strong>{{ text(selectedSlip, fields.name) }}</strong>
            </div>
            <div>
              <span>Masa Pajak</span>
              <strong>{{ formatPeriod(selectedSlip) }}</strong>
            </div>
            <div>
              <span>{{ baseHeader }}</span>
              <strong>Rp {{ amount(selectedSlip, fields.base) }}</strong>
            </div>
            <div>
              <span>{{ taxHeader }}</span>
              <strong>Rp {{ amount(selectedSlip, fields.tax) }}</strong>
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

    <UModal
      v-model:open="flagOpen"
      :title="`Flag SPT ${label}`"
      description="Tandai status SPT/keberatan untuk dokumen yang telah terbit."
    >
      <template #body>
        <div v-if="flagSlip" class="space-y-4">
          <div class="guru-bupot__detail">
            <div>
              <span>Nama</span>
              <strong>{{ text(flagSlip, fields.name) }}</strong>
            </div>
            <div>
              <span>Masa Pajak</span>
              <strong>{{ formatPeriod(flagSlip) }}</strong>
            </div>
          </div>

          <UFormField name="spt_flag" label="Flag SPT">
            <USelect v-model="flagValue" :items="sptFlagModalOptions" class="w-full" />
          </UFormField>

          <div class="flex justify-end gap-2">
            <UButton label="Batal" color="neutral" variant="ghost" @click="closeFlagModal" />
            <UButton label="Simpan Flag" :loading="savingFlag" @click="saveFlag" />
          </div>
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
