<script setup lang="ts">
import type {
  AssignmentDocType,
  AssignmentRead,
  AssignmentStatus,
  SchoolClass
} from '~/types/api'
import {
  assignmentStatusColor,
  assignmentStatusLabel,
  DOC_TYPE_OPTIONS,
  docTypeLabel,
  downloadBlob,
  formatDateTimeId
} from '~/utils/tugas'

definePageMeta({ middleware: 'role', roles: ['guru'] })

const { apiFetch } = useApi()
const toast = useToast()

const selectedClassId = ref<number | undefined>(undefined)
const selectedStatus = ref<AssignmentStatus | 'all'>('all')
const selectedDocType = ref<AssignmentDocType | 'all'>('all')
const busyActionId = ref<number | null>(null)
const exportBusy = ref<'xlsx' | 'csv' | null>(null)

const { data: classes } = useAsyncData(
  'guru-tugas-classes',
  () => apiFetch<SchoolClass[]>('/api/v1/classes'),
  { default: () => [] as SchoolClass[] }
)

const activeClasses = computed(() => (classes.value ?? []).filter(c => !c.archived))

watch(activeClasses, (list) => {
  if (selectedClassId.value === undefined && list.length > 0) {
    selectedClassId.value = list[0]?.id
  }
}, { immediate: true })

const classOptions = computed(() => [
  { label: 'Semua Kelas', value: 0 },
  ...activeClasses.value.map(c => ({
    label: `${c.name} (${c.academic_year})`,
    value: c.id
  }))
])

const classSelectModel = computed({
  get: () => selectedClassId.value ?? 0,
  set: (v: number) => {
    selectedClassId.value = v === 0 ? undefined : v
  }
})

const statusOptions = [
  { label: 'Semua Status', value: 'all' },
  { label: 'Draf', value: 'draft' },
  { label: 'Terbit', value: 'published' },
  { label: 'Ditutup', value: 'closed' }
]

const docTypeFilterOptions = [
  { label: 'Semua Jenis Dokumen', value: 'all' },
  ...DOC_TYPE_OPTIONS.map(o => ({ label: o.label, value: o.value }))
]

const { data: assignments, status: listStatus, refresh: refreshAssignments } = useAsyncData(
  'guru-tugas-list',
  () => {
    const params = new URLSearchParams()
    if (selectedClassId.value) params.set('class_id', String(selectedClassId.value))
    if (selectedStatus.value !== 'all') params.set('status', selectedStatus.value)
    if (selectedDocType.value !== 'all') params.set('doc_type', selectedDocType.value)
    const qs = params.toString()
    return apiFetch<AssignmentRead[]>(`/api/v1/tugas${qs ? `?${qs}` : ''}`)
  },
  {
    watch: [selectedClassId, selectedStatus, selectedDocType],
    default: () => [] as AssignmentRead[]
  }
)

const totalPendingGrading = computed(() =>
  (assignments.value ?? []).reduce(
    (sum, a) => sum + Math.max(0, a.submitted_count - a.graded_count),
    0
  )
)

