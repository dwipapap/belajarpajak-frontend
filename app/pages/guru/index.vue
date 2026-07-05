<script setup lang="ts">
import type { ClassDetail, DashboardSummary, SchoolClass } from '~/types/api'

definePageMeta({ middleware: 'role', roles: ['guru'] })

const { apiFetch } = useApi()

const { data: summary } = useAsyncData(
  'guru-summary',
  () => apiFetch<DashboardSummary>('/api/v1/dashboard/summary')
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
