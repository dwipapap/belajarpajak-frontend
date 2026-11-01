<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type {
  ClassDetail,
  SchoolClass,
  User,
  UserListResponse
} from '~/types/api'

definePageMeta({ middleware: 'role', roles: ['admin'] })

const { apiFetch } = useApi()
const toast = useToast()

// ---- Daftar kelas -----------------------------------------------------------
const showArchived = ref(false)

const { data: classes, status: classesStatus, refresh: refreshClasses } = useAsyncData(
  'admin-classes',
  () => apiFetch<SchoolClass[]>('/api/v1/classes'),
  { default: () => [] as SchoolClass[] }
)

// Jumlah siswa per kelas: diambil dari detail tiap kelas agar kolom
// "Jumlah Siswa" selalu akurat mengikuti data enroll terbaru.
const studentCounts = ref<Record<number, number>>({})

async function refreshStudentCounts(list: SchoolClass[]) {
  const entries = await Promise.all(
    list.map(async (c) => {
      try {
        const detail = await apiFetch<ClassDetail>(`/api/v1/classes/${c.id}`)
        return [c.id, detail.students.length] as const
      } catch {
        return [c.id, 0] as const
      }
    })
  )
  studentCounts.value = Object.fromEntries(entries)
}

watch(classes, (list) => {
  void refreshStudentCounts(list ?? [])
}, { immediate: true })

const visibleClasses = computed(() =>
  showArchived.value ? classes.value : classes.value.filter(c => !c.archived)
)

const totalSiswa = computed(() =>
  Object.values(studentCounts.value).reduce((sum, n) => sum + n, 0)
)

const statCards = computed(() => [
  { label: 'Total Kelas', value: classes.value.length, icon: 'i-lucide-book-open' },
  { label: 'Kelas Aktif', value: classes.value.filter(c => !c.archived).length, icon: 'i-lucide-book-open-check' },
  { label: 'Siswa Terdaftar', value: totalSiswa.value, icon: 'i-lucide-graduation-cap' }
])

const columns: TableColumn<SchoolClass>[] = [
  { accessorKey: 'name', header: 'Nama Kelas' },
  { accessorKey: 'academic_year', header: 'Tahun Ajaran' },
  { accessorKey: 'guru', header: 'Wali Kelas' },
  { id: 'students', header: 'Jumlah Siswa' },
  { accessorKey: 'archived', header: 'Status' },
  { id: 'actions' }
]

// ---- Guru & siswa tenant (untuk pilihan wali kelas & enroll) -----------------
const { data: guruList } = useAsyncData(
  'admin-kelas-guru',
  () => apiFetch<UserListResponse>('/api/v1/users?role=guru&page=1&size=100'),
  { default: () => ({ items: [], total: 0, page: 1, size: 100 }) }
)

const { data: siswaList, refresh: refreshSiswa } = useAsyncData(
  'admin-kelas-siswa',
  () => apiFetch<UserListResponse>('/api/v1/users?role=siswa&page=1&size=100'),
  { default: () => ({ items: [], total: 0, page: 1, size: 100 }) }
)

const guruOptions = computed(() =>
  guruList.value.items.map(g => ({ label: g.full_name, value: g.id }))
)

const siswaOptions = computed(() =>
  siswaList.value.items.map(s => ({ label: `${s.full_name} (${s.email})`, value: s.id }))
)

// ---- "Buat Kelas" ------------------------------------------------------------
const createOpen = ref(false)
const creating = ref(false)
const createError = ref<string | null>(null)

const newClass = reactive({
  name: '',
  academic_year: '',
  guru_id: undefined as number | undefined
})

function openCreate() {
  createError.value = null
  createOpen.value = true
}

function closeCreate() {
  createOpen.value = false
}

function closeDetail() {
  detailOpen.value = false
}

function archiveFromDetail() {
  if (detailClass.value) void onToggleArchive(detailClass.value)
}

