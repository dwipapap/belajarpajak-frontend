<script setup lang="ts">
import type { ClassDetail, DashboardSummary, SchoolClass, TaxReturnSummary } from '~/types/api'

definePageMeta({ middleware: 'role', roles: ['guru'] })

const { apiFetch } = useApi()

const { data: summary } = useAsyncData(
  'guru-summary',
  () => apiFetch<DashboardSummary>('/api/v1/dashboard/summary')
)

/** Rekap pembayaran yang perlu perhatian — dihitung di client dari list tenant. */
interface PbkMini { status: string }
interface TagihanMini { status: string }
interface AngsuranMini { status: string }
const { data: pbkList } = useAsyncData(
  'guru-dashboard-pbk',
  () => apiFetch<{ items: PbkMini[]; total: number }>('/api/v1/pbk', { query: { page: 1, size: 100 } }),
  { default: () => ({ items: [], total: 0 }) }
)
const { data: tagihanList } = useAsyncData(
  'guru-dashboard-tagihan',
  () => apiFetch<{ items: TagihanMini[]; total: number }>('/api/v1/tagihan', { query: { page: 1, size: 100 } }),
  { default: () => ({ items: [], total: 0 }) }
)
const { data: angsuranList } = useAsyncData(
  'guru-dashboard-angsuran',
  () => apiFetch<{ items: AngsuranMini[]; total: number }>('/api/v1/angsuran', { query: { page: 1, size: 100 } }),
  { default: () => ({ items: [], total: 0 }) }
)
const pbkMenunggu = computed(() => pbkList.value.items.filter(i => i.status === 'diajukan').length)
const tagihanBelum = computed(() => tagihanList.value.items.filter(i => i.status === 'belum').length)
const angsuranBerjalan = computed(() => angsuranList.value.items.filter(i => i.status === 'berjalan').length)

/** SPT dilaporkan yang belum diberi nilai — antrean penilaian guru. */
const { data: sptSummary } = useAsyncData(
  'guru-dashboard-spt-summary',
  () => apiFetch<TaxReturnSummary>('/api/v1/spt/summary'),
  { default: () => ({ draft: 0, awaiting_payment: 0, reported: 0, total: 0 }) }
)

const { data: classes, status: classesStatus } = useAsyncData(
  'guru-classes',
  () => apiFetch<SchoolClass[]>('/api/v1/classes'),
  { default: () => [] as SchoolClass[] }
)

const statCards = computed(() => [
  { label: 'Kelas Saya', value: summary.value?.classes ?? 0, icon: 'i-lucide-book-open' },
  { label: 'Siswa Terdaftar', value: summary.value?.siswa ?? 0, icon: 'i-lucide-graduation-cap' }
])

// ---- Class detail (enrolled students) --------------------------------------
const selectedClassId = ref<number | null>(null)

const { data: classDetail, status: detailStatus } = useAsyncData(
  'guru-class-detail',
  async () =>
    selectedClassId.value === null
      ? null
      : await apiFetch<ClassDetail>(`/api/v1/classes/${selectedClassId.value}`),
  { watch: [selectedClassId] }
)

function selectClass(id: number) {
  selectedClassId.value = selectedClassId.value === id ? null : id
}
</script>

