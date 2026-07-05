<script setup lang="ts">
import type { DashboardSummary, SchoolClass } from '~/types/api'

definePageMeta({ middleware: 'role', roles: ['siswa'] })

const { apiFetch } = useApi()

const { data: summary } = useAsyncData(
  'siswa-summary',
  () => apiFetch<DashboardSummary>('/api/v1/dashboard/summary')
)

const { data: classes, status: classesStatus } = useAsyncData(
  'siswa-classes',
  () => apiFetch<SchoolClass[]>('/api/v1/classes'),
  { default: () => [] as SchoolClass[] }
)
</script>

<template>
  <div class="space-y-6">
    <h1 class="text-2xl font-semibold text-default">Dasbor Siswa</h1>

    <!-- Stat card -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <UCard>
        <div class="flex items-center gap-4">
          <div class="rounded-lg bg-primary/10 p-3">
            <UIcon name="i-lucide-book-open" class="size-6 text-primary" />
          </div>
          <div>
            <p class="text-sm text-muted">Kelas Saya</p>
            <p class="text-2xl font-semibold text-default">{{ summary?.classes ?? 0 }}</p>
          </div>
        </div>
      </UCard>
    </div>

    <!-- Enrolled classes -->
    <UCard>
      <template #header>
        <h2 class="font-semibold text-default">Kelas yang Diikuti</h2>
      </template>

      <div v-if="classesStatus === 'pending'" class="py-6 text-center text-sm text-muted">
        Memuat…
      </div>
      <div v-else-if="classes.length === 0" class="py-6 text-center text-sm text-muted">
        Anda belum terdaftar di kelas mana pun.
      </div>
      <ul v-else class="divide-y divide-default">
        <li v-for="c in classes" :key="c.id" class="flex items-center gap-3 px-2 py-3">
          <div class="rounded-lg bg-primary/10 p-2">
            <UIcon name="i-lucide-book-open" class="size-5 text-primary" />
          </div>
          <div>
            <p class="font-medium text-default">{{ c.name }}</p>
            <p class="text-sm text-muted">Tahun Ajaran {{ c.academic_year }}</p>
          </div>
        </li>
      </ul>
    </UCard>
  </div>
</template>