function validateNewClass(state: typeof newClass) {
  const errors: { name: string, message: string }[] = []
  if (!state.name?.trim()) errors.push({ name: 'name', message: 'Nama kelas wajib diisi' })
  if (!state.academic_year?.trim()) {
    errors.push({ name: 'academic_year', message: 'Tahun ajaran wajib diisi' })
  } else if (!/^\d{4}\/\d{4}$/.test(state.academic_year.trim())) {
    errors.push({ name: 'academic_year', message: 'Format tahun ajaran: 2024/2025' })
  }
  if (!state.guru_id) errors.push({ name: 'guru_id', message: 'Pilih wali kelas (guru)' })
  return errors
}

async function onCreateClass() {
  creating.value = true
  createError.value = null
  try {
    await apiFetch<SchoolClass>('/api/v1/classes', {
      method: 'POST',
      body: {
        name: newClass.name.trim(),
        academic_year: newClass.academic_year.trim(),
        guru_id: newClass.guru_id
      }
    })
    toast.add({
      title: 'Kelas berhasil dibuat',
      description: `${newClass.name.trim()} (${newClass.academic_year.trim()})`,
      color: 'success',
      icon: 'i-lucide-check-circle'
    })
    createOpen.value = false
    Object.assign(newClass, { name: '', academic_year: '', guru_id: undefined })
    await refreshClasses()
  } catch (error) {
    createError.value = apiErrorMessage(error, 'Gagal membuat kelas.')
  } finally {
    creating.value = false
  }
}

// ---- Detail + enroll ----------------------------------------------------------
const detailOpen = ref(false)
const detailClass = ref<SchoolClass | null>(null)
const { data: classDetail, status: detailStatus, refresh: refreshDetail } = useAsyncData(
  'admin-kelas-detail',
  async () =>
    detailClass.value === null
      ? null
      : await apiFetch<ClassDetail>(`/api/v1/classes/${detailClass.value.id}`)
)

const enrollSiswaId = ref<number | undefined>(undefined)
const enrollBusy = ref(false)
const unenrollBusyId = ref<number | null>(null)
const archiveBusy = ref(false)

function openDetail(row: SchoolClass) {
  detailClass.value = row
  enrollSiswaId.value = undefined
  detailOpen.value = true
  void refreshDetail()
}

function enrolledIds(detail: ClassDetail | null): Set<number> {
  return new Set((detail?.students ?? []).map(s => s.id))
}

const enrollableOptions = computed(() => {
  const taken = enrolledIds(classDetail.value ?? null)
  return siswaOptions.value.filter(o => !taken.has(o.value as number))
})

async function onEnroll() {
  if (!detailClass.value || !enrollSiswaId.value) return
  enrollBusy.value = true
  try {
    await apiFetch<ClassDetail>(`/api/v1/classes/${detailClass.value.id}/enrollments`, {
      method: 'POST',
      body: { siswa_id: enrollSiswaId.value }
    })
    toast.add({
      title: 'Siswa ditambahkan ke kelas',
      color: 'success',
      icon: 'i-lucide-user-plus'
    })
    enrollSiswaId.value = undefined
    await Promise.all([refreshDetail(), refreshClasses(), refreshSiswa()])
  } catch (error) {
    toast.add({ title: 'Gagal menambahkan siswa', description: apiErrorMessage(error), color: 'error', icon: 'i-lucide-circle-alert' })
  } finally {
    enrollBusy.value = false
  }
}

async function onUnenroll(siswa: User) {
  if (!detailClass.value) return
  unenrollBusyId.value = siswa.id
  try {
    await apiFetch<ClassDetail>(`/api/v1/classes/${detailClass.value.id}/enrollments/${siswa.id}`, {
      method: 'DELETE'
    })
    toast.add({
      title: 'Siswa dikeluarkan dari kelas',
      description: siswa.full_name,
      color: 'success',
      icon: 'i-lucide-user-minus'
    })
    await Promise.all([refreshDetail(), refreshClasses()])
  } catch (error) {
    toast.add({ title: 'Gagal mengeluarkan siswa', description: apiErrorMessage(error), color: 'error', icon: 'i-lucide-circle-alert' })
  } finally {
    unenrollBusyId.value = null
  }
}