async function publishAssignment(item: AssignmentRead) {
  busyActionId.value = item.id
  try {
    await apiFetch(`/api/v1/tugas/${item.id}/publish`, { method: 'POST' })
    toast.add({
      title: 'Tugas diterbitkan',
      description: item.title,
      color: 'success',
      icon: 'i-lucide-send'
    })
    await refreshAssignments()
  } catch (error) {
    toast.add({
      title: 'Gagal menerbitkan tugas',
      description: apiErrorMessage(error),
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
  } finally {
    busyActionId.value = null
  }
}

async function closeAssignment(item: AssignmentRead) {
  busyActionId.value = item.id
  try {
    await apiFetch(`/api/v1/tugas/${item.id}/close`, { method: 'POST' })
    toast.add({
      title: 'Tugas ditutup',
      description: item.title,
      color: 'warning',
      icon: 'i-lucide-lock'
    })
    await refreshAssignments()
  } catch (error) {
    toast.add({
      title: 'Gagal menutup tugas',
      description: apiErrorMessage(error),
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
  } finally {
    busyActionId.value = null
  }
}

async function deleteAssignment(item: AssignmentRead) {
  busyActionId.value = item.id
  try {
    await apiFetch(`/api/v1/tugas/${item.id}`, { method: 'DELETE' })
    toast.add({
      title: 'Tugas dihapus',
      description: item.title,
      color: 'success',
      icon: 'i-lucide-trash-2'
    })
    await refreshAssignments()
  } catch (error) {
    toast.add({
      title: 'Gagal menghapus tugas',
      description: apiErrorMessage(error),
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
  } finally {
    busyActionId.value = null
  }
}

async function exportClassRekap(format: 'xlsx' | 'csv') {
  const targetClassId = selectedClassId.value ?? activeClasses.value[0]?.id
  if (!targetClassId) {
    toast.add({
      title: 'Pilih kelas terlebih dahulu',
      description: 'Pilih salah satu kelas untuk mengunduh rekap nilai.',
      color: 'warning',
      icon: 'i-lucide-circle-alert'
    })
    return
  }
  exportBusy.value = format
  try {
    const blob = await apiFetch<Blob>(
      `/api/v1/tugas/rekap-kelas/${targetClassId}/export?format=${format}`,
      { responseType: 'blob' }
    )
    const cls = activeClasses.value.find(c => c.id === targetClassId)
    const safeName = (cls?.name ?? `kelas-${targetClassId}`).toLowerCase().replace(/[^a-z0-9]+/g, '-')
    downloadBlob(blob, `rekap-nilai-${safeName}.${format}`)
    toast.add({
      title: `Rekap nilai kelas (${format.toUpperCase()}) diunduh`,
      color: 'success',
      icon: 'i-lucide-download'
    })
  } catch (error) {
    toast.add({
      title: 'Gagal mengunduh rekap nilai kelas',
      description: apiErrorMessage(error),
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
  } finally {
    exportBusy.value = null
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted">
          <UIcon name="i-lucide-clipboard-check" class="size-4 text-primary" />
          <span>Ruang Kelas &middot; Penugasan</span>
        </div>
        <h1 class="mt-1 text-2xl font-semibold text-highlighted">
          Kelola Tugas &amp; Penilaian
        </h1>
        <p class="mt-0.5 text-sm text-muted">
          Berikan soal kasus perpajakan ke kelas, tinjau hasil penilaian otomatis, dan unduh rekap nilai siswa.
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <UButton
          icon="i-lucide-file-spreadsheet"
          label="Rekap Kelas (.xlsx)"
          color="neutral"
          variant="soft"
          size="sm"
          :loading="exportBusy === 'xlsx'"
          @click="exportClassRekap('xlsx')"
        />
        <UButton
          icon="i-lucide-file-down"
          label="Rekap (.csv)"
          color="neutral"
          variant="ghost"
          size="sm"
          :loading="exportBusy === 'csv'"
          @click="exportClassRekap('csv')"
        />
        <UButton
          to="/guru/tugas/create"
          icon="i-lucide-plus"
          label="Buat Tugas Baru"
          color="primary"
          size="sm"
        />
      </div>
    </div>

    <!-- Summary strip -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div class="dash-stat">
        <span class="dash-stat-label">Total Tugas</span>
        <span class="dash-stat-value font-mono">{{ assignments.length }}</span>
        <span class="dash-stat-sub">Sesuai filter aktif</span>
      </div>
      <div class="dash-stat">
        <span class="dash-stat-label">Tugas Terbit</span>
        <span class="dash-stat-value font-mono text-primary">
          {{ assignments.filter(a => a.status === 'published').length }}
        </span>
        <span class="dash-stat-sub">Menerima pengumpulan siswa</span>
      </div>
      <div class="dash-stat" :class="{ 'dash-stat-warn': totalPendingGrading > 0 }">
        <span class="dash-stat-label">Menunggu Nilai Akhir Guru</span>
        <span class="dash-stat-value font-mono">{{ totalPendingGrading }}</span>
        <span class="dash-stat-sub">Sudah dinilai otomatis, belum disahkan guru</span>
      </div>
    </div>

    <!-- Filter bar -->
    <UCard>
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <UFormField label="Kelas">
          <USelect
            v-model="classSelectModel"
            :items="classOptions"
            class="w-full"
          />
        </UFormField>
        <UFormField label="Status Tugas">
          <USelect
            v-model="selectedStatus"
            :items="statusOptions"
            class="w-full"
          />
        </UFormField>
        <UFormField label="Jenis Dokumen">
          <USelect
            v-model="selectedDocType"
            :items="docTypeFilterOptions"
            class="w-full"
          />
        </UFormField>
        <div class="flex items-end justify-end">
          <UButton
            icon="i-lucide-refresh-cw"
            label="Muat Ulang"
            color="neutral"
            variant="soft"
            :loading="listStatus === 'pending'"
            @click="refreshAssignments()"
          />
        </div>
      </div>
    </UCard>

    <!-- Daftar Tugas -->
    <div v-if="listStatus === 'pending' && assignments.length === 0" class="space-y-3">
      <USkeleton class="h-24 w-full" />
      <USkeleton class="h-24 w-full" />
    </div>

    <UCard v-else-if="assignments.length === 0">
      <div class="py-10 text-center">
        <UIcon name="i-lucide-clipboard-list" class="mx-auto size-10 text-muted" />
        <p class="mt-3 text-base font-semibold text-highlighted">
          Belum ada tugas untuk filter ini
        </p>
        <p class="mt-1 text-sm text-muted">
          Klik tombol &ldquo;Buat Tugas Baru&rdquo; untuk menyusun soal studi kasus bagi kelas Anda.
        </p>
        <UButton
          to="/guru/tugas/create"
          icon="i-lucide-plus"
          label="Buat Tugas Baru"
          color="primary"
          size="sm"
          class="mt-4"
        />
      </div>
    </UCard>

    <div v-else class="space-y-3">
      <UCard
        v-for="item in assignments"
        :key="item.id"
      >
        <div class="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div class="min-w-0 flex-1 space-y-1.5">
            <div class="flex flex-wrap items-center gap-2">
              <UBadge :color="assignmentStatusColor(item.status)" variant="subtle" size="sm">
                {{ assignmentStatusLabel(item.status) }}
              </UBadge>
              <UBadge color="primary" variant="subtle" size="sm">
                {{ docTypeLabel(item.doc_type) }}
              </UBadge>
              <UBadge color="neutral" variant="outline" size="sm">
                {{ item.class_name ?? `Kelas #${item.class_id}` }}
              </UBadge>
              <span class="text-xs text-muted">
                &middot; Tenggat: <strong class="text-default">{{ formatDateTimeId(item.due_at) }}</strong>
              </span>
            </div>

            <NuxtLink
              :to="`/guru/tugas/${item.id}`"
              class="block text-base font-semibold text-highlighted hover:text-primary"
            >
              {{ item.title }}
            </NuxtLink>

            <p class="line-clamp-2 text-sm text-muted">
              {{ item.instructions }}
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-4 border-t border-default pt-3 lg:border-t-0 lg:pt-0">
            <div class="flex items-center gap-4 text-xs">
              <div>
                <span class="block text-muted">Dikumpulkan</span>
                <span class="font-mono text-sm font-semibold text-highlighted">
                  {{ item.submitted_count }} / {{ item.enrolled_count }}
                </span>
              </div>
              <div>
                <span class="block text-muted">Dinilai Guru</span>
                <span class="font-mono text-sm font-semibold text-highlighted">
                  {{ item.graded_count }} / {{ item.submitted_count }}
                </span>
              </div>
            </div>

            <div class="flex flex-wrap items-center gap-1.5">
              <UButton
                v-if="item.status === 'draft'"
                icon="i-lucide-send"
                label="Terbitkan"
                color="success"
                variant="soft"
                size="xs"
                :loading="busyActionId === item.id"
                @click="publishAssignment(item)"
              />
              <UButton
                v-if="item.status === 'published'"
                icon="i-lucide-lock"
                label="Tutup"
                color="warning"
                variant="soft"
                size="xs"
                :loading="busyActionId === item.id"
                @click="closeAssignment(item)"
              />
              <UButton
                v-if="item.submitted_count === 0"
                icon="i-lucide-trash-2"
                label="Hapus"
                color="error"
                variant="ghost"
                size="xs"
                :loading="busyActionId === item.id"
                @click="deleteAssignment(item)"
              />
              <UButton
                :to="`/guru/tugas/${item.id}`"
                icon="i-lucide-arrow-right"
                trailing
                label="Detail & Nilai"
                color="primary"
                variant="soft"
                size="xs"
              />
            </div>
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>
