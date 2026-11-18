<script setup lang="ts">
import type {
  AssignmentDetailRead,
  AssignmentDocType,
  AssignmentUpdate,
  SubmissionRead
} from '~/types/api'
import {
  assignmentStatusColor,
  assignmentStatusLabel,
  DOC_TYPE_OPTIONS,
  docTypeLabel,
  downloadBlob,
  formatDateTimeId,
  guruDocMonitorPath
} from '~/utils/tugas'

definePageMeta({ middleware: 'role', roles: ['guru', 'admin', 'superadmin'] })

const route = useRoute()
const auth = useAuth()
const { apiFetch } = useApi()
const toast = useToast()

const assignmentId = computed(() => Number(route.params.id))
const isGuru = computed(() => auth.user.value?.role === 'guru')

const { data: detail, status: detailStatus, refresh: refreshDetail } = useAsyncData(
  `guru-tugas-detail-${route.params.id}`,
  () => apiFetch<AssignmentDetailRead>(`/api/v1/tugas/${assignmentId.value}`)
)

const statusBusy = ref(false)
const exportBusy = ref<'xlsx' | 'csv' | null>(null)
const filterMode = ref<'all' | 'submitted' | 'ungraded' | 'missing'>('all')

function setFilterMode(mode: 'all' | 'submitted' | 'ungraded' | 'missing') {
  filterMode.value = mode
}

const filteredSubmissions = computed(() => {
  const rows = detail.value?.submissions ?? []
  switch (filterMode.value) {
    case 'submitted':
      return rows.filter(r => r.submitted)
    case 'ungraded':
      return rows.filter(r => r.submitted && r.final_score === null)
    case 'missing':
      return rows.filter(r => !r.submitted)
    default:
      return rows
  }
})

// ---- Lifecycle actions (Publish / Close / Delete) ---------------------------
async function onPublish() {
  if (!detail.value) return
  statusBusy.value = true
  try {
    await apiFetch(`/api/v1/tugas/${detail.value.id}/publish`, { method: 'POST' })
    toast.add({
      title: 'Tugas diterbitkan',
      description: 'Siswa di kelas kini dapat melihat dan mengumpulkan dokumen.',
      color: 'success',
      icon: 'i-lucide-send'
    })
    await refreshDetail()
  } catch (error) {
    toast.add({ title: 'Gagal menerbitkan tugas', description: apiErrorMessage(error), color: 'error', icon: 'i-lucide-circle-alert' })
  } finally {
    statusBusy.value = false
  }
}

async function onClose() {
  if (!detail.value) return
  statusBusy.value = true
  try {
    await apiFetch(`/api/v1/tugas/${detail.value.id}/close`, { method: 'POST' })
    toast.add({
      title: 'Tugas ditutup',
      description: 'Pengumpulan baru tidak lagi diterima.',
      color: 'warning',
      icon: 'i-lucide-lock'
    })
    await refreshDetail()
  } catch (error) {
    toast.add({ title: 'Gagal menutup tugas', description: apiErrorMessage(error), color: 'error', icon: 'i-lucide-circle-alert' })
  } finally {
    statusBusy.value = false
  }
}

async function onDelete() {
  if (!detail.value) return
  statusBusy.value = true
  try {
    await apiFetch(`/api/v1/tugas/${detail.value.id}`, { method: 'DELETE' })
    toast.add({
      title: 'Tugas dihapus',
      color: 'success',
      icon: 'i-lucide-trash-2'
    })
    await navigateTo('/guru/tugas')
  } catch (error) {
    toast.add({ title: 'Gagal menghapus tugas', description: apiErrorMessage(error), color: 'error', icon: 'i-lucide-circle-alert' })
  } finally {
    statusBusy.value = false
  }
}