async function onToggleArchive(row: SchoolClass) {
  archiveBusy.value = true
  try {
    await apiFetch<SchoolClass>(`/api/v1/classes/${row.id}/archive`, {
      method: 'PATCH',
      body: { archived: !row.archived }
    })
    toast.add({
      title: row.archived ? 'Arsip kelas dibuka' : 'Kelas diarsipkan',
      description: row.name,
      color: 'success',
      icon: 'i-lucide-archive'
    })
    if (detailClass.value?.id === row.id) await refreshDetail()
    await refreshClasses()
  } catch (error) {
    toast.add({ title: 'Gagal mengubah arsip kelas', description: apiErrorMessage(error), color: 'error', icon: 'i-lucide-circle-alert' })
  } finally {
    archiveBusy.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold text-default">Kelola Kelas</h1>
        <p class="mt-1 text-sm text-muted">
          Buat kelas, daftarkan siswa ke kelas, dan arsipkan kelas yang sudah tidak aktif.
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <UButton
          to="/admin"
          icon="i-lucide-arrow-left"
          label="Dasbor Admin"
          color="neutral"
          variant="soft"
        />
        <UButton icon="i-lucide-plus" label="Buat Kelas" @click="openCreate" />
      </div>
    </div>

    <!-- Stat cards -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
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

    <!-- Tabel kelas -->
    <UCard>
      <template #header>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <h2 class="font-semibold text-default">Daftar Kelas</h2>
          <div class="flex items-center gap-3">
            <UCheckbox v-model="showArchived" label="Tampilkan arsip" />
            <UButton icon="i-lucide-refresh-cw" color="neutral" variant="soft" label="Muat Ulang" @click="refreshClasses()" />
          </div>
        </div>
      </template>

      <div class="overflow-x-auto">
        <UTable
          :data="visibleClasses"
          :columns="columns"
          :loading="classesStatus === 'pending'"
        >
          <template #guru-cell="{ row }">
            <span class="text-sm text-default">{{ row.original.guru?.full_name ?? '—' }}</span>
          </template>
          <template #students-cell="{ row }">
            <UBadge color="neutral" variant="subtle">
              {{ studentCounts[row.original.id] ?? '…' }} siswa
            </UBadge>
          </template>
          <template #archived-cell="{ row }">
            <UBadge :color="row.original.archived ? 'neutral' : 'success'" variant="subtle">
              {{ row.original.archived ? 'Diarsipkan' : 'Aktif' }}
            </UBadge>
          </template>
          <template #actions-cell="{ row }">
            <div class="flex justify-end gap-1">
              <UButton
                icon="i-lucide-users"
                size="xs"
                color="neutral"
                variant="soft"
                label="Kelola Siswa"
                @click="openDetail(row.original)"
              />
              <UButton
                :icon="row.original.archived ? 'i-lucide-archive-restore' : 'i-lucide-archive'"
                size="xs"
                :color="row.original.archived ? 'success' : 'warning'"
                variant="soft"
                :label="row.original.archived ? 'Buka Arsip' : 'Arsipkan'"
                :loading="archiveBusy"
                @click="onToggleArchive(row.original)"
              />
            </div>
          </template>
          <template #empty>
            <p class="py-6 text-center text-sm text-muted">Belum ada kelas. Klik “Buat Kelas” untuk menambah kelas baru.</p>
          </template>
        </UTable>
      </div>

      <template #footer>
        <p class="text-sm text-muted">Total: {{ visibleClasses.length }} dari {{ classes.length }} kelas</p>
      </template>
    </UCard>

    <!-- Modal buat kelas -->
    <UModal v-model:open="createOpen" title="Buat Kelas" description="Buat kelas baru untuk institusi Anda, lalu daftarkan siswanya.">
      <template #body>
        <UForm :state="newClass" :validate="validateNewClass" class="space-y-4" @submit="onCreateClass">
          <UAlert
            v-if="createError"
            color="error"
            variant="subtle"
            icon="i-lucide-circle-alert"
            :title="createError"
          />

          <UFormField name="name" label="Nama Kelas" required help="Contoh: XII AKL 1.">
            <UInput v-model="newClass.name" class="w-full" placeholder="XII AKL 1" />
          </UFormField>

          <UFormField name="academic_year" label="Tahun Ajaran" required help="Format: 2024/2025.">
            <UInput v-model="newClass.academic_year" class="w-full" placeholder="2024/2025" />
          </UFormField>

          <UFormField name="guru_id" label="Wali Kelas" required help="Hanya guru dari institusi Anda yang bisa dipilih.">
            <USelect
              v-model="newClass.guru_id"
              :items="guruOptions"
              placeholder="Pilih guru"
              class="w-full"
            />
          </UFormField>

          <div class="flex justify-end gap-2">
            <UButton label="Batal" color="neutral" variant="ghost" @click="closeCreate" />
            <UButton type="submit" label="Simpan" :loading="creating" />
          </div>
        </UForm>
      </template>
    </UModal>

    <!-- Modal kelola siswa -->
    <UModal
      v-model:open="detailOpen"
      :title="detailClass ? `Kelas ${detailClass.name}` : 'Kelas'"
      :description="detailClass ? `Tahun ajaran ${detailClass.academic_year} — Wali: ${detailClass.guru?.full_name ?? '—'}` : undefined"
    >
      <template #body>
        <div v-if="detailStatus === 'pending'" class="py-6 text-center text-sm text-muted">
          Memuat…
        </div>
        <template v-else-if="classDetail">
          <!-- Tambah siswa -->
          <div class="flex flex-col gap-2 sm:flex-row sm:items-end">
            <UFormField label="Tambah Siswa" class="flex-1" help="Hanya siswa dari institusi Anda yang bisa didaftarkan.">
              <USelect
                v-model="enrollSiswaId"
                :items="enrollableOptions"
                placeholder="Pilih siswa"
                class="w-full"
              />
            </UFormField>
            <UButton
              icon="i-lucide-user-plus"
              label="Tambahkan"
              :disabled="!enrollSiswaId"
              :loading="enrollBusy"
              @click="onEnroll"
            />
          </div>

          <p class="mt-5 mb-2 text-sm font-medium text-muted">
            Siswa terdaftar ({{ classDetail.students.length }})
          </p>
          <ul v-if="classDetail.students.length > 0" class="space-y-1">
            <li
              v-for="s in classDetail.students"
              :key="s.id"
              class="flex items-center justify-between gap-2 rounded-md bg-elevated/50 px-3 py-2"
            >
              <div class="flex min-w-0 items-center gap-2">
                <UIcon name="i-lucide-user" class="size-4 shrink-0 text-muted" />
                <span class="truncate text-sm text-default">{{ s.full_name }}</span>
                <span class="truncate text-xs text-muted">{{ s.email }}</span>
              </div>
              <UButton
                icon="i-lucide-user-minus"
                size="xs"
                color="error"
                variant="soft"
                label="Keluarkan"
                :loading="unenrollBusyId === s.id"
                @click="onUnenroll(s)"
              />
            </li>
          </ul>
          <p v-else class="text-sm text-muted">Belum ada siswa terdaftar di kelas ini.</p>
        </template>
      </template>
      <template #footer>
        <div class="flex items-center justify-between gap-2">
          <UButton
            v-if="detailClass"
            :icon="detailClass.archived ? 'i-lucide-archive-restore' : 'i-lucide-archive'"
            :label="detailClass.archived ? 'Buka Arsip Kelas Ini' : 'Arsipkan Kelas Ini'"
            :color="detailClass.archived ? 'success' : 'warning'"
            variant="soft"
            :loading="archiveBusy"
            @click="archiveFromDetail"
          />
          <UButton label="Tutup" color="neutral" variant="ghost" @click="closeDetail" />
        </div>
      </template>
    </UModal>
  </div>
</template>
