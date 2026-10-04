<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { AuditLog, AuditLogListResponse, Tenant } from '~/types/api'

definePageMeta({ middleware: 'role', roles: ['admin', 'superadmin'] })

const auth = useAuth()
const { apiFetch } = useApi()

const isSuperadmin = computed(() => auth.user.value?.role === 'superadmin')
const page = ref(1)
const pageSize = ref(25)
const actionFilter = ref<string | undefined>(undefined)
const tenantFilter = ref<number | undefined>(undefined)

const actionOptions = [
  { label: 'Semua Aksi', value: undefined as string | undefined },
  ...[
    'user.create',
    'user.bulk_create',
    'user.update',
    'user.deactivate',
    'user.password_reset',
    'class.create',
    'class.archive',
    'enrollment.add',
    'enrollment.remove',
    'document.create',
    'document.issue',
    'document.cancel',
    'document.invalidate',
    'document.credit',
    'document.uncredit',
    'document.review',
    'spt.submit',
    'spt.pembetulan',
    'spt.review',
    'billing.pay',
    'tenant.create',
    'tenant.activate',
    'tenant.deactivate',
    'tenant.delete'
  ].map(value => ({ label: value, value: value as string | undefined }))
]

const { data: tenants } = useAsyncData(
  'audit-tenants',
  async () => (isSuperadmin.value ? await apiFetch<Tenant[]>('/api/v1/tenants') : []),
  { default: () => [] as Tenant[] }
)

const tenantOptions = computed(() => [
  { label: 'Semua Instansi', value: undefined as number | undefined },
  ...tenants.value.map(t => ({ label: t.name, value: t.id as number | undefined }))
])

const { data: logs, status: logsStatus, refresh: refreshLogs } = useAsyncData(
  'audit-logs-list',
  () => {
    const query = new URLSearchParams({
      page: String(page.value),
      size: String(pageSize.value)
    })
    if (actionFilter.value) query.set('action', actionFilter.value)
    if (isSuperadmin.value && tenantFilter.value !== undefined) {
      query.set('tenant_id', String(tenantFilter.value))
    }
    return apiFetch<AuditLogListResponse>(`/api/v1/audit-logs?${query.toString()}`)
  },
  { watch: [page, pageSize, actionFilter, tenantFilter] }
)

watch([actionFilter, tenantFilter, pageSize], () => {
  page.value = 1
})

const columns: TableColumn<AuditLog>[] = [
  { accessorKey: 'created_at', header: 'Waktu' },
  { accessorKey: 'actor_email', header: 'Pelaku' },
  { accessorKey: 'actor_role', header: 'Peran' },
  { accessorKey: 'action', header: 'Aksi' },
  { accessorKey: 'summary', header: 'Ringkasan' }
]

function formatTime(iso: string | null) {
  if (!iso) return '-'
  return new Date(iso).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-2xl font-semibold text-default">Log Audit</h1>
      <div class="flex flex-wrap items-center gap-2">
        <USelect v-model="actionFilter" :items="actionOptions" class="w-52" />
        <USelect
          v-if="isSuperadmin"
          v-model="tenantFilter"
          :items="tenantOptions"
          class="w-52"
        />
        <UButton icon="i-lucide-refresh-cw" color="neutral" variant="soft" :loading="logsStatus === 'pending'" @click="() => refreshLogs()" />
      </div>
    </div>

    <UCard>
      <div class="overflow-x-auto">
        <UTable :data="logs?.items ?? []" :columns="columns" :loading="logsStatus === 'pending'">
          <template #created_at-cell="{ row }">{{ formatTime(row.original.created_at) }}</template>
          <template #actor_role-cell="{ row }">
            <UBadge color="neutral" variant="subtle">{{ row.original.actor_role }}</UBadge>
          </template>
          <template #action-cell="{ row }">
            <span class="font-mono text-xs">{{ row.original.action }}</span>
          </template>
          <template #empty>
            <p class="py-8 text-center text-sm text-muted">Belum ada aktivitas tercatat.</p>
          </template>
        </UTable>
      </div>
      <template #footer>
        <div class="flex items-center justify-between">
          <p class="text-sm text-muted">Total: {{ logs?.total ?? 0 }} catatan</p>
          <div class="flex items-center gap-3">
            <UPagination v-model:page="page" :total="logs?.total ?? 0" :items-per-page="pageSize" />
            <USelect v-model="pageSize" :items="[10, 25, 50, 100]" size="xs" class="w-20" />
          </div>
        </div>
      </template>
    </UCard>
  </div>
</template>
