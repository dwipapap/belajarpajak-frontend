<script setup lang="ts">
definePageMeta({ middleware: 'role', roles: ['guru', 'admin', 'superadmin'] })

interface PbkItem {
  id: number
  tenant_id: number
  user_id: number
  dari_kap: string
  ke_kap: string
  amount: number
  masa: string
  alasan: string
  status: string
  decided_by_id: number | null
  created_at: string | null
}
interface PbkListResponse { items: PbkItem[]; total: number }

const { apiFetch } = useApi()
const toast = useToast()

const statusFilter = ref<string>('semua')
const page = ref(1)
const size = 20

const { data, status, refresh } = useAsyncData(
  'guru-pbk-list',
  () => apiFetch<PbkListResponse>('/api/v1/pbk', { query: { page: page.value, size } }),
  { default: () => ({ items: [], total: 0 }) as PbkListResponse, watch: [page] }
)

const items = computed(() => statusFilter.value === 'semua'
  ? (data.value?.items ?? [])
  : (data.value?.items ?? []).filter(i => i.status === statusFilter.value))

const actingId = ref<number | null>(null)

async function setujui(id: number) {
  actingId.value = id
  try {
    await apiFetch(`/api/v1/pbk/${id}/setujui`, { method: 'POST' })
    toast.add({ title: 'Pbk disetujui', color: 'success', icon: 'i-lucide-check-circle' })
    await refresh()
  } catch (e) {
    toast.add({ title: 'Gagal menyetujui', description: apiErrorMessage(e), color: 'error', icon: 'i-lucide-circle-alert' })
  } finally {
    actingId.value = null
  }
}

async function tolak(id: number) {
  if (!confirm('Tolak pengajuan Pbk ini?')) return
  actingId.value = id
  try {
    await apiFetch(`/api/v1/pbk/${id}/tolak`, { method: 'POST' })
    toast.add({ title: 'Pbk ditolak', color: 'warning', icon: 'i-lucide-x-circle' })
    await refresh()
  } catch (e) {
    toast.add({ title: 'Gagal menolak', description: apiErrorMessage(e), color: 'error', icon: 'i-lucide-circle-alert' })
  } finally {
    actingId.value = null
  }
}

function statusColor(s: string) {
  return s === 'disetujui' ? 'success' : s === 'ditolak' ? 'error' : 'warning'
}

const columns = [
  { accessorKey: 'id', header: 'ID' },
  { accessorKey: 'user_id', header: 'Siswa (ID)' },
  { accessorKey: 'dari_kap', header: 'Dari KAP' },
  { accessorKey: 'ke_kap', header: 'Ke KAP' },
  { accessorKey: 'masa', header: 'Masa' },
  { accessorKey: 'amount', header: 'Nominal' },
  { accessorKey: 'status', header: 'Status' },
  { accessorKey: 'alasan', header: 'Alasan' },
  { accessorKey: 'actions', header: 'Aksi' }
]
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold text-default">Pemindahbukuan (Pbk)</h1>
        <p class="text-sm text-muted">Pengajuan Pbk siswa — setujui atau tolak.</p>
      </div>
      <UButton to="/guru" icon="i-lucide-arrow-left" color="neutral" variant="ghost" label="Dasbor Guru" />
    </div>

    <UCard>
      <template #header>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <h2 class="font-semibold text-default">Daftar Pengajuan ({{ data?.total ?? 0 }})</h2>
          <div class="flex items-center gap-2">
            <USelect
              v-model="statusFilter"
              :items="[
                { label: 'Semua', value: 'semua' },
                { label: 'Diajukan', value: 'diajukan' },
                { label: 'Disetujui', value: 'disetujui' },
                { label: 'Ditolak', value: 'ditolak' }
              ]"
              class="w-40"
            />
            <UButton icon="i-lucide-refresh-cw" color="neutral" variant="ghost" :loading="status === 'pending'" @click="() => refresh()" />
          </div>
        </div>
      </template>

      <div v-if="status === 'pending'" class="py-6 text-center text-sm text-muted">Memuat…</div>
      <div v-else-if="items.length === 0" class="py-6 text-center text-sm text-muted">
        Belum ada pengajuan Pbk.
      </div>
      <UTable v-else :data="items" :columns="columns">
        <template #amount-cell="{ row }">
          {{ formatCurrency(row.original.amount) }}
        </template>
        <template #status-cell="{ row }">
          <UBadge :color="statusColor(row.original.status)" variant="subtle" :label="row.original.status" />
        </template>
        <template #actions-cell="{ row }">
          <div v-if="row.original.status === 'diajukan'" class="flex gap-1">
            <UButton
              size="xs" color="success" label="Setujui"
              :loading="actingId === row.original.id"
              @click="setujui(row.original.id)"
            />
            <UButton
              size="xs" color="error" variant="outline" label="Tolak"
              :loading="actingId === row.original.id"
              @click="tolak(row.original.id)"
            />
          </div>
          <span v-else class="text-xs text-muted">—</span>
        </template>
      </UTable>

      <div v-if="(data?.total ?? 0) > size" class="mt-4 flex justify-end">
        <UPagination v-model:page="page" :total="data?.total ?? 0" :items-per-page="size" />
      </div>
    </UCard>
  </div>
</template>