// ---- Export (.xlsx / .csv) --------------------------------------------------
async function onExport(format: 'xlsx' | 'csv') {
  if (!detail.value) return
  exportBusy.value = format
  try {
    const blob = await apiFetch<Blob>(
      `/api/v1/tugas/${detail.value.id}/export?format=${format}`,
      { responseType: 'blob' }
    )
    const safeTitle = detail.value.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)
    downloadBlob(blob, `nilai-tugas-${detail.value.id}-${safeTitle}.${format}`)
    toast.add({
      title: `Daftar nilai (${format.toUpperCase()}) berhasil diunduh`,
      color: 'success',
      icon: 'i-lucide-download'
    })
  } catch (error) {
    toast.add({ title: 'Gagal mengunduh nilai', description: apiErrorMessage(error), color: 'error', icon: 'i-lucide-circle-alert' })
  } finally {
    exportBusy.value = null
  }
}

// ---- Edit Assignment Modal --------------------------------------------------
const editOpen = ref(false)
const editBusy = ref(false)
const editError = ref<string | null>(null)
const editForm = reactive({
  title: '',
  instructions: '',
  doc_type: 'bppu' as AssignmentDocType,
  due_at_local: ''
})

const docTypeOptions = DOC_TYPE_OPTIONS.map(o => ({
  label: o.label,
  value: o.value
}))

function toLocalDatetimeInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function openEditModal() {
  if (!detail.value) return
  editError.value = null
  editForm.title = detail.value.title
  editForm.instructions = detail.value.instructions
  editForm.doc_type = detail.value.doc_type
  editForm.due_at_local = toLocalDatetimeInput(detail.value.due_at)
  editOpen.value = true
}

async function onSaveEdit() {
  if (!detail.value) return
  if (!editForm.title.trim() || !editForm.instructions.trim()) {
    editError.value = 'Judul dan instruksi wajib diisi.'
    return
  }
  editBusy.value = true
  editError.value = null
  try {
    let dueIso: string | null = null
    if (editForm.due_at_local.trim()) {
      const parsed = new Date(editForm.due_at_local)
      if (!Number.isNaN(parsed.getTime())) {
        dueIso = parsed.toISOString()
      }
    }
    const payload: AssignmentUpdate = {
      title: editForm.title.trim(),
      instructions: editForm.instructions.trim(),
      due_at: dueIso
    }
    if (detail.value.submitted_count === 0) {
      payload.doc_type = editForm.doc_type
    }
    await apiFetch(`/api/v1/tugas/${detail.value.id}`, {
      method: 'PATCH',
      body: payload
    })
    toast.add({
      title: 'Perubahan tugas disimpan',
      color: 'success',
      icon: 'i-lucide-check-circle'
    })
    editOpen.value = false
    await refreshDetail()
  } catch (error) {
    editError.value = apiErrorMessage(error, 'Gagal memperbarui tugas.')
  } finally {
    editBusy.value = false
  }
}

// ---- Grade & Auto-Checks Modal ----------------------------------------------
const gradeOpen = ref(false)
const gradeBusy = ref(false)
const gradeError = ref<string | null>(null)
const selectedSub = ref<SubmissionRead | null>(null)
const gradeForm = reactive({
  final_score: 100,
  teacher_feedback: ''
})

function openGradeModal(sub: SubmissionRead) {
  selectedSub.value = sub
  gradeError.value = null
  gradeForm.final_score = sub.final_score ?? sub.auto_score ?? 0
  gradeForm.teacher_feedback = sub.teacher_feedback ?? ''
  gradeOpen.value = true
}

