<script setup lang="ts">
import type {
  AssignmentDetailRead,
  CandidateDocRead,
  SubmissionRead
} from '~/types/api'
import { formatCurrency } from '~/utils/bupot'
import {
  docStatusLabel,
  assignmentStatusColor,
  assignmentStatusLabel,
  docTypeLabel,
  formatDateTimeId,
  siswaCreateDocPath
} from '~/utils/tugas'

definePageMeta({ middleware: 'role', roles: ['siswa'] })

const auth = useAuth()
const route = useRoute()
const { apiFetch } = useApi()
const toast = useToast()

const assignmentId = computed(() => Number(route.params.id))

const { data: detail, status: detailStatus, refresh: refreshDetail } = useAsyncData(
  `siswa-tugas-detail-${route.params.id}`,
  () => apiFetch<AssignmentDetailRead>(`/api/v1/tugas/${assignmentId.value}`)
)

const { data: candidates, status: candidatesStatus, refresh: refreshCandidates } = useAsyncData(
  `siswa-tugas-candidates-${route.params.id}`,
  () => apiFetch<CandidateDocRead[]>(`/api/v1/tugas/${assignmentId.value}/candidates`),
  { default: () => [] as CandidateDocRead[] }
)

const selectedDocId = ref<number | undefined>(undefined)
const submitBusy = ref(false)
const submitError = ref<string | null>(null)

const mySub = computed<SubmissionRead | null>(() => detail.value?.my_submission ?? null)

watch(
  [mySub, candidates],
  ([sub, list]) => {
    if (selectedDocId.value === undefined) {
      if (sub?.doc_id) {
        selectedDocId.value = sub.doc_id
      } else if (list && list.length > 0) {
        selectedDocId.value = list[0]?.id
      }
    }
  },
  { immediate: true }
)

const allowResubmission = computed(() => auth.user.value?.settings?.allow_resubmission ?? true)
const allowLateSubmission = computed(() => auth.user.value?.settings?.allow_late_submission ?? true)
const isPastDue = computed(() => {
  if (!detail.value?.due_at) return false
  return new Date(detail.value.due_at).getTime() < Date.now()
})

const canSubmit = computed(() => {
  if (!detail.value) return false
  if (detail.value.status !== 'published') return false
  if (mySub.value?.final_score !== null && mySub.value?.final_score !== undefined) return false
  if (mySub.value?.submitted && !allowResubmission.value) return false
  if (isPastDue.value && !allowLateSubmission.value) return false
  return true
})

const isSubmissionLocked = computed(() => {
  if (detail.value?.status === 'closed') return true
  if (mySub.value?.final_score !== null && mySub.value?.final_score !== undefined) return true
  if (mySub.value?.submitted && !allowResubmission.value) return true
  if (isPastDue.value && !allowLateSubmission.value) return true
  return false
})

const autoChecksHidden = computed(() =>
  Boolean(mySub.value?.auto_checks_hidden) || auth.user.value?.settings?.show_auto_check_details === false
)

