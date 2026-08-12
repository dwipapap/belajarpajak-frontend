<script setup lang="ts">
import type {
  Bp21ListResponse,
  Bp21Read,
  Bp21Summary,
  Bp23ListResponse,
  Bp23Read,
  Bp23Summary,
  Bp26ListResponse,
  Bp26Read,
  Bp26Summary,
  DashboardSummary,
  SchoolClass
} from '~/types/api'
import { formatCurrency, formatPeriod, statusColor, statusLabel } from '~/utils/bupot'

definePageMeta({ middleware: 'role', roles: ['siswa'] })

const auth = useAuth()
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

const { data: bp21Summary } = useAsyncData(
  'siswa-dashboard-bp21-summary',
  () => apiFetch<Bp21Summary>('/api/v1/bp21/summary'),
  { default: () => ({ draft: 0, issued: 0, invalid: 0, total: 0 }) }
)

const { data: bp23Summary } = useAsyncData(
  'siswa-dashboard-bp23-summary',
  () => apiFetch<Bp23Summary>('/api/v1/bp23/summary'),
  { default: () => ({ draft: 0, issued: 0, invalid: 0, total: 0 }) }
)

const { data: bp26Summary } = useAsyncData(
  'siswa-dashboard-bp26-summary',
  () => apiFetch<Bp26Summary>('/api/v1/bp26/summary'),
  { default: () => ({ draft: 0, issued: 0, invalid: 0, total: 0 }) }
)

const { data: bp21List, status: bp21Status } = useAsyncData(
  'siswa-dashboard-bp21-list',
  () => apiFetch<Bp21ListResponse>('/api/v1/bp21?page=1&size=5'),
  { default: () => ({ items: [], total: 0, page: 1, size: 5 }) }
)

const { data: bp23List, status: bp23Status } = useAsyncData(
  'siswa-dashboard-bp23-list',
  () => apiFetch<Bp23ListResponse>('/api/v1/bp23?page=1&size=5'),
  { default: () => ({ items: [], total: 0, page: 1, size: 5 }) }
)

const { data: bp26List, status: bp26Status } = useAsyncData(
  'siswa-dashboard-bp26-list',
  () => apiFetch<Bp26ListResponse>('/api/v1/bp26?page=1&size=5'),
  { default: () => ({ items: [], total: 0, page: 1, size: 5 }) }
)

type RecentDocument = {
  id: number
  module: 'BP21' | 'BP23' | 'BP26'
  to: string
  recipient_name: string
  tax_month: number
  tax_year: number
  status: Bp21Read['status']
  income_tax: number
  score: number | null
  updated_at: string | null
  created_at: string | null
}

const bupotTotal = computed(() => bp21Summary.value.total + bp23Summary.value.total + bp26Summary.value.total)
const issuedTotal = computed(() => bp21Summary.value.issued + bp23Summary.value.issued + bp26Summary.value.issued)
const draftTotal = computed(() => bp21Summary.value.draft + bp23Summary.value.draft + bp26Summary.value.draft)
const invalidTotal = computed(() => bp21Summary.value.invalid + bp23Summary.value.invalid + bp26Summary.value.invalid)

const statCards = computed(() => [
  {
    label: 'Kelas Saya',
    description: 'Kelas aktif yang diikuti',
    value: summary.value?.classes ?? 0,
    icon: 'i-lucide-users',
    tone: 'info'
  },
  {
    label: 'Total e-Bupot',
    description: 'BP21 + BP23 + BP26',
    value: bupotTotal.value,
    icon: 'i-lucide-file-text',
    tone: 'primary'
  },
  {
    label: 'Telah Terbit',
    description: 'Dokumen yang telah terbit',
    value: issuedTotal.value,
    icon: 'i-lucide-check-circle-2',
    tone: 'success'
  },
  {
    label: 'Perlu Diselesaikan',
    description: 'Konsep + Tidak valid',
    value: draftTotal.value + invalidTotal.value,
    icon: 'i-lucide-hourglass',
    tone: 'warning'
  }
])

const modules = computed(() => [
  {
    title: 'BP21',
    description: 'Bukti pemotongan PPh Pasal 21',
    to: '/siswa/bp21',
    colorClass: 'is-bp21',
    summary: bp21Summary.value
  },
  {
    title: 'BP23',
    description: 'Bukti pemotongan PPh Pasal 23',
    to: '/siswa/bp23',
    colorClass: 'is-bp23',
    summary: bp23Summary.value
  },
  {
    title: 'BP26',
    description: 'Bukti pemotongan PPh Pasal 26',
    to: '/siswa/bp26',
    colorClass: 'is-bp26',
    summary: bp26Summary.value
  }
])