async function onSaveGrade() {
  if (!detail.value || !selectedSub.value) return
  const scoreNum = Number(gradeForm.final_score)
  if (Number.isNaN(scoreNum) || scoreNum < 0 || scoreNum > 100) {
    gradeError.value = 'Nilai akhir harus berupa angka antara 0 hingga 100.'
    return
  }
  gradeBusy.value = true
  gradeError.value = null
  try {
    await apiFetch(
      `/api/v1/tugas/${detail.value.id}/submissions/${selectedSub.value.siswa_id}`,
      {
        method: 'PATCH',
        body: {
          final_score: Math.round(scoreNum),
          teacher_feedback: gradeForm.teacher_feedback.trim() || null
        }
      }
    )
    toast.add({
      title: 'Nilai berhasil disimpan',
      description: `${selectedSub.value.siswa_name} — Nilai Akhir: ${Math.round(scoreNum)}`,
      color: 'success',
      icon: 'i-lucide-check-circle'
    })
    gradeOpen.value = false
    await refreshDetail()
  } catch (error) {
    gradeError.value = apiErrorMessage(error, 'Gagal menyimpan nilai.')
  } finally {
    gradeBusy.value = null as unknown as boolean
    gradeBusy.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Loading state -->
    <div v-if="detailStatus === 'pending' && !detail" class="space-y-4">
      <USkeleton class="h-32 w-full" />
      <USkeleton class="h-64 w-full" />
    </div>

    <UCard v-else-if="!detail">
      <div class="py-10 text-center">
        <p class="text-base font-semibold text-highlighted">
          Tugas tidak ditemukan
        </p>
        <UButton
          to="/guru/tugas"
          icon="i-lucide-arrow-left"
          label="Kembali ke Daftar Tugas"
          color="neutral"
          variant="soft"
          size="sm"
          class="mt-3"
        />
      </div>
    </UCard>

    <template v-else>
      <!-- Top bar -->
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="space-y-1">
          <div class="flex flex-wrap items-center gap-2">
            <UButton
              to="/guru/tugas"
              icon="i-lucide-arrow-left"
              label="Daftar Tugas"
              color="neutral"
              variant="ghost"
              size="xs"
            />
            <UBadge :color="assignmentStatusColor(detail.status)" variant="subtle" size="sm">
              {{ assignmentStatusLabel(detail.status) }}
            </UBadge>
            <UBadge color="primary" variant="subtle" size="sm">
              {{ docTypeLabel(detail.doc_type) }}
            </UBadge>
            <UBadge color="neutral" variant="outline" size="sm">
              {{ detail.class_name ?? `Kelas #${detail.class_id}` }}
            </UBadge>
          </div>
          <h1 class="text-2xl font-semibold text-highlighted">
            {{ detail.title }}
          </h1>
          <p class="text-xs text-muted">
            Tenggat: <strong class="text-default">{{ formatDateTimeId(detail.due_at) }}</strong>
            <span v-if="detail.creator_name"> &middot; Dibuat oleh {{ detail.creator_name }}</span>
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <UButton
            icon="i-lucide-file-spreadsheet"
            label="Unduh Nilai (.xlsx)"
            color="neutral"
            variant="soft"
            size="sm"
            :loading="exportBusy === 'xlsx'"
            @click="onExport('xlsx')"
          />
          <UButton
            icon="i-lucide-file-down"
            label="Unduh (.csv)"
            color="neutral"
            variant="ghost"
            size="sm"
            :loading="exportBusy === 'csv'"
            @click="onExport('csv')"
          />
          <template v-if="isGuru">
            <UButton
              icon="i-lucide-pencil"
              label="Ubah Tugas"
              color="neutral"
              variant="soft"
              size="sm"
              @click="openEditModal"
            />
            <UButton
              v-if="detail.status === 'draft'"
              icon="i-lucide-send"
              label="Terbitkan"
              color="success"
              size="sm"
              :loading="statusBusy"
              @click="onPublish"
            />
            <UButton
              v-if="detail.status === 'published'"
              icon="i-lucide-lock"
              label="Tutup Tugas"
              color="warning"
              variant="soft"
              size="sm"
              :loading="statusBusy"
              @click="onClose"
            />
            <UButton
              v-if="detail.submitted_count === 0"
              icon="i-lucide-trash-2"
              label="Hapus"
              color="error"
              variant="ghost"
              size="sm"
              :loading="statusBusy"
              @click="onDelete"
            />
          </template>
        </div>
      </div>

      <!-- Case / Soal Card & Stats -->
      <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <UCard class="lg:col-span-2">
          <template #header>
            <div class="flex items-center justify-between">
              <span class="text-sm font-semibold text-highlighted">Instruksi &amp; Soal Studi Kasus</span>
              <UButton
                :to="guruDocMonitorPath(detail.doc_type)"
                icon="i-lucide-external-link"
                trailing
                :label="`Buka Monitor ${docTypeLabel(detail.doc_type)}`"
                color="neutral"
                variant="ghost"
                size="xs"
              />
            </div>
          </template>
          <p class="whitespace-pre-line text-sm leading-relaxed text-default">
            {{ detail.instructions }}
          </p>
        </UCard>

        <div class="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-1">
          <div class="dash-stat">
            <span class="dash-stat-label">Siswa Terdaftar</span>
            <span class="dash-stat-value font-mono">{{ detail.enrolled_count }}</span>
            <span class="dash-stat-sub">{{ detail.class_name }}</span>
          </div>
          <div class="dash-stat">
            <span class="dash-stat-label">Sudah Mengumpulkan</span>
            <span class="dash-stat-value font-mono text-primary">
              {{ detail.submitted_count }} / {{ detail.enrolled_count }}
            </span>
            <span class="dash-stat-sub">
              {{ detail.enrolled_count - detail.submitted_count }} siswa belum mengumpulkan
            </span>
          </div>
          <div class="dash-stat" :class="{ 'dash-stat-warn': detail.submitted_count > detail.graded_count }">
            <span class="dash-stat-label">Sudah Dinilai Guru</span>
            <span class="dash-stat-value font-mono">
              {{ detail.graded_count }} / {{ detail.submitted_count }}
            </span>
            <span class="dash-stat-sub">
              {{ Math.max(0, detail.submitted_count - detail.graded_count) }} menunggu nilai akhir guru
            </span>
          </div>
        </div>
      </div>

      <!-- Submissions Table -->
      <UCard>
        <template #header>
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 class="text-base font-semibold text-highlighted">
                Daftar Pengumpulan Siswa ({{ filteredSubmissions.length }})
              </h2>
              <p class="text-xs text-muted">
                Menampilkan seluruh siswa yang terdaftar di kelas {{ detail.class_name }}.
              </p>
            </div>
            <div class="flex flex-wrap items-center gap-1.5">
              <UButton
                label="Semua"
                size="xs"
                :color="filterMode === 'all' ? 'primary' : 'neutral'"
                :variant="filterMode === 'all' ? 'solid' : 'soft'"
                @click="setFilterMode('all')"
              />
              <UButton
                label="Sudah Kumpul"
                size="xs"
                :color="filterMode === 'submitted' ? 'primary' : 'neutral'"
                :variant="filterMode === 'submitted' ? 'solid' : 'soft'"
                @click="setFilterMode('submitted')"
              />
              <UButton
                label="Perlu Dinilai"
                size="xs"
                :color="filterMode === 'ungraded' ? 'warning' : 'neutral'"
                :variant="filterMode === 'ungraded' ? 'solid' : 'soft'"
                @click="setFilterMode('ungraded')"
              />
              <UButton
                label="Belum Mengumpulkan"
                size="xs"
                :color="filterMode === 'missing' ? 'neutral' : 'neutral'"
                :variant="filterMode === 'missing' ? 'solid' : 'soft'"
                @click="setFilterMode('missing')"
              />
            </div>
          </div>
        </template>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead>
              <tr class="border-b border-default text-[11px] font-semibold uppercase tracking-wider text-muted">
                <th class="py-2.5 pr-3">Siswa</th>
                <th class="px-3 py-2.5">Status Pengumpulan</th>
                <th class="px-3 py-2.5">Dokumen &amp; Masa</th>
                <th class="px-3 py-2.5">Waktu Kumpul</th>
                <th class="px-3 py-2.5 text-right">Nilai Otomatis</th>
                <th class="px-3 py-2.5 text-right">Nilai Akhir</th>
                <th class="px-3 py-2.5">Umpan Balik</th>
                <th class="py-2.5 pl-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-default">
              <tr
                v-for="sub in filteredSubmissions"
                :key="sub.siswa_id"
                class="hover:bg-elevated/40"
              >
                <td class="py-3 pr-3">
                  <div class="font-medium text-highlighted">{{ sub.siswa_name }}</div>
                  <div class="font-mono text-xs text-muted">{{ sub.siswa_identifier ?? '—' }}</div>
                </td>

                <td class="px-3 py-3">
                  <div class="flex flex-wrap items-center gap-1.5">
                    <UBadge
                      v-if="!sub.submitted"
                      color="neutral"
                      variant="subtle"
                      size="xs"
                    >
                      Belum mengumpulkan
                    </UBadge>
                    <UBadge
                      v-else-if="sub.final_score !== null"
                      color="success"
                      variant="subtle"
                      size="xs"
                    >
                      Sudah dinilai
                    </UBadge>
                    <UBadge
                      v-else
                      color="primary"
                      variant="subtle"
                      size="xs"
                    >
                      Sudah mengumpulkan
                    </UBadge>
                    <UBadge
                      v-if="sub.submitted && sub.is_late"
                      color="warning"
                      variant="subtle"
                      size="xs"
                    >
                      Terlambat
                    </UBadge>
                  </div>
                </td>

                <td class="px-3 py-3">
                  <template v-if="sub.submitted && sub.doc_id">
                    <div class="font-mono text-xs font-medium text-highlighted">
                      {{ sub.doc_number ?? `Dokumen #${sub.doc_id}` }}
                    </div>
                    <div class="text-xs text-muted">
                      Masa {{ sub.doc_period ?? '—' }} &middot; {{ sub.doc_status ?? '—' }}
                    </div>
                  </template>
                  <span v-else class="text-xs text-muted">—</span>
                </td>

                <td class="px-3 py-3 text-xs text-muted">
                  {{ sub.submitted ? formatDateTimeId(sub.submitted_at) : '—' }}
                </td>

                <td class="px-3 py-3 text-right font-mono">
                  <template v-if="sub.submitted && sub.auto_score !== null">
                    <span class="font-semibold text-default">{{ sub.auto_score }}</span>
                    <span class="text-xs text-muted"> / 100</span>
                    <div class="text-[11px] text-muted">
                      {{ sub.auto_checks.filter(c => c.passed).length }}/{{ sub.auto_checks.length }} cek lulus
                    </div>
                  </template>
                  <span v-else class="text-muted">—</span>
                </td>

                <td class="px-3 py-3 text-right font-mono">
                  <template v-if="sub.submitted">
                    <UBadge
                      :color="sub.final_score !== null ? 'success' : 'neutral'"
                      variant="subtle"
                      size="sm"
                    >
                      {{ sub.displayed_score ?? '—' }}
                    </UBadge>
                    <div v-if="sub.final_score === null" class="mt-0.5 text-[10px] text-muted">
                      (otomatis)
                    </div>
                  </template>
                  <span v-else class="text-muted">—</span>
                </td>

                <td class="max-w-xs px-3 py-3">
                  <p v-if="sub.teacher_feedback" class="line-clamp-2 text-xs text-default">
                    {{ sub.teacher_feedback }}
                  </p>
                  <span v-else class="text-xs text-muted">—</span>
                </td>

                <td class="py-3 pl-3 text-right">
                  <div v-if="sub.submitted" class="flex items-center justify-end gap-1.5">
                    <UButton
                      :to="guruDocMonitorPath(detail.doc_type, sub.doc_id)"
                      icon="i-lucide-eye"
                      label="Dokumen"
                      color="neutral"
                      variant="ghost"
                      size="xs"
                    />
                    <UButton
                      icon="i-lucide-check-square"
                      :label="sub.final_score !== null ? 'Ubah Nilai' : 'Tinjau & Nilai'"
                      color="primary"
                      variant="soft"
                      size="xs"
                      @click="openGradeModal(sub)"
                    />
                  </div>
                  <span v-else class="text-xs text-muted">—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </UCard>

      <!-- Modal Edit Tugas -->
      <UModal
        v-model:open="editOpen"
        title="Ubah Tugas"
        description="Perbarui judul, tenggat waktu, atau instruksi studi kasus."
      >
        <template #body>
          <form class="space-y-4" @submit.prevent="onSaveEdit">
            <UAlert
              v-if="editError"
              color="error"
              variant="subtle"
              icon="i-lucide-circle-alert"
              :title="editError"
            />
            <UFormField label="Judul Tugas" required>
              <UInput v-model="editForm.title" class="w-full" />
            </UFormField>
            <UFormField
              label="Jenis Dokumen"
              :help="detail.submitted_count > 0 ? 'Tidak dapat diubah karena sudah ada siswa yang mengumpulkan.' : undefined"
            >
              <USelect
                v-model="editForm.doc_type"
                :items="docTypeOptions"
                :disabled="detail.submitted_count > 0"
                class="w-full"
              />
            </UFormField>
            <UFormField label="Tenggat Pengumpulan (Opsional)">
              <UInput v-model="editForm.due_at_local" type="datetime-local" class="w-full" />
            </UFormField>
            <UFormField label="Instruksi &amp; Soal Studi Kasus" required>
              <UTextarea v-model="editForm.instructions" :rows="6" class="w-full" />
            </UFormField>
            <div class="flex justify-end gap-2 pt-2">
              <UButton label="Batal" color="neutral" variant="ghost" @click="() => { editOpen = false }" />
              <UButton type="submit" label="Simpan Perubahan" :loading="editBusy" />
            </div>
          </form>
        </template>
      </UModal>

      <!-- Modal Penilaian & Rincian Pemeriksaan Otomatis -->
      <UModal
        v-model:open="gradeOpen"
        :title="selectedSub ? `Penilaian — ${selectedSub.siswa_name}` : 'Penilaian Pengumpulan'"
        :description="selectedSub ? `Dokumen: ${selectedSub.doc_number ?? '#' + selectedSub.doc_id} (Masa ${selectedSub.doc_period ?? '-'})` : undefined"
      >
        <template #body>
          <div v-if="selectedSub" class="space-y-4">
            <UAlert
              v-if="gradeError"
              color="error"
              variant="subtle"
              icon="i-lucide-circle-alert"
              :title="gradeError"
            />

            <!-- Rincian Penilaian Otomatis -->
            <div class="rounded-lg border border-default bg-elevated/40 p-3.5">
              <div class="flex items-center justify-between">
                <span class="text-xs font-semibold uppercase tracking-wider text-muted">
                  Hasil Pemeriksaan Otomatis
                </span>
                <UBadge color="primary" variant="subtle" size="sm">
                  Skor Otomatis: {{ selectedSub.auto_score ?? 0 }} / 100
                </UBadge>
              </div>

              <ul class="mt-3 divide-y divide-default text-xs">
                <li
                  v-for="chk in selectedSub.auto_checks"
                  :key="chk.code"
                  class="flex items-start justify-between gap-3 py-2"
                >
                  <div class="flex items-start gap-2">
                    <UIcon
                      :name="chk.passed ? 'i-lucide-check-circle-2' : 'i-lucide-x-circle'"
                      class="mt-0.5 size-4 shrink-0"
                      :class="chk.passed ? 'text-success' : 'text-error'"
                    />
                    <div>
                      <div class="font-medium text-highlighted">{{ chk.label }}</div>
                      <div class="text-muted">{{ chk.message }}</div>
                    </div>
                  </div>
                  <span class="shrink-0 font-mono text-[11px] text-muted">
                    Bobot {{ chk.weight }}
                  </span>
                </li>
              </ul>
            </div>

            <!-- Form Nilai Akhir Guru -->
            <form class="space-y-4" @submit.prevent="onSaveGrade">
              <UFormField
                label="Nilai Akhir Guru (0 – 100)"
                required
                help="Nilai ini juga disinkronkan ke dokumen asli siswa pada dasbor."
              >
                <UInput
                  v-model.number="gradeForm.final_score"
                  type="number"
                  min="0"
                  max="100"
                  class="w-full"
                />
              </UFormField>

              <UFormField
                label="Umpan Balik Guru (Maks. 500 karakter)"
                help="Catatan koreksi atau apresiasi untuk siswa."
              >
                <UTextarea
                  v-model="gradeForm.teacher_feedback"
                  :rows="3"
                  maxlength="500"
                  placeholder="Tuliskan umpan balik untuk siswa..."
                  class="w-full"
                />
              </UFormField>

              <div class="flex justify-end gap-2 pt-2">
                <UButton label="Tutup" color="neutral" variant="ghost" @click="() => { gradeOpen = false }" />
                <UButton
                  v-if="isGuru"
                  type="submit"
                  icon="i-lucide-check"
                  label="Simpan Nilai Akhir"
                  color="primary"
                  :loading="gradeBusy"
                />
              </div>
            </form>
          </div>
        </template>
      </UModal>
    </template>
  </div>
</template>