async function onSubmitDoc() {
  if (!detail.value || !selectedDocId.value) {
    submitError.value = 'Pilih dokumen yang akan dikumpulkan terlebih dahulu.'
    return
  }
  submitBusy.value = true
  submitError.value = null
  try {
    const res = await apiFetch<SubmissionRead>(
      `/api/v1/tugas/${detail.value.id}/submit`,
      {
        method: 'POST',
        body: { doc_id: selectedDocId.value }
      }
    )
    toast.add({
      title: 'Dokumen berhasil dikumpulkan',
      description: `Skor Pemeriksaan Otomatis: ${res.auto_score ?? 0} / 100`,
      color: 'success',
      icon: 'i-lucide-check-circle'
    })
    await Promise.all([refreshDetail(), refreshCandidates()])
  } catch (error) {
    submitError.value = apiErrorMessage(error, 'Gagal mengumpulkan dokumen.')
  } finally {
    submitBusy.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Loading -->
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
          to="/siswa/tugas"
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
      <!-- Header -->
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="space-y-1">
          <div class="flex flex-wrap items-center gap-2">
            <UButton
              to="/siswa/tugas"
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
            <span v-if="detail.creator_name"> &middot; Guru: {{ detail.creator_name }}</span>
          </p>
        </div>

        <UButton
          :to="siswaCreateDocPath(detail.doc_type)"
          icon="i-lucide-plus-circle"
          :label="`Buat ${docTypeLabel(detail.doc_type)}`"
          color="primary"
          variant="soft"
          size="sm"
        />
      </div>

      <!-- Main Grid: Instructions + Submission Status -->
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <!-- Left 2 cols: Case instructions & Document picker -->
        <div class="space-y-6 lg:col-span-2">
          <!-- Case Card -->
          <UCard>
            <template #header>
              <div class="flex items-center justify-between">
                <span class="text-sm font-semibold text-highlighted">Instruksi &amp; Soal Studi Kasus</span>
                <UBadge color="primary" variant="subtle" size="xs">
                  Wajib: {{ docTypeLabel(detail.doc_type) }}
                </UBadge>
              </div>
            </template>
            <p class="whitespace-pre-line text-sm leading-relaxed text-default">
              {{ detail.instructions }}
            </p>
          </UCard>

          <!-- Document Selection & Submit -->
          <UCard>
            <template #header>
              <div class="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 class="text-sm font-semibold text-highlighted">
                    Pilih Dokumen untuk Dikumpulkan
                  </h2>
                  <p class="text-xs text-muted">
                    Pilih salah satu dokumen <strong>{{ docTypeLabel(detail.doc_type) }}</strong> milik Anda. Pastikan dokumen sudah diterbitkan/dilaporkan agar memperoleh skor maksimal.
                  </p>
                </div>
                <UButton
                  icon="i-lucide-refresh-cw"
                  label="Segarkan Daftar"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  :loading="candidatesStatus === 'pending'"
                  @click="refreshCandidates()"
                />
              </div>
            </template>

            <div class="space-y-4">
              <UAlert
                v-if="submitError"
                color="error"
                variant="subtle"
                icon="i-lucide-circle-alert"
                :title="submitError"
              />

              <UAlert
                v-if="detail.status === 'closed'"
                color="warning"
                variant="subtle"
                icon="i-lucide-lock"
                title="Tugas ini telah ditutup oleh guru"
                description="Pengumpulan baru atau pengiriman ulang sudah tidak dapat dilakukan."
              />

              <UAlert
                v-else-if="mySub?.final_score !== null && mySub?.final_score !== undefined"
                color="success"
                variant="subtle"
                icon="i-lucide-badge-check"
                title="Tugas Anda telah dinilai oleh guru"
                description="Dokumen yang sudah dinilai akhir oleh guru tidak dapat diganti lagi."
              />

              <UAlert
                v-else-if="mySub?.submitted && !allowResubmission"
                color="neutral"
                variant="subtle"
                icon="i-lucide-lock"
                title="Pengiriman ulang dinonaktifkan"
                description="Instansi Anda tidak mengizinkan penggantian dokumen kiriman setelah dikumpulkan."
              />

              <UAlert
                v-else-if="isPastDue && !allowLateSubmission"
                color="warning"
                variant="subtle"
                icon="i-lucide-clock-alert"
                title="Tenggat sudah lewat"
                description="Pengumpulan tugas terlambat dinonaktifkan oleh pengaturan instansi Anda."
              />

              <div v-if="!isSubmissionLocked && candidates.length === 0" class="rounded-lg border border-dashed border-default p-6 text-center">
                <UIcon name="i-lucide-file-question" class="mx-auto size-8 text-muted" />
                <p class="mt-2 text-sm font-medium text-highlighted">
                  Anda belum memiliki dokumen {{ docTypeLabel(detail.doc_type) }}
                </p>
                <p class="mt-1 text-xs text-muted">
                  Buat dan terbitkan dokumen terlebih dahulu sesuai soal studi kasus di atas, lalu kembali ke halaman ini untuk mengumpulkannya.
                </p>
                <UButton
                  :to="siswaCreateDocPath(detail.doc_type)"
                  icon="i-lucide-plus"
                  :label="`Buat ${docTypeLabel(detail.doc_type)} Sekarang`"
                  color="primary"
                  size="xs"
                  class="mt-3"
                />
              </div>

              <div v-else-if="!isSubmissionLocked" class="space-y-2">
                <label
                  v-for="doc in candidates"
                  :key="doc.id"
                  class="flex cursor-pointer items-center justify-between gap-3 rounded-lg border p-3 transition"
                  :class="selectedDocId === doc.id ? 'border-primary bg-primary/5' : 'border-default hover:bg-elevated/40'"
                >
                  <div class="flex items-start gap-3">
                    <input
                      v-model="selectedDocId"
                      type="radio"
                      :value="doc.id"
                      :disabled="!canSubmit"
                      class="mt-1"
                    >
                    <div>
                      <div class="flex flex-wrap items-center gap-2">
                        <span class="font-mono text-sm font-semibold text-highlighted">
                          {{ doc.number ?? `Konsep (belum bernomor) · ID ${doc.id}` }}
                        </span>
                        <UBadge
                          :color="doc.status === 'issued' || doc.status === 'reported' || doc.status === 'credited' ? 'success' : 'warning'"
                          variant="subtle"
                          size="xs"
                        >
                          {{ docStatusLabel(doc.status) }}
                        </UBadge>
                        <UBadge
                          v-if="mySub?.doc_id === doc.id"
                          color="primary"
                          variant="subtle"
                          size="xs"
                        >
                          Terpilih Saat Ini
                        </UBadge>
                      </div>
                      <div class="mt-0.5 text-xs text-muted">
                        Masa Pajak: <strong class="text-default">{{ String(doc.tax_month).padStart(2, '0') }}/{{ doc.tax_year }}</strong>
                        <span v-if="doc.counterparty_name"> &middot; Lawan Transaksi: {{ doc.counterparty_name }}</span>
                      </div>
                    </div>
                  </div>
                  <div class="text-right font-mono text-xs font-semibold text-default">
                    Rp {{ formatCurrency(doc.tax_amount) }}
                  </div>
                </label>

                <div class="flex items-center justify-end pt-2">
                  <UButton
                    icon="i-lucide-upload"
                    :label="mySub?.submitted ? 'Kirim Ulang Dokumen & Periksa Otomatis' : 'Kumpulkan Dokumen'"
                    color="primary"
                    :disabled="!canSubmit || !selectedDocId"
                    :loading="submitBusy"
                    @click="onSubmitDoc"
                  />
                </div>
              </div>
            </div>
          </UCard>
        </div>

        <!-- Right col: Submission Score & Auto-Check Checklist -->
        <div class="space-y-4">
          <UCard>
            <template #header>
              <span class="text-sm font-semibold text-highlighted">Status &amp; Nilai Pengumpulan</span>
            </template>

            <div v-if="!mySub?.submitted" class="py-6 text-center">
              <UIcon name="i-lucide-hourglass" class="mx-auto size-8 text-muted" />
              <p class="mt-2 text-sm font-medium text-highlighted">
                Belum Mengumpulkan
              </p>
              <p class="mt-1 text-xs text-muted">
                Pilih dokumen di samping dan klik &ldquo;Kumpulkan Dokumen&rdquo; untuk menjalankan pemeriksaan otomatis.
              </p>
            </div>

            <div v-else class="space-y-4">
              <div class="flex items-center justify-between rounded-lg bg-elevated/60 p-3.5">
                <div>
                  <span class="block text-xs text-muted">
                    {{ mySub.final_score !== null ? 'Nilai Akhir Guru' : 'Skor Pemeriksaan Otomatis' }}
                  </span>
                  <div class="mt-0.5 flex items-baseline gap-1 font-mono">
                    <span class="text-3xl font-bold text-highlighted">
                      {{ mySub.displayed_score ?? 0 }}
                    </span>
                    <span class="text-sm text-muted">/ 100</span>
                  </div>
                </div>
                <div class="flex flex-col items-end gap-1">
                  <UBadge
                    :color="mySub.final_score !== null ? 'success' : 'primary'"
                    variant="subtle"
                    size="sm"
                  >
                    {{ mySub.final_score !== null ? 'Disahkan Guru' : 'Nilai Otomatis' }}
                  </UBadge>
                  <UBadge v-if="mySub.is_late" color="warning" variant="subtle" size="xs">
                    Terlambat
                  </UBadge>
                </div>
              </div>

              <div class="space-y-1 text-xs text-muted">
                <div class="flex justify-between">
                  <span>Dokumen Terkumpul:</span>
                  <strong class="font-mono text-default">{{ mySub.doc_number ?? `#${mySub.doc_id}` }}</strong>
                </div>
                <div class="flex justify-between">
                  <span>Waktu Kumpul:</span>
                  <strong class="text-default">{{ formatDateTimeId(mySub.submitted_at) }}</strong>
                </div>
                <div v-if="mySub.final_score !== null" class="flex justify-between">
                  <span>Skor Otomatis Awal:</span>
                  <strong class="font-mono text-default">{{ mySub.auto_score ?? 0 }} / 100</strong>
                </div>
              </div>

              <!-- Teacher feedback -->
              <div
                v-if="mySub.teacher_feedback"
                class="rounded-lg border border-default bg-elevated/40 p-3 text-xs"
              >
                <span class="block font-semibold text-highlighted">Umpan Balik Guru:</span>
                <p class="mt-1 whitespace-pre-line text-default">
                  {{ mySub.teacher_feedback }}
                </p>
              </div>

              <!-- Auto-Checks Checklist -->
              <div class="border-t border-default pt-3">
                <div class="flex items-center justify-between text-xs font-semibold text-highlighted">
                  <span>Rincian Pemeriksaan Otomatis</span>
                  <span v-if="!autoChecksHidden" class="font-mono text-muted">
                    {{ mySub.auto_checks.filter(c => c.passed).length }}/{{ mySub.auto_checks.length }} lulus
                  </span>
                </div>

                <div
                  v-if="autoChecksHidden"
                  class="mt-2.5 flex items-center gap-2 rounded-lg border border-default bg-elevated/40 p-3 text-xs text-muted"
                >
                  <UIcon name="i-lucide-eye-off" class="size-4 shrink-0" />
                  <span>Rincian pemeriksaan disembunyikan oleh guru/admin</span>
                </div>

                <ul v-else class="mt-2.5 divide-y divide-default text-xs">
                  <li
                    v-for="chk in mySub.auto_checks"
                    :key="chk.code"
                    class="flex items-start gap-2.5 py-2"
                  >
                    <UIcon
                      :name="chk.passed ? 'i-lucide-check-circle-2' : 'i-lucide-x-circle'"
                      class="mt-0.5 size-4 shrink-0"
                      :class="chk.passed ? 'text-success' : 'text-error'"
                    />
                    <div class="min-w-0 flex-1">
                      <div class="flex items-center justify-between gap-2">
                        <span class="font-medium text-highlighted">{{ chk.label }}</span>
                        <span class="shrink-0 font-mono text-[10px] text-muted">+{{ chk.weight }}</span>
                      </div>
                      <p class="mt-0.5 text-muted">
                        {{ chk.message }}
                      </p>
                    </div>
                  </li>
                </ul>

                <p
                  v-if="canSubmit"
                  class="mt-3 rounded-md bg-elevated/50 p-2.5 text-[11px] text-muted"
                >
                  Jika masih ada pemeriksaan yang belum lulus, Anda dapat memperbaiki atau membuat dokumen baru lalu melakukan <strong>Kirim Ulang</strong> selama tugas masih terbit dan belum dinilai akhir oleh guru.
                </p>
              </div>
            </div>
          </UCard>
        </div>
      </div>
    </template>
  </div>
</template>
