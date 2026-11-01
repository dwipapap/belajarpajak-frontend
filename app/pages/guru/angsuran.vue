<script setup lang="ts">
definePageMeta({ middleware: 'role', roles: ['guru', 'admin', 'superadmin'] })

interface Cicilan {
  id: number
  ke: number
  jatuh_tempo: string
  amount: number
  status: string
  paid_at: string | null
  kanal: string | null
}
interface AngsuranItem {
  id: number
  billing_id: number
  n_cicilan: number
  status: string
  cicilan: Cicilan[]
}
interface AngsuranListResponse { items: AngsuranItem[]; total: number }

const { apiFetch } = useApi()

const page = ref(1)
const size = 20
const { data, status, refresh } = useAsyncData(
  'guru-angsuran-list',
  () => apiFetch<AngsuranListResponse>('/api/v1/angsuran', { query: { page: page.value, size } }),
  { default: () => ({ items: [], total: 0 }) as AngsuranListResponse, watch: [page] }
)

const expandedId = ref<number | null>(null)
function toggle(id: number) {
  expandedId.value = expandedId.value === id ? null : id
}

const columns = [
  { accessorKey: 'id', header: 'ID' },
  { accessorKey: 'billing_id', header: 'Billing' },
  { accessorKey: 'n_cicilan', header: 'Cicilan' },
  { accessorKey: 'status', header: 'Status' },
  { accessorKey: 'progress', header: 'Terbayar' },
  { accessorKey: 'actions', header: 'Jadwal' }
]

function paidCount(a: AngsuranItem) {
  return a.cicilan.filter(c => c.status === 'paid').length
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold text-default">Monitor Angsuran</h1>
        <p class="text-sm text-muted">Angsuran berjalan milik siswa — pantau jadwal cicilan.</p>
      </div>
      <UButton to="/guru" icon="i-lucide-arrow-left" color="neutral" variant="ghost" label="Dasbor Guru" />
    </div>

    <UCard>
      <template #header>
        <div class="flex items-center justify-between gap-3">
          <h2 class="font-semibold text-default">Daftar Angsuran ({{ data?.total ?? 0 }})</h2>
          <UButton icon="i-lucide-refresh-cw" color="neutral" variant="ghost" :loading="status === 'pending'" @click="() => refresh()" />
        </div>
      </template>

      <div v-if="status === 'pending'" class="py-6 text-center text-sm text-muted">Memuat…</div>
      <div v-else-if="(data?.items ?? []).length === 0" class="py-6 text-center text-sm text-muted">
        Belum ada angsuran.
      </div>
      <template v-else>
        <UTable :data="data?.items ?? []" :columns="columns">
          <template #status-cell="{ row }">
            <UBadge
              :color="row.original.status === 'lunas' ? 'success' : row.original.status === 'berjalan' ? 'info' : 'neutral'"
              variant="subtle"
              :label="row.original.status"
            />
          </template>
          <template #progress-cell="{ row }">
            {{ paidCount(row.original) }}/{{ row.original.n_cicilan }}
          </template>
          <template #actions-cell="{ row }">
            <UButton
              size="xs" color="neutral" variant="ghost"
              :icon="expandedId === row.original.id ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
              label="Jadwal"
              @click="toggle(row.original.id)"
            />
          </template>
        </UTable>

        <div v-for="a in (data?.items ?? [])" :key="a.id">
          <div v-if="expandedId === a.id" class="mt-2 rounded-lg bg-elevated/50 p-4">
            <p class="mb-2 text-sm font-medium text-default">Jadwal cicilan angsuran #{{ a.id }} (billing #{{ a.billing_id }})</p>
            <ul class="space-y-1">
              <li
                v-for="c in a.cicilan"
                :key="c.id"
                class="flex flex-wrap items-center justify-between gap-2 rounded-md bg-default px-3 py-2"
              >
                <span class="text-sm text-default">Cicilan ke-{{ c.ke }} — jatuh tempo {{ c.jatuh_tempo }}</span>
                <span class="text-sm text-default">{{ formatCurrency(c.amount) }}</span>
                <UBadge :color="c.status === 'paid' ? 'success' : 'warning'" variant="subtle" :label="c.status" />
              </li>
            </ul>
          </div>
        </div>

        <div v-if="(data?.total ?? 0) > size" class="mt-4 flex justify-end">
          <UPagination v-model:page="page" :total="data?.total ?? 0" :items-per-page="size" />
        </div>
      </template>
    </UCard>
  </div>
</template>
