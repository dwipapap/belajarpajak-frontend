<script setup lang="ts">
import type { AssignmentRead } from '~/types/api'
import {
  assignmentStatusColor,
  assignmentStatusLabel,
  docTypeLabel,
  formatDateTimeId
} from '~/utils/tugas'

definePageMeta({ middleware: 'role', roles: ['siswa'] })

const { apiFetch } = useApi()

const filterTab = ref<'all' | 'pending' | 'submitted' | 'graded'>('all')

function setFilterTab(tab: 'all' | 'pending' | 'submitted' | 'graded') {
  filterTab.value = tab
}

const { data: assignments, status: listStatus, refresh: refreshAssignments } = useAsyncData(
  'siswa-tugas-list',
  () => apiFetch<AssignmentRead[]>('/api/v1/tugas'),
  { default: () => [] as AssignmentRead[] }
)

const filteredAssignments = computed(() => {
  const list = assignments.value ?? []
  switch (filterTab.value) {
    case 'pending':
      return list.filter(a => !a.my_submission?.submitted)
    case 'submitted':
      return list.filter(a => a.my_submission?.submitted && a.my_submission.final_score === null)
    case 'graded':
      return list.filter(a => a.my_submission?.submitted && a.my_submission.final_score !== null)
    default:
      return list
  }
})

const pendingCount = computed(() =>
  (assignments.value ?? []).filter(a => !a.my_submission?.submitted && a.status === 'published').length
)

const submittedCount = computed(() =>
  (assignments.value ?? []).filter(a => a.my_submission?.submitted).length
)

