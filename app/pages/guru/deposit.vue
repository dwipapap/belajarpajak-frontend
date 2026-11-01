<script setup lang="ts">
definePageMeta({ middleware: 'role', roles: ['guru', 'admin', 'superadmin'] })

interface RekapRow {
  user_id: number
  full_name: string
  saldo: number
}

const { apiFetch } = useApi()

const { data, status, refresh } = useAsyncData(
  'guru-deposit-rekap',
  () => apiFetch<RekapRow[]>('/api/v1/deposit/tenant'),
  { default: () => [] as RekapRow[] }
)

const totalSaldo = computed(() => (data.value ?? []).reduce((s, r) => s + r.saldo, 0))

const columns = [
  { accessorKey: 'user_id', header: 'User ID' },
  { accessorKey: 'full_name', header: 'Nama' },
  { accessorKey: 'saldo', header: 'Saldo' }
]
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold text-default">Rekap Deposit</h1>
        <p class="text-sm text-muted">Saldo deposit per pengguna di institusi Anda.</p>
      </div>
      <UButton to="/guru" icon="i-lucide-arrow-left" color="neutral" variant="ghost" label="Dasbor Guru" />
    </div>

    <UCard>
      <div class="flex items-center gap-4">
        <div class="rounded-lg bg-primary/10 p-3">
          <UIcon name="i-lucide-wallet" class="size-6 text-primary" />
        </div>
        <div>
          <p class="text-sm text-muted">Total saldo tenant</p>
          <p class="text-2xl font-semibold text-default">{{ formatCurrency(totalSaldo) }}</p>
        </div>
        <div class="ml-auto">
          <UButton icon="i-lucide-refresh-cw" color="neutral" variant="ghost" :loading="status === 'pending'" @click="() => refresh()" />
        </div>
      </div>
    </UCard>

    <UCard>
      <template #header>
        <h2 class="font-semibold text-default">Saldo per Pengguna ({{ (data ?? []).length }})</h2>
      </template>
      <div v-if="status === 'pending'" class="py-6 text-center text-sm text-muted">Memuat…</div>
      <div v-else-if="(data ?? []).length === 0" class="py-6 text-center text-sm text-muted">
        Belum ada data deposit.
      </div>
      <UTable v-else :data="data ?? []" :columns="columns">
        <template #saldo-cell="{ row }">{{ formatCurrency(row.original.saldo) }}</template>
      </UTable>
    </UCard>
  </div>
</template>