const recentDocuments = computed<RecentDocument[]>(() => {
  const bp21 = bp21List.value.items.map((item: Bp21Read) => ({
    ...item,
    module: 'BP21' as const,
    to: '/siswa/bp21'
  }))
  const bp23 = bp23List.value.items.map((item: Bp23Read) => ({
    ...item,
    module: 'BP23' as const,
    to: '/siswa/bp23'
  }))
  const bp26 = bp26List.value.items.map((item: Bp26Read) => ({
    ...item,
    module: 'BP26' as const,
    to: '/siswa/bp26'
  }))

  return [...bp21, ...bp23, ...bp26]
    .sort((a, b) => {
      const left = a.updated_at || a.created_at || ''
      const right = b.updated_at || b.created_at || ''
      return right.localeCompare(left)
    })
    .slice(0, 6)
})

const isDocumentsLoading = computed(
  () => bp21Status.value === 'pending' || bp23Status.value === 'pending' || bp26Status.value === 'pending'
)
</script>

<template>
  <div class="siswa-dashboard space-y-4">
    <section class="siswa-dashboard__hero flex justify-between items-center bg-blue-50/50 p-6 rounded-xl border border-blue-100">
      <div class="space-y-4 max-w-lg">
        <UBadge color="primary" variant="subtle" class="gap-1.5" size="md">
          <UIcon name="i-lucide-building" class="size-4" />
          {{ auth.user.value?.tenant_id ?? '1471110802000001' }}
        </UBadge>
        <div>
          <h1 class="text-3xl font-bold text-gray-900 tracking-tight">Dasbor Siswa</h1>
          <p class="text-gray-600 mt-1 text-lg">{{ auth.user.value?.full_name }}</p>
        </div>
      </div>
      
      <div class="hidden md:block absolute right-72 opacity-20 pointer-events-none">
        <UIcon name="i-lucide-graduation-cap" class="size-48 text-primary" />
      </div>

      <div class="bg-white p-4 rounded-xl border border-gray-100 shadow-sm z-10 w-64 space-y-3">
        <p class="text-sm font-semibold text-gray-900 mb-2">Aksi Cepat</p>
        <UButton to="/siswa/bp21/create" icon="i-lucide-file-plus-2" label="Buat BP21" class="w-full justify-center" size="md" />
        <UButton to="/siswa/bp23/create" icon="i-lucide-file-plus-2" label="Buat BP23" color="neutral" variant="outline" class="w-full justify-center" size="md" />
        <UButton to="/siswa/bp26/create" icon="i-lucide-file-plus-2" label="Buat BP26" color="neutral" variant="outline" class="w-full justify-center" size="md" />
      </div>
    </section>

    <section class="grid grid-cols-1 md:grid-cols-4 gap-4" aria-label="Ringkasan siswa">
      <div v-for="card in statCards" :key="card.label" class="bg-white border border-gray-200 rounded-xl p-5 flex items-center gap-4">
        <div :class="['size-12 rounded-full flex items-center justify-center flex-shrink-0', `bg-${card.tone}-50 text-${card.tone}-600`]">
          <UIcon :name="card.icon" class="size-6" />
        </div>
        <div>
          <p class="text-sm font-medium text-gray-500">{{ card.label }}</p>
          <p class="text-2xl font-bold text-gray-900 leading-none mt-1">{{ card.value }}</p>
          <p class="text-xs text-gray-400 mt-1">{{ card.description }}</p>
        </div>
      </div>
    </section>

    <section class="grid grid-cols-1 lg:grid-cols-12 gap-4">
      <div class="bg-white border border-gray-200 rounded-xl overflow-hidden lg:col-span-4 flex flex-col">
        <header class="p-5 border-b border-gray-100 bg-gray-50/50">
          <h2 class="font-bold text-gray-900">Simulasi yang Aktif</h2>
          <p class="text-xs text-gray-500 mt-0.5">Pilih modul untuk membuat e-Bupot</p>
        </header>

        <div class="flex-1 p-3 space-y-2">
          <NuxtLink
            v-for="item in modules"
            :key="item.title"
            :to="item.to"
            class="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-100 transition-colors"
          >
            <div :class="['size-12 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-lg', item.colorClass]">
              {{ item.title.replace('BP', '') }}
            </div>
            <div class="flex-1 min-w-0">
              <strong class="block text-gray-900 text-sm truncate">{{ item.title }}</strong>
              <span class="block text-xs text-gray-500 truncate">{{ item.description }}</span>
            </div>
            <div class="flex gap-2">
              <div class="text-center">
                <span class="block text-sm font-bold text-orange-600">{{ item.summary.draft }}</span>
                <span class="block text-[10px] text-orange-600/70 font-medium uppercase tracking-wider">Konsep</span>
              </div>
              <div class="text-center">
                <span class="block text-sm font-bold text-green-600">{{ item.summary.issued }}</span>
                <span class="block text-[10px] text-green-600/70 font-medium uppercase tracking-wider">Terbit</span>
              </div>
            </div>
            <UIcon name="i-lucide-chevron-right" class="size-4 text-gray-300 ml-1" />
          </NuxtLink>
        </div>
      </div>

      <div class="bg-white border border-gray-200 rounded-xl overflow-hidden lg:col-span-8 flex flex-col">
        <header class="p-5 border-b border-gray-100 bg-gray-50/50">
          <h2 class="font-bold text-gray-900">Dokumen Terbaru</h2>
          <p class="text-xs text-gray-500 mt-0.5">Dokumen e-Bupot terbaru dari semua modul</p>
        </header>

        <div v-if="isDocumentsLoading" class="p-8 text-center text-sm text-gray-500">Memuat dokumen...</div>
        <div v-else-if="recentDocuments.length === 0" class="p-8 text-center text-sm text-gray-500">
          Belum ada dokumen. Mulai dari BP21, BP23, atau BP26.
        </div>
        <div v-else class="flex-1 p-2">
          <NuxtLink 
            v-for="doc in recentDocuments" 
            :key="`${doc.module}-${doc.id}`"
            :to="doc.to"
            class="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div :class="['size-10 rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-sm', `is-${doc.module.toLowerCase()}`]">
              {{ doc.module.replace('BP', '') }}
            </div>
            <div class="flex-1 min-w-0">
              <strong class="block text-gray-900 text-sm truncate">{{ doc.recipient_name }}</strong>
              <span class="block text-xs text-gray-500 truncate">{{ formatPeriod(doc) }}</span>
            </div>
            <div class="text-right tabular-nums text-sm text-gray-600 font-medium px-4 w-36">
              Rp {{ formatCurrency(doc.income_tax) }}
            </div>
            <div class="w-28 text-center">
              <UBadge :color="statusColor[doc.status]" variant="subtle" size="sm" class="justify-center w-full">
                {{ statusLabel[doc.status] }}
              </UBadge>
            </div>
            <div class="w-20 text-right text-sm font-medium text-gray-900 flex items-center justify-end gap-2">
              <span class="text-gray-400 font-normal">Nilai</span>
              <span v-if="doc.score !== null" class="text-primary">{{ doc.score }}</span>
              <span v-else class="text-gray-300">-</span>
              <UIcon name="i-lucide-chevron-right" class="size-4 text-gray-300" />
            </div>
          </NuxtLink>
        </div>
      </div>
    </section>

    <section class="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <header class="p-5 border-b border-gray-100 bg-gray-50/50">
        <h2 class="font-bold text-gray-900">Kelas yang Diikuti</h2>
        <p class="text-xs text-gray-500 mt-0.5">Daftar kelas yang sedang Anda ikuti</p>
      </header>

      <div v-if="classesStatus === 'pending'" class="p-8 text-center text-sm text-gray-500">Memuat kelas...</div>
      <div v-else-if="classes.length === 0" class="p-8 text-center text-sm text-gray-500">
        Anda belum terdaftar di kelas mana pun.
      </div>
      <UTable 
        v-else 
        :data="classes" 
        :columns="[{accessorKey: 'name', header: 'Nama Kelas'}, {accessorKey: 'academic_year', header: 'Tahun Ajaran'}, {accessorKey: 'guru', header: 'Pengajar'}, {id: 'status', header: 'Status'}, {id: 'action', header: ''}]"
        :ui="{ th: 'bg-transparent text-xs font-medium text-gray-500 uppercase tracking-wider py-3', td: 'py-3 cursor-pointer' }"
      >
        <template #name-cell="{ row }">
          <div class="flex items-center gap-3">
            <div class="size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <UIcon name="i-lucide-book-open" class="size-4" />
            </div>
            <span class="font-medium text-gray-900 text-sm">{{ row.original.name }}</span>
          </div>
        </template>
        <template #academic_year-cell="{ row }">
          <span class="text-sm text-gray-600">{{ row.original.academic_year }}</span>
        </template>
        <template #guru-cell="{ row }">
          <span class="text-sm text-gray-600">{{ row.original.guru?.full_name || '-' }}</span>
        </template>
        <template #status-cell>
          <UBadge color="success" variant="subtle" size="sm">Aktif</UBadge>
        </template>
        <template #action-cell>
          <UIcon name="i-lucide-chevron-right" class="size-4 text-gray-300" />
        </template>
      </UTable>
    </section>
  </div>
</template>

<style scoped>
.siswa-dashboard__hero {
  position: relative;
  overflow: hidden;
}
.is-bp21 { background: oklch(0.92 0.05 270); color: oklch(0.4 0.1 270); }
.is-bp23 { background: oklch(0.92 0.04 250); color: oklch(0.4 0.08 250); }
.is-bp26 { background: oklch(0.92 0.05 150); color: oklch(0.4 0.1 150); }
</style>