<template>
  <div class="space-y-6">
    <h1 class="text-2xl font-semibold text-default">Dasbor Guru</h1>

    <!-- Perlu perhatian: rekap pembayaran -->
    <UCard>
      <template #header>
        <h2 class="font-semibold text-default">Perlu Perhatian</h2>
      </template>
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div class="flex items-center justify-between gap-2 rounded-lg bg-elevated/50 px-4 py-3">
          <div>
            <p class="text-sm text-muted">Pbk menunggu</p>
            <p class="text-2xl font-semibold text-default">{{ pbkMenunggu }}</p>
          </div>
          <UButton to="/guru/pbk" size="sm" color="neutral" variant="ghost" icon="i-lucide-arrow-right" label="Pbk" />
        </div>
        <div class="flex items-center justify-between gap-2 rounded-lg bg-elevated/50 px-4 py-3">
          <div>
            <p class="text-sm text-muted">Tagihan belum dibilling</p>
            <p class="text-2xl font-semibold text-default">{{ tagihanBelum }}</p>
          </div>
          <UButton to="/guru/tagihan" size="sm" color="neutral" variant="ghost" icon="i-lucide-arrow-right" label="Tagihan" />
        </div>
        <div class="flex items-center justify-between gap-2 rounded-lg bg-elevated/50 px-4 py-3">
          <div>
            <p class="text-sm text-muted">Angsuran berjalan</p>
            <p class="text-2xl font-semibold text-default">{{ angsuranBerjalan }}</p>
          </div>
          <UButton to="/guru/angsuran" size="sm" color="neutral" variant="ghost" icon="i-lucide-arrow-right" label="Angsuran" />
        </div>
      </div>
      <div class="mt-3">
        <UButton to="/guru/deposit" size="sm" color="neutral" variant="outline" icon="i-lucide-wallet" label="Rekap Deposit" />
      </div>
    </UCard>

    <!-- Stat cards -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <UCard v-for="card in statCards" :key="card.label">
        <div class="flex items-center gap-4">
          <div class="rounded-lg bg-primary/10 p-3">
            <UIcon :name="card.icon" class="size-6 text-primary" />
          </div>
          <div>
            <p class="text-sm text-muted">{{ card.label }}</p>
            <p class="text-2xl font-semibold text-default">{{ card.value }}</p>
          </div>
        </div>
      </UCard>

      <UCard>
        <div class="flex items-center justify-between gap-4">
          <div class="flex items-center gap-4">
            <div class="rounded-lg bg-warning/10 p-3">
              <UIcon name="i-lucide-clipboard-check" class="size-6 text-warning" />
            </div>
            <div>
              <p class="text-sm text-muted">Perlu dinilai</p>
              <p class="text-2xl font-semibold text-default">{{ sptSummary.reported }}</p>
              <p class="text-xs text-muted">SPT dilaporkan menunggu penilaian. Antrean per modul: SPT, BP21, BP23, BP26.</p>
            </div>
          </div>
          <UButton to="/guru/spt" icon="i-lucide-arrow-right" color="neutral" variant="ghost" label="Nilai SPT" />
        </div>
      </UCard>
      
      <UCard>
        <div class="flex items-center justify-between gap-4">
          <div class="flex items-center gap-4">
            <div class="rounded-lg bg-primary/10 p-3">
              <UIcon name="i-lucide-scroll-text" class="size-6 text-primary" />
            </div>
            <div>
              <p class="text-sm text-muted">Monitoring e-Bupot</p>
              <p class="text-lg font-semibold text-default">BP21 Siswa</p>
            </div>
          </div>
          <UButton to="/guru/bp21" icon="i-lucide-arrow-right" color="neutral" variant="ghost" />
        </div>
      </UCard>

      <UCard>
        <div class="flex items-center justify-between gap-4">
          <div class="flex items-center gap-4">
            <div class="rounded-lg bg-primary/10 p-3">
              <UIcon name="i-lucide-file-signature" class="size-6 text-primary" />
            </div>
            <div>
              <p class="text-sm text-muted">Monitoring e-Bupot</p>
              <p class="text-lg font-semibold text-default">BP23 Siswa</p>
            </div>
          </div>
          <UButton to="/guru/bp23" icon="i-lucide-arrow-right" color="neutral" variant="ghost" />
        </div>
      </UCard>

      <UCard>
        <div class="flex items-center justify-between gap-4">
          <div class="flex items-center gap-4">
            <div class="rounded-lg bg-primary/10 p-3">
              <UIcon name="i-lucide-globe" class="size-6 text-primary" />
            </div>
            <div>
              <p class="text-sm text-muted">Monitoring e-Bupot</p>
              <p class="text-lg font-semibold text-default">BP26 Siswa</p>
            </div>
          </div>
          <UButton to="/guru/bp26" icon="i-lucide-arrow-right" color="neutral" variant="ghost" />
        </div>
      </UCard>
    </div>

    <!-- Class list -->
    <UCard>
      <template #header>
        <h2 class="font-semibold text-default">Kelas Saya</h2>
      </template>

      <div v-if="classesStatus === 'pending'" class="py-6 text-center text-sm text-muted">
        Memuat…
      </div>
      <div v-else-if="classes.length === 0" class="py-6 text-center text-sm text-muted">
        Belum ada kelas.
      </div>
      <ul v-else class="divide-y divide-default">
        <li v-for="c in classes" :key="c.id">
          <button
            type="button"
            class="flex w-full items-center justify-between gap-3 px-2 py-3 text-left hover:bg-elevated/50"
            @click="selectClass(c.id)"
          >
            <div>
              <p class="font-medium text-default">{{ c.name }}</p>
              <p class="text-sm text-muted">Tahun Ajaran {{ c.academic_year }}</p>
            </div>
            <UIcon
              :name="selectedClassId === c.id ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
              class="size-5 text-muted"
            />
          </button>

          <!-- Enrolled students -->
          <div v-if="selectedClassId === c.id" class="px-2 pb-4">
            <div v-if="detailStatus === 'pending'" class="py-3 text-sm text-muted">Memuat…</div>
            <template v-else-if="classDetail">
              <p class="mb-2 text-sm font-medium text-muted">
                Siswa terdaftar ({{ classDetail.students.length }})
              </p>
              <ul class="space-y-1">
                <li
                  v-for="s in classDetail.students"
                  :key="s.id"
                  class="flex items-center gap-2 rounded-md bg-elevated/50 px-3 py-2"
                >
                  <UIcon name="i-lucide-user" class="size-4 text-muted" />
                  <span class="text-sm text-default">{{ s.full_name }}</span>
                  <span class="text-xs text-muted">{{ s.email }}</span>
                </li>
              </ul>
              <p v-if="classDetail.students.length === 0" class="text-sm text-muted">
                Belum ada siswa terdaftar.
              </p>
            </template>
          </div>
        </li>
      </ul>
    </UCard>
  </div>
</template>