const averageScore = computed(() => {
  const scores = (assignments.value ?? [])
    .map(a => a.my_submission?.displayed_score)
    .filter((s): s is number => typeof s === 'number')
  if (scores.length === 0) return null
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length
  return Math.round(avg * 10) / 10
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted">
          <UIcon name="i-lucide-clipboard-check" class="size-4 text-primary" />
          <span>Portal Wajib Pajak &middot; Tugas Praktikum</span>
        </div>
        <h1 class="mt-1 text-2xl font-semibold text-highlighted">
          Tugas Kelas Saya
        </h1>
        <p class="mt-0.5 text-sm text-muted">
          Kerjakan studi kasus perpajakan dari guru, pilih dokumen yang telah Anda terbitkan, dan tinjau hasil pemeriksaan otomatis.
        </p>
      </div>
      <div class="flex items-center gap-2">
        <UButton
          to="/siswa"
          icon="i-lucide-arrow-left"
          label="Dasbor Saya"
          color="neutral"
          variant="soft"
          size="sm"
        />
        <UButton
          icon="i-lucide-refresh-cw"
          label="Muat Ulang"
          color="neutral"
          variant="ghost"
          size="sm"
          :loading="listStatus === 'pending'"
          @click="refreshAssignments()"
        />
      </div>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div class="dash-stat" :class="{ 'dash-stat-warn': pendingCount > 0 }">
        <span class="dash-stat-label">Belum Dikumpulkan</span>
        <span class="dash-stat-value font-mono">{{ pendingCount }}</span>
        <span class="dash-stat-sub">Tugas terbit yang menunggu dokumen Anda</span>
      </div>
      <div class="dash-stat">
        <span class="dash-stat-label">Sudah Dikumpulkan</span>
        <span class="dash-stat-value font-mono text-primary">{{ submittedCount }}</span>
        <span class="dash-stat-sub">Dari total {{ assignments.length }} tugas kelas</span>
      </div>
      <div class="dash-stat">
        <span class="dash-stat-label">Rata-rata Nilai</span>
        <span class="dash-stat-value font-mono">{{ averageScore ?? '—' }}</span>
        <span class="dash-stat-sub">Nilai akhir guru / skor otomatis</span>
      </div>
    </div>

    <!-- Filter buttons -->
    <div class="flex flex-wrap items-center gap-2">
      <UButton
        label="Semua Tugas"
        size="xs"
        :color="filterTab === 'all' ? 'primary' : 'neutral'"
        :variant="filterTab === 'all' ? 'solid' : 'soft'"
        @click="setFilterTab('all')"
      />
      <UButton
        label="Belum Dikumpulkan"
        size="xs"
        :color="filterTab === 'pending' ? 'warning' : 'neutral'"
        :variant="filterTab === 'pending' ? 'solid' : 'soft'"
        @click="setFilterTab('pending')"
      />
      <UButton
        label="Menunggu Nilai Guru"
        size="xs"
        :color="filterTab === 'submitted' ? 'primary' : 'neutral'"
        :variant="filterTab === 'submitted' ? 'solid' : 'soft'"
        @click="setFilterTab('submitted')"
      />
      <UButton
        label="Sudah Dinilai Guru"
        size="xs"
        :color="filterTab === 'graded' ? 'success' : 'neutral'"
        :variant="filterTab === 'graded' ? 'solid' : 'soft'"
        @click="setFilterTab('graded')"
      />
    </div>

    <!-- Loading / Empty / List -->
    <div v-if="listStatus === 'pending' && assignments.length === 0" class="space-y-3">
      <USkeleton class="h-28 w-full" />
      <USkeleton class="h-28 w-full" />
    </div>

    <UCard v-else-if="filteredAssignments.length === 0">
      <div class="py-10 text-center">
        <UIcon name="i-lucide-clipboard-check" class="mx-auto size-10 text-muted" />
        <p class="mt-3 text-base font-semibold text-highlighted">
          Tidak ada tugas pada kategori ini
        </p>
        <p class="mt-1 text-sm text-muted">
          Tugas yang diterbitkan oleh guru kelas Anda akan muncul di halaman ini.
        </p>
      </div>
    </UCard>

    <div v-else class="space-y-3">
      <UCard
        v-for="item in filteredAssignments"
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

              <!-- Submission status badge -->
              <UBadge
                v-if="!item.my_submission?.submitted"
                color="warning"
                variant="subtle"
                size="sm"
              >
                Belum mengumpulkan
              </UBadge>
              <UBadge
                v-else-if="item.my_submission.final_score !== null"
                color="success"
                variant="subtle"
                size="sm"
              >
                Sudah dinilai guru
              </UBadge>
              <UBadge
                v-else
                color="primary"
                variant="subtle"
                size="sm"
              >
                Sudah dikumpulkan
              </UBadge>

              <UBadge
                v-if="item.my_submission?.is_late"
                color="warning"
                variant="subtle"
                size="sm"
              >
                Terlambat
              </UBadge>
            </div>

            <NuxtLink
              :to="`/siswa/tugas/${item.id}`"
              class="block text-base font-semibold text-highlighted hover:text-primary"
            >
              {{ item.title }}
            </NuxtLink>

            <p class="line-clamp-2 text-sm text-muted">
              {{ item.instructions }}
            </p>

            <div class="text-xs text-muted">
              Tenggat: <strong class="text-default">{{ formatDateTimeId(item.due_at) }}</strong>
              <span v-if="item.my_submission?.submitted">
                &middot; Dikumpulkan: {{ formatDateTimeId(item.my_submission.submitted_at) }}
              </span>
            </div>
          </div>

          <div class="flex flex-wrap items-center justify-between gap-4 border-t border-default pt-3 lg:justify-end lg:border-t-0 lg:pt-0">
            <div v-if="item.my_submission?.submitted" class="text-right">
              <span class="block text-[11px] uppercase tracking-wider text-muted">
                {{ item.my_submission.final_score !== null ? 'Nilai Akhir' : 'Skor Otomatis' }}
              </span>
              <span class="font-mono text-xl font-bold text-highlighted">
                {{ item.my_submission.displayed_score ?? '—' }}
              </span>
              <span class="font-mono text-xs text-muted">/ 100</span>
            </div>

            <UButton
              :to="`/siswa/tugas/${item.id}`"
              :icon="item.my_submission?.submitted ? 'i-lucide-eye' : 'i-lucide-upload'"
              :label="item.my_submission?.submitted ? 'Lihat Hasil & Kirim Ulang' : 'Kerjakan & Kumpulkan'"
              :color="item.my_submission?.submitted ? 'neutral' : 'primary'"
              :variant="item.my_submission?.submitted ? 'soft' : 'solid'"
              size="sm"
            />
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>
